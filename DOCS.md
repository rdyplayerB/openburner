# OpenBurner Documentation

## What is Burner?

[Burner](https://burner.pro) is an affordable, credit-card-sized hardware wallet built for gifting and everyday crypto use. It uses the same secure chip technology found in traditional hardware wallets like Ledger or Trezor, but reimagines the hardware wallet experience with a seedless design, web-based interface, and NFC connectivity. Burner combines the security of cold storage with the convenience of a software wallet, offering an accessible self-custody solution for spending, saving, and gifting crypto securely.

## What is OpenBurner?

OpenBurner is a wallet application for Burner Ethereum cards. Run it locally or use the hosted app at [app.openburner.xyz](https://app.openburner.xyz). Private keys remain in the card's secure element.

**Features:**
- Works with Burner Ethereum cards (EAL6+ secure element)
- Supports any EVM-compatible network: pick a preset or add your own RPC URL
- Send & receive tokens, with on-chip signing
- Token swaps via the 0x Swap API
- NFT gallery — view, send & receive ERC-721 / ERC-1155 collectibles
- WalletConnect — connect your Burner to any dApp
- Real-time pricing via CoinGecko (local and hosted)
- Local (USB reader) or hosted (phone as NFC reader) modes
- MIT licensed

### How does OpenBurner relate to BurnerOS?

BurnerOS is the app Burner makes for its cards. OpenBurner is an open-source app for the same cards, built for two things: using your card on EVM networks Burner doesn't officially support, and giving developers a starting point for their own Burner projects. Your card works with both apps.

## Local vs Hosted Versions

OpenBurner supports two deployment modes with different capabilities:

The mode is set with `NEXT_PUBLIC_APP_MODE` (`local` or `hosted`).

### Local Version — desktop + USB NFC reader (HaLo Bridge)
- **Connection**: a local NFC reader via the HaLo Bridge
- **All features** with your own API keys: pricing (CoinGecko), swaps (0x), NFTs (Alchemy), WalletConnect
- **Development mode**: full debugging and customization
- **API costs**: you pay for your own API usage
- **Fee customization**: can modify the swap fee recipient address in code

### Hosted Version — your phone is the NFC reader
- **Connection**: on a phone, tap your card to the phone directly. On a computer, scan the HaLo Gateway's QR code with your phone, then tap your card to the phone. No reader or bridge install required. Gateway sessions survive brief phone drops, so you reconnect without re-scanning.
- **Optional integrations are enabled per deployment** with server-side keys:
  - **Pricing** — `COINGECKO_API_KEY` (the free Demo tier works) + `NEXT_PUBLIC_PRICING_ENABLED=true`
  - **NFTs** — `ALCHEMY_API_KEY`
  - **Swaps** — `ZEROX_API_KEY` (0.88% platform fee)
  - **dApp connections** — `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- **Bring your own keys**: users can also add their own keys in Settings (stored only in their browser, used for read-only data)

**Note**: Missing keys don't hide features. Without pricing set up, hosted tokens show no dollar values. Swap stays visible, but quotes need a 0x key. **Connect to a dApp** is always there and asks for a WalletConnect project ID if none is set. The NFT gallery explains how to turn on discovery, and you can still add NFTs by contract address. Sending, receiving and managing tokens always work. Pricing was previously disabled on hosted; it now works once a deployer sets `COINGECKO_API_KEY` + `NEXT_PUBLIC_PRICING_ENABLED`.

## Quick Start

### Prerequisites
- **Burner Ethereum card** - [Order here](https://arx-burner.myshopify.com/OPENBURNER)
- **Desktop NFC Reader** - ACR1252U (recommended) or ACR122U (budget option) USB reader
  - Recommended: [ACR1252U on Amazon](https://amzn.to/3ISNwd7)
  - Budget option: [ACR122U on Amazon](https://amzn.to/3WQxGms)
- **Node.js 22.12+**

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
- Next.js 16 + React 19
- TypeScript
- Tailwind CSS 4 (theme and tokens in `app/globals.css`, no `tailwind.config`)
- Zustand (state management)

**Web3 Libraries:**
- ethers.js (blockchain interactions)
- HaLo Bridge WebSocket (USB reader, `lib/burner-bridge.ts`)
- LibHalo (HaLo Gateway pairing and phone NFC)
- Multicall3 (efficient batch RPC calls)

**APIs:**
- CoinGecko API (token prices - both versions, through the app's `/api/coingecko` proxy)
- 0x API (token swaps - both versions)
- Alchemy NFT API (collectible discovery, optional)
- WalletConnect / Reown (dApp connections)
- Public or custom RPC endpoints (blockchain data)

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
- Fetches prices from CoinGecko through the app's proxy

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
import { useEnvironment } from '@/hooks/use-environment';
import { signTransactionSmart } from '@/lib/smart-signer';

// In your component: hosted mode on a phone signs over the phone's NFC
// only when the environment says it's a phone.
const environment = useEnvironment();

// Routes to the active connection (USB bridge, phone gateway or mobile NFC),
// signs with the connected card's key slot, and throws unless the signature
// recovers to the connected address.
const signedTx = await signTransactionSmart(unsignedTx, undefined, pin, environment);
await provider.broadcastTransaction(signedTx);
```

### Parse a Card Key

```typescript
import { parseCardPublicKey } from '@/lib/card/keys';

// Accepts only a valid 33-byte compressed or 65-byte uncompressed secp256k1 key.
// Anything else throws MalformedCardKeyError — keys are never padded or truncated.
const { address, publicKey } = parseCardPublicKey(rawKeyFromCard);
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

Prices are cached to keep CoinGecko calls low, in local and hosted mode alike:

| Token Type | Fresh for | Examples |
|------------|-----------|----------|
| Stablecoins | 2 hours | USDC, USDT, DAI |
| Other Tokens | 30 minutes | ETH, WBTC, all other tokens |

**Cache Layers:**
1. **Memory cache** - Fast, session-only
2. **localStorage** - Persistent across page reloads
3. **Stale-while-revalidate** - A price up to 24 hours old is shown right away while a fresh one loads in the background
4. **Batch fetching** - One request for coins known by ID, plus one per network for tokens looked up by contract address, never one per token

**Refreshing:**
- Opening the token list fetches only prices that are no longer fresh
- The refresh button in the header, and every send or swap, refetches balances and prices
- The `/api/coingecko` proxy also caches responses briefly and rate-limits per IP (see [docs/HOSTING.md](docs/HOSTING.md))

## Token Swaps (Both Versions)

OpenBurner supports token swaps on both local and hosted versions using the [0x Standard Swap API](https://0x.org/docs/category/swap-api). The 0x protocol provides:

- **Decentralized swaps**: No custody of your tokens
- **Best price routing**: Automatically finds optimal swap paths
- **Multi-DEX aggregation**: Routes through multiple decentralized exchanges
- **Gas optimization**: Efficient transaction batching
- **User pays gas fees**: Standard swap API requires users to pay their own gas fees
- **API key required**: 0x API requires authentication for production use

**Note**: OpenBurner uses 0x's **standard swap API**, not their gasless API. Users must have native tokens (ETH, BNB, POL, etc.) to pay for gas fees when executing swaps.

**Swap Fees:**
- **0.88% platform fee** on all swaps (matches popular wallets like MetaMask and Phantom)
- **Transparent pricing**: Fee amount displayed before confirming swap
- **Fees collected in sell token**: Paid in the token you're swapping from
- **Hosted version**: Set at 0.88% (88 basis points) in the swap function code
- **Supports development**: Fees help maintain and improve OpenBurner

**Networks:**
- The preset networks that both 0x and the app's swap proxy support (see `SUPPORTED_SWAP_CHAINS` in `lib/supported-chains.ts`)
- Automatic network detection and routing
- Real-time quote fetching and execution

## Environment Variables

```bash
# Mode: 'local' (USB reader via HaLo Bridge) or 'hosted' (phone as NFC reader)
NEXT_PUBLIC_APP_MODE=local

# --- Local development ---
# Pricing is always on in local mode. The server-side keys below work locally too.
NEXT_PUBLIC_0X_API_KEY=your_0x_api_key_here          # token swaps (legacy: ends up in the client bundle; prefer ZEROX_API_KEY)

# --- Hosted deployment (server-side keys; kept secret, proxied) ---
NEXT_PUBLIC_PRICING_ENABLED=true                     # turns pricing on in hosted mode
COINGECKO_API_KEY=your_key_here                      # pricing (free Demo tier works)
ALCHEMY_API_KEY=your_alchemy_key                     # NFT auto-discovery
ZEROX_API_KEY=your_0x_api_key                        # token swaps
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id # WalletConnect / dApp connections

# --- Hosted abuse protection (optional) ---
ALLOWED_ORIGINS=https://staging.yourapp.com          # extra origins allowed to call /api (own origin is always allowed)
UPSTASH_REDIS_REST_URL=https://...upstash.io         # rate limits shared across instances
UPSTASH_REDIS_REST_TOKEN=your_token
DAILY_CAP_COINGECKO=20000                            # global daily cap per upstream service (deployer and user keys share it)
```

Notes:
- Hosted server-side keys (`COINGECKO_API_KEY`, `ALCHEMY_API_KEY`, `ZEROX_API_KEY`) are read only on the server and proxied, so they never reach the browser. Mark them as **Sensitive** in your host (e.g. Vercel).
- `NEXT_PUBLIC_PRICING_ENABLED=true` is required alongside `COINGECKO_API_KEY` to enable pricing in hosted mode — the key alone isn't enough, since the client needs a public flag to start fetching.
- The API routes only answer your own deployment's origin and send no CORS headers. See [docs/HOSTING.md](docs/HOSTING.md) for the full abuse-protection setup.
- For a free CoinGecko **Demo** key the proxy uses the `x-cg-demo-api-key` header automatically; set `COINGECKO_API_PLAN=pro` only if you have a paid Pro key.
- `npm run dev` sets `NEXT_PUBLIC_APP_MODE=local`; `npm run build` and `npm run dev:hosted` set `hosted`.
- Keys users add under **Settings → API keys** are stored in their browser and override the deployer's keys.

### Getting API Keys

**CoinGecko API Key:**
1. Sign up at [CoinGecko API](https://www.coingecko.com/en/api)
2. Get your free Demo API key from the dashboard
3. Add it to your environment (`.env.local` locally, or your host's env vars when hosted)

**0x API Key:**
1. Sign up at [0x.org](https://0x.org)
2. Get your free API key from the dashboard
3. Add it to your environment

**Alchemy API Key (NFTs):**
1. Sign up at [alchemy.com](https://www.alchemy.com)
2. Create an app and copy its API key
3. Add it as `ALCHEMY_API_KEY`

**WalletConnect Project ID (dApp connections):**
1. Create a project at [cloud.reown.com](https://cloud.reown.com) (formerly WalletConnect Cloud)
2. Copy the ~32-char Project ID
3. Add it as `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` (optionally restrict allowed domains)

**Note**: The 0x API key is used for the standard swap API endpoints (`/swap/allowance-holder/price` and `/swap/allowance-holder/quote`), not the gasless API endpoints.

## Networks

OpenBurner works with any EVM-compatible network. The presets in the network menu are examples, each defined in `lib/supported-chains.ts` with a primary public RPC URL and a backup from a different operator. If the primary stops answering, the app switches to the backup and goes back to the primary a few minutes later (`lib/provider.ts`), and batches are capped at 10 calls. These RPCs are free public services run by other companies (PublicNode, Pocket Network, dRPC and the networks' own teams). They can be slow or go down, and they see your address and the transactions you send. To use other RPCs in your own copy, change `rpcUrls` in `lib/supported-chains.ts`. Add any other network from the menu with its name, chain ID and an RPC URL; OpenBurner checks that the RPC returns that chain ID before saving it. Networks you add are saved in your browser only. Presets also carry explorer, price and swap settings. An added network's coin is priced from the currency symbol you set for it.

Not every preset has every feature. Swaps need the network in `SUPPORTED_SWAP_CHAINS`, collectible discovery needs it in `ALCHEMY_NFT_NETWORKS` (`lib/nft.ts`), and default tokens come from `lib/token-lists.ts`. Robinhood Chain, Monad, HyperEVM, Ink, Gnosis, Celo and Cronos have none of these yet.

## Token Management

### Default Token Lists

OpenBurner uses **streamlined token lists** focused on core tokens for optimal performance. The following essential tokens are pre-configured for each network:

**Ethereum Mainnet:**
- WETH, USDC, USDT, WBTC

**Base:**
- WETH, USDC

**Arbitrum One:**
- WETH, USDC, USDT, WBTC

**Optimism:**
- WETH, USDC, USDT, WBTC, OP

**Polygon:**
- POL (native), WETH, USDC, USDT, WBTC

**Scroll:**
- WETH, USDC, USDT

**Linea:**
- WETH, USDC, USDT

**zkSync Era:**
- WETH, USDC, USDT

Other networks start with no default tokens.

### Adding Custom Tokens

Use **Add a token** in the token list and paste the token's contract address. OpenBurner reads its symbol, name and decimals from the network (or CoinGecko if that fails) and saves the token in your browser for that network.

To ship a token to everyone in your own build, add it to `lib/token-lists.ts`:

```typescript
// In lib/token-lists.ts
1: [
  { address: "0xYourTokenAddress", symbol: "TOKEN", name: "Your Token", decimals: 18 },
  // ... existing tokens
]
```

## Bridge Connection (Local Version)

The USB reader and HaLo Bridge are used in local mode only. The hosted app on desktop connects through the HaLo Gateway instead, since a page served over HTTPS can't open the bridge's local `ws://` connection.

### How It Works

1. **WebSocket**: `lib/burner-bridge.ts` talks to the bridge at `ws://127.0.0.1:32868/ws`
2. **PIN prompt**: When the card needs your PIN, the bridge's own consent page opens in a small window (`http://localhost:32868/consent`)
3. **Signature check**: Every signature is checked against your connected card before it's used

### Bridge Requirements

- **Halo Bridge Software**: Must be installed and running locally
- **USB NFC Reader**: Compatible reader connected to computer
- **Burner Ethereum card**: Physical card placed on reader

### Security Considerations

- Bridge communication is restricted to localhost only
- Use the HaLo Gateway (your phone as the reader) when the bridge isn't available

See [BRIDGE_SECURITY.md](./docs/BRIDGE_SECURITY.md) for more.

## Project Structure

```
openburner/
├── app/                    # Next.js app
│   ├── page.tsx           # Main entry (connect screen or dashboard)
│   └── api/               # Proxies: coingecko, swap/quote, nft, config-status
├── proxy.ts                # Origin guard for every /api route
├── components/             # React components (dashboard, send, swap, NFTs, WalletConnect, signing)
├── lib/                    # Core libraries
│   ├── card/              # Card key parsing, tx building, signature checks
│   ├── burner.ts          # USB bridge connect + commands
│   ├── burner-gateway.ts  # Phone gateway pairing + commands
│   ├── mobile/nfc.ts      # Mobile Web NFC connect + commands
│   ├── smart-signer.ts    # Routes signing to the active connection
│   ├── supported-chains.ts # Preset networks, their RPCs and swap support
│   ├── provider.ts        # Shared RPC providers with backup failover
│   ├── log.ts             # The only logger (never prints card data)
│   ├── rate-limit.ts      # Per-IP limits + daily caps for the proxies
│   ├── multicall.ts       # Batch RPC calls
│   ├── price-oracle.ts    # Price fetching
│   └── token-lists.ts     # Token metadata
├── store/                  # Zustand state
├── design/brand/           # Logo source (flame.json) and its build script
├── stories/                # Ladle stories for every screen
├── .ladle/                 # Story config, fakes and example data
└── tests/                  # Vitest suite
```

## Security Notes

### What's Protected
✅ **Private keys** - Never leave the secure element chip  
✅ **Signing operations** - Happen inside hardware  
✅ **Key generation** - Done on-chip, not extractable
✅ **Card keys** - Validated as real secp256k1 keys; malformed keys end the connection
✅ **Signatures** - Each one must recover to your connected address before it's sent
✅ **Proxy API keys** - Server-side only, and the routes refuse other websites
✅ **Logs** - No keys, signatures, pairing links or PINs are logged

### What's Your Responsibility
⚠️ **Transaction verification** - Always verify recipient address and amount  
⚠️ **RPC endpoint trust** - Use trusted RPC providers  
⚠️ **Physical security** - Keep your Burner Ethereum card secure  
⚠️ **Bridge security** - Only run bridge on trusted local machine  
⚠️ **Hosted vs local** - The hosted app at app.openburner.xyz is convenient; run it locally if you'd rather trust your own build

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

### "This card returned an unreadable key"
- The card answered with a key that isn't a valid public key, so OpenBurner stopped instead of guessing
- Re-tap and hold the card still; if it repeats, contact support

### "This isn't the card you connected"
- The signature came from a different card or key than the one you connected with
- Tap the same card you signed in with, or disconnect and reconnect

### Transaction fails
- Verify you have enough ETH for gas
- Check network is selected correctly
- Ensure RPC endpoint is responsive

## Development

```bash
# Run dev server
npm run dev

# Lint (ESLint 10 flat config in eslint.config.mjs, no-console enforced)
npm run lint

# Tests
npm test

# Screens: every screen and state in Ladle, no card or network needed
npm run stories

# Screens as a static site (ladle-build/)
npm run stories:build

# Logo: rebuild the flame paths, logo SVG, app icons and favicon from design/brand/flame.json
npm run brand

# Build for production
npm run build
```

### Screens (Ladle)

`stories/` holds every screen and state of the app as a [Ladle](https://ladle.dev) story: welcome, dashboard, send, signing, swap and connected apps, on phone and desktop widths, in light and dark (press `d`). Stories render the real components, so editing a component updates its stories as you save.

Stories never touch a card or an RPC. The only API call is from the Settings story, which fetches `/api/config-status`; Ladle doesn't serve it, so Settings shows no deployer keys. `.ladle/vite.config.ts` swaps the modules that would (RPC, prices, quotes, ENS, the card signer, WalletConnect, the connect transports) for fakes in `.ladle/mocks/`, fed by example data in `.ladle/fixtures.ts`. The example collectibles are real NFTs on Ethereum, with their art saved in `.ladle/assets/` so they load offline; the Collectibles story switches to Ethereum to show them. Each story picks its situation with knobs from `.ladle/scenario.ts`: hosted or local, prices on or off, a wrong PIN, a failed transaction, an approval needed, and so on.

A story can also act like a person after it opens, through `Scene` steps (`.ladle/scene.tsx`): click a button, type into a field, wait for text. That's how stories open straight on a filled-in review or a quote, and how the "Whole flow" stories play a send or swap from start to finish with a pretend card.

To add a screen state, copy a nearby story and change its knobs or steps.

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
2. Modify chain configurations in `lib/supported-chains.ts`
3. Update token lists in `lib/token-lists.ts`
4. Customize UI in `components/` and `app/`
5. Deploy to Vercel or run locally

**Fee Recipient Address:**
- **Default fee recipient**: `0x084A66020a0CAc73a7161dD473740C82295683Fb` (configured in `lib/swap-api.ts` and `app/api/swap/quote/route.ts`)
- **Keeping it is appreciated**: If you fork OpenBurner and use it, maintaining the default fee recipient address helps support the project
- **Fee rate**: Currently set at 0.88% (88 basis points) in the swap function code

**Use cases for forking:**
- Add support for specific L2s or custom chains
- Build a branded wallet for your project
- Experiment with new Burner Ethereum card features
- Create specialized tools (NFT minting, DAO voting, etc.)

**Code structure:**
- `app/` - Next.js pages and routing
- `components/` - React components for UI
- `lib/` - Core libraries (Burner, multicall, pricing)
- `store/` - Zustand state management

## How can I support OpenBurner?

If you find OpenBurner useful, there are a few ways you can help:

**Automatic Support (Easiest):**
- Use token swaps - Every swap includes a 0.88% platform fee that supports development
- Keep default fee recipient - When running locally, the default fee address supports the project
- Use hosted version - Swaps on the hosted version automatically support development

**Community Support:**
- Share your feedback by [opening an issue](https://github.com/rdyplayerB/openburner/issues), reaching out on [𝕏](https://x.com/rdyplayerB), [Farcaster](https://farcaster.xyz/rdyplayerb), or [email me](mailto:rdyplayerb@gmail.com)
- You can also find me in the official [Burner Telegram channel](https://t.me/burnerofficial) (@rdyplayerB)
- Share OpenBurner on [𝕏](https://x.com/rdyplayerB) or [Farcaster](https://farcaster.xyz/rdyplayerb)
- Use my link to get a [Burner](https://arx-burner.myshopify.com/OPENBURNER) or [USB NFC reader](https://amzn.to/3ISNwd7) (ACR1252U recommended, [ACR122U budget option](https://amzn.to/3WQxGms))

**Direct Support:**
- Support development with a donation to `rdyplayerB.eth`
- Fork the project and experiment with your own ideas

**Why the swap fee?**
The 0.88% platform fee is competitive with popular wallets (MetaMask, Phantom) and helps maintain OpenBurner's development, server costs, and continuous improvements. Since OpenBurner is open source, this fee is how the project funds itself.

## Links

- **GitHub**: https://github.com/rdyplayerB/openburner
- **Get a Burner Ethereum card**: [Order here](https://arx-burner.myshopify.com/OPENBURNER)
- **LibHalo Documentation**: https://github.com/arx-research/libhalo
- **ethers.js Docs**: https://docs.ethers.org

---

Built by [@rdyplayerB](https://github.com/rdyplayerB) ([𝕏](https://x.com/rdyplayerB) / [Farcaster](https://farcaster.xyz/rdyplayerb)) • MIT License

