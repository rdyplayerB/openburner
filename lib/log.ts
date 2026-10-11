/**
 * The only place in the app allowed to touch `console`.
 *
 * - `debug` / `info` are silent in production unless the user turns on
 *   "Debug logging" in Settings (stored in localStorage under DEBUG_KEY).
 * - `warn` / `error` always print, but callers pass a short message and an
 *   error code — never card data.
 *
 * Never log raw card responses, public keys, signatures, pairing (exec) URLs,
 * PINs or signing commands, at any level. Shorten addresses with `shortAddr`.
 */

/* eslint-disable no-console */

export const DEBUG_KEY = "openburner:debug";

function debugEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(DEBUG_KEY) === "1";
  } catch {
    return false;
  }
}

export function setDebugLogging(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(DEBUG_KEY, "1");
    else window.localStorage.removeItem(DEBUG_KEY);
  } catch {
    // storage unavailable — debug logging simply stays off
  }
}

export function isDebugLogging(): boolean {
  return debugEnabled();
}

/** 0x1234…abcd */
export function shortAddr(address?: string | null): string {
  if (!address) return "—";
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

/** Reduce an unknown error to a message string safe to print. */
export function errMsg(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "unknown error";
}

export const log = {
  debug: (...args: unknown[]) => {
    if (debugEnabled()) console.log(...args);
  },
  info: (...args: unknown[]) => {
    if (debugEnabled()) console.info(...args);
  },
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};
