/**
 * Token Icon Utilities
 * Fetches real token logos from CoinGecko API
 */

import { coinGeckoLimiter } from "./coingecko-rate-limiter";
import { getChainConfig } from "./supported-chains";

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
      
      // Older builds cached the "large" CoinGecko variant; use "small" instead.
      return new Map(
        (validEntries as [string, CachedTokenImage][]).map(([k, v]) => [
          k,
          { ...v, url: v.url.includes("coin-images.coingecko.com") ? v.url.replace("/large/", "/small/") : v.url },
        ])
      );
    }
  } catch {
    /* storage unavailable */
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
  } catch {
    /* storage unavailable */
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
  url = url.includes("coin-images.coingecko.com") ? url.replace("/large/", "/small/") : url;
  const cache = getCache();
  cache.set(cacheKey, { url, timestamp: Date.now() });
  saveImageCache(cache);
}

// Map of common token symbols to their CoinGecko IDs
// This is critical for avoiding rate limits - tokens in this map won't need contract lookups
const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  // Native tokens
  ETH: "ethereum",
  WETH: "weth",
  BTC: "bitcoin",
  WBTC: "wrapped-bitcoin",
  POL: "polygon-ecosystem-token",
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
  return getChainConfig(chainId)?.coingeckoPlatform ?? null;
}

function proxyUrl(endpoint: string, params = ""): string {
  if (typeof window !== "undefined") {
    return `/api/coingecko?endpoint=${endpoint}${params ? `&${params}` : ""}`;
  }
  return `https://api.coingecko.com/api/v3/${endpoint}${params ? `?${params}` : ""}`;
}

async function fetchJson(url: string): Promise<any | null> {
  try {
    const res = await coinGeckoLimiter.fetch(url);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/** Prefer the 64px "small" variant over "large" (~10x the bytes) for list icons. */
function smallVariant(url: string): string {
  return url.replace("/large/", "/small/");
}

/**
 * Get token image URL from CoinGecko (cached in localStorage for 30 days).
 * Order: known symbol -> contract address -> symbol search.
 */
export async function getTokenImage(
  symbol: string,
  tokenAddress?: string,
  chainId?: number
): Promise<string | null> {
  const upperSymbol = symbol.toUpperCase();
  const cache = getCache();

  const symbolOnlyKey = upperSymbol;
  const symbolChainKey = `${upperSymbol}_${chainId || 0}`;
  const fullKey = `${upperSymbol}_${tokenAddress || "native"}_${chainId || 0}`;
  for (const key of [symbolOnlyKey, symbolChainKey, fullKey]) {
    const cached = cache.get(key);
    if (cached?.url) return cached.url;
  }

  const coinGeckoId = SYMBOL_TO_COINGECKO_ID[upperSymbol];
  const saveCacheKey = coinGeckoId ? symbolOnlyKey : fullKey;
  const save = (url: string) => {
    cacheTokenImage(saveCacheKey, url);
    return url;
  };

  // 1. Known symbol -> coin id
  if (coinGeckoId) {
    const data = await fetchJson(
      proxyUrl(
        `coins/${coinGeckoId}`,
        "localization=false&tickers=false&market_data=false&community_data=false&developer_data=false"
      )
    );
    const url = data?.image?.small || data?.image?.thumb || data?.image?.large;
    if (url) return save(url);
  }

  // 2. Contract address on this chain
  if (tokenAddress && tokenAddress !== "native" && chainId) {
    const platformId = getChainPlatformId(chainId);
    if (platformId) {
      const data = await fetchJson(proxyUrl(`coins/${platformId}/contract/${tokenAddress.toLowerCase()}`));
      const url = data?.image?.small || data?.image?.thumb || data?.image?.large;
      if (url) return save(url);
    }
  }

  // 3. Symbol search (results carry `large`/`thumb`, not `image`)
  const search = await fetchJson(proxyUrl("search", `query=${encodeURIComponent(symbol)}`));
  const coins: Array<CoinGeckoToken & { large?: string; thumb?: string }> = search?.coins || [];
  const match = coins.find((c) => c.symbol?.toLowerCase() === symbol.toLowerCase()) || coins[0];
  const url = match?.large ? smallVariant(match.large) : match?.thumb;
  if (url) return save(url);

  return null;
}

/**
 * Batch fetch token images for multiple tokens (keyed by upper-case symbol).
 */
export async function batchGetTokenImages(
  tokens: Array<{ symbol: string; address?: string; chainId?: number }>
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const settled = await Promise.all(
    tokens.map((t) =>
      getTokenImage(t.symbol, t.address, t.chainId)
        .then((imageUrl) => ({ symbol: t.symbol, imageUrl }))
        .catch(() => ({ symbol: t.symbol, imageUrl: null }))
    )
  );
  for (const r of settled) {
    if (r.imageUrl) results.set(r.symbol.toUpperCase(), r.imageUrl);
  }
  return results;
}

/** Synchronous cache lookup (no network) — lets the list paint known icons instantly. */
export function getCachedTokenImage(symbol: string, tokenAddress?: string, chainId?: number): string | null {
  const upperSymbol = symbol.toUpperCase();
  const cache = getCache();
  for (const key of [upperSymbol, `${upperSymbol}_${chainId || 0}`, `${upperSymbol}_${tokenAddress || "native"}_${chainId || 0}`]) {
    const cached = cache.get(key);
    if (cached?.url) return cached.url;
  }
  return null;
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
    } catch {
      /* ignore */
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
    ETH: "https://coin-images.coingecko.com/coins/images/279/small/ethereum.png?1696501628",
    WETH: "https://coin-images.coingecko.com/coins/images/2518/small/weth.png?1696503332",
    BTC: "https://coin-images.coingecko.com/coins/images/1/small/bitcoin.png?1696501400",
    WBTC: "https://coin-images.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png?1696507857",
    MATIC: "https://coin-images.coingecko.com/coins/images/4713/small/polygon.png?1698233745",
    
    // Stablecoins
    USDC: "https://coin-images.coingecko.com/coins/images/6319/small/usdc.png?1696506694",
    USDT: "https://coin-images.coingecko.com/coins/images/325/small/Tether.png?1696501661",
    DAI: "https://coin-images.coingecko.com/coins/images/9956/small/Badge_Dai.png?1696509996",
    
    // Base-specific wrapped tokens
    CBBTC: "https://coin-images.coingecko.com/coins/images/40665/small/cbbtc.png?1725611138",
    CBETH: "https://coin-images.coingecko.com/coins/images/27008/small/cbeth.png?1709186989",
  };
  
  const cache = getCache();
  let changed = false;
  Object.entries(commonImages).forEach(([symbol, url]) => {
    if (!cache.has(symbol)) {
      cache.set(symbol, { url, timestamp: Date.now() });
      changed = true;
    }
  });
  if (changed) saveImageCache(cache);
}
