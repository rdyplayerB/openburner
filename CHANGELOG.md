# Changelog

All notable changes to OpenBurner will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.4.0] - 2026-10-11 - Security Hardening & Faster Loads

### Security
- **Card keys are validated, never repaired** - A key must be exactly a valid secp256k1 public key; malformed keys end the connection instead of being padded or truncated into an address nobody controls
- **Every signature is checked** - Transactions, messages and typed data must recover to the connected address before they're broadcast or returned to a dApp
- **No silent key-slot fallback** - Signing always uses the connected card's key slot; older sessions without one are asked to reconnect
- **API routes locked to the app** - `/api` answers only the app's own origin (plus `ALLOWED_ORIGINS`), sends no CORS headers, validates every input, and the CoinGecko proxy only allows the endpoints the app uses
- **Shared rate limits** - Optional Upstash Redis backing and `DAILY_CAP_*` limits per upstream key
- **No card data in logs** - Keys, signatures, pairing links and PINs are never logged; production builds strip debug logs. A "Debug logging" switch in Settings helps support sessions
- **Dependencies patched** - Next.js 15.5 and React 19 (fixes the critical Next.js advisories), ethers 6.17, libhalo 1.20, WalletConnect 2.26; production `npm audit` is clean

### Changed
- **First load from 969 kB to 111 kB** - WalletConnect, the card libraries and each connect screen load on demand
- **Faster balances and prices** - One multicall for native and token balances, shared RPC providers, batched CoinGecko price calls
- **Honest transaction results** - Failed and still-pending transactions are shown as such, not as "complete"
- **Send review step** - Recipient, amount, network and estimated fee before you tap; Max keeps a gas reserve
- **Swap fixes** - Correct minimum received, fee from the quote, approval flow no longer gets stuck
- **Desktop pairing progress** - The QR screen shows each stage and any errors, with a fresh-QR option
- **Accessible modals** - One shared dialog with Escape, focus handling and scroll lock; toasts always show above modals
- **Unichain mainnet** - Unichain now points at mainnet (chain 130)

### Fixed
- Refresh now reloads token balances, and balances refresh after every send and swap
- An RPC outage no longer looks like an empty wallet
- Mobile NFC cancel/timeout no longer leaves "Reading card…" spinning
- Missing files return 404 instead of the app page; `manifest.json` updates reach installed apps

## [1.3.0] - 2026-06-14 - WalletConnect, NFTs & Hosted Pricing

### Added
- **WalletConnect** - Connect your Burner to any dApp by scanning a WalletConnect QR code
- **NFT Gallery** - View, send and receive ERC-721 & ERC-1155 collectibles, with optional Alchemy auto-discovery
- **Hosted Pricing** - Live CoinGecko prices on the hosted app
- **Resilient Gateway Sessions** - Phone-as-reader sessions survive brief drops

## [1.2.0] - 2025-01-26 - Token Swaps with 0x Integration

### Added
- **Token Swaps via 0x Protocol** - Comprehensive swap functionality across 13 networks
  - Support for ERC-20 to ERC-20, ERC-20 to native, and native to ERC-20 swaps
  - Real-time price quotes with customizable slippage tolerance (default 0.5%)
  - Price impact warnings and transaction confirmation
  - Supported networks: Ethereum, Base, Arbitrum, Optimism, Polygon, BNB Chain, Avalanche, Blast, Linea, Mantle, Mode, Scroll, zkSync Era
  - Complete swap UX flow with automatic token approval handling
  - Transaction completion modal with block explorer links

## [1.1.0] - 2025-01-21 - Architecture Enhancement & Library Integration

### Added
- **Dual Library Architecture** - Enhanced card communication with both LibBurner and LibHalo
  - LibBurner for Burner card communication via WebSocket
  - LibHalo for HaLo card communication and NFC operations
  - Improved compatibility across different card types and connection methods

- **Enhanced Mobile NFC Support** - Direct smartphone NFC integration
  - Web NFC API support for Chrome/Android devices
  - Fallback to gateway mode for iOS and other browsers
  - Streamlined mobile user experience with single-tap connection

