# OpenBurner Documentation

## What is Burner?

[Burner](https://burner.pro) is an affordable, credit-card-sized hardware wallet built for gifting and everyday crypto use. It uses the same secure chip technology found in traditional hardware wallets like Ledger or Trezor, but reimagines the hardware wallet experience with a seedless design, web-based interface, and NFC connectivity. Burner combines the security of cold storage with the convenience of a software wallet, offering an accessible self-custody solution for spending, saving, and gifting crypto securely.

## What is OpenBurner?

OpenBurner is a wallet application for Burner Ethereum hardware wallets. It runs locally on your machine. Private keys remain in the card's secure element.

**Features:**
- Works with Burner Ethereum cards (EAL6+ secure element)
- Supports any EVM-compatible network
- Local execution only
- MIT licensed

### How is this different from BurnerOS?

**BurnerOS** is the official wallet from Burner that supports Ethereum, Base, Arbitrum, and Optimism.

**OpenBurner** is an alternative that:
- Supports all BurnerOS chains + many more (BNB Chain, Avalanche, Blast, Linea, Mantle, Mode, Polygon, Scroll, Unichain, etc.)
- Allows you to add any custom EVM-compatible chain
- Runs locally on your machine with full control over RPC endpoints
- Is open source (MIT licensed)

Both work with the same Burner Ethereum card - your addresses and keys remain the same.

## Quick Start

### Prerequisites
- **Burner Card** - [Order here](https://arx-burner.myshopify.com/OPENBURNER)
- **Desktop NFC Reader** - ACR1252U or compatible USB reader ([Get on Amazon](https://amzn.to/3ISNwd7))
- **Node.js 18+**

### Installation

```bash
git clone https://github.com/rdyplayerB/openburner.git
cd openburner
npm install
cp env.example .env.local
npm run dev
```

### HaLo Bridge Setup

1. Download bridge from [HaLo Tools releases](https://github.com/arx-research/libhalo/releases)
2. Run the bridge executable (starts on `ws://127.0.0.1:32868/ws`)
3. Grant consent: Visit `http://127.0.0.1:32868/consent?website=http://localhost:3000`
4. Plug in NFC reader, tap your Burner Ethereum card

## Tech Stack

**Frontend:**
- Next.js 14+ (React framework)
- TypeScript
- Tailwind CSS
- Zustand (state management)

**Web3 Libraries:**
- ethers.js (blockchain interactions)
- LibBurner (Burner card communication via WebSocket)
- LibHalo (HaLo card communication and NFC operations)
- Multicall3 (efficient batch RPC calls)

**APIs:**
- CoinGecko API (token prices)
- Custom RPC endpoints (blockchain data)

## Architecture

```
┌──────────────────┐
│   Web App        │  Next.js app running on localhost
│   (localhost)    │  Builds transactions, manages UI state
└────────┬─────────┘
         │ WebSocket
         ↓
┌──────────────────┐
│  HaLo Bridge     │  Local WebSocket server (port 32868)
│   (localhost)    │  Routes commands to NFC reader
└────────┬─────────┘
         │ PC/SC
         ↓
┌──────────────────┐
│   NFC Reader     │  USB device (ACR122U, etc.)
│   (USB)          │  Communicates with card via NFC
└────────┬─────────┘
         │ NFC
         ↓
┌──────────────────┐
│ Burner Ethereum  │  Secure element (EAL6+ certified)
│     Card         │  Stores private keys, signs transactions
└──────────────────┘
```

**Key Security Property**: Private keys never leave the Burner Ethereum card's secure element. Only public keys and signatures are exposed.

## How It Works

### 1. Connection
- Web app connects to HaLo Bridge via WebSocket
- Bridge detects Burner Ethereum card on NFC reader
- App fetches Ethereum address from card's secure element

### 2. View Balances
- App queries blockchain RPCs for ETH and token balances
- Uses Multicall3 for efficient batch queries
- Fetches real-time prices from CoinGecko API

### 3. Send Transaction
- User enters recipient address and amount
- App builds unsigned transaction with ethers.js
- Transaction sent to Burner Ethereum card via bridge for signing
- Card signs transaction using private key (never exposed)
- Signed transaction broadcast to blockchain

## Key Code APIs

### Connect to Burner Ethereum Card

```typescript
import { getBurnerAddress } from '@/lib/burner';

const { address, publicKey, keySlot } = await getBurnerAddress();
```

### Sign Transaction

```typescript
import { signTransactionWithBurner } from '@/lib/burner';

const signedTx = await signTransactionWithBurner(unsignedTx, keySlot, pin);
await provider.broadcastTransaction(signedTx);
```

### Get Token Balances

```typescript
import { batchGetBalances } from '@/lib/multicall';
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider(rpcUrl);
const balances = await batchGetBalances(
  provider,
  tokenAddresses,
  walletAddress
);
```

### Get Token Prices

```typescript
import { getTokenPrices, clearPriceCache } from '@/lib/price-oracle';

const prices = await getTokenPrices([
  'ETH',
  'USDC'
]);
// Returns: { ETH: 2500.00, USDC: 1.00 }

// Force fresh price fetch
clearPriceCache();
```

**Price Caching Strategy:**

OpenBurner uses an aggressive multi-tier caching strategy to minimize CoinGecko API calls and stay within the free tier limits (10-30 calls/minute):

| Token Type | Cache Duration | Examples |
|------------|----------------|----------|
| Stablecoins | 2 hours | USDC, USDT, DAI |
| Major Tokens | 30 minutes | ETH, BTC, MATIC, BNB |
| Other Tokens | 30 minutes | All other tokens |

**Cache Layers:**
1. **Memory cache** - Fast, session-only
2. **localStorage** - Persistent across page reloads
3. **Request deduplication** - Prevents duplicate concurrent API calls
4. **Batch fetching** - All token prices fetched in single API call

**Manual Refresh Only:**
- Prices are **NOT** auto-refreshed on page load
- Cached prices are served immediately for instant UI
- Users must manually click the refresh button to update prices
- This prevents excessive API calls as user count scales

**Why This Matters:**
- With 100 tokens, 1 refresh = 1 API call (not 100)
- With 1000 users refreshing randomly across 1 hour = ~16 calls/min (sustainable)
- Free tier limit: 10-30 calls/minute
- If you need more frequent updates, consider upgrading to CoinGecko Pro

**UI Indicator:**
The token list shows "Updated Xm ago" next to the refresh button, so users know price freshness.

## Environment Variables

```bash
# Optional - CoinGecko API (free tier works without key)
NEXT_PUBLIC_COINGECKO_API_KEY=your_key_here
NEXT_PUBLIC_COINGECKO_API_URL=https://api.coingecko.com/api/v3
```

## Supported Networks

OpenBurner supports **everything BurnerOS does** (Ethereum, Base, Arbitrum, Optimism) **plus many more**:

- BNB Chain
- Avalanche
- Blast
- Linea
- Mantle
- Mode
- Polygon
- Scroll
- Unichain
- Any custom EVM-compatible chain

**How BurnerOS compares:**
- BurnerOS officially supports: Ethereum, Base, Arbitrum, Optimism
- OpenBurner supports those + all additional EVM chains via custom RPC configuration

Add any custom network via the UI network selector.

## Token Management

### Default Token Lists

OpenBurner uses **streamlined token lists** focused on core tokens for optimal performance. The following essential tokens are pre-configured for each network:

**Ethereum Mainnet:**
- WETH, USDC, USDT, WBTC

**Base:**
- WETH, USDC, USD2

**Arbitrum One:**
- WETH, USDC, USDT, WBTC

**Optimism:**
- WETH, USDC, USDT, WBTC, OP

**Polygon:**
- POL (native), WETH, USDC, USDT, WBTC

**Blast:**
- WETH, USDB (native stablecoin)

**Scroll:**
- WETH, USDC, USDT

**Linea:**
- WETH, USDC, USDT

**zkSync Era:**
- WETH, USDC, USDT

### Adding Custom Tokens

**Important:** There is currently no token list service or UI for adding custom tokens. If you need to track tokens that aren't in the hardcoded lists above, you must:

1. Fork the repository
2. Edit `lib/token-lists.ts`
3. Add your token addresses to the appropriate chain ID
4. Rebuild and run your custom version

**Example** - Adding a custom token to Ethereum:

```typescript
// In lib/token-lists.ts
1: [
  { address: "0xYourTokenAddress", symbol: "TOKEN", name: "Your Token", decimals: 18 },
  // ... existing tokens
]
```

This limitation is intentional to keep the app simple and local-first. Future versions may include a dynamic token management UI.

## Bridge Connection (Hosted Version)

The hosted version supports USB NFC reader connections through a bridge service that handles consent properly.

### How It Works

1. **HaloBridge Service**: Uses `@arx-research/libhalo` for proper consent handling
2. **Consent Flow**: Shows a modal matching BurnerOS approval prompt
3. **WebSocket Communication**: Communicates with local bridge software
4. **Security**: Requires explicit user consent and HTTPS

### Bridge Requirements

- **Halo Bridge Software**: Must be installed and running locally
- **USB NFC Reader**: Compatible reader connected to computer
- **Burner Card**: Physical card placed on reader
- **User Consent**: Explicit permission granted through consent modal

### Security Considerations

- Bridge communication is restricted to localhost only
- User consent is required before any USB access
- HTTPS is required for hosted version
- Clear fallback to gateway mode if bridge fails

See [BRIDGE_SECURITY.md](./docs/BRIDGE_SECURITY.md) for detailed security information.

## Project Structure

```
openburner/
├── app/                    # Next.js pages
│   ├── page.tsx           # Main entry
│   └── wallet/page.tsx    # Wallet UI
├── components/             # React components
│   ├── wallet-connect.tsx
│   ├── wallet-dashboard.tsx
│   ├── token-list.tsx
│   └── send-token.tsx
├── lib/                    # Core libraries
│   ├── burner.ts          # Burner card integration
│   ├── burner-bridge.ts   # Bridge WebSocket client
│   ├── multicall.ts       # Batch RPC calls
│   ├── price-oracle.ts    # Price fetching
│   └── token-lists.ts     # Token metadata
└── store/
    └── wallet-store.ts    # Zustand state management
```

## Security Notes

### What's Protected
✅ **Private keys** - Never leave the secure element chip  
✅ **Signing operations** - Happen inside hardware  
✅ **Key generation** - Done on-chip, not extractable

### What's Your Responsibility
⚠️ **Transaction verification** - Always verify recipient address and amount  
⚠️ **RPC endpoint trust** - Use trusted RPC providers  
⚠️ **Physical security** - Keep your Burner Ethereum card secure  
⚠️ **Bridge security** - Only run bridge on trusted local machine  
⚠️ **Local execution** - OpenBurner runs locally, not hosted anywhere

### Attack Surface
- **Web app** - Standard web vulnerabilities apply
- **RPC endpoints** - Could show false balances
- **Bridge** - Runs locally, only accessible on localhost
- **Chip** - Hardware tamper-resistant (EAL6+ certified)

## Troubleshooting

### Bridge won't connect
- Check bridge is running: `http://127.0.0.1:32868/health`
- Grant consent: `http://127.0.0.1:32868/consent?website=http://localhost:3000`
- Check NFC reader is plugged in

### Can't read card
- Ensure Burner Ethereum card is properly positioned on reader
- Try removing and re-tapping card
- Check bridge logs for errors
- Verify you have a Burner Ethereum card (not Bitcoin or other variants)

### Transaction fails
- Verify you have enough ETH for gas
- Check network is selected correctly
- Ensure RPC endpoint is responsive

## Development

```bash
# Run dev server
npm run dev

# Type checking
npm run lint

# Build for production
npm run build
```

## License & Usage

OpenBurner is open source under the MIT License. This means you can:

- Use it for personal or commercial purposes
- Modify and customize the code
- Fork and build your own version
- Distribute your modified versions

**No warranty is provided.** See the LICENSE file for full terms.

## Maintenance

This project is actively maintained by [@rdyplayerB](https://github.com/rdyplayerB) — find me on [𝕏](https://x.com/rdyplayerB) / [Farcaster](https://farcaster.xyz/rdyplayerb). Updates and improvements will be made over time.

**Not accepting pull requests** - This is a personal project rather than a community-driven one. If you want to customize OpenBurner or add features, please fork the repository.

## Forking & Customization

You're encouraged to fork OpenBurner for your own use:

1. Fork the repository
2. Modify chain configurations in `components/chain-selector.tsx`
3. Update token lists in `lib/token-lists.ts`
4. Customize UI in `components/` and `app/`
5. Deploy to Vercel or run locally

**Use cases for forking:**
- Add support for specific L2s or custom chains
- Build a branded wallet for your project
- Experiment with new Burner card features
- Create specialized tools (NFT minting, DAO voting, etc.)

**Code structure:**
- `app/` - Next.js pages and routing
- `components/` - React components for UI
- `lib/` - Core libraries (Burner, multicall, pricing)
- `store/` - Zustand state management

## How can I support OpenBurner?

If you find OpenBurner useful, there are a few ways you can help:

- Share your feedback by [opening an issue](https://github.com/rdyplayerB/openburner/issues), reaching out on [𝕏](https://x.com/rdyplayerB), [Farcaster](https://farcaster.xyz/rdyplayerb), or [email me](mailto:rdyplayerb@gmail.com)
- You can also find me in the official [Burner Telegram channel](https://t.me/burnerofficial) (@rdyplayerB)
- Share OpenBurner on [𝕏](https://x.com/rdyplayerB) or [Farcaster](https://farcaster.xyz/rdyplayerb)
- Use my link to get a [Burner](https://arx-burner.myshopify.com/OPENBURNER) or my link for the [recommended USB NFC reader](https://amzn.to/3ISNwd7)
- Support development with a donation to `rdyplayerB.eth`
- Fork the project and experiment with your own ideas

## Links

- **GitHub**: https://github.com/rdyplayerB/openburner
- **Get a Burner Card**: [Order here](https://arx-burner.myshopify.com/OPENBURNER)
- **LibBurner Documentation**: https://github.com/arx-research/libburner
- **ethers.js Docs**: https://docs.ethers.org

---

Built by [@rdyplayerB](https://github.com/rdyplayerB) ([𝕏](https://x.com/rdyplayerB) / [Farcaster](https://farcaster.xyz/rdyplayerb)) • MIT License

