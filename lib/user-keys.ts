/**
 * User-provided API keys, stored in this browser (localStorage).
 *
 * These take precedence over server-side environment variables, letting users bring their
 * own keys without editing .env (and making the hosted build fully functional at no cost to
 * the deployer). Keys live only in the user's browser — fine for the read-only data APIs
 * used here (pricing, NFT metadata, swap quotes, WalletConnect relay).
 */

export type UserKeyName = "coingecko" | "alchemy" | "zerox" | "walletconnect";

const STORAGE_KEY = "openburner_api_keys";
export const USER_KEYS_CHANGED_EVENT = "openburner-keys-changed";

export function getUserKeys(): Partial<Record<UserKeyName, string>> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function getUserKey(name: UserKeyName): string {
  return getUserKeys()[name] || "";
}

export function setUserKey(name: UserKeyName, value: string): void {
  if (typeof window === "undefined") return;
  const keys = getUserKeys();
  const trimmed = value.trim();
  if (trimmed) keys[name] = trimmed;
  else delete keys[name];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  window.dispatchEvent(new Event(USER_KEYS_CHANGED_EVENT));
}
