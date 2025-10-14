/**
 * Token Icon Utilities
 * Fetches real token logos from CoinGecko API
 */

import { coinGeckoLimiter } from "./coingecko-rate-limiter";

interface CoinGeckoToken {
  id: string;
  symbol: string;
  name: string;
  image?: string;
}

// Persistent cache for token images (localStorage)
const TOKEN_IMAGE_CACHE_KEY = "openburner_token_images";
const CACHE_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CachedTokenImage {
  url: string;
  timestamp: number;
}

// Check if we're in a browser environment
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

// Load cache from localStorage on initialization
function loadImageCache(): Map<string, CachedTokenImage> {
  if (!isBrowser()) {
    return new Map();
  }
  
  try {
    const stored = localStorage.getItem(TOKEN_IMAGE_CACHE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const now = Date.now();
      
      // Filter out expired entries
      const validEntries = Object.entries(parsed).filter(([_, value]: [string, any]) => {
        return now - value.timestamp < CACHE_EXPIRATION_MS;
      });
      
      console.log(`✅ [Token Icon Cache] Loaded ${validEntries.length} cached images from localStorage`);
      return new Map(validEntries as [string, CachedTokenImage][]);
    }
  } catch (err) {
    console.error("❌ [Token Icon Cache] Failed to load cache:", err);
  }
  return new Map();
}

// Save cache to localStorage
function saveImageCache(cache: Map<string, CachedTokenImage>): void {
  if (!isBrowser()) {
    return;
  }
  
  try {
    const obj = Object.fromEntries(cache);
    localStorage.setItem(TOKEN_IMAGE_CACHE_KEY, JSON.stringify(obj));
  } catch (err) {
    console.error("❌ [Token Icon Cache] Failed to save cache:", err);
  }
}

// Initialize cache lazily (not at module load to avoid SSR issues)
let tokenImageCache: Map<string, CachedTokenImage> | null = null;

function getCache(): Map<string, CachedTokenImage> {
  if (!tokenImageCache) {
    tokenImageCache = loadImageCache();
  }
  return tokenImageCache;
}

// Helper function to cache an image and persist to localStorage
function cacheTokenImage(cacheKey: string, url: string): void {
  const cache = getCache();
  cache.set(cacheKey, { url, timestamp: Date.now() });
  saveImageCache(cache);
  console.log(`💾 [Token Icon Cache] Saved ${cacheKey} to cache`);
}

// Map of common token symbols to their CoinGecko IDs
// This is critical for avoiding rate limits - tokens in this map won't need contract lookups
const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  // Native tokens
  ETH: "ethereum",
  WETH: "weth",
  BTC: "bitcoin",
  WBTC: "wrapped-bitcoin",
  MATIC: "matic-network",
  WMATIC: "wmatic",
  BNB: "binancecoin",
  AVAX: "avalanche-2",
  MNT: "mantle",
  FTM: "fantom",
  CELO: "celo",
  ONE: "harmony",
  KLAY: "klay-token",
  
  // Stablecoins (most common across all chains)
  USDC: "usd-coin",
  "USDC.e": "bridged-usd-coin",
  USDbC: "bridged-usd-coin-base",
  USDT: "tether",
  DAI: "dai",
  BUSD: "binance-usd",
  FRAX: "frax",
  LUSD: "liquity-usd",
  USDB: "usdb",
  TUSD: "true-usd",
  GUSD: "gemini-dollar",
  USDP: "paxos-standard",
  
  // DeFi tokens
  UNI: "uniswap",
  AAVE: "aave",
  COMP: "compound-governance-token",
  MKR: "maker",
  SNX: "havven",
  CRV: "curve-dao-token",
  BAL: "balancer",
  SUSHI: "sushi",
  YFI: "yearn-finance",
  "1INCH": "1inch",
  GRT: "the-graph",
  
  // Wrapped BTC variants
  CBBTC: "coinbase-wrapped-btc",
  cbBTC: "coinbase-wrapped-btc",
  TBTC: "tbtc",
  RENBTC: "renbtc",
  
  // Wrapped ETH variants
  STETH: "staked-ether",
  WSTETH: "wrapped-steth",
  RETH: "rocket-pool-eth",
  CBETH: "coinbase-wrapped-staked-eth",
  
  // Layer 2 and scaling tokens
  LINK: "chainlink",
  ARB: "arbitrum",
  OP: "optimism",
  METIS: "metis-token",
  BOBA: "boba-network",
  
  // Meme tokens
  PEPE: "pepe",
  SHIB: "shiba-inu",
  DOGE: "dogecoin",
  FLOKI: "floki",
  
  // Other popular tokens
  APE: "apecoin",
  LDO: "lido-dao",
  RPL: "rocket-pool",
  BLUR: "blur",
  IMX: "immutable-x",
  SAND: "the-sandbox",
  MANA: "decentraland",
  AXS: "axie-infinity",
  ENJ: "enjincoin",
  GALA: "gala",
};

