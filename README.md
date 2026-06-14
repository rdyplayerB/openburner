# 🔥 OpenBurner

An open source Web3 wallet for Burner Ethereum hardware wallets. Built with Next.js, TypeScript, and ethers.js.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What is Burner?

[Burner](https://burner.pro) is an affordable, credit-card-sized hardware wallet built for gifting and everyday crypto use. It uses the same secure chip technology found in traditional hardware wallets like Ledger or Trezor, but reimagines the hardware wallet experience with a seedless design, web-based interface, and NFC connectivity. Burner combines the security of cold storage with the convenience of a software wallet, offering an accessible self-custody solution for spending, saving, and gifting crypto securely.

## What is OpenBurner?

OpenBurner is a wallet application for Burner Ethereum hardware wallets. It supports both local and hosted deployment modes. Private keys remain in the card's secure element.

## ✨ Features

### Core Functionality
- 🔐 **Hardware-Secured Keys** - Private keys never leave the secure element chip
- 📱 **Flexible Connectivity** - Use a desktop USB NFC reader (HaLo Bridge) locally, or turn your phone into the reader via the HaLo Gateway when hosted — scan a QR, tap your card. Hosted sessions stay alive through brief phone sleeps so you keep working without re-pairing
- 🌐 **Multi-Chain Support** - Extends Burner use across Ethereum, Base, Arbitrum, Optimism, BNB Chain, Avalanche, Blast, Linea, Mantle, Mode, Polygon, Scroll, Unichain, and any custom EVM chain
- 💰 **Token Management** - View balances for ETH and ERC-20 tokens
- 💸 **Send Transactions** - Native and ERC-20 transfers with hardware signing
- 🔄 **Token Swaps** - Decentralized swaps using [0x Standard Swap API](https://0x.org/docs/category/swap-api) (requires a 0x API key — your own locally, or one configured by the deployer when hosted)
- 🖼️ **NFT Management** - View, receive, and send ERC-721 & ERC-1155 collectibles with a gallery view, full detail pages, and OpenSea links. Auto-discovery via an optional [Alchemy NFT API](https://www.alchemy.com) key, plus manual add-by-contract on any chain
- 🔗 **WalletConnect** - Connect to dApps by scanning a WalletConnect QR (powered by [Reown](https://reown.com)). A header chip shows connected dApps with a live indicator and lets you manage or disconnect them
- 📊 **Real-Time Prices** - CoinGecko price feeds, available in both local and hosted modes (hosted needs a CoinGecko API key — the free Demo tier works)
- 🚀 **Custom RPCs** - Connect to any EVM-compatible chain

### Technical Highlights
- **Multicall3 Integration** - Batch RPC calls for efficient balance queries
- **Advanced Caching** - Multi-tier price caching with a rate-limited server-side proxy
- **Resilient Gateway Sessions** - Hosted phone-as-reader connections survive brief phone sleeps and resume in place, no constant QR re-scanning
- **Burner Card Integration** - NFC-based hardware wallet support (local bridge or hosted gateway)
- **Modern Stack** - Next.js 14, TypeScript, Tailwind CSS, ethers.js v6
- **State Persistence** - localStorage-backed state management with Zustand

## Local vs Hosted

OpenBurner runs in two modes, selected by `NEXT_PUBLIC_APP_MODE`:

**Local (`local`)** — desktop + USB NFC reader via HaLo Bridge
- Connects to your Burner through a local NFC reader
- Full functionality (pricing, swaps, NFTs, sends) using your own API keys
- Best for development and power users

**Hosted (`hosted`)** — phone as the NFC reader via HaLo Gateway
- Pair by scanning a QR with your phone, then tap your Burner to sign — no reader or bridge install needed
- Optional integrations are enabled per deployment with server-side keys:
  - **Pricing** — `COINGECKO_API_KEY` (free Demo tier works) + `NEXT_PUBLIC_PRICING_ENABLED=true`
  - **NFTs** — `ALCHEMY_API_KEY`
  - **Swaps** — `ZEROX_API_KEY`
  - **dApp connections** — `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- Users can also bring their own keys in **Settings** (stored only in their browser, used for read-only data)

*Any integration without a configured key is simply hidden — the wallet's core send/receive/manage functions always work. OpenBurner uses 0x's standard swap API (not gasless), so users pay their own gas fees.*

## 🚀 Quick Start

### Prerequisites

1. **Burner Card** - [Order here](https://arx-burner.myshopify.com/OPENBURNER)
2. **Desktop NFC Reader** - ACR1252U (recommended) or ACR122U (budget option) USB NFC reader
   - Recommended: [ACR1252U on Amazon](https://amzn.to/3ISNwd7)
   - Budget option: [ACR122U on Amazon](https://amzn.to/3WQxGms)
3. **HaLo Bridge** - Local WebSocket bridge software ([HaLo Tools](https://github.com/arx-research/libhalo/releases))
4. **Node.js 18+** - [Download](https://nodejs.org)

### Installation

```bash
# Clone the repository
git clone https://github.com/rdyplayerB/openburner.git
cd openburner

# Install dependencies
npm install

# Create environment file
cp env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### HaLo Bridge Setup

Install and run the HaLo Bridge to connect your NFC reader. The bridge runs on `ws://127.0.0.1:32868/ws` by default.

See **[DOCS.md](DOCS.md)** for complete setup instructions.

## 📖 Documentation

**[→ Read the full documentation](DOCS.md)**

Complete guide covering:
- Installation & setup
- Architecture
- HaLo Bridge configuration
- API reference
- Security model
- Troubleshooting

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│       Web Application (Next.js)         │
│  • Wallet UI                            │
│  • Transaction Building                 │
│  • Token Management                     │
│  • Price Oracle                         │
└─────────────┬───────────────────────────┘
              │
              │ WebSocket (127.0.0.1:32868)
              ↓
┌─────────────────────────────────────────┐
│          HaLo Bridge (Local)            │
│  • NFC Communication                    │
│  • Command Routing                      │
│  • PC/SC Interface                      │
└─────────────┬───────────────────────────┘
              │
              │ NFC (13.56 MHz)
              ↓
┌─────────────────────────────────────────┐
│       Burner NFC Chip (Secure Element)  │
│  • Private Key Storage                  │
│  • Transaction Signing                  │
│  • ECDSA Operations                     │
└─────────────────────────────────────────┘
```

*Hosted mode replaces the local HaLo Bridge + USB reader with the HaLo Gateway, using your phone's NFC as the reader (pair via QR, tap to sign). Keys still never leave the card's secure element either way.*

## 🔒 Security

Your private keys never leave the Burner card's secure element (EAL6+ certified). All signing happens on-chip. The app only handles public keys and coordinates transactions via the local bridge.

## 📊 Supported Networks

**Everything BurnerOS supports:**
- Ethereum, Base, Arbitrum, Optimism

**Plus additional chains:**
- BNB Chain
- Avalanche  
- Blast
- Linea
- Mantle
- Mode
- Polygon
- Scroll
- Unichain

**Plus any custom EVM-compatible chain via Custom RPC configuration**

## 📝 License & Usage

This project is licensed under the MIT License. You can:

- Use it for personal or commercial purposes
- Modify and customize the code
- Fork and build your own version
- Distribute your modified versions

See the [LICENSE](LICENSE) file for full terms.

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

**Fee Recipient Address:**
- **Default fee recipient**: `0x084A66020a0CAc73a7161dD473740C82295683Fb` (configured in `lib/swap-api.ts` and `app/api/swap/quote/route.ts`)
- **Keeping it is appreciated**: If you fork OpenBurner and use it, maintaining the default fee recipient address helps support the project
- **Fee rate**: Currently set at 0.88% (88 basis points) in the swap function code

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
- Use my link to get a [Burner](https://arx-burner.myshopify.com/OPENBURNER) or [USB NFC reader](https://amzn.to/3ISNwd7) (ACR1252U recommended, [ACR122U budget option](https://amzn.to/3WQxGms))
- Make token swaps - Using token swaps is a great way to support the project (platform fee included). If you fork OpenBurner, maintaining the default fee recipient address is appreciated
- Support development with a donation to `rdyplayerB.eth`

## Links

- **GitHub**: https://github.com/rdyplayerB/openburner
- **Get a Burner Card**: [Order here](https://arx-burner.myshopify.com/OPENBURNER)
- **LibBurner Documentation**: https://github.com/arx-research/libburner
- **ethers.js Docs**: https://docs.ethers.org

---

Built by [@rdyplayerB](https://github.com/rdyplayerB) ([𝕏](https://x.com/rdyplayerB) / [Farcaster](https://farcaster.xyz/rdyplayerb)) • MIT License
