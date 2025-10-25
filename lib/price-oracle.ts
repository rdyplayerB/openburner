/**
 * Price Oracle using CoinGecko API
 * Implements multi-tier caching and best practices to minimize API calls
 * 
 * HOSTED VERSION: Pricing is disabled to avoid API costs
 * LOCAL VERSION: Full pricing functionality enabled
 * 
 * Caching Strategy:
 * 1. Memory cache (fast, session-only)
 * 2. localStorage cache (persistent across sessions)
 * 3. Stale-while-revalidate pattern
 * 4. Request deduplication
 * 5. Differential cache duration based on token type
 */

import { coinGeckoLimiter } from "./coingecko-rate-limiter";
import { getAppConfig } from "./config/environment";

interface TokenPrice {
  usd: number;
  lastUpdated: number;
}

interface CoinGeckoResponse {
  [coinId: string]: {
    usd: number;
  };
}

// Cache durations - Conservative settings for CoinGecko API rate limits
// API rate limit: ~10-30 calls/minute
// With batched requests, 1000 users = ~1000 calls/hour = ~16 calls/min (sustainable)
const CACHE_DURATIONS = {
  STABLECOIN: 2 * 60 * 60 * 1000,  // 2 hours (stablecoins barely move)
  MAJOR: 30 * 60 * 1000,            // 30 minutes (ETH, BTC, major tokens)
  DEFAULT: 30 * 60 * 1000,          // 30 minutes (other tokens)
};

// Stale-while-revalidate: serve stale data up to this duration while fetching fresh
// Disabled for manual-refresh-only strategy
const STALE_WHILE_REVALIDATE = 24 * 60 * 60 * 1000; // 24 hours (very permissive)

// Memory cache (fast, in-memory)
const memoryCache = new Map<string, TokenPrice>();

// Track in-flight requests to prevent duplicate API calls
const pendingRequests = new Map<string, Promise<{ [symbol: string]: number }>>();

// Stablecoins (very stable, cache longer)
const STABLECOINS = new Set(['USDC', 'USDT', 'DAI', 'USDB', 'USDbC']);

// Major tokens (less volatile, cache medium)
const MAJOR_TOKENS = new Set(['ETH', 'WETH', 'BTC', 'WBTC', 'cbBTC', 'MATIC', 'WMATIC', 'BNB']);

// Map token symbols to CoinGecko IDs
const SYMBOL_TO_COINGECKO_ID: { [symbol: string]: string } = {
  // Native tokens
  ETH: "ethereum",
  MATIC: "matic-network",
  BNB: "binancecoin",
  AVAX: "avalanche-2",
  
  // Stablecoins
  USDC: "usd-coin",
  USDT: "tether",
  DAI: "dai",
  USDB: "usdb",
  USDbC: "bridged-usd-coin-base",
  
  // Wrapped tokens
  WETH: "weth",
  WBTC: "wrapped-bitcoin",
  cbBTC: "coinbase-wrapped-btc",
  WMATIC: "wmatic",
  cbETH: "coinbase-wrapped-staked-eth",
  
  // DeFi tokens
  UNI: "uniswap",
  AAVE: "aave",
  LINK: "chainlink",
  CRV: "curve-dao-token",
  MKR: "maker",
  SNX: "havven",
  COMP: "compound-governance-token",
  
  // Other popular tokens
  ARB: "arbitrum",
  OP: "optimism",
  PEPE: "pepe",
  SHIB: "shiba-inu",
  APE: "apecoin",
};

/**
 * Get the CoinGecko API base URL
 */
function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_COINGECKO_API_URL || "https://api.coingecko.com/api/v3";
}

/**
 * Get CoinGecko platform ID for a given chain ID
 */
function getChainPlatformId(chainId: number): string | null {
  const platformMap: Record<number, string> = {
    1: "ethereum",
    10: "optimistic-ethereum", 
    56: "binance-smart-chain",
    137: "polygon-pos",
    250: "fantom",
    42161: "arbitrum-one",
    43114: "avalanche",
    8453: "base",
    5000: "mantle",
    34443: "mode",
  };
  return platformMap[chainId] || null;
}

/**
 * Fetch complete token data (metadata, image, price) by contract address
 * This replaces separate calls for metadata, images, and prices
 */
