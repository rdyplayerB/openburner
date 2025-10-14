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

// Load cache from localStorage on initialization
function loadImageCache(): Map<string, CachedTokenImage> {
  try {
    const stored = localStorage.getItem(TOKEN_IMAGE_CACHE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const now = Date.now();
      
      // Filter out expired entries
      const validEntries = Object.entries(parsed).filter(([_, value]: [string, any]) => {
        return now - value.timestamp < CACHE_EXPIRATION_MS;
      });
      
      return new Map(validEntries as [string, CachedTokenImage][]);
    }
  } catch (err) {
    console.error("Failed to load token image cache:", err);
  }
  return new Map();
}

// Save cache to localStorage
function saveImageCache(cache: Map<string, CachedTokenImage>): void {
  try {
    const obj = Object.fromEntries(cache);
    localStorage.setItem(TOKEN_IMAGE_CACHE_KEY, JSON.stringify(obj));
  } catch (err) {
    console.error("Failed to save token image cache:", err);
  }
}

// Initialize cache from localStorage
const tokenImageCache = loadImageCache();

// Helper function to cache an image and persist to localStorage
function cacheTokenImage(cacheKey: string, url: string): void {
  tokenImageCache.set(cacheKey, { url, timestamp: Date.now() });
  saveImageCache(tokenImageCache);
}

// Map of common token symbols to their CoinGecko IDs
const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  // Native tokens
  ETH: "ethereum",
  WETH: "weth",
  BTC: "bitcoin",
  WBTC: "wrapped-bitcoin",
  MATIC: "matic-network",
  BNB: "binancecoin",
  AVAX: "avalanche-2",
  MNT: "mantle",
  
  // Stablecoins
  USDC: "usd-coin",
  USDT: "tether",
  DAI: "dai",
  BUSD: "binance-usd",
  FRAX: "frax",
  LUSD: "liquity-usd",
  
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
  
  // Wrapped BTC variants
  CBBTC: "coinbase-wrapped-btc",
  TBTC: "tbtc",
  RENBTC: "renbtc",
  
  // Wrapped ETH variants
  STETH: "staked-ether",
  WSTETH: "wrapped-steth",
  RETH: "rocket-pool-eth",
  CBETH: "coinbase-wrapped-staked-eth",
  
  // Stablecoin variants
  USDB: "usdb",
  USDBC: "bridged-usd-coin-base",
  
  // Other popular tokens
  LINK: "chainlink",
  ARB: "arbitrum",
  OP: "optimism",
  PEPE: "pepe",
  SHIB: "shiba-inu",
  APE: "apecoin",
  LDO: "lido-dao",
  RPL: "rocket-pool",
  BLUR: "blur",
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
  
  // Check cache first
  const cacheKey = `${upperSymbol}_${tokenAddress || "native"}_${chainId || 0}`;
  console.log(`🔍 [Token Icon] Fetching image for ${symbol} (address: ${tokenAddress}, chain: ${chainId})`);
  
  if (tokenImageCache.has(cacheKey)) {
    const cached = tokenImageCache.get(cacheKey);
    if (cached) {
      console.log(`💾 [Token Icon] Cache HIT for ${symbol}: ${cached.url}`);
      return cached.url;
    }
  }
  
  console.log(`❌ [Token Icon] Cache MISS for ${symbol}, fetching from CoinGecko...`);

  try {
    // Strategy 1: Try contract address lookup (most accurate for custom tokens)
    if (tokenAddress && tokenAddress !== "native" && chainId) {
      const platformId = getChainPlatformId(chainId);
      console.log(`📍 [Token Icon] Platform ID for chain ${chainId}: ${platformId}`);
      
      if (platformId) {
        try {
          const url = `https://api.coingecko.com/api/v3/coins/${platformId}/contract/${tokenAddress.toLowerCase()}`;
          console.log(`🌐 [Token Icon] Strategy 1 - Contract lookup: ${url}`);
          
          const contractResponse = await coinGeckoLimiter.fetch(url);
          console.log(`📡 [Token Icon] Contract response status: ${contractResponse.status}`);
          
          if (contractResponse.ok) {
            const contractData = await contractResponse.json();
            const imageUrl = contractData.image?.large || contractData.image?.small || contractData.image?.thumb;
            
            if (imageUrl) {
              console.log(`✅ [Token Icon] Found token image via contract address: ${symbol} -> ${imageUrl}`);
              cacheTokenImage(cacheKey, imageUrl);
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
      console.log(`⚠️ [Token Icon] Skipping contract lookup - address: ${tokenAddress}, chainId: ${chainId}`);
    }
    
    // Strategy 2: Try to get CoinGecko ID from symbol mapping
    const coinGeckoId = SYMBOL_TO_COINGECKO_ID[upperSymbol];
    console.log(`📋 [Token Icon] Strategy 2 - Symbol mapping lookup for ${symbol}: ${coinGeckoId || 'NOT FOUND'}`);
    
    if (coinGeckoId) {
      const url = `https://api.coingecko.com/api/v3/coins/${coinGeckoId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`;
      console.log(`🌐 [Token Icon] Fetching: ${url}`);
      
      const response = await coinGeckoLimiter.fetch(url);
      console.log(`📡 [Token Icon] Symbol mapping response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        const imageUrl = data.image?.large || data.image?.small || data.image?.thumb;
        
        if (imageUrl) {
          console.log(`✅ [Token Icon] Found token image via symbol mapping: ${symbol} -> ${imageUrl}`);
          cacheTokenImage(cacheKey, imageUrl);
          return imageUrl;
        } else {
          console.log(`⚠️ [Token Icon] Symbol mapping found but no image in response for ${symbol}`);
        }
      } else {
        console.log(`⚠️ [Token Icon] Symbol mapping lookup failed with status ${response.status}`);
      }
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
        cacheTokenImage(cacheKey, exactMatch.image);
        return exactMatch.image;
      } else if (exactMatch) {
        console.log(`⚠️ [Token Icon] Exact match found but no image for ${symbol}`);
      }
      
      // Fallback to first result if available
      if (coins.length > 0 && coins[0].image) {
        console.log(`✅ [Token Icon] Found token image via search (first result): ${symbol} -> ${coins[0].image}`);
        cacheTokenImage(cacheKey, coins[0].image);
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
  tokenImageCache.clear();
  try {
    localStorage.removeItem(TOKEN_IMAGE_CACHE_KEY);
    console.log("🗑️ [Token Icon] Cache cleared from memory and localStorage");
  } catch (err) {
    console.error("Failed to clear token image cache from localStorage:", err);
  }
}

/**
 * Pre-populate cache with known token images
 */
export function preloadCommonTokenImages() {
  // You can add direct CDN links here for instant loading of common tokens
  const commonImages: Record<string, string> = {
    ETH: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
    USDC: "https://assets.coingecko.com/coins/images/6319/large/usdc.png",
    USDT: "https://assets.coingecko.com/coins/images/325/large/Tether.png",
    DAI: "https://assets.coingecko.com/coins/images/9956/large/Badge_Dai.png",
    WETH: "https://assets.coingecko.com/coins/images/2518/large/weth.png",
  };
  
  Object.entries(commonImages).forEach(([symbol, url]) => {
    cacheTokenImage(`${symbol}_native`, url);
  });
}

