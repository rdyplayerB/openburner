# OpenBurner Documentation

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
- **Burner Ethereum Card** - [Order from burner.pro/eth](https://burner.pro/eth)
- **Desktop NFC Reader** - ACR122U or compatible USB reader
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

1. Download bridge from [HaLo Gateway releases](https://github.com/arx-research/libhalo/releases)
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
- libhalo (Burner card communication via WebSocket)
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
│   HaLo Bridge    │  Local WebSocket server (port 32868)
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
import { getHaloAddress } from '@/lib/halo';

const { address, publicKey, keySlot } = await getHaloAddress();
```

### Sign Transaction

```typescript
import { signTransactionWithHalo } from '@/lib/halo';

const signedTx = await signTransactionWithHalo(unsignedTx, keySlot, pin);
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
import { getTokenPrices } from '@/lib/price-oracle';

const prices = await getTokenPrices([
  'ETH',
  'USDC'
]);
// Returns: { ETH: 2500.00, USDC: 1.00 }
```

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
│   ├── halo.ts            # Burner card integration
│   ├── halo-bridge.ts     # Bridge WebSocket client
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

This project is actively maintained by [@rdyplayerB](https://github.com/rdyplayerB). Updates and improvements will be made over time.

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
- `lib/` - Core libraries (Halo, multicall, pricing)
- `store/` - Zustand state management
- `website/` - Marketing/landing page

## Links

- **Website**: https://openburner.vercel.app
- **GitHub**: https://github.com/rdyplayerB/openburner
- **Get a Burner Ethereum Card**: https://burner.pro/eth
- **LibHaLo Documentation**: https://github.com/arx-research/libhalo
- **ethers.js Docs**: https://docs.ethers.org

---

**Questions?** Open an issue on [GitHub](https://github.com/rdyplayerB/openburner/issues)

