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

// Cache durations - Conservative settings for CoinGecko free tier
// Free tier limit: ~10-30 calls/minute
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
  
  for (const symbol of symbols) {
    const coinId = SYMBOL_TO_COINGECKO_ID[symbol];
    if (coinId) {
      coinIds.push(coinId);
      symbolToCoinId[symbol] = coinId;
    } else {
      console.warn(`No CoinGecko ID mapping for symbol: ${symbol}`);
      result[symbol] = 0;
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