/**
 * Get chain platform ID for CoinGecko API
 */
function getChainPlatformId(chainId: number): string | null {
  const platformMap: Record<number, string> = {
    1: "ethereum",
    8453: "base",
    56: "binance-smart-chain",
    42161: "arbitrum-one",
    43114: "avalanche",
    10: "optimistic-ethereum",
    137: "polygon-pos",
    81457: "blast",
    534352: "scroll",
    59144: "linea",
    324: "zksync",
    5000: "mantle",
    34443: "mode",
  };
  return platformMap[chainId] || null;
}

/**
 * Get token image URL from CoinGecko
 */
export async function getTokenImage(
  symbol: string, 
  tokenAddress?: string, 
  chainId?: number
): Promise<string | null> {
  const upperSymbol = symbol.toUpperCase();
  const cache = getCache();
  
  console.log(`🔍 [Token Icon] Fetching image for ${symbol} (address: ${tokenAddress || 'native'}, chain: ${chainId || 'unknown'})`);
  
  // Generate cache keys - try multiple strategies for cache lookup
  // Strategy 1: Symbol only (most tokens have same icon across chains)
  const symbolOnlyKey = upperSymbol;
  // Strategy 2: Symbol + chain (for chain-specific token variants)
  const symbolChainKey = `${upperSymbol}_${chainId || 0}`;
  // Strategy 3: Full key with address (most specific)
  const fullKey = `${upperSymbol}_${tokenAddress || "native"}_${chainId || 0}`;
  
  // Check all cache key strategies
  for (const key of [symbolOnlyKey, symbolChainKey, fullKey]) {
    const cached = cache.get(key);
    if (cached && cached.url) {
      const age = Date.now() - cached.timestamp;
      const ageMinutes = Math.floor(age / 60000);
      console.log(`✅ [Token Icon] Cache HIT for ${symbol} (key: ${key}, age: ${ageMinutes}m): ${cached.url}`);
      return cached.url;
    }
  }
  
  console.log(`❌ [Token Icon] Cache MISS for ${symbol}, fetching from CoinGecko...`);

  // Determine which cache key to use when saving
  // Use symbol-only for tokens with known symbol mappings (cross-chain compatible)
  const hasMappingId = !!SYMBOL_TO_COINGECKO_ID[upperSymbol];
  const saveCacheKey = hasMappingId ? symbolOnlyKey : fullKey;

  try {
    // Strategy 1: Try symbol mapping first (most efficient for common tokens)
    const coinGeckoId = SYMBOL_TO_COINGECKO_ID[upperSymbol];
    
    if (coinGeckoId) {
      console.log(`📋 [Token Icon] Strategy 1 - Symbol mapping lookup for ${symbol}: ${coinGeckoId}`);
      
      try {
        const url = `https://api.coingecko.com/api/v3/coins/${coinGeckoId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`;
        console.log(`🌐 [Token Icon] Fetching: ${url}`);
        
        const response = await coinGeckoLimiter.fetch(url);
        console.log(`📡 [Token Icon] Symbol mapping response status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          const imageUrl = data.image?.large || data.image?.small || data.image?.thumb;
          
          if (imageUrl) {
            console.log(`✅ [Token Icon] Found token image via symbol mapping: ${symbol} -> ${imageUrl}`);
            cacheTokenImage(saveCacheKey, imageUrl);
            return imageUrl;
          } else {
            console.log(`⚠️ [Token Icon] Symbol mapping found but no image in response for ${symbol}`);
          }
        } else {
          console.log(`⚠️ [Token Icon] Symbol mapping lookup failed with status ${response.status}`);
        }
      } catch (err) {
        console.error(`❌ [Token Icon] Symbol mapping error for ${symbol}:`, err);
      }
    } else {
      console.log(`📋 [Token Icon] No symbol mapping for ${symbol}, will try contract lookup`);
    }
    
    // Strategy 2: Try contract address lookup (for tokens without symbol mapping)
    if (tokenAddress && tokenAddress !== "native" && chainId) {
      const platformId = getChainPlatformId(chainId);
      console.log(`📍 [Token Icon] Platform ID for chain ${chainId}: ${platformId}`);
      
      if (platformId) {
        try {
          const url = `https://api.coingecko.com/api/v3/coins/${platformId}/contract/${tokenAddress.toLowerCase()}`;
          console.log(`🌐 [Token Icon] Strategy 2 - Contract lookup: ${url}`);
          
          const contractResponse = await coinGeckoLimiter.fetch(url);
          console.log(`📡 [Token Icon] Contract response status: ${contractResponse.status}`);
          
          if (contractResponse.ok) {
            const contractData = await contractResponse.json();
            const imageUrl = contractData.image?.large || contractData.image?.small || contractData.image?.thumb;
            
            if (imageUrl) {
              console.log(`✅ [Token Icon] Found token image via contract address: ${symbol} -> ${imageUrl}`);
              cacheTokenImage(saveCacheKey, imageUrl);
              return imageUrl;
            } else {
              console.log(`⚠️ [Token Icon] Contract found but no image in response for ${symbol}`);
            }
          } else {
            console.log(`⚠️ [Token Icon] Contract lookup failed with status ${contractResponse.status}`);
          }
        } catch (err) {
          console.error(`❌ [Token Icon] Contract lookup error for ${symbol}:`, err);
        }
      } else {
        console.log(`⚠️ [Token Icon] No platform ID mapping for chain ${chainId}`);
      }
    } else {
      console.log(`⚠️ [Token Icon] Skipping contract lookup - address: ${tokenAddress || 'none'}, chainId: ${chainId || 'none'}`);
    }
    
    // Strategy 3: Try to search by symbol (fallback)
    const searchUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`;
    console.log(`🔍 [Token Icon] Strategy 3 - Search by symbol: ${searchUrl}`);
    
    const searchResponse = await coinGeckoLimiter.fetch(searchUrl);
    console.log(`📡 [Token Icon] Search response status: ${searchResponse.status}`);
    
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      const coins = searchData.coins || [];
      console.log(`🔍 [Token Icon] Search found ${coins.length} results for ${symbol}`);
      
      // Try to find exact symbol match
      const exactMatch = coins.find(
        (coin: CoinGeckoToken) => coin.symbol?.toLowerCase() === symbol.toLowerCase()
      );
      
      if (exactMatch && exactMatch.image) {
        console.log(`✅ [Token Icon] Found token image via search (exact match): ${symbol} -> ${exactMatch.image}`);
        cacheTokenImage(saveCacheKey, exactMatch.image);
        return exactMatch.image;
      } else if (exactMatch) {
        console.log(`⚠️ [Token Icon] Exact match found but no image for ${symbol}`);
      }
      
      // Fallback to first result if available
      if (coins.length > 0 && coins[0].image) {
        console.log(`✅ [Token Icon] Found token image via search (first result): ${symbol} -> ${coins[0].image}`);
        cacheTokenImage(saveCacheKey, coins[0].image);
        return coins[0].image;
      } else if (coins.length > 0) {
        console.log(`⚠️ [Token Icon] First result found but no image for ${symbol}`);
      }
    } else {
      console.log(`⚠️ [Token Icon] Search failed with status ${searchResponse.status}`);
    }
  } catch (error) {
    console.error(`❌ [Token Icon] Error fetching token image for ${symbol}:`, error);
  }
  
  console.log(`❌ [Token Icon] No image found for token: ${symbol} after all strategies`);
  return null;
}

/**
 * Batch fetch token images for multiple tokens
 */
export async function batchGetTokenImages(
  tokens: Array<{ symbol: string; address?: string; chainId?: number }>
): Promise<Map<string, string>> {
  console.log(`🎯 [Batch Fetch] Starting batch fetch for ${tokens.length} tokens`);
  const results = new Map<string, string>();
  
  // Fetch images in parallel with rate limiting
  const batchSize = 5; // Limit concurrent requests
  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    console.log(`📦 [Batch Fetch] Processing batch ${Math.floor(i/batchSize) + 1} (tokens ${i + 1}-${Math.min(i + batchSize, tokens.length)})`);
    
    const promises = batch.map(token => 
      getTokenImage(token.symbol, token.address, token.chainId)
        .then(imageUrl => {
          console.log(`✅ [Batch Fetch] ${token.symbol}: ${imageUrl ? 'SUCCESS' : 'NO IMAGE'}`);
          return { symbol: token.symbol, imageUrl };
        })
        .catch((err) => {
          console.error(`❌ [Batch Fetch] ${token.symbol}: ERROR`, err);
          return { symbol: token.symbol, imageUrl: null };
        })
    );
    
    const batchResults = await Promise.all(promises);
    batchResults.forEach(result => {
      if (result.imageUrl) {
        results.set(result.symbol.toUpperCase(), result.imageUrl);
      }
    });
    
    // Small delay between batches to respect rate limits
    if (i + batchSize < tokens.length) {
      console.log(`⏳ [Batch Fetch] Waiting 500ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`✅ [Batch Fetch] Complete! Loaded ${results.size} out of ${tokens.length} token images`);
  return results;
}

