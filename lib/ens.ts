import { ethers } from "ethers";
import { getProvider } from "./provider";
import { getPrimaryRpcUrl } from "./supported-chains";

/**
 * ENS names (Ethereum mainnet) for display and for sending to `name.eth`.
 * Reverse lookups are cached per address for a day in this browser.
 */

const CACHE_KEY = "openburner_ens";
const TTL_MS = 24 * 60 * 60 * 1000;

function mainnet() {
  return getProvider(1, getPrimaryRpcUrl(1) ?? "https://ethereum-rpc.publicnode.com");
}

/** True for strings that look like an ENS name (e.g. "vitalik.eth"). */
export function looksLikeEns(value: string): boolean {
  return /^[^\s.]+(\.[^\s.]+)*\.(eth|xyz|box|com|id|art)$/i.test(value.trim());
}

/** Resolve an ENS name to a checksummed address, or null when it has none. */
export async function resolveEns(name: string): Promise<string | null> {
  try {
    const address = await mainnet().resolveName(name.trim());
    return address ? ethers.getAddress(address) : null;
  } catch {
    return null;
  }
}

type Cache = Record<string, { name: string | null; at: number }>;

function readCache(): Cache {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

/** Primary ENS name for an address, or null. Cached for a day. */
export async function lookupEnsName(address: string): Promise<string | null> {
  const key = address.toLowerCase();
  const cache = readCache();
  const hit = cache[key];
  if (hit && Date.now() - hit.at < TTL_MS) return hit.name;
  let name: string | null = null;
  try {
    name = await mainnet().lookupAddress(address);
  } catch {
    // Network hiccup: don't cache, try again next time.
    return hit?.name ?? null;
  }
  try {
    cache[key] = { name, at: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* storage unavailable */
  }
  return name;
}

/** The cached name without a network call (for first paint). */
export function cachedEnsName(address: string): string | null {
  return readCache()[address.toLowerCase()]?.name ?? null;
}
