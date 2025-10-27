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
- 🌐 **Multi-Chain Support** - Extends Burner use across Ethereum, Base, Arbitrum, Optimism, BNB Chain, Avalanche, Blast, Linea, Mantle, Mode, Polygon, Scroll, Unichain, and any custom EVM chain
- 💰 **Token Management** - View balances for ETH and ERC-20 tokens
- 💸 **Send Transactions** - Native and ERC-20 transfers with hardware signing
- 🔄 **Token Swaps** - Decentralized swaps using [0x Standard Swap API](https://0x.org/docs/category/swap-api) (local: requires API key, hosted: limited)
- 📊 **Real-Time Prices** - CoinGecko integration (local version only)
- 🚀 **Custom RPCs** - Connect to any EVM-compatible chain

### Technical Highlights
- **Multicall3 Integration** - Batch RPC calls for efficient balance queries
- **Advanced Caching** - Multi-tier price caching (local version only)
- **Burner Card Integration** - NFC-based hardware wallet support
- **Modern Stack** - Next.js 14, TypeScript, Tailwind CSS, ethers.js v6
- **State Persistence** - localStorage-backed state management with Zustand

## Local vs Hosted

**Local Version (Full Features)**
- Real-time pricing with your CoinGecko API key
- Token swaps with your 0x Standard Swap API key
- Complete wallet functionality
- Development and debugging features

**Hosted Version (Pricing Disabled)**
- Limited token swaps (basic functionality)
- Core wallet features (send, receive, manage)
- Shows "-" instead of USD prices (with helpful tooltip)
- No API costs or setup required
- Deploy with limited functionality (API keys required for full features)

*Note: Real-time prices and token swaps require running locally with your own CoinGecko and 0x API keys. Hosted version has limited functionality to avoid API costs. OpenBurner uses 0x's standard swap API (not gasless) - users must pay their own gas fees.*

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
│  • Price Oracle (local only)           │
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
- Support development with a donation to `rdyplayerB.eth`
- Fork the project and experiment with your own ideas

## Links

- **GitHub**: https://github.com/rdyplayerB/openburner
- **Get a Burner Card**: [Order here](https://arx-burner.myshopify.com/OPENBURNER)
- **LibBurner Documentation**: https://github.com/arx-research/libburner
- **ethers.js Docs**: https://docs.ethers.org

---

Built by [@rdyplayerB](https://github.com/rdyplayerB) ([𝕏](https://x.com/rdyplayerB) / [Farcaster](https://farcaster.xyz/rdyplayerb)) • MIT License