- **Comprehensive Gateway Integration** - Smartphone-based NFC reader functionality
  - QR code pairing for desktop-to-mobile connection
  - Secure WebSocket communication between devices
  - Real-time connection status monitoring

### Changed
- **App Description** - Updated metadata description to "Start using OpenBurner"
- **Connection Architecture** - Unified connection handling across environments
  - Hosted environments default to gateway mode for optimal user experience
  - Local environments support both bridge and gateway modes
  - Environment-aware connection method selection

- **Documentation Structure** - Updated technical documentation
  - Added comprehensive mobile NFC integration guide
  - Updated architecture diagrams to reflect dual library usage
  - Enhanced security considerations for gateway connections

### Supported Setups
- **Local + Desktop + Bridge** - USB NFC reader
- **Local + Desktop** - Smartphone as NFC reader via Halo Gateway
- **Hosted + Mobile** - Tap smartphone NFC directly
- **Hosted + Desktop** - Smartphone as NFC reader via Halo Gateway

### Technical Improvements
- **Service Worker Caching** - Improved cache invalidation strategy
  - Version-based cache management for reliable deployments
  - Automatic cache clearing on new releases
  - Enhanced offline functionality

- **Error Handling** - Robust connection failure management
  - Graceful fallback between connection methods
  - Clear user feedback for connection issues
  - Automatic retry mechanisms for transient failures

## [1.0.1] - 2024-12-19 - Minor Updates

## [1.0.0] - 2024-12-19 - First Stable Release

### Changed
- **Project Structure** - Removed `/website` directory
  - Consolidated to single application running from root directory
  - Updated all documentation to reflect new structure
  - Removed DEPLOYMENT.md (was specific to website deployment)

### Added
- **Price Oracle Integration** - Real-time cryptocurrency prices from CoinGecko
  - Multi-tier caching (memory + localStorage)
  - Stale-while-revalidate pattern for instant UI updates
  - Differential cache durations based on token volatility
  - 73-81% reduction in API calls vs naive implementation
  - Support for 25+ tokens across 9 networks

- **Comprehensive Documentation** - Organized documentation structure
  - Setup guides (installation, bridge, gateway, environment)
  - Technical docs (architecture, API reference, security, price oracle, caching)
  - User guides (general usage, network management, token management)
  - Centralized docs index with clear navigation

- **Token Price Display** - USD values for all supported tokens
  - Real-time prices in wallet dashboard
  - Per-token USD values in token list
  - Graceful fallback for unsupported tokens
  - Automatic price refresh with caching

### Changed
- **Documentation Organization** - Moved all docs to `/docs` directory
  - `DOCS.md` - Complete documentation in single file
  - Updated README.md with better overview and navigation

- **Architecture Documentation** - Updated with current implementation
  - Added price oracle integration section
  - Updated component descriptions
  - Added caching strategy overview
  - Improved accuracy throughout

### Fixed
- Documentation now accurately reflects current codebase
- All internal doc links updated to new structure

## [0.1.0] - Initial Release

### Added
- HaLo NFC chip integration for hardware-secured keys
- Multi-chain support (Ethereum, Base, Arbitrum, Optimism, Polygon, etc.)
- Token management with auto-detection
- Send transactions for native and ERC-20 tokens
- Network switching and custom RPC support
- Multicall3 integration for efficient balance queries
- State persistence with Zustand and localStorage
- Modern UI with Tailwind CSS and Framer Motion
- WebSocket bridge communication
- Key slot management (up to 9 slots per chip)
- Transaction signing with physical chip tap
- EIP-1559 transaction support

### Security
- Hardware-isolated private keys
- EAL6+ certified secure element
- Physical authorization required for signing
- No private key exposure to application

---

## Future Plans

### Planned Features
- NFT support (ERC-721, ERC-1155)
- Transaction history
- PIN protection UI
- WalletConnect integration
- EIP-712 typed data signing
- Transaction simulation
- Multi-signature support
- Hardware wallet comparison mode

### Performance Improvements
- Service worker caching
- Optimistic UI updates
- Background sync
- Predictive prefetching

### Security Enhancements
- Formal security audit
- Bug bounty program
- Enhanced transaction review
- Trusted display verification

