/**
 * Token prices via CoinGecko (through the /api/coingecko proxy in the browser).
 *
 * One request per kind, never one per token:
 *   - native coins + well-known symbols  -> one `simple/price?ids=a,b,c`
 *   - everything else, per chain         -> one `simple/token_price/{platform}?contract_addresses=a,b,c`
 *
 * Prices are cached in memory + localStorage and served stale-while-revalidate.
 * Pricing is a no-op (returns zeros) when getAppConfig().pricingEnabled is false.
 */

import { coinGeckoLimiter } from "./coingecko-rate-limiter";
import { getAppConfig } from "./config/environment";
import { getUserKey } from "./user-keys";
import { getChainConfig } from "./supported-chains";
import { log } from "./log";

/** Header carrying the user's CoinGecko key (this browser) to the proxy, if set. */
function cgKeyHeader(): Record<string, string> {
  const k = getUserKey("coingecko");
  return k ? { "x-coingecko-key": k } : {};
}

interface TokenPrice {
  usd: number;
  lastUpdated: number;
}

const FRESH_MS = {
  STABLECOIN: 2 * 60 * 60 * 1000,
  DEFAULT: 30 * 60 * 1000,
};
// Serve stale prices up to this age while a fresh fetch runs in the background.
const STALE_MS = 24 * 60 * 60 * 1000;

const STABLECOINS = new Set(["USDC", "USDT", "DAI", "USDB", "USDBC", "USDC.E"]);

// Well-known symbols that map unambiguously to one CoinGecko coin id.
const SYMBOL_TO_COINGECKO_ID: { [symbol: string]: string } = {
  ETH: "ethereum",
  POL: "polygon-ecosystem-token",
  MATIC: "matic-network",
  BNB: "binancecoin",
  AVAX: "avalanche-2",
  MNT: "mantle",
  USDC: "usd-coin",
  USDT: "tether",
  DAI: "dai",
  USDB: "usdb",
  USDBC: "bridged-usd-coin-base",
  WETH: "weth",
  WBTC: "wrapped-bitcoin",
  CBBTC: "coinbase-wrapped-btc",
  WMATIC: "wmatic",
  CBETH: "coinbase-wrapped-staked-eth",
  UNI: "uniswap",
  AAVE: "aave",
  LINK: "chainlink",
  CRV: "curve-dao-token",
  MKR: "maker",
  SNX: "havven",
  COMP: "compound-governance-token",
  ARB: "arbitrum",
  OP: "optimism",
  PEPE: "pepe",
  SHIB: "shiba-inu",
  APE: "apecoin",
};

const memoryCache = new Map<string, TokenPrice>();
const LS_PREFIX = "price_";

function apiUrl(endpoint: string, params: Record<string, string> = {}): string {
  const qs = new URLSearchParams(params).toString();
  if (typeof window !== "undefined") {
    return `/api/coingecko?endpoint=${endpoint}${qs ? `&${qs}` : ""}`;
  }
  const base = process.env.NEXT_PUBLIC_COINGECKO_API_URL || "https://api.coingecko.com/api/v3";
  return `${base}/${endpoint}${qs ? `?${qs}` : ""}`;
}

function readCache(key: string): TokenPrice | undefined {
  let cached = memoryCache.get(key);
  if (!cached && typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LS_PREFIX + key);
      if (raw) {
        cached = JSON.parse(raw) as TokenPrice;
        memoryCache.set(key, cached);
      }
    } catch {
      /* ignore */
    }
  }
  return cached;
}

function writeCache(key: string, usd: number) {
  const entry = { usd, lastUpdated: Date.now() };
  memoryCache.set(key, entry);
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(entry));
  } catch {
    /* storage full / disabled */
  }
}

function freshFor(symbol: string): number {
  return STABLECOINS.has(symbol.toUpperCase()) ? FRESH_MS.STABLECOIN : FRESH_MS.DEFAULT;
}

/** A priced asset: either a CoinGecko coin id or a contract on a platform. */
type PriceSource =
  | { kind: "id"; id: string; cacheKey: string }
  | { kind: "contract"; platform: string; address: string; cacheKey: string };

function sourceFor(token: { symbol: string; address?: string; chainId?: number }): PriceSource | null {
  const symbol = token.symbol.toUpperCase();
  if (token.address === "native" && token.chainId) {
    const id = getChainConfig(token.chainId)?.nativeCoingeckoId ?? SYMBOL_TO_COINGECKO_ID[symbol];
    return id ? { kind: "id", id, cacheKey: `id:${id}` } : null;
  }
  const mapped = SYMBOL_TO_COINGECKO_ID[symbol];
  if (mapped) return { kind: "id", id: mapped, cacheKey: `id:${mapped}` };
  if (token.address && token.chainId) {
    const platform = getChainConfig(token.chainId)?.coingeckoPlatform;
    if (platform) {
      const address = token.address.toLowerCase();
      return { kind: "contract", platform, address, cacheKey: `${platform}:${address}` };
    }
  }
  return null;
}

