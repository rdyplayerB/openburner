# Changelog

All notable changes to OpenBurner will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.1] - 2026-11-18 - Network Update

### Added
- **Monad, HyperEVM, Ink, Gnosis, Celo and Cronos** - Now in the network menu, each with two public RPCs from different operators that held up under load. Swaps and collectible discovery aren't available on them yet
- **A note on public RPCs** - The network menu says built-in networks use free public RPCs run by other companies, and Settings → About says OpenBurner comes as is under the MIT license

### Changed
- **Backup RPCs** - Where a network's own RPC refused requests under load, Pocket Network is now the backup: Ethereum, Base, Arbitrum, OP Mainnet, Robinhood Chain and Mantle. After switching to a backup, the app goes back to the first RPC a few minutes later
- **OP Mainnet logo** - Now Optimism's current OP Mainnet symbol
- **Robinhood Chain logo** - More room around the feather

### Removed
- **Blast** - Blast shut down in October 2026, so it's no longer in the network menu. If Blast was the last network you used, the app opens on Ethereum
- **Mode** - Mode sees very little use now, so it's no longer in the network menu. If you were using it, it stays as one of your custom networks

### Fixed
- **Version in Settings** - Showed v1.4.0; it now comes from the release itself
- **Apps adding a built-in network** - An app asking to add a network the app already has now just switches to it, instead of leaving a duplicate entry in your custom networks

## [1.5.0] - 2026-11-17 - Design Refresh

### Added
- **Tap-your-card signing** - PIN and card tap are one sheet with a live step list (Prepare → Sign with your Burner → Send) and a hint for your reader: phone, HaLo Gateway or USB. An animation shows the tap: the card meets the top of the phone and the phone buzzes, or rings ripple out where the card lands on a USB reader
- **Activity** - Sends, swaps, approvals, NFT transfers and dApp transactions from this device, grouped by day, with live pending/failed status
- **Readable dApp requests** - "Approve unlimited USDC", "Sign in to app.uniswap.org" instead of raw data; warnings for unlimited approvals, collection-wide NFT access, marketplace orders, sign-in domain mismatches and unverified or scam sites, which need an extra confirmation
- **Token details** - Tap any token for its balance, value, Send/Swap and contract address
- **ENS and recent recipients** - Send to `name.eth`, paste in one tap, pick from your last recipients; your own ENS name shows on the dashboard
- **Any EVM network** - Networks you add are saved only after their RPC confirms the chain ID, can have their own currency symbol, and work right away with apps you've already connected
- **Robinhood Chain** - Now in the network menu. Swaps, default tokens and collectible discovery aren't available on it yet

### Changed
- **Redrawn logo** - The flame is redrawn cleanly from circles and smooth curves (it was an auto-trace) as one solid flame used at every size, with a favicon drawn pixel by pixel at 16 px and new app icons. The wordmark is one colour, with the flame as the only orange and new proportions between flame and name, and the flame now matches the app's accent orange in light and dark
- **New dashboard** - Two columns on desktop (account + assets/activity), one clean column on phones; identicon, balance that animates on change, and a native-balance headline when prices are off instead of "$—"
- **New Send** - Large amount entry with USD toggle, token switcher in the sheet, a button that says what's missing, and a review step with the full recipient address (ends highlighted) and first-time-recipient warnings
- **New Swap** - Opens on your native token, quotes as you type, keeps the main button visible, shows balances on both sides and folds rate, impact, minimum received and fees into one row
- **New connect screen** - The app opens straight on one centred card with the tap for your reader: your phone, your phone as a reader for your computer, or a USB reader. Local mode shows live bridge and card status, and "What is OpenBurner?" links to the website
- **Bottom sheets on phones** - Every dialog opens from the bottom and stays above the keyboard
- **Clearer, calmer visuals** - One shape for token icons with network badges, sentence-case labels, orange reserved for actions, readable button contrast (WCAG AA) and a clear disabled state
- **One transaction screen** - Sent → Confirming → Confirmed in a single sheet, with explorer link
- **Updated dependencies** - Next.js 16, React 19.3, Tailwind CSS 4 and libhalo 1.22. Running it yourself now needs Node.js 22.12 or later

