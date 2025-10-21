# Changelog

All notable changes to OpenBurner will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

