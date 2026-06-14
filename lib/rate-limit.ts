import { NextRequest, NextResponse } from "next/server";

/**
 * Lightweight in-memory guards for the public proxy routes (no external deps).
 *
 * - Per-IP fixed-window rate limiting so a public hosted instance can't have its shared
 *   API keys drained by abuse.
 * - Optional origin allowlist via ALLOWED_ORIGINS (comma-separated). Unset = allow all.
 * - A tiny TTL response cache to cut repeat upstream calls.
 *
 * Note: state is per-server-instance and in-memory. On serverless it resets per cold start
 * and isn't shared across instances — it's a basic abuse speed-bump, not a hard quota. For
 * strict global limits, back this with Redis/Upstash.
 */

interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * Returns a 429 NextResponse if the caller exceeded `limit` requests per `windowMs`,
 * otherwise null. `bucketName` scopes the limit per route.
 */
export function rateLimit(
  req: NextRequest,
  bucketName: string,
  limit = 60,
  windowMs = 60_000
): NextResponse | null {
  const key = `${bucketName}:${clientIp(req)}`;
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now > existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  existing.count += 1;
  if (existing.count > limit) {
    const retry = Math.ceil((existing.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Rate limit exceeded. Please slow down." },
      { status: 429, headers: { "Retry-After": String(retry) } }
    );
  }
  return null;
}

/**
 * If ALLOWED_ORIGINS is set, reject requests whose Origin isn't on the list.
 * Returns a 403 NextResponse when blocked, otherwise null.
 */
export function checkOrigin(req: NextRequest): NextResponse | null {
  const allowed = process.env.ALLOWED_ORIGINS;
  if (!allowed) return null;
  const list = allowed.split(",").map((o) => o.trim()).filter(Boolean);
  const origin = req.headers.get("origin");
  // Same-origin/no-origin requests (e.g. server-to-server) have no Origin header — allow.
  if (!origin) return null;
  if (list.includes(origin)) return null;
  return NextResponse.json({ error: "Origin not allowed." }, { status: 403 });
}

// ---- tiny TTL cache ----
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
    // drop oldest-ish: clear a chunk to bound memory
    const drop = Math.ceil(MAX_CACHE_ENTRIES * 0.2);
    let i = 0;
    for (const k of cache.keys()) {
      cache.delete(k);
      if (++i >= drop) break;
    }
  }
  cache.set(key, { expires: Date.now() + ttlMs, data });
}