export async function fetchTokenDataByContract(
  tokenAddress: string, 
  chainId: number
): Promise<{
  symbol: string;
  name: string;
  decimals: number;
  price: number;
  imageUrl: string | null;
  success: boolean;
} | null> {
  const platformId = getChainPlatformId(chainId);
  if (!platformId) {
    console.warn(`No platform ID mapping for chain ${chainId}`);
    return null;
  }

  try {
    const url = `${getApiBaseUrl()}/coins/${platformId}/contract/${tokenAddress.toLowerCase()}`;
    console.log(`🔍 [Token Data] Unified contract lookup: ${url}`);
    
    const response = await coinGeckoLimiter.fetch(url);
    
    if (response.ok) {
      const data = await response.json();
      
      // Extract all data from single response
      const symbol = data.symbol?.toUpperCase() || 'UNKNOWN';
      const name = data.name || 'Unknown Token';
      const decimals = data.detail_platforms?.[platformId]?.decimal_place || 18;
      const price = data.market_data?.current_price?.usd || 0;
      const imageUrl = data.image?.large || data.image?.small || data.image?.thumb || null;
      
      console.log(`✅ [Token Data] Found complete data via contract: ${symbol} -> $${price}`);
      
      return {
        symbol,
        name,
        decimals,
        price,
        imageUrl,
        success: true
      };
    } else {
      console.log(`⚠️ [Token Data] Contract lookup failed with status ${response.status}`);
    }
  } catch (error) {
    console.error(`❌ [Token Data] Contract lookup error for ${tokenAddress}:`, error);
  }
  
  return null;
}

/**
 * Fetch price for a token by contract address (legacy function for backward compatibility)
 */
async function fetchPriceByContract(
  tokenAddress: string, 
  chainId: number
): Promise<number | null> {
  const tokenData = await fetchTokenDataByContract(tokenAddress, chainId);
  return tokenData?.price || null;
}

/**
 * Batch fetch complete token data for multiple tokens by contract address
 * This is the most efficient way to get all token data in one go
 */
export async function batchFetchTokenDataByContract(
  tokens: Array<{ address: string; chainId: number }>
): Promise<Map<string, {
  symbol: string;
  name: string;
  decimals: number;
  price: number;
  imageUrl: string | null;
  success: boolean;
}>> {
  const results = new Map();
  
  // Process tokens in parallel with rate limiting
  const batchSize = 3; // Conservative batch size for CoinGecko API
  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    console.log(`📦 [Batch Token Data] Processing batch ${Math.floor(i/batchSize) + 1} (tokens ${i + 1}-${Math.min(i + batchSize, tokens.length)})`);
    
    const promises = batch.map(async ({ address, chainId }) => {
      try {
        const tokenData = await fetchTokenDataByContract(address, chainId);
        if (tokenData) {
          results.set(address.toLowerCase(), tokenData);
          console.log(`✅ [Batch Token Data] ${tokenData.symbol}: SUCCESS`);
        } else {
          console.log(`❌ [Batch Token Data] ${address}: NO DATA`);
        }
      } catch (error) {
        console.error(`❌ [Batch Token Data] ${address}: ERROR`, error);
      }
    });
    
    await Promise.all(promises);
    
    // Small delay between batches to respect rate limits
    if (i + batchSize < tokens.length) {
      console.log(`⏳ [Batch Token Data] Waiting 1s before next batch...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`✅ [Batch Token Data] Complete! Loaded ${results.size} out of ${tokens.length} tokens`);
  return results;
}

/**
 * Get the CoinGecko API key (only for local development)
 */
function getApiKey(): string | undefined {
  const config = getAppConfig();
  
  // Only use API key for local development
  if (!config.pricingEnabled) {
    return undefined;
  }
  
  return process.env.NEXT_PUBLIC_COINGECKO_API_KEY || undefined;
}

/**
 * Get cache duration for a token based on its type
 */
function getCacheDuration(symbol: string): number {
  if (STABLECOINS.has(symbol)) {
    return CACHE_DURATIONS.STABLECOIN;
  }
  if (MAJOR_TOKENS.has(symbol)) {
    return CACHE_DURATIONS.MAJOR;
  }
  return CACHE_DURATIONS.DEFAULT;
}

/**
 * Load prices from localStorage
 */
function loadFromLocalStorage(symbol: string): TokenPrice | undefined {
  if (typeof window === 'undefined') return undefined;
  
  try {
    const key = `price_${symbol}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const price: TokenPrice = JSON.parse(stored);
      return price;
    }
  } catch (error) {
    console.warn(`Failed to load price from localStorage for ${symbol}:`, error);
  }
  return undefined;
}

