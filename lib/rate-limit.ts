import { NextRequest, NextResponse } from "next/server";

/**
 * Guards for the public proxy routes (CoinGecko, 0x, Alchemy). They spend
 * shared API keys, so every route is:
 *
 *  1. Origin-checked in middleware.ts (same-origin only by default).
 *  2. Rate limited per IP here, plus an optional global daily cap per upstream.
 *
 * Counters live in Upstash Redis when UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN are set, so limits are shared across serverless
 * instances. Without them, counters fall back to per-instance memory (a speed
 * bump only — set Upstash for a public deployment).
 */

// ---- counter store ----

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

async function incrMemory(key: string, windowMs: number): Promise<number> {
  const now = Date.now();
  const existing = memoryBuckets.get(key);
  if (!existing || now > existing.resetAt) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    if (memoryBuckets.size > 10_000) {
      for (const [k, v] of memoryBuckets) if (now > v.resetAt) memoryBuckets.delete(k);
    }
    return 1;
  }
  existing.count += 1;
  return existing.count;
}

async function incrUpstash(key: string, windowMs: number): Promise<number | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        ["PEXPIRE", key, String(windowMs), "NX"],
      ]),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const out = (await res.json()) as Array<{ result?: number }>;
    return typeof out?.[0]?.result === "number" ? out[0].result : null;
  } catch {
    return null; // store unreachable — fall back to memory rather than failing open to nothing
  }
}

/** Increment a fixed-window counter and return the new count. */
async function increment(key: string, windowMs: number): Promise<number> {
  const windowStart = Math.floor(Date.now() / windowMs);
  const scoped = `ob:${key}:${windowStart}`;
  return (await incrUpstash(scoped, windowMs)) ?? incrMemory(scoped, windowMs);
}

function clientIp(req: NextRequest): string {
  // On Vercel these headers are set by the edge and can't be spoofed by the client.
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function tooMany(retryAfterSec: number, message = "Rate limit exceeded. Please slow down."): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
  );
}

/**
 * Per-IP limit for a route, plus a global daily cap for its upstream when
 * DAILY_CAP_<UPSTREAM> is set (e.g. DAILY_CAP_COINGECKO=20000).
 * Returns a 429 response when blocked, otherwise null.
 */
export async function rateLimit(
  req: NextRequest,
  bucketName: string,
  limit = 60,
  windowMs = 60_000
): Promise<NextResponse | null> {
  const count = await increment(`ip:${bucketName}:${clientIp(req)}`, windowMs);
  if (count > limit) return tooMany(Math.ceil(windowMs / 1000));

  const cap = Number(process.env[`DAILY_CAP_${bucketName.toUpperCase()}`] || 0);
  if (cap > 0) {
    const day = 86_400_000;
    const total = await increment(`day:${bucketName}`, day);
    if (total > cap) return tooMany(3600, "This service is busy right now. Please try again later.");
  }
  return null;
}

// ---- tiny TTL response cache ----

interface CacheEntry {
  expires: number;
  data: any;
}
const cache = new Map<string, CacheEntry>();
const MAX_CACHE_ENTRIES = 500;

export function cacheGet(key: string): any | null {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() > e.expires) {
    cache.delete(key);
    return null;
  }
  return e.data;
}

export function cacheSet(key: string, data: any, ttlMs: number): void {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const drop = Math.ceil(MAX_CACHE_ENTRIES * 0.2);
    let i = 0;
    for (const k of cache.keys()) {
      cache.delete(k);
      if (++i >= drop) break;
    }
  }
  cache.set(key, { expires: Date.now() + ttlMs, data });
}
