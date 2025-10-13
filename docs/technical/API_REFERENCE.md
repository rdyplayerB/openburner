# Technical Documentation

## Architecture Overview

OpenBurner is a Next.js-based web3 wallet that uses hardware security via HaLo NFC chips.

### Core Components

#### 1. HaLo Integration (`lib/halo.ts`)

The HaLo integration layer provides three main functions:

**`getHaloAddress()`**
- Retrieves the public key from the HaLo chip
- Derives the Ethereum address using ethers.js
- Uses the `get_pkeys` command from libhalo

**`signTransactionWithHalo()`**
- Creates an unsigned transaction
- Computes the transaction hash
- Sends the hash to the HaLo chip for signing
- Returns a fully signed transaction ready for broadcast

**`signMessageWithHalo()`**
- Signs arbitrary messages using the HaLo chip
- Useful for authentication and message verification

#### 2. State Management (`store/wallet-store.ts`)

Uses Zustand for simple, performant state management:

```typescript
interface WalletState {
  address: string | null;          // Ethereum address
  publicKey: string | null;        // Public key from chip
  chainId: number;                 // Current chain ID
  rpcUrl: string;                  // RPC endpoint
  chainName: string;               // Display name
  isConnected: boolean;            // Connection status
  balance: string;                 // ETH balance
}
```

Persisted to localStorage for session continuity.

#### 3. UI Components

**`wallet-connect.tsx`**
- Handles initial HaLo chip connection
- Shows connection status and errors
- Provides user guidance

**`wallet-dashboard.tsx`**
- Main wallet interface
- Displays address, balance, and network
- Orchestrates other components

**`chain-selector.tsx`**
- Network switching interface
- Pre-configured popular chains
- Custom RPC input form

**`send-transaction.tsx`**
- Transaction creation UI
- HaLo signing integration
- Transaction status tracking

## Security Model

### Hardware Security

HaLo chips are secure elements that:
- Generate keys internally (never exposed)
- Perform signing operations on-chip
- Provide tamper-resistant storage
- Are similar to hardware wallets (Ledger, Trezor)

### Attack Surface

**What's Protected:**
- ✅ Private keys (never leave chip)
- ✅ Signing operations (hardware-isolated)
- ✅ Key generation (on-chip entropy)

**What's Not Protected:**
- ❌ Transaction data (visible to app)
- ❌ Network requests (use HTTPS RPCs)
- ❌ Balance information (public on blockchain)

### Best Practices

1. **RPC Selection**: Use trusted RPC providers
2. **Transaction Verification**: Always verify recipient and amount
3. **Network Selection**: Double-check you're on the right chain
4. **Chip Security**: Keep your HaLo chip physically secure

## HaLo Bridge Communication

### How It Works

```
Web App (localhost:3000)
    ↓ HTTP/WebSocket
HaLo Bridge (localhost:7999)
    ↓ PC/SC Protocol
USB NFC Reader
    ↓ NFC
HaLo Chip
```

### Communication Flow

1. **Command Initiation**: Web app calls `execHaloCmdWeb()`
2. **Bridge Connection**: libhalo connects to localhost:7999
3. **NFC Communication**: Bridge sends APDU commands to chip
4. **Response Processing**: Chip response is returned to web app

### Supported Commands

This wallet uses:
- `get_pkeys` - Retrieve public keys
- `sign` - Sign transaction hashes

See [HaLo Command Set](https://github.com/arx-research/libhalo/tree/master/docs) for full list.

## Transaction Flow

### Signing Process

```typescript
// 1. Create transaction request
const transaction = {
  to: "0x...",
  value: ethers.parseEther("0.1"),
  nonce: await provider.getTransactionCount(address),
  chainId: 1,
  gasLimit: 21000,
  maxFeePerGas: feeData.maxFeePerGas,
  maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
};

// 2. Sign with HaLo chip
const signedTx = await signTransactionWithHalo(transaction);

// 3. Broadcast to network
const tx = await provider.broadcastTransaction(signedTx);

// 4. Wait for confirmation
await tx.wait();
```

### EIP-1559 Support

The wallet uses EIP-1559 transactions (Type 2) with:
- `maxFeePerGas` - Maximum total fee
- `maxPriorityFeePerGas` - Miner tip
- Dynamic gas pricing based on network conditions

## Error Handling

### Common Errors

**"Failed to read HaLo chip"**
- Cause: Bridge not running, chip not detected
- Solution: Check bridge status, try reconnecting chip

**"Transaction failed"**
- Cause: Insufficient balance, wrong network, invalid recipient
- Solution: Verify all transaction parameters

**"Cannot connect to RPC"**
- Cause: RPC endpoint down or rate-limited
- Solution: Switch to different RPC provider

### Error Recovery

The app implements retry logic for:
- Balance fetching (manual refresh)
- Transaction broadcasting (automatic retry)
- HaLo chip communication (prompt user to retry)

## Performance Considerations

### Balance Loading

Balance is fetched:
- On initial connection
- After successful transaction
- On manual refresh
- When changing networks

Cached in Zustand store to avoid redundant requests.

### Transaction Gas Estimation

Gas parameters are fetched dynamically:
```typescript
const feeData = await provider.getFeeData();
```

This ensures competitive gas prices without overpaying.

### State Persistence

Wallet state is persisted to localStorage:
- Survives page refreshes
- Persists network selection
- Maintains connection state

## Browser Compatibility

### Requirements

- Modern browser with Web Crypto API
- LocalStorage support
- Fetch API support

### Tested Browsers

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Edge 90+
- ✅ Safari 14+

## Development

### Environment Variables

No environment variables required - all configuration is user-provided.

### Build Process

```bash
npm run dev      # Development server (localhost:3000)
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint check
```

### Adding New Features

**To add a new network:**
Edit `components/chain-selector.tsx` and add to `POPULAR_CHAINS` array.

**To add token support:**
1. Add token state to `wallet-store.ts`
2. Create token balance fetching in `lib/`
3. Update dashboard to display tokens

**To add more HaLo commands:**
Add functions to `lib/halo.ts` using `execHaloCmdWeb()`.

## Testing

### Manual Testing Checklist

- [ ] Connect HaLo chip
- [ ] View balance on mainnet
- [ ] Switch to different network
- [ ] Add custom RPC
- [ ] Send transaction (testnet)
- [ ] Verify transaction on block explorer
- [ ] Disconnect and reconnect
- [ ] Test with invalid inputs

### Integration Testing

Test with multiple chains:
- Ethereum (1)
- Sepolia testnet (11155111)
- Polygon (137)
- Arbitrum (42161)

## Troubleshooting Development Issues

### TypeScript Errors

If you see "BigInt literals are not available":
- Ensure `tsconfig.json` has `"target": "ES2020"`

### Module Resolution

If imports fail:
- Check `tsconfig.json` paths configuration
- Verify `next.config.mjs` webpack fallbacks

### HaLo Integration

If libhalo fails to load:
- Check webpack configuration in `next.config.mjs`
- Verify all dependencies are installed

## Resources

- [ethers.js v6 Documentation](https://docs.ethers.org/v6/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Zustand Guide](https://github.com/pmndrs/zustand)
- [LibHaLo Documentation](https://github.com/arx-research/libhalo)
- [EIP-1559 Specification](https://eips.ethereum.org/EIPS/eip-1559)

## Contributing

When contributing:
1. Follow the existing code style
2. Add TypeScript types for all functions
3. Test with real HaLo chip
4. Update documentation as needed
5. Keep dependencies minimal

