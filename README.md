# OpenBurner 🔥

An open source Web3 wallet for Burner Ethereum hardware wallets. Built with Next.js, TypeScript, and ethers.js.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📂 About

OpenBurner is a locally-run wallet application for Burner Ethereum hardware wallets. It is designed to run **locally only** on your machine, providing maximum security by eliminating remote attack vectors. Your private keys remain secure in the Burner card's secure element and never leave the hardware.

## ✨ Features

### Core Functionality
- 🔐 **Hardware-Secured Keys** - Private keys never leave the secure element chip
- 🌐 **Multi-Chain Support** - Extends Burner use across Ethereum, Base, Arbitrum, Optimism, BNB Chain, Avalanche, Blast, Linea, Mantle, Mode, Polygon, Scroll, Unichain, and any custom EVM chain
- 💰 **Token Management** - View balances for ETH and ERC-20 tokens
- 💸 **Send Transactions** - Native and ERC-20 transfers with hardware signing
- 📊 **Real-Time Prices** - CoinGecko integration with intelligent caching
- 🚀 **Custom RPCs** - Connect to any EVM-compatible chain

### Technical Highlights
- **Multicall3 Integration** - Batch RPC calls for efficient balance queries
- **Advanced Caching** - Multi-tier price caching with stale-while-revalidate
- **Burner Card Integration** - NFC-based hardware wallet support
- **Modern Stack** - Next.js 14, TypeScript, Tailwind CSS, ethers.js v6
- **State Persistence** - localStorage-backed state management with Zustand

## 🚀 Quick Start

### Prerequisites

1. **Burner Card** - [Order here (10% off)](https://arx-burner.myshopify.com/OPENBURNER)
2. **Desktop NFC Reader** - ACR1252U or compatible USB NFC reader ([Get on Amazon](https://amzn.to/3ISNwd7))
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
│  • Price Oracle Integration             │
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

## 🔒 Security Model

### Hardware Security Layer
- **Secure Element** - EAL6+ certified tamper-resistant chip
- **Private Keys** - Generated and stored on-chip, never exposed
- **On-Chip Signing** - Cryptographic operations happen in hardware
- **Physical Security** - Requires physical chip tap to sign

### Application Security
- **No Key Exposure** - Only public keys/addresses handled by app
- **Transaction Review** - User verifies all transaction details
- **HTTPS RPCs** - Encrypted communication with blockchain nodes
- **Local Bridge** - Bridge only accessible on localhost

### Attack Surface
✅ **Protected**: Private keys, signing operations, key generation  
⚠️ **User Responsibility**: Transaction verification, RPC selection, physical chip security

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4
- **State**: Zustand 4.5 with localStorage persistence
- **UI Components**: Lucide React icons, Framer Motion animations

### Blockchain
- **Library**: ethers.js v6
- **Networks**: EVM-compatible chains
- **Standards**: ERC-20, EIP-1559, Multicall3
- **Price Data**: CoinGecko API with multi-tier caching

### Hardware Integration
- **libburner**: @arx-research/libburner 1.0
- **Transport**: WebSocket bridge on port 32868
- **Protocol**: PC/SC for NFC reader communication

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

## 🎯 Key Features Explained

### Multi-Chain Token Detection
Automatically detects popular ERC-20 tokens on 9 different chains using Multicall3 for efficient batch queries.

### Advanced Price Caching
- **Multi-tier caching**: Memory + localStorage
- **Differential durations**: Stablecoins cached 30min, major tokens 5min, others 3min
- **Stale-while-revalidate**: Instant UI updates while fetching fresh data
- **73-81% API call reduction** vs naive implementation

### Hardware Security
Burner cards provide hardware wallet-level security in an NFC form factor:
- Private keys generated on-chip
- Tamper-resistant secure element
- Physical tap required for signing
- Up to 9 separate key slots

## 📁 Project Structure

```
openburner/
├── app/                          # Next.js app pages
├── components/                   # React components
├── lib/                          # Core libraries
│   ├── burner.ts                # Burner card integration
│   ├── burner-bridge.ts         # Bridge WebSocket client
│   ├── price-oracle.ts          # CoinGecko integration
│   ├── token-lists.ts           # Token metadata
│   └── multicall.ts             # Batch RPC calls
├── store/                        # Zustand state management
└── DOCS.md                       # Complete documentation
```

## 🧪 Development

```bash
# Install dependencies
npm install

# Run development server (with hot reload)
npm run dev

# Type checking
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

### Environment Variables

```env
# CoinGecko API (optional, free tier works without key)
NEXT_PUBLIC_COINGECKO_API_KEY=
NEXT_PUBLIC_COINGECKO_API_URL=https://api.coingecko.com/api/v3
```

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
- Use the [affiliate link to get a Burner (10% off)](https://arx-burner.myshopify.com/OPENBURNER) or the [Amazon affiliate link for the recommended USB NFC reader](https://amzn.to/3ISNwd7)
- Support development with a donation to `rdyplayerB.eth`
- Fork the project and experiment with your own ideas

## Links

- **GitHub**: https://github.com/rdyplayerB/openburner
- **Get a Burner Card**: [Order here (10% off)](https://arx-burner.myshopify.com/OPENBURNER)
- **LibBurner Documentation**: https://github.com/arx-research/libburner
- **ethers.js Docs**: https://docs.ethers.org

---

Built by [@rdyplayerB](https://github.com/rdyplayerB) ([𝕏](https://x.com/rdyplayerB) / [Farcaster](https://farcaster.xyz/rdyplayerb)) • MIT License
