# OpenBurner: Architecture Overview

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Implementation Details](#implementation-details)
- [Security Model](#security-model)
- [Key Components](#key-components)
- [Price Oracle Integration](#price-oracle-integration)
- [Transaction Flow](#transaction-flow)
- [Connection Methods](#connection-methods)
- [Technology Stack](#technology-stack)

---

## Overview

OpenBurner is a Web3 wallet that uses HaLo NFC chips (secure element hardware) for private key storage and transaction signing. Private keys are generated and stored on-chip and never exposed to the host system.

### HaLo Chip Specifications

**Hardware**: Secure element NFC tag (EAL6+ certified)
- Cryptographic processor (ECDSA secp256k1)
- Tamper-resistant key storage
- On-chip signing capability
- NFC interface (ISO 14443A, 13.56 MHz)
- Multiple key slots (up to 9 addresses)

**Security Property**: Private keys never leave the secure element. Only public keys and signatures are exposed.

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Web Application                          │
│  (Next.js + React + Zustand + ethers.js)                   │
│                                                              │
│  • UI Components (Dashboard, Send, Connect)                │
│  • State Management (Wallet Store)                          │
│  • Blockchain Interaction (ethers.js Provider)             │
└───────────────┬─────────────────────────────────────────────┘
                │
                │ WebSocket (ws://127.0.0.1:32868/ws)
                ↓
┌─────────────────────────────────────────────────────────────┐
│                   HaLo Bridge                               │
│  (Local WebSocket Server on Port 32868)                    │
│                                                              │
│  • WebSocket Handler                                        │
│  • Command Dispatcher                                       │
│  • PC/SC Interface                                          │
└───────────────┬─────────────────────────────────────────────┘
                │
                │ PC/SC Protocol
                ↓
┌─────────────────────────────────────────────────────────────┐
│              USB NFC Reader                                 │
│  (ACR122U, ACR1252U, PN532, etc.)                          │
└───────────────┬─────────────────────────────────────────────┘
                │
                │ NFC (13.56 MHz)
                ↓
┌─────────────────────────────────────────────────────────────┐
│                 HaLo NFC Chip                               │
│  (Secure Element with Private Keys)                        │
│                                                              │
│  • Key Storage (up to 9 key slots)                         │
│  • ECDSA Signing Engine                                    │
│  • Authentication Logic                                     │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| **Web App** | UI, transaction building, blockchain queries | Next.js 14, React, ethers.js |
| **HaLo Bridge** | NFC reader communication, command routing | WebSocket server, libhalo |
| **USB NFC Reader** | Physical NFC communication | PC/SC compatible hardware |
| **HaLo Chip** | Key storage, transaction signing | Secure element (EAL6+ certified) |

---

## Implementation Details

### Connection Phase

```typescript
// User clicks "Connect HaLo Chip"
connectToBridge()
  ↓
// Establish WebSocket connection to HaLo Bridge
ws = new WebSocket("ws://127.0.0.1:32868/ws")
  ↓
// Bridge detects chip on NFC reader
event: "handle_added"
  ↓
// Request public keys from chip
execBridgeCommand({ name: "get_pkeys" })
  ↓
// Derive Ethereum address from public key
address = ethers.computeAddress(publicKey)
  ↓
// Store in wallet state
useWalletStore.setWallet(address, publicKey, keySlot)
```

**Process:**
1. WebSocket connection established to bridge (127.0.0.1:32868)
2. Bridge detects chip via NFC reader, sends `handle_added` event
3. App executes `get_pkeys` command to retrieve public key
4. Ethereum address derived using `ethers.computeAddress(publicKey)`
5. Address and public key stored in application state

### Balance & Network Queries

```typescript
// Once connected, load balance
const provider = new ethers.JsonRpcProvider(rpcUrl)
const balance = await provider.getBalance(address)
  ↓
// Display in UI
setBalance(ethers.formatEther(balance))
```

**Process:**
- Provider connects to blockchain RPC endpoint
- Queries address balance via `eth_getBalance` JSON-RPC call
- ERC-20 token balances queried via contract `balanceOf()` calls

### Transaction Signing

```typescript
// User enters recipient and amount
const transaction = {
  to: "0xRecipient...",
  value: ethers.parseEther("0.1"),
  nonce: await provider.getTransactionCount(address),
  chainId: 1,
  gasLimit: 21000,
  maxFeePerGas: feeData.maxFeePerGas,
  maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
}
  ↓
// Create unsigned transaction
const tx = ethers.Transaction.from(transaction)
const txHash = tx.unsignedHash  // Keccak256 hash
  ↓
// Send hash to HaLo chip for signing
execBridgeCommand({
  name: "sign",
  keyNo: keySlot,
  digest: txHash.slice(2),  // Remove '0x' prefix
})
  ↓
// Chip signs hash with private key (on-chip)
signature = { r, s, v }
  ↓
// Attach signature to transaction
tx.signature = ethers.Signature.from(signature)
  ↓
// Broadcast to network
provider.broadcastTransaction(tx.serialized)
```

**Process:**
1. Transaction object constructed with parameters (to, value, nonce, gas, chainId)
2. Unsigned transaction hash computed (Keccak256)
3. Hash sent to chip via `sign` command with key slot number
4. Physical tap required for signing
5. Chip performs ECDSA signing, returns (r, s, v) signature
6. Signature attached to transaction, serialized to RLP
7. Signed transaction broadcast via `eth_sendRawTransaction`

**Note:** Chip only receives the transaction hash, not full transaction details.

### Key Slot Management

HaLo chips support **up to 9 key slots** (separate private keys):

```typescript
// Query all available key slots
for (let keyNo = 1; keyNo <= 9; keyNo++) {
  const keyInfo = await execBridgeCommand({
    name: "get_key_info",
    keyNo,
  })
  // Each slot has its own address
  const address = ethers.computeAddress(keyInfo.publicKey)
}
```

**Slot conventions:**
- Slots 1-2: Typically reserved for system/attestation keys
- Slots 3-9: User wallet addresses
- Implementation selects highest available slot as primary address

---

## Security Model

### Threat Model & Protections

| Attack Vector | Protected? | How |
|--------------|-----------|-----|
| **Private key extraction** | ✅ Yes | Keys stored in tamper-resistant secure element |
| **Malware/keyloggers** | ✅ Yes | Keys never enter computer memory |
| **Phishing attacks** | ⚠️ Partial | User must verify transaction details on screen |
| **Network eavesdropping** | ✅ Yes | Only public data transmitted |
| **Physical chip theft** | ⚠️ Partial | Can be protected with PIN (optional) |
| **Malicious transactions** | ⚠️ Partial | User must review before tapping chip |
| **Bridge compromise** | ⚠️ Partial | Bridge can't extract keys but could send malicious hashes |

### Security Layers

1. **Hardware Layer**: Secure element chip (EAL6+ certified)
   - Tamper-resistant storage
   - Side-channel attack protections
   - Secure boot and firmware

2. **Protocol Layer**: NFC + WebSocket communication
   - Local-only (127.0.0.1) WebSocket
   - No internet-exposed ports
   - Command authentication

3. **Application Layer**: Web app security
   - HTTPS for RPC connections
   - No private key storage
   - Transaction review UI

4. **Physical Layer**: User confirmation
   - Must physically tap chip to sign
   - Physical possession required
   - Optional PIN protection

### What Can Be Compromised?

**NOT Protected:**
- Transaction details before signing (visible to app)
- Network RPC endpoints (use trusted providers)
- Balance information (public on blockchain)
- Transaction metadata (gas prices, nonce)

**Protected:**
- Private keys (never leave chip)
- Signature generation (happens on-chip)
- Key derivation (happens on-chip)

---

## Key Components

### 1. Web Application (`/app`, `/components`)

**Main Components:**

- **`wallet-connect.tsx`**: Initial connection UI
  - Displays connection status
  - Handles chip detection
  - Shows error messages
  
- **`wallet-dashboard.tsx`**: Main wallet interface
  - Displays balance and address
  - Network selector dropdown
  - Custom RPC input
  - Token list integration
  
- **`token-list.tsx`**: Token balance display
  - Native token (ETH)
  - ERC-20 token detection and display
  - Balance refresh
  - Custom token addition
  
- **`send-token.tsx`**: Transaction creation UI
  - Supports both native and ERC-20 transfers
  - PIN input integration
  - Transaction status display
  
- **`pin-input.tsx`**: PIN entry component
  - 6-digit PIN input
  - Used for protected chip signing
  
- **`chain-selector.tsx`**: Network selection component
  - Pre-configured chain list
  - Custom RPC configuration

### 2. State Management (`/store/wallet-store.ts`)

Uses **Zustand** with localStorage persistence:

```typescript
interface WalletState {
  address: string | null;        // Ethereum address
  publicKey: string | null;      // Public key from chip
  keySlot: number | null;        // Which key slot (1-9)
  chainId: number;               // Current network
  rpcUrl: string;                // RPC endpoint
  chainName: string;             // Display name
  isConnected: boolean;          // Connection status
  balance: string;               // Native balance
}
```

**Persistence**: State survives page refreshes via localStorage.

### 3. HaLo Integration Layer (`/lib`)

**`halo.ts`** - High-level HaLo functions:
- `getHaloAddress()`: Retrieve address from chip
- `signTransactionWithHalo()`: Sign Ethereum transaction
- `signMessageWithHalo()`: Sign arbitrary message

**`halo-bridge.ts`** - Low-level bridge communication:
- `connectToBridge()`: Establish WebSocket connection
- `execBridgeCommand()`: Send commands to chip
- `disconnectBridge()`: Close connection

**Key Features:**
- Automatic chip detection
- Key slot enumeration
- PIN support
- Error handling with timeout logic

### 4. Utility Libraries (`/lib`)

**`token-lists.ts`**:
- Token metadata for 9 chains
- Popular token lists (USDC, USDT, WETH, etc.)
- Chain-specific token configuration

**`multicall.ts`**:
- Batch RPC calls using Multicall3 contract
- Efficient balance queries with fallback
- Token metadata batching

**`price-oracle.ts`**:
- CoinGecko API integration
- Multi-tier caching (memory + localStorage)
- Stale-while-revalidate pattern
- Request deduplication
- Differential cache durations

**`utils.ts`**:
- Tailwind CSS class merging utility (`cn`)

---

## Price Oracle Integration

### CoinGecko API

OpenBurner integrates with CoinGecko for real-time cryptocurrency prices:

**Features:**
- 25+ supported tokens
- Real-time price updates
- Multi-tier caching
- Free tier support (no API key required)
- Optional Pro API key support

**Architecture:**
```
┌─────────────────────────────────────────┐
│   UI Components (Dashboard, Tokens)    │
│   Display prices                        │
└─────────────┬───────────────────────────┘
              │
              │ getTokenPrices()
              ↓
┌─────────────────────────────────────────┐
│   Price Oracle (lib/price-oracle.ts)   │
│   • Check memory cache                 │
│   • Check localStorage                  │
│   • Deduplicate requests               │
│   • Fetch from API if needed           │
└─────────────┬───────────────────────────┘
              │
              │ HTTPS API Call
              ↓
┌─────────────────────────────────────────┐
│   CoinGecko API                        │
│   api.coingecko.com/api/v3             │
└─────────────────────────────────────────┘
```

### Caching Strategy

**Multi-Tier Caching:**
1. **Memory Cache** - Instant lookups, session-only
2. **localStorage Cache** - Persistent across sessions
3. **Stale-While-Revalidate** - Instant display, background refresh

**Differential Cache Durations:**
- Stablecoins (USDC, USDT): 30 minutes
- Major tokens (ETH, BTC): 5 minutes
- Other tokens: 3 minutes

**Performance Impact:**
- 73-81% reduction in API calls
- Instant UI updates (0ms for cached data)
- Zero loading states for repeat visits
- Rate limit resilience

See [Price Oracle Documentation](PRICE_ORACLE.md) and [Caching Strategy](CACHING.md) for details.

---

## Transaction Flow

### Complete Transaction Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER INITIATES TRANSACTION                                   │
│    - Opens Send modal                                           │
│    - Enters recipient address                                   │
│    - Enters amount                                              │
└────────────────┬────────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. APP PREPARES TRANSACTION                                     │
│    - Fetches current nonce                                      │
│    - Sets fixed gas limit (21000 for ETH, 100000 for ERC-20)   │
│    - Gets current gas prices (EIP-1559)                         │
│    - Validates inputs                                           │
└────────────────┬────────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. CREATE UNSIGNED TRANSACTION                                  │
│    - Build transaction object:                                  │
│      {                                                           │
│        to: "0x...",                                             │
│        value: parseEther("0.1"),                                │
│        nonce: 42,                                               │
│        gasLimit: 21000,                                         │
│        maxFeePerGas: "50000000000",                             │
│        maxPriorityFeePerGas: "2000000000",                      │
│        chainId: 1                                               │
│      }                                                           │
│    - Compute transaction hash (Keccak256)                       │
└────────────────┬────────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. SEND HASH TO HALO CHIP                                       │
│    - Connect to bridge (WebSocket)                              │
│    - Wait for chip detection                                    │
│    - Send sign command:                                         │
│      {                                                           │
│        name: "sign",                                            │
│        keyNo: 3,                                                │
│        digest: "a7b3c2..."                                      │
│      }                                                           │
└────────────────┬────────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. USER TAPS CHIP (Physical Confirmation)                       │
│    - User places chip on NFC reader                             │
│    - Bridge sends APDU commands to chip                         │
│    - Chip validates request                                     │
│    - (Optional) Chip prompts for PIN                            │
└────────────────┬────────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. CHIP SIGNS TRANSACTION                                       │
│    - Chip loads private key from secure storage                 │
│    - Performs ECDSA signing on digest                           │
│    - Returns signature: { r, s, v }                             │
│    - Private key NEVER leaves chip                              │
└────────────────┬────────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. APP CONSTRUCTS SIGNED TRANSACTION                            │
│    - Attach signature to transaction                            │
│    - Serialize to RLP encoding                                  │
│    - Verify signature is valid                                  │
│    - signedTx = "0x02f8..."                                     │
└────────────────┬────────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. BROADCAST TO NETWORK                                         │
│    - Send to RPC endpoint:                                      │
│      eth_sendRawTransaction(signedTx)                           │
│    - RPC node validates transaction                             │
│    - Transaction enters mempool                                 │
│    - Returns transaction hash                                   │
└────────────────┬────────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. WAIT FOR CONFIRMATION                                        │
│    - Monitor transaction status                                 │
│    - Wait for block inclusion                                   │
│    - Wait for N confirmations                                   │
│    - Update UI with status                                      │
└────────────────┬────────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ 10. TRANSACTION CONFIRMED                                       │
│     - Display success message                                   │
│     - Update balance                                            │
│     - Show transaction link (block explorer)                    │
└─────────────────────────────────────────────────────────────────┘
```

### Transaction Format

**EIP-1559 (Type 2)**:
```javascript
{
  type: 2,
  to: "0x...",
  value: "1000000000000000000",  // 1 ETH in wei
  nonce: 42,
  chainId: 1,
  gasLimit: 21000n,
  maxFeePerGas: "50000000000",      // From provider.getFeeData()
  maxPriorityFeePerGas: "2000000000", // From provider.getFeeData()
}
```

---

## Connection Methods

### Method 1: HaLo Bridge + USB NFC Reader

```
Desktop Computer ←──USB──→ NFC Reader ←──NFC──→ HaLo Chip
      ↑
   localhost:32868
   (HaLo Bridge)
```

**Configuration:**
1. Install HaLo Bridge software (runs on port 32868)
2. Connect USB NFC reader via PC/SC interface
3. Web app connects via WebSocket (`ws://127.0.0.1:32868/ws`)
4. Bridge translates WebSocket commands to APDU commands for chip

**Requirements:**
- PC/SC compatible USB NFC reader (ACR122U, ACR1252U, PN532)
- HaLo Bridge software
- WebSocket support in browser

### Method 2: HaLo Gateway + Smartphone

```
Desktop ←──WiFi──→ Smartphone ←──NFC──→ HaLo Chip
                   (Gateway App)
```

**Configuration:**
1. Install HaLo Gateway app on smartphone
2. Devices connected to same local network
3. Gateway discovered via mDNS
4. Commands routed: Web App → WiFi → Gateway App → NFC → Chip

**Requirements:**
- NFC-enabled smartphone
- HaLo Gateway app
- Local network connectivity

### Method 3: Web NFC API (Mobile Browser)

```
Mobile Browser ←──Web NFC API──→ HaLo Chip
```

**Configuration:**
1. Browser accesses chip directly via Web NFC API
2. No bridge or gateway required
3. Direct NDEF and command execution

**Requirements:**
- Android Chrome 89+ or iOS Safari 13+
- Web NFC API support
- NFC permissions granted

### Connection Method Comparison

| Method | Transport | Latency | Setup |
|--------|-----------|---------|-------|
| **Bridge + USB** | USB + WebSocket | ~100-200ms | Bridge software required |
| **Gateway + Phone** | WiFi + NFC | ~300-500ms | Gateway app + network setup |
| **Web NFC** | Direct NFC | ~100-200ms | No additional software |

---

## Technology Stack

### Frontend

- **Framework**: Next.js 14 (App Router)
  - React 18.3+
  - Server/Client Components
  - TypeScript 5
  
- **Styling**: Tailwind CSS 3.4
  - Utility-first CSS
  - Custom design system
  - Responsive layouts
  
- **UI Libraries**:
  - `lucide-react` - Icons
  - `framer-motion` - Animations
  - `class-variance-authority` - Component variants

### Blockchain

- **Ethereum Library**: ethers.js v6
  - Provider/Signer abstraction
  - Transaction building
  - ABI encoding/decoding
  - Address/signature utilities
  
- **RPC Endpoints**:
  - LlamaNodes (https://eth.llamarpc.com) - default for Ethereum
  - Network-specific public RPCs (Base, Arbitrum, Optimism, etc.)
  - User-configurable custom RPC endpoints

### State Management

- **Zustand** 4.5
  - Lightweight (< 1KB)
  - No boilerplate
  - TypeScript support
  - Middleware (persist)

### Hardware Integration

- **libhalo** (@arx-research/libhalo 1.15)
  - HaLo chip commands
  - Bridge communication
  - NFC abstraction
  
- **WebSocket**: Native browser WebSocket
  - Bridge connection on port 32868
  - Real-time command/response messaging
  - 10s chip detection timeout, 30s command timeout

### Build Tools

- **Package Manager**: npm
- **Bundler**: Next.js (Webpack/Turbopack)
- **TypeScript**: Strict mode
- **Linter**: ESLint + Next.js config

### Development

```json
{
  "scripts": {
    "dev": "next dev",         // Development server (port 3000)
    "build": "next build",     // Production build
    "start": "next start",     // Production server
    "lint": "next lint"        // Linting
  }
}
```

---

## Implemented Features

### Core Functionality

**Chip Communication:**
- WebSocket-based bridge communication
- Multi-slot key enumeration (9 slots)
- Public key retrieval via `get_pkeys` command
- Address derivation using `ethers.computeAddress()`

**Blockchain Interaction:**
- Multi-chain support (9 pre-configured networks)
- Custom RPC endpoint configuration
- Native balance queries via `eth_getBalance`
- ERC-20 token balance queries via Multicall3
- Transaction construction and signing
- EIP-1559 (Type 2) transactions with dynamic fee data
- Fixed gas limits (21000 for ETH, 100000 for ERC-20)

**State Management:**
- Zustand-based state store
- localStorage persistence
- Address, publicKey, keySlot, chainId, rpcUrl, balance tracking

**Transaction Flow:**
- Transaction building with nonce, gas parameters
- Keccak256 hash generation
- On-chip ECDSA signing
- RLP serialization
- Broadcast via `eth_sendRawTransaction`

**ERC-20 Token Support:**
- Auto-detection of popular tokens per chain
- Multicall3-based batch balance queries
- Custom token addition by contract address
- Token metadata caching
- ERC-20 transfer support

**Message Signing:**
- Arbitrary message signing via `signMessageWithHalo()`
- PIN-protected signing operations

### Planned Extensions

**Advanced Signing:**
- EIP-712 typed data signing
- WalletConnect protocol support

**Enhanced Features:**
- Transaction history indexing
- Multi-account/multi-chip management
- NFT metadata display (ERC-721/1155)
- Contract interaction UI
- Dynamic gas estimation

---

## Additional Resources

- **Setup Guide**: See `SETUP_GUIDE.md` for detailed setup instructions
- **Technical Details**: See `TECHNICAL.md` for architecture deep-dive
- **Bridge Setup**: See `BRIDGE_CONSENT.md` and `GATEWAY_SETUP.md` for connection methods
- **LibHaLo Docs**: https://github.com/arx-research/libhalo
- **Arx Research**: https://arx.org (HaLo chip manufacturer)
- **ethers.js**: https://docs.ethers.org/v6/

