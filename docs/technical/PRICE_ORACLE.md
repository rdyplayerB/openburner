# CoinGecko Price Oracle Implementation

## Overview

Integrated CoinGecko API as the price oracle for OpenBurner wallet. The implementation fetches real-time cryptocurrency prices for native tokens (ETH, MATIC) and ERC-20 tokens.

## Files Created

### 1. `lib/price-oracle.ts`
Core price oracle implementation with the following features:
- Batch price fetching for multiple tokens
- 60-second price caching to minimize API calls
- Support for 25+ popular tokens (ETH, MATIC, USDC, USDT, WETH, UNI, etc.)
- Symbol to CoinGecko ID mapping
- Rate limit handling
- Error handling with fallbacks

### 2. `env.example`
Example environment configuration file with:
- CoinGecko API key (optional for free tier)
- API base URL configuration
- Setup instructions

### 3. `ENV_SETUP.md`
Complete setup and usage guide including:
- Quick setup instructions
- Supported tokens list
- Rate limits information
- Troubleshooting guide
- Implementation details

## Files Modified

### 1. `components/token-list.tsx`
**Changes:**
- Added `getTokenPrices()` import from price oracle
- Added `tokenPrices` state to store fetched prices
- Added `usdPrice` field to Token interface
- Added `loadPricesForTokens()` function to fetch prices for all tokens
- Updated price display to show real prices instead of hardcoded values
- Integrated price loading with token loading
- Added price cache clearing on manual refresh

**Before:**
```typescript
≈ ${(parseFloat(token.balance) * (token.symbol === 'ETH' ? 2500 : token.symbol === 'USDT' || token.symbol === 'USDC' ? 1 : 0)).toFixed(2)}
```

**After:**
```typescript
{tokenPrices[token.symbol] !== undefined ? (
  `≈ $${(parseFloat(token.balance) * tokenPrices[token.symbol]).toFixed(2)}`
) : (
  <span className="text-slate-400">Price unavailable</span>
)}
```

### 2. `components/wallet-dashboard.tsx`
**Changes:**
- Added `getTokenPrice()` import from price oracle
- Added `nativeTokenPrice` state to store native token price
- Added `loadNativeTokenPrice()` function to fetch price for ETH/MATIC
- Updated price display to show real price instead of hardcoded $2500
- Integrated price loading with balance loading
- Auto-refresh price on network change

**Before:**
```typescript
≈ ${isLoadingBalance ? "..." : (parseFloat(balance) * 2500).toFixed(2)} USD
```

**After:**
```typescript
{isLoadingBalance ? (
  "≈ $... USD"
) : nativeTokenPrice > 0 ? (
  `≈ $${(parseFloat(balance) * nativeTokenPrice).toFixed(2)} USD`
) : (
  <span className="text-slate-400">Price unavailable</span>
)}
```

## Features

### Price Caching
- Prices cached for 60 seconds
- Reduces API calls and improves performance
- Avoids rate limiting issues
- Cache cleared on manual wallet refresh

### Batch Fetching
- Fetches prices for multiple tokens in a single API call
- More efficient than individual requests
- Supports up to 250 tokens per request (CoinGecko limit)

### Error Handling
- Graceful fallback for unsupported tokens
- Network error handling
- Rate limit detection and messaging
- Missing price display as "Price unavailable"

### Supported Tokens
The oracle currently supports 25+ tokens including:
- Native: ETH, MATIC, BNB, AVAX
- Stablecoins: USDC, USDT, DAI, USDB, USDbC
- Wrapped: WETH, WBTC, WMATIC
- DeFi: UNI, AAVE, LINK, CRV, MKR, SNX, COMP
- Other: ARB, OP, PEPE, SHIB, APE

### Extensibility
Easy to add new token mappings:
```typescript
export function addCustomTokenMapping(symbol: string, coinGeckoId: string): void
```

## Setup Instructions

1. **Create environment file:**
   ```bash
   cp env.example .env.local
   ```

2. **Run the application:**
   ```bash
   npm run dev
   ```

3. **Optional - Add Pro API key:**
   - Sign up at https://www.coingecko.com/en/api/pricing
   - Add key to `.env.local`:
     ```
     NEXT_PUBLIC_COINGECKO_API_KEY=your_key_here
     ```

## Testing

To test the implementation:

1. Start the dev server
2. Connect your HaLo wallet
3. Check console logs for price fetching:
   - `💰 Fetching prices for tokens: [...]`
   - `✅ Prices loaded: {...}`
4. Verify prices display correctly in:
   - Wallet dashboard (main balance USD value)
   - Token list (each token's USD value)

## Rate Limits

**Free Tier:** 10-50 calls/minute
- Should be sufficient for normal usage
- Caching prevents excessive calls
- If rate limited, wait 60 seconds

**Pro Tier:** Higher limits based on plan

## Future Enhancements

Possible improvements:
1. Add more token mappings as needed
2. Implement fallback price sources (e.g., Uniswap pools)
3. Add price change indicators (24h %, 7d %)
4. Support for NFT floor prices
5. Historical price charts
6. Price alerts/notifications

## API Documentation

CoinGecko API docs: https://www.coingecko.com/en/api/documentation