/**
 * Save price to localStorage
 */
function saveToLocalStorage(symbol: string, price: TokenPrice): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = `price_${symbol}`;
    localStorage.setItem(key, JSON.stringify(price));
  } catch (error) {
    // localStorage might be full or disabled, fail silently
    console.warn(`Failed to save price to localStorage for ${symbol}:`, error);
  }
}

/**
 * Check if price is fresh (within cache duration)
 */
function isFresh(price: TokenPrice, symbol: string, now: number): boolean {
  const cacheDuration = getCacheDuration(symbol);
  return now - price.lastUpdated < cacheDuration;
}

/**
 * Check if price is stale but usable (stale-while-revalidate)
 */
function isStaleButUsable(price: TokenPrice, now: number): boolean {
  return now - price.lastUpdated < STALE_WHILE_REVALIDATE;
}

/**
 * Fetch prices from CoinGecko API
 */
async function fetchPricesFromCoinGecko(coinIds: string[]): Promise<CoinGeckoResponse> {
  const baseUrl = getApiBaseUrl();
  const apiKey = getApiKey();
  
  const idsParam = coinIds.join(",");
  const url = `${baseUrl}/simple/price?ids=${idsParam}&vs_currencies=usd`;
  
  const headers: HeadersInit = {
    "Accept": "application/json",
  };
  
  // Add API key if available (for Pro users)
  if (apiKey) {
    headers["x-cg-pro-api-key"] = apiKey;
  }
  
  try {
    const response = await coinGeckoLimiter.fetch(url, { headers });
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching prices from CoinGecko:", error);
    throw error;
  }
}

/**
 * Get price for a single token symbol
 * HOSTED VERSION: Returns 0 (pricing disabled)
 * LOCAL VERSION: Returns actual price
 */
export async function getTokenPrice(symbol: string): Promise<number> {
  const config = getAppConfig();
  
  // Disable pricing on hosted version
  if (!config.pricingEnabled) {
    console.log(`💰 [Pricing] Disabled on hosted version for symbol: ${symbol}`);
    return 0;
  }
  
  // Local version - use existing logic
  const prices = await getTokenPrices([symbol]);
  return prices[symbol] || 0;
}

/**
 * Enhanced token price lookup with contract address support
 * This is the main function that should be used for dynamic token pricing
 */
