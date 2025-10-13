# Environment Setup Guide

## CoinGecko Price Oracle Configuration

This project uses CoinGecko API to fetch real-time cryptocurrency prices. The integration is already implemented and will work with the free tier (no API key required).

### Quick Setup (Free Tier)

1. Create a `.env.local` file in the project root:

```bash
cp .env.local.example .env.local
```

2. The free tier works without an API key! The default configuration is already set:

```env
# CoinGecko API Configuration
NEXT_PUBLIC_COINGECKO_API_KEY=

# CoinGecko API Base URL (free tier uses public API)
NEXT_PUBLIC_COINGECKO_API_URL=https://api.coingecko.com/api/v3
```

3. That's it! The app will automatically fetch real-time prices.

### Pro Tier (Optional)

If you have a CoinGecko Pro account, you can add your API key for higher rate limits:

1. Get your API key from: https://www.coingecko.com/en/api/pricing

2. Add your API key to `.env.local`:

```env
NEXT_PUBLIC_COINGECKO_API_KEY=your_api_key_here
```

### Supported Tokens

The price oracle supports the following tokens:

**Native Tokens:**
- ETH (Ethereum)
- MATIC (Polygon)
- BNB (Binance Coin)
- AVAX (Avalanche)

**Stablecoins:**
- USDC, USDT, DAI, USDB, USDbC

**Wrapped Tokens:**
- WETH, WBTC, WMATIC

**DeFi Tokens:**
- UNI, AAVE, LINK, CRV, MKR, SNX, COMP

**Other Popular Tokens:**
- ARB, OP, PEPE, SHIB, APE

### Rate Limits

**Free Tier:**
- 10-50 calls/minute
- Prices are cached for 60 seconds to minimize API calls

**Pro Tier:**
- Higher rate limits (varies by plan)
- Same caching applies

### Price Caching

Prices are automatically cached for 60 seconds to:
- Reduce API calls
- Improve performance
- Avoid rate limiting

The cache is cleared when you manually refresh your wallet balance.

### Troubleshooting

**"Price unavailable" displayed:**
- Token symbol not supported by CoinGecko
- Rate limit exceeded (wait 60 seconds)
- Network error (check internet connection)

**Adding custom token prices:**
You can add custom token mappings in `lib/price-oracle.ts`:

```typescript
import { addCustomTokenMapping } from "@/lib/price-oracle";

addCustomTokenMapping("MYTOKEN", "coingecko-id-here");
```

### Implementation Details

The price oracle is integrated into:
- `lib/price-oracle.ts` - Core price fetching logic
- `components/wallet-dashboard.tsx` - Native token price display
- `components/token-list.tsx` - ERC-20 token price display

Prices are fetched:
- On wallet connection
- When switching networks
- When manually refreshing balances
- When adding new tokens