async function getJson(url: string): Promise<any> {
  const res = await coinGeckoLimiter.fetch(url, {
    headers: { Accept: "application/json", ...cgKeyHeader() },
  });
  if (!res.ok) {
    throw new Error(res.status === 429 ? "Rate limit exceeded. Please try again later." : `CoinGecko error ${res.status}`);
  }
  return res.json();
}

/** Fetch every source in as few requests as possible and populate the cache. */
async function fetchSources(sources: PriceSource[]): Promise<void> {
  const ids = Array.from(new Set(sources.filter((s) => s.kind === "id").map((s) => (s as any).id as string)));
  const byPlatform = new Map<string, Set<string>>();
  for (const s of sources) {
    if (s.kind !== "contract") continue;
    if (!byPlatform.has(s.platform)) byPlatform.set(s.platform, new Set());
    byPlatform.get(s.platform)!.add(s.address);
  }

  const jobs: Promise<void>[] = [];
  if (ids.length > 0) {
    jobs.push(
      getJson(apiUrl("simple/price", { ids: ids.sort().join(","), vs_currencies: "usd" })).then((data) => {
        for (const id of ids) {
          const usd = data?.[id]?.usd;
          if (typeof usd === "number") writeCache(`id:${id}`, usd);
        }
      })
    );
  }
  byPlatform.forEach((addresses, platform) => {
    const list = Array.from(addresses).sort();
    jobs.push(
      getJson(
        apiUrl(`simple/token_price/${platform}`, { contract_addresses: list.join(","), vs_currencies: "usd" })
      ).then((data) => {
        for (const address of list) {
          const usd = data?.[address]?.usd;
          // Remember "unpriced" as 0 so we don't re-ask on every load.
          writeCache(`${platform}:${address}`, typeof usd === "number" ? usd : 0);
        }
      })
    );
  });

  const results = await Promise.allSettled(jobs);
  results.forEach((r) => {
    if (r.status === "rejected") log.warn("[price] fetch failed:", r.reason?.message || r.reason);
  });
}

/**
 * Prices (USD) keyed by token symbol. Native tokens use the chain's native coin;
 * other tokens are looked up by symbol (well-known) or by contract address.
 * Pass `force` to bypass freshness (manual refresh).
 */
export async function getTokenPricesWithAddresses(
  tokens: Array<{ symbol: string; address?: string; chainId?: number }>,
  opts: { force?: boolean } = {}
): Promise<{ [symbol: string]: number }> {
  const result: { [symbol: string]: number } = {};
  if (!getAppConfig().pricingEnabled) {
    for (const t of tokens) result[t.symbol] = 0;
    return result;
  }

  const now = Date.now();
  const toFetch: PriceSource[] = [];
  const toRevalidate: PriceSource[] = [];
  const sourceBySymbol = new Map<string, PriceSource>();

  for (const token of tokens) {
    const source = sourceFor(token);
    if (!source) continue;
    sourceBySymbol.set(token.symbol, source);
    const cached = readCache(source.cacheKey);
    const age = cached ? now - cached.lastUpdated : Infinity;
    if (!opts.force && cached && age < freshFor(token.symbol)) continue;
    if (!opts.force && cached && age < STALE_MS) toRevalidate.push(source);
    else toFetch.push(source);
  }

  if (toRevalidate.length > 0) {
    fetchSources(toRevalidate).catch(() => {});
  }
  if (toFetch.length > 0) {
    await fetchSources(toFetch);
  }

  sourceBySymbol.forEach((source, symbol) => {
    const cached = readCache(source.cacheKey);
    if (cached) result[symbol] = cached.usd;
  });
  return result;
}

/** Prices keyed by symbol, for well-known symbols only. */
export async function getTokenPrices(symbols: string[]): Promise<{ [symbol: string]: number }> {
  return getTokenPricesWithAddresses(symbols.map((symbol) => ({ symbol })));
}

/** USD price of one symbol (0 when unknown or pricing is disabled). */
export async function getTokenPrice(symbol: string): Promise<number> {
  const prices = await getTokenPrices([symbol]);
  return prices[symbol] || 0;
}

/**
 * Full token data (metadata, price, image) by contract address — used only when
 * adding a custom token whose on-chain metadata is unreadable.
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
  const platformId = getChainConfig(chainId)?.coingeckoPlatform;
  if (!platformId) return null;
  try {
    const data = await getJson(apiUrl(`coins/${platformId}/contract/${tokenAddress.toLowerCase()}`));
    return {
      symbol: data.symbol?.toUpperCase() || "UNKNOWN",
      name: data.name || "Unknown Token",
      decimals: data.detail_platforms?.[platformId]?.decimal_place || 18,
      price: data.market_data?.current_price?.usd || 0,
      imageUrl: data.image?.small || data.image?.thumb || data.image?.large || null,
      success: true,
    };
  } catch {
    return null;
  }
}

/** Drop in-memory prices so the next lookup refetches (localStorage kept as fallback). */
export function clearPriceCache(): void {
  memoryCache.clear();
}