export async function getTokenPricesWithAddresses(
  tokens: Array<{ symbol: string; address?: string; chainId?: number }>
): Promise<{ [symbol: string]: number }> {
  const config = getAppConfig();
  
  // Disable pricing on hosted version
  if (!config.pricingEnabled) {
    console.log(`💰 [Pricing] Disabled on hosted version for tokens: ${tokens.map(t => t.symbol).join(', ')}`);
    return tokens.reduce((acc, token) => ({ ...acc, [token.symbol]: 0 }), {});
  }

  const now = Date.now();
  const result: { [symbol: string]: number } = {};
  const symbolsToFetch: string[] = [];
  const symbolsToRevalidate: string[] = [];
  const contractLookups: Array<{ symbol: string; address: string; chainId: number }> = [];
  
  // Step 1: Check memory cache and localStorage
  for (const token of tokens) {
    const { symbol, address, chainId } = token;
    
    // Check memory cache first (fastest)
    let cached = memoryCache.get(symbol);
    
    // If not in memory, check localStorage
    if (!cached) {
      cached = loadFromLocalStorage(symbol);
      if (cached) {
        // Promote to memory cache
        memoryCache.set(symbol, cached);
      }
    }
    
    if (cached) {
      if (isFresh(cached, symbol, now)) {
        // Fresh price, use it
        result[symbol] = cached.usd;
      } else if (isStaleButUsable(cached, now)) {
        // Stale but usable - return it immediately and revalidate in background
        result[symbol] = cached.usd;
        symbolsToRevalidate.push(symbol);
      } else {
        // Too old, fetch fresh
        if (address && chainId) {
          contractLookups.push({ symbol, address, chainId });
        } else {
          symbolsToFetch.push(symbol);
        }
      }
    } else {
      // No cache, must fetch
      if (address && chainId) {
        contractLookups.push({ symbol, address, chainId });
      } else {
        symbolsToFetch.push(symbol);
      }
    }
  }
  
  // Step 2: Background revalidation for stale prices (fire and forget)
  if (symbolsToRevalidate.length > 0) {
    fetchAndCachePrices(symbolsToRevalidate).catch(err => {
      console.warn('Background price revalidation failed:', err);
    });
  }
  
  // Step 3: Fetch missing/expired prices
  if (symbolsToFetch.length === 0 && contractLookups.length === 0) {
    return result; // All prices served from cache
  }
  
  // Fetch symbol-based prices
  if (symbolsToFetch.length > 0) {
    const fetchedPrices = await fetchAndCachePrices(symbolsToFetch);
    for (const symbol of symbolsToFetch) {
      result[symbol] = fetchedPrices[symbol] || 0;
    }
  }
  
  // Fetch contract-based prices
  if (contractLookups.length > 0) {
    console.log(`🔍 [Price Oracle] Fetching prices for ${contractLookups.length} tokens via contract lookup`);
    
    for (const { symbol, address, chainId } of contractLookups) {
      try {
        const price = await fetchPriceByContract(address, chainId);
        if (price !== null) {
          result[symbol] = price;
          
          // Cache the result
          const priceData: TokenPrice = {
            usd: price,
            lastUpdated: now,
          };
          memoryCache.set(symbol, priceData);
          saveToLocalStorage(symbol, priceData);
        } else {
          result[symbol] = 0;
        }
      } catch (error) {
        console.error(`Failed to fetch price for ${symbol} via contract:`, error);
        result[symbol] = 0;
      }
    }
  }
  
  return result;
}

/**
 * Get prices for multiple token symbols with advanced caching
 * HOSTED VERSION: Returns zeros for all symbols (pricing disabled)
 * LOCAL VERSION: Returns actual prices with caching
 * 
 * Strategy:
 * 1. Check memory cache first (fastest)
 * 2. Check localStorage (persistent)
 * 3. Use stale-while-revalidate: return stale price immediately, fetch fresh in background
 * 4. Deduplicate concurrent requests for same symbols
 */
export async function getTokenPrices(symbols: string[]): Promise<{ [symbol: string]: number }> {
  const config = getAppConfig();
  
  // Disable pricing on hosted version
  if (!config.pricingEnabled) {
    console.log(`💰 [Pricing] Disabled on hosted version for symbols: ${symbols.join(', ')}`);
    return symbols.reduce((acc, symbol) => ({ ...acc, [symbol]: 0 }), {});
  }
  const now = Date.now();
  const result: { [symbol: string]: number } = {};
  const symbolsToFetch: string[] = [];
  const symbolsToRevalidate: string[] = [];
  
  // Step 1: Check memory cache and localStorage
  for (const symbol of symbols) {
    // Check memory cache first (fastest)
    let cached = memoryCache.get(symbol);
    
    // If not in memory, check localStorage
    if (!cached) {
      cached = loadFromLocalStorage(symbol);
      if (cached) {
        // Promote to memory cache
        memoryCache.set(symbol, cached);
      }
    }
    
    if (cached) {
      if (isFresh(cached, symbol, now)) {
        // Fresh price, use it
        result[symbol] = cached.usd;
      } else if (isStaleButUsable(cached, now)) {
        // Stale but usable - return it immediately and revalidate in background
        result[symbol] = cached.usd;
        symbolsToRevalidate.push(symbol);
      } else {
        // Too old, fetch fresh
        symbolsToFetch.push(symbol);
      }
    } else {
      // No cache, must fetch
      symbolsToFetch.push(symbol);
    }
  }
  
  // Step 2: Background revalidation for stale prices (fire and forget)
  if (symbolsToRevalidate.length > 0) {
    fetchAndCachePrices(symbolsToRevalidate).catch(err => {
      console.warn('Background price revalidation failed:', err);
    });
  }
  
  // Step 3: Fetch missing/expired prices
  if (symbolsToFetch.length === 0) {
    return result; // All prices served from cache
  }
  
  // Check if there's already a pending request for these symbols
  const requestKey = symbolsToFetch.sort().join(',');
  let fetchPromise = pendingRequests.get(requestKey);
  
  if (!fetchPromise) {
    // No pending request, create one
    fetchPromise = fetchAndCachePrices(symbolsToFetch);
    pendingRequests.set(requestKey, fetchPromise);
    
    // Clean up after request completes
    fetchPromise.finally(() => {
      pendingRequests.delete(requestKey);
    });
  }
  
  // Wait for fetch to complete
  const fetchedPrices = await fetchPromise;
  
  // Merge fetched prices with result
  for (const symbol of symbolsToFetch) {
    result[symbol] = fetchedPrices[symbol] || 0;
  }
  
  return result;
}

