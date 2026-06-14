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
| `ALLOWED_ORIGINS` | server-only | abuse protection (see below) |

Notes:
- The three **server-only** keys are read inside API routes and **never shipped to the
  browser**. Prefer `ZEROX_API_KEY` over the legacy `NEXT_PUBLIC_0X_API_KEY` for public
  deploys (the latter ends up in the client bundle and can be scraped).
- The WalletConnect project id is *designed* to be public/embeddable — exposing it is fine.
- After setting envs on your host (Vercel, etc.), redeploy. Locally, restart the dev server.

## Abuse protection (shared keys on a public URL)

Because deployer keys are shared by all visitors, the proxy routes (`/api/coingecko`,
`/api/nft`, `/api/swap/quote`) include:

- **Per-IP rate limiting** — coingecko 90/min, nft 60/min, swap 40/min (returns `429`).
- **Short response caching** — prices ~30s, NFT lists ~60s — to cut repeat upstream calls.
- **Optional origin allowlist** — set `ALLOWED_ORIGINS=https://yourapp.com` (comma-separated)
  to reject requests from other origins. Leave unset to allow any origin.

Caveat: the rate limiter and cache are **in-memory per server instance**. On serverless
(e.g. Vercel) state resets on cold starts and isn't shared across instances — it's a
speed-bump against casual abuse, not a hard global quota. For strict limits, back
`lib/rate-limit.ts` with Redis/Upstash.

## Cost control tips

- Use each provider's free tier; CoinGecko/Alchemy free tiers are generous for read traffic.
- Keep `ALLOWED_ORIGINS` set so only your own frontend can use your keys.
- Tighten the per-route limits in `lib/rate-limit.ts` if you see abuse.
- Or skip deployer keys entirely and rely on the user-provided keys in Settings — then the
  hosted instance costs you nothing and each user brings their own.