/**
 * Clear the token image cache (both memory and localStorage)
 * Note: This should rarely be needed since we cache successfully loaded images
 */
export function clearTokenImageCache() {
  const cache = getCache();
  cache.clear();
  
  if (isBrowser()) {
    try {
      localStorage.removeItem(TOKEN_IMAGE_CACHE_KEY);
      console.log("🗑️ [Token Icon Cache] Cleared from memory and localStorage");
    } catch (err) {
      console.error("❌ [Token Icon Cache] Failed to clear from localStorage:", err);
    }
  }
}

/**
 * Pre-populate cache with known token images
 * Uses symbol-only keys for cross-chain compatibility
 * This helps avoid unnecessary CoinGecko API calls for the most common tokens
 */
export function preloadCommonTokenImages() {
  if (!isBrowser()) {
    return;
  }
  
  // Direct CDN links for instant loading of common tokens (no API calls needed)
  const commonImages: Record<string, string> = {
    // Major tokens
    ETH: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png?1696501628",
    WETH: "https://coin-images.coingecko.com/coins/images/2518/large/weth.png?1696503332",
    BTC: "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png?1696501400",
    WBTC: "https://coin-images.coingecko.com/coins/images/7598/large/wrapped_bitcoin_wbtc.png?1696507857",
    MATIC: "https://coin-images.coingecko.com/coins/images/4713/large/polygon.png?1698233745",
    
    // Stablecoins
    USDC: "https://coin-images.coingecko.com/coins/images/6319/large/usdc.png?1696506694",
    USDT: "https://coin-images.coingecko.com/coins/images/325/large/Tether.png?1696501661",
    DAI: "https://coin-images.coingecko.com/coins/images/9956/large/Badge_Dai.png?1696509996",
    
    // Base-specific wrapped tokens
    cbBTC: "https://coin-images.coingecko.com/coins/images/40665/large/cbbtc.png?1725611138",
    cbETH: "https://coin-images.coingecko.com/coins/images/27008/large/cbeth.png?1709186989",
  };
  
  let preloaded = 0;
  Object.entries(commonImages).forEach(([symbol, url]) => {
    const cache = getCache();
    // Only preload if not already in cache
    if (!cache.has(symbol)) {
      cacheTokenImage(symbol, url);
      preloaded++;
    }
  });
  
  if (preloaded > 0) {
    console.log(`✅ [Token Icon Cache] Preloaded ${preloaded} common token images`);
  }
}

