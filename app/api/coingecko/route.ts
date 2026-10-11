import { NextRequest, NextResponse } from 'next/server';
import { log, errMsg } from '@/lib/log';
import { rateLimit, cacheGet, cacheSet } from '@/lib/rate-limit';

// Free "Demo" keys use the public endpoint + the x-cg-demo-api-key header.
// Paid "Pro" keys use the pro endpoint + the x-cg-pro-api-key header. Defaults
// to the free Demo tier; deployers with a paid key set COINGECKO_API_PLAN=pro.
const COINGECKO_IS_PRO = process.env.COINGECKO_API_PLAN === 'pro';
const COINGECKO_API_BASE_URL = COINGECKO_IS_PRO
  ? 'https://pro-api.coingecko.com/api/v3'
  : 'https://api.coingecko.com/api/v3';
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;

// Per-endpoint cache lifetimes (seconds). Prices move; metadata/icons/search are
// effectively static, so they get long TTLs to spare the shared rate limit.
function ttlForEndpoint(endpoint: string): number {
  const e = endpoint.toLowerCase();
  if (e.includes('simple/price') || e.includes('simple/token_price')) return 60;
  if (e.includes('/contract/') || e.startsWith('coins/') || e.startsWith('search')) return 3600;
  return 120;
}
// How long to remember a "not found" (404) — these never change, so cache long.
const NEGATIVE_TTL = 21_600; // 6h
// Brief back-off when CoinGecko itself rate-limits us, so we stop hammering it.
const BACKOFF_TTL = 30;

/**
 * Build a JSON response that's cacheable at Vercel's edge/CDN. `s-maxage` lets the
 * CDN serve one cached response to ALL users (so N concurrent users ≈ 1 upstream
 * call), and `stale-while-revalidate` keeps things snappy while it refreshes.
 */
function edgeJson(body: any, status: number, sMaxAgeSec: number): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': `public, s-maxage=${sMaxAgeSec}, stale-while-revalidate=${sMaxAgeSec * 4}`,
    },
  });
}

// Only the endpoint shapes the app uses. Anything else is refused, so this
// route can't be used as an open proxy to the rest of CoinGecko on our key.
const ALLOWED_ENDPOINTS = [
  /^simple\/price$/,
  /^simple\/token_price\/[a-z0-9-]+$/,
  /^coins\/[a-z0-9-]+$/,
  /^coins\/[a-z0-9-]+\/contract\/0x[0-9a-fA-F]{40}$/,
  /^search$/,
];
const MAX_PARAM_LENGTH = 2000;

/**
 * Proxy for CoinGecko so the API key stays server-side.
 */
export async function GET(request: NextRequest) {
  try {
    const blocked = await rateLimit(request, 'coingecko', 90, 60_000);
    if (blocked) return blocked;

    const { searchParams } = new URL(request.url);

    // Extract the endpoint path from the request
    const endpoint = searchParams.get('endpoint');
    if (!endpoint) {
      return NextResponse.json(
        { error: 'Missing required parameter: endpoint' },
        { status: 400 }
      );
    }

    if (!ALLOWED_ENDPOINTS.some((re) => re.test(endpoint))) {
      return NextResponse.json({ error: 'Unsupported endpoint' }, { status: 400 });
    }
    for (const value of searchParams.values()) {
      if (value.length > MAX_PARAM_LENGTH) {
        return NextResponse.json({ error: 'Parameter too long' }, { status: 400 });
      }
    }

    const ttl = ttlForEndpoint(endpoint);

    // Serve a cached response if available — including remembered "not found"/back-off
    // results, so unlisted tokens (404) aren't re-fetched on every refresh.
    const cacheKey = `cg:${request.url.split('/api/coingecko')[1] || ''}`;
    const cachedData = cacheGet(cacheKey);
    if (cachedData) {
      if (cachedData.__negative) {
        return edgeJson({ error: cachedData.error }, cachedData.status, cachedData.ttl);
      }
      return edgeJson(cachedData, 200, ttl);
    }

    // Build the CoinGecko API URL
    const coingeckoUrl = new URL(`${COINGECKO_API_BASE_URL}/${endpoint}`);
    
    // Forward all other query parameters to CoinGecko
    for (const [key, value] of searchParams.entries()) {
      if (key !== 'endpoint') {
        coingeckoUrl.searchParams.set(key, value);
      }
    }

    // Prepare headers
    const headers: HeadersInit = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    // User-provided key (forwarded by the client) takes precedence over the env var.
    const coingeckoKey = request.headers.get('x-coingecko-key') || COINGECKO_API_KEY;
    if (coingeckoKey) {
      // Demo (free) and Pro (paid) keys authenticate with different header names.
      headers[COINGECKO_IS_PRO ? 'x-cg-pro-api-key' : 'x-cg-demo-api-key'] = coingeckoKey;
    }


    // Make request to CoinGecko API
    const response = await fetch(coingeckoUrl.toString(), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      log.warn(`[CoinGecko Proxy] upstream ${response.status}`);

      // Token not on CoinGecko — remember it so we never re-fetch this dead lookup.
      if (response.status === 404) {
        cacheSet(cacheKey, { __negative: true, status: 404, error: 'Data not found.', ttl: NEGATIVE_TTL }, NEGATIVE_TTL * 1000);
        return edgeJson({ error: 'Data not found.' }, 404, NEGATIVE_TTL);
      }
      // CoinGecko rate-limited us — back off briefly so we stop hammering upstream.
      if (response.status === 429) {
        cacheSet(cacheKey, { __negative: true, status: 429, error: 'Rate limit exceeded. Please try again later.', ttl: BACKOFF_TTL }, BACKOFF_TTL * 1000);
        return edgeJson({ error: 'Rate limit exceeded. Please try again later.' }, 429, BACKOFF_TTL);
      }

      const errorMessage = response.status === 400 ? 'Invalid request parameters.' : 'Failed to fetch data from CoinGecko';
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    const data = await response.json();

    cacheSet(cacheKey, data, ttl * 1000);

    // Return cacheable at the edge so all users share one upstream call.
    return edgeJson(data, 200, ttl);

  } catch (error) {
    log.error(`[CoinGecko Proxy] ${errMsg(error)}`);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
