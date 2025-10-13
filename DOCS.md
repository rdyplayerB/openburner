# OpenBurner Documentation

> An open source Web3 wallet for Burner cards. Keys stay in hardware, never exposed.

## Quick Start

### Prerequisites
- **Burner Card** - [Order from Burner.pro](https://burner.pro) (note: requires a specially programmed Burner card, not just any HaLo chip)
- **USB NFC Reader** - ACR122U or compatible
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
4. Plug in NFC reader, tap Burner card

## Architecture

```
┌──────────────────┐
│   Web App        │  Built with Next.js + ethers.js
│   (localhost)    │  Builds transactions, manages UI
└────────┬─────────┘
         │ WebSocket
         ↓
┌──────────────────┐
│   HaLo Bridge    │  Local WebSocket server
│   (port 32868)   │  Routes commands to NFC reader
└────────┬─────────┘
         │ PC/SC
         ↓
┌──────────────────┐
│   NFC Reader     │  USB device (ACR122U, etc.)
│   (USB)          │  Reads/writes to chip
└────────┬─────────┘
         │ NFC
         ↓
┌──────────────────┐
│   Burner Card    │  Secure element (EAL6+)
│   (Hardware)     │  Stores keys, signs transactions
└──────────────────┘
```

**Key Security Property**: Private keys never leave the Burner card. Only public keys and signatures are exposed.

## How It Works

### 1. Connection
- Web app connects to HaLo Bridge via WebSocket
- Bridge detects Burner card on NFC reader
- App fetches Ethereum address from card

### 2. View Balances
- App queries blockchain RPCs for ETH and token balances
- Uses Multicall3 for efficient batch queries
- Fetches prices from CoinGecko API

### 3. Send Transaction
- User enters recipient address and amount
- App builds unsigned transaction with ethers.js
- Transaction sent to Burner card via bridge for signing
- Signed transaction broadcast to blockchain

## Key Code APIs

### Connect to Burner Card

```typescript
import { connectHaloChip } from '@/lib/halo';

const { address, publicKey } = await connectHaloChip();
```

### Sign Transaction

```typescript
import { signTransaction } from '@/lib/halo';

const signedTx = await signTransaction(unsignedTx);
await provider.sendTransaction(signedTx);
```

### Get Token Balances

```typescript
import { getTokenBalances } from '@/lib/multicall';

const balances = await getTokenBalances(
  address,
  chainId,
  rpcUrl
);
```

### Get Token Prices

```typescript
import { getTokenPrices } from '@/lib/price-oracle';

const prices = await getTokenPrices([
  'ethereum',
  'usd-coin'
]);
```

## Environment Variables

```bash
# Optional - CoinGecko API (free tier works without key)
NEXT_PUBLIC_COINGECKO_API_KEY=your_key_here
NEXT_PUBLIC_COINGECKO_API_URL=https://api.coingecko.com/api/v3
```

## Supported Networks

| Network | Chain ID | RPC |
|---------|----------|-----|
| Ethereum | 1 | Infura/Alchemy |
| Base | 8453 | Public RPC |
| Arbitrum | 42161 | Public RPC |
| Optimism | 10 | Public RPC |
| Polygon | 137 | Public RPC |

Add custom networks via the UI network selector.

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
⚠️ **Transaction verification** - Always verify recipient address  
⚠️ **RPC endpoint trust** - Use trusted RPC providers  
⚠️ **Physical security** - Keep your Burner card secure  
⚠️ **Bridge security** - Only run bridge on trusted local machine

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
- Ensure Burner card is properly positioned on reader
- Try removing and re-tapping card
- Check bridge logs for errors

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

## Links

- **GitHub**: https://github.com/rdyplayerB/openburner
- **Get a Burner**: https://burner.pro
- **LibHaLo**: https://github.com/arx-research/libhalo
- **ethers.js**: https://docs.ethers.org

---

That's it! For questions, open an issue on GitHub.