/**
 * Fetch prices from API and update all caches
 */
async function fetchAndCachePrices(symbols: string[]): Promise<{ [symbol: string]: number }> {
  const now = Date.now();
  const result: { [symbol: string]: number } = {};
  
  // Map symbols to CoinGecko IDs
  const coinIds: string[] = [];
  const symbolToCoinId: { [symbol: string]: string } = {};
  const symbolsWithoutMapping: string[] = [];
  
  for (const symbol of symbols) {
    const coinId = SYMBOL_TO_COINGECKO_ID[symbol];
    if (coinId) {
      coinIds.push(coinId);
      symbolToCoinId[symbol] = coinId;
    } else {
      console.warn(`No CoinGecko ID mapping for symbol: ${symbol}`);
      symbolsWithoutMapping.push(symbol);
      result[symbol] = 0; // Default to 0, will try contract lookup later
    }
  }
  
  // Fetch from API
  if (coinIds.length > 0) {
    try {
      const prices = await fetchPricesFromCoinGecko(coinIds);
      
      // Update all caches
      for (const symbol of symbols) {
        const coinId = symbolToCoinId[symbol];
        if (coinId && prices[coinId]) {
          const price = prices[coinId].usd;
          result[symbol] = price;
          
          const priceData: TokenPrice = {
            usd: price,
            lastUpdated: now,
          };
          
          // Update memory cache
          memoryCache.set(symbol, priceData);
          
          // Update localStorage
          saveToLocalStorage(symbol, priceData);
        } else if (result[symbol] === undefined) {
          result[symbol] = 0;
        }
      }
    } catch (error) {
      console.error("Failed to fetch prices:", error);
      
      // On error, try to return last known prices from localStorage
      for (const symbol of symbols) {
        if (result[symbol] === undefined) {
          const lastKnown = loadFromLocalStorage(symbol);
          if (lastKnown) {
            console.log(`Using last known price for ${symbol} (age: ${Math.round((now - lastKnown.lastUpdated) / 60000)}m)`);
            result[symbol] = lastKnown.usd;
          } else {
            result[symbol] = 0;
          }
        }
      }
    }
  }
  
  // Try contract-based lookups for symbols without mapping
  if (symbolsWithoutMapping.length > 0) {
    console.log(`🔍 [Price Oracle] Attempting contract-based lookups for: ${symbolsWithoutMapping.join(', ')}`);
    // Note: Contract-based lookups would require token addresses and chain IDs
    // This would need to be implemented with additional context from the calling code
  }
  
  return result;
}

/**
 * Clear the price cache (useful for manual refresh)
 * Forces fresh fetch on next request
 */
export function clearPriceCache(): void {
  memoryCache.clear();
  pendingRequests.clear();
  console.log("💰 Memory cache cleared (localStorage preserved)");
}

/**
 * Get the timestamp of the oldest cached price
 * Useful for showing "Last updated X minutes ago"
 */
export function getOldestPriceTimestamp(symbols: string[]): number | null {
  let oldestTimestamp: number | null = null;
  
  for (const symbol of symbols) {
    const cached = memoryCache.get(symbol) || loadFromLocalStorage(symbol);
    if (cached) {
      if (oldestTimestamp === null || cached.lastUpdated < oldestTimestamp) {
        oldestTimestamp = cached.lastUpdated;
      }
    }
  }
  
  return oldestTimestamp;
}