### Fixed
- **Logo sent to connected apps** - Apps now get a logo that exists (the old link pointed at a missing file)
- **Network RPCs** - Polygon's RPC had stopped answering. Every preset network now has two tested public RPCs from different operators, ordered by how they held up in a load test, and the app switches to the second if the first stops answering
- **Large batches on public RPCs** - The official Optimism, Scroll and Unichain RPCs refuse batches over 10 calls, so batches are now capped at 10, and a batch an RPC rejects is re-sent one call at a time
- **Sending on networks without EIP-1559** - Transactions now use a legacy gas price on any network that reports no base fee
- **Prices on added networks** - An added network's coin is priced only by the currency symbol you set for it. Tokens on added networks show no price, since a symbol alone can't tell a real USDC from a copy
- **Collectible links on added networks** - Collectibles on added networks no longer show an Etherscan link, since Etherscan doesn't cover those networks

## [1.4.1] - 2026-11-04 - Security Update

### Security
- **Next.js 15.5.29** - Fixes two Next.js advisories: a critical one in image optimization ([GHSA-2464-fhr4-w9xw](https://github.com/advisories/GHSA-2464-fhr4-w9xw)) and a denial of service through Server Actions ([GHSA-p3m5-59mp-jv5r](https://github.com/advisories/GHSA-p3m5-59mp-jv5r))
- **decode-uri-component 0.5.1** - Replaces a vulnerable version pulled in by a dependency; production `npm audit` is clean

## [1.4.0] - 2026-10-11 - Security Hardening & Faster Loads

### Security
- **Card keys are validated, never repaired** - A key must be exactly a valid secp256k1 public key; malformed keys end the connection instead of being padded or truncated into an address nobody controls
- **Every signature is checked** - Transactions, messages and typed data must recover to the connected address before they're broadcast or returned to a dApp
- **No silent key-slot fallback** - Signing always uses the connected card's key slot; older sessions without one are asked to reconnect
- **API routes locked to the app** - `/api` answers only the app's own origin (plus `ALLOWED_ORIGINS`), sends no CORS headers, validates every input, and the CoinGecko proxy only allows the endpoints the app uses
- **Shared rate limits** - Optional Upstash Redis backing and global `DAILY_CAP_*` limits per upstream service, shared by deployer and user-provided keys
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

## [1.2.0] - 2025-10-27 - Token Swaps with 0x Integration

### Added
- **Token Swaps via 0x Protocol** - Comprehensive swap functionality across supported networks
  - Support for ERC-20 to ERC-20, ERC-20 to native, and native to ERC-20 swaps
  - Real-time price quotes with customizable slippage tolerance (default 0.5%)
  - Price impact warnings and transaction confirmation
  - Supported networks: Ethereum, Base, Arbitrum, Optimism, Polygon, BNB Chain, Avalanche, Blast, Linea, Mantle, Mode, Scroll, zkSync Era
  - Complete swap UX flow with automatic token approval handling
  - Transaction completion modal with block explorer links

## [1.1.0] - 2025-10-21 - Architecture Enhancement & Library Integration

### Added
- **Dual Library Architecture** - Enhanced card communication with both LibBurner and LibHalo
  - LibBurner for Burner Ethereum card communication via WebSocket
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

## [1.0.1] - 2025-10-14 - Minor Updates

## [1.0.0] - 2025-10-14 - First Stable Release

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
  - Token pricing across supported networks

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
- Transaction simulation
- Multi-signature support
- Hardware wallet comparison mode

### Performance Improvements
- Optimistic UI updates
- Background sync
- Predictive prefetching

### Security Enhancements
- Formal security audit
- Bug bounty program
- Enhanced transaction review
- Trusted display verification

