# Hosting a fully-functional OpenBurner

OpenBurner's **core wallet works with no API keys at all** — connecting a Burner, viewing
native + ERC-20 balances, sending, receiving, and adding NFTs by contract all run on public
RPCs. The enhanced features (USD pricing, NFT gallery auto-discovery, swaps, WalletConnect)
need API keys.

There are two ways to provide them, and they compose:

1. **Deployer-provided (recommended for a public instance)** — you set the keys once in the
   host's environment and *every* visitor gets full features. This is the "it just works"
   path; you absorb the API usage.
2. **User-provided (built in)** — any visitor can paste their own keys under **Settings →
   API keys** (stored in their browser). These override the deployer keys, so power/heavy
   users can use their own quota.

## Environment variables

| Variable | Exposure | Enables |
|---|---|---|
| `COINGECKO_API_KEY` | server-only | USD pricing |
| `NEXT_PUBLIC_PRICING_ENABLED=true` | public flag | turns the pricing UI on in hosted (set with the key above) |
| `ZEROX_API_KEY` | server-only | token swaps |
| `ALCHEMY_API_KEY` | server-only | NFT gallery auto-discovery |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | public (by design) | connecting to dApps |
| `ALLOWED_ORIGINS` | server-only | extra origins allowed to call the API (see below) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | server-only | rate limits shared across instances |
| `DAILY_CAP_COINGECKO` / `DAILY_CAP_ZEROX` / `DAILY_CAP_ALCHEMY` | server-only | a global daily request cap per upstream |

Notes:
- The three **server-only** keys are read inside API routes and **never shipped to the
  browser**. Prefer `ZEROX_API_KEY` over the legacy `NEXT_PUBLIC_0X_API_KEY` for public
  deploys (the latter ends up in the client bundle and can be scraped).
- The WalletConnect project id is *designed* to be public/embeddable — exposing it is fine.
- After setting envs on your host (Vercel, etc.), redeploy. Locally, restart the dev server.

## Abuse protection (shared keys on a public URL)

Because deployer keys are shared by all visitors, the proxy routes (`/api/coingecko`,
`/api/nft`, `/api/swap/quote`) are locked down:

- **Same-origin only** — `middleware.ts` refuses requests from other websites (it checks
  `Sec-Fetch-Site`, `Origin`, and a same-origin `Referer` for older Safari). No CORS headers
  are sent, so another site's JavaScript can't read the responses. In hosted mode, requests
  with no browser headers at all (scripts, servers) are refused too.
- **`ALLOWED_ORIGINS`** — only needed if a *different* origin should be allowed to call the
  API (comma-separated, e.g. `https://staging.yourapp.com`). Your own deployment's origin is
  always allowed; leave this unset otherwise.
- **Input validation** — the CoinGecko route only proxies the endpoints the app uses; swap and
  NFT parameters must be valid addresses and amounts.
- **Per-IP rate limiting** — coingecko 90/min, alchemy 60/min, 0x 40/min (returns `429`).
- **Daily caps** — set `DAILY_CAP_COINGECKO`, `DAILY_CAP_ZEROX` or `DAILY_CAP_ALCHEMY` to cap
  total requests per upstream per day, so one abuser can't exhaust your plan.
- **Short response caching** — prices ~60s at the edge, NFT lists ~60s — to cut repeat upstream calls.

Header checks stop other websites in a browser; a script can still forge headers. That's
what the rate limits and daily caps are for — and for those to hold across serverless
instances, connect Upstash Redis (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`,
free tier is fine). Without it, counters are in-memory per instance: a speed bump, not a
hard quota.

## Cost control tips

- Use each provider's free tier; CoinGecko/Alchemy free tiers are generous for read traffic.
- Connect Upstash and set a `DAILY_CAP_*` for each key you pay for.
- Tighten the per-route limits in `lib/rate-limit.ts` if you see abuse.
- Or skip deployer keys entirely and rely on the user-provided keys in Settings — then the
  hosted instance costs you nothing and each user brings their own.
