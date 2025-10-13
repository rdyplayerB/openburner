# Network Management Guide

Complete guide to managing networks in OpenBurner.

## Overview

OpenBurner supports multiple EVM-compatible networks and allows you to add custom networks. Your wallet address remains the same across all networks.

## Supported Networks

### Pre-configured Networks

| Network | Chain ID | Native Token | Block Explorer |
|---------|----------|--------------|----------------|
| **Ethereum** | 1 | ETH | etherscan.io |
| **Base** | 8453 | ETH | basescan.org |
| **Arbitrum One** | 42161 | ETH | arbiscan.io |
| **Optimism** | 10 | ETH | optimistic.etherscan.io |
| **Polygon** | 137 | MATIC | polygonscan.com |
| **Blast** | 81457 | ETH | blastscan.io |
| **Scroll** | 534352 | ETH | scrollscan.com |
| **Linea** | 59144 | ETH | lineascan.build |
| **zkSync Era** | 324 | ETH | explorer.zksync.io |

## Switching Networks

### Using Pre-configured Networks

1. Click the **network dropdown** at the top
2. Select your desired network from the list
3. Your wallet will automatically switch
4. Balances and tokens update for new network

**Note:** Switching is instant and your address stays the same.

### Network Information Display

When connected, you'll see:
- Network name
- Chain ID
- Your balance in native token
- Approximate USD value

## Adding Custom Networks

### Step-by-Step

1. **Open Custom RPC**
   - Click network dropdown
   - Select "Custom RPC"

2. **Enter Network Details**
   - **Network Name**: Display name (e.g., "Optimism")
   - **RPC URL**: HTTP(S) endpoint
   - **Chain ID**: Numeric network identifier

3. **Connect**
   - Click "Connect"
   - If valid, network switches immediately

### Finding Network Information

**ChainList.org:**
- Visit [chainlist.org](https://chainlist.org)
- Search for your network
- Copy RPC URL and Chain ID

**Official Documentation:**
- Check network's official docs
- Look for "Developers" or "RPC Endpoints"
- Use verified public RPCs

**Example Networks:**

**Gnosis Chain:**
```
Name: Gnosis
RPC: https://rpc.gnosischain.com
Chain ID: 100
```

**Fantom Opera:**
```
Name: Fantom
RPC: https://rpc.ftm.tools
Chain ID: 250
```

**Avalanche C-Chain:**
```
Name: Avalanche
RPC: https://api.avax.network/ext/bc/C/rpc
Chain ID: 43114
```

## RPC Providers

### Public RPCs

**Pros:**
- Free to use
- No signup required
- Work immediately

**Cons:**
- Rate limits
- May be slower
- Less reliable
- No guaranteed uptime

**Popular Public RPCs:**
- LlamaNodes
- PublicNode
- Chain-specific RPCs

### Private RPCs

**Pros:**
- Higher rate limits
- Better reliability
- Faster responses
- Dedicated support

**Cons:**
- May require account
- Some have costs
- Need API key

**Popular Providers:**
- **Alchemy** - alchemy.com
- **Infura** - infura.io
- **QuickNode** - quicknode.com
- **Ankr** - ankr.com

### Choosing an RPC

**For Testing:**
- Use public RPCs
- Free and immediate

**For Regular Use:**
- Private RPC recommended
- Better performance
- More reliable

**Security Note:** Always use HTTPS RPC URLs.

## Network-Specific Features

### Ethereum Mainnet

**Characteristics:**
- Most secure
- Highest liquidity
- Highest gas fees
- Slowest confirmation

**Best For:**
- Large value transfers
- DeFi interactions
- NFTs
- Long-term holdings

### Layer 2 Networks (Optimism, Arbitrum, Base)

**Characteristics:**
- Lower gas fees (95%+ cheaper)
- Faster confirmations
- Growing ecosystem
- Inherits Ethereum security

**Best For:**
- Frequent transactions
- DeFi farming
- Gaming
- Cost-sensitive use cases

### Sidechains (Polygon)

**Characteristics:**
- Very low gas fees
- Fast confirmations
- Large ecosystem
- Independent security

**Best For:**
- High-frequency transactions
- Testing/development
- Gaming and NFTs
- Emerging DeFi protocols

## Best Practices

### Network Selection

✅ **Do:**
- Verify network before transactions
- Use Layer 2 for frequent transactions
- Keep some native tokens for gas
- Bookmark trusted RPC URLs

❌ **Don't:**
- Send to wrong network
- Use untrusted RPCs
- Ignore network warnings
- Switch networks mid-transaction

### Gas Management

**Ethereum Mainnet:**
- Gas fees: $5-$100+ per transaction
- Check gas prices before sending
- Use during low-activity hours
- Consider Layer 2 alternatives

**Layer 2 Networks:**
- Gas fees: $0.01-$1 per transaction
- Much more affordable
- Still need native token
- Good for frequent use

**Polygon:**
- Gas fees: < $0.01 per transaction
- Extremely cheap
- Need MATIC for gas
- Bridge from Ethereum if needed

### Security Considerations

**RPC Security:**
- ✅ Use HTTPS only
- ✅ Verify RPC URL
- ✅ Use reputable providers
- ❌ Don't use HTTP
- ❌ Don't use unknown RPCs
- ❌ Don't trust random URLs

**Network Verification:**
- Always verify network before signing
- Check chain ID matches expectation
- Confirm token contract on correct network
- Use block explorers to verify transactions

## Troubleshooting

### "Network not responding"

**Causes:**
- RPC endpoint down
- Network issues
- Rate limiting
- Invalid RPC URL

**Solutions:**
- Try different RPC
- Wait a moment
- Check internet connection
- Verify RPC URL format

### "Wrong chain ID"

**Causes:**
- RPC doesn't match chain ID
- Temporary network issues
- RPC misconfiguration

**Solutions:**
- Verify chain ID is correct
- Try different RPC for same network
- Check network documentation
- Wait and retry

### "Insufficient funds for gas"

**Causes:**
- No native token for gas
- Balance on different network
- Gas price too high

**Solutions:**
- Get native token (ETH, MATIC, etc.)
- Check you're on correct network
- Bridge tokens if needed
- Use faucet for testnets

### "Transaction not found"

**Causes:**
- Wrong network selected
- Transaction on different network
- Block explorer issues

**Solutions:**
- Verify you're on correct network
- Check transaction hash on explorer
- Wait for confirmations
- Check different explorer

## Advanced Topics

### Custom Network Configuration

For advanced users who need specific configuration:

**Testnet Networks:**
- Goerli (Ethereum testnet)
- Sepolia (Ethereum testnet)
- Mumbai (Polygon testnet)
- Base Goerli (Base testnet)

**Private Networks:**
- Local development (Hardhat, Ganache)
- Enterprise networks
- Consortium chains

### Network Limitations

**OpenBurner requires:**
- EVM compatibility
- JSON-RPC interface
- Standard transaction format
- ECDSA signatures

**Won't work with:**
- Non-EVM chains (Bitcoin, Solana, etc.)
- Networks requiring different signature schemes
- Networks with incompatible transaction formats

### Cross-Chain Bridges

To move assets between networks:

**Official Bridges:**
- [Optimism Bridge](https://app.optimism.io/bridge)
- [Arbitrum Bridge](https://bridge.arbitrum.io)
- [Polygon Bridge](https://wallet.polygon.technology)
- [Base Bridge](https://bridge.base.org)

**Third-Party Bridges:**
- [Hop Protocol](https://app.hop.exchange)
- [Across Protocol](https://across.to)
- [Synapse Protocol](https://synapseprotocol.com)
- [Stargate](https://stargate.finance)

**Security Warning:** Bridges are complex. Only use reputable bridges and understand the risks.

## Network Comparison

### Transaction Speed

| Network | Confirmation Time | Finality |
|---------|------------------|----------|
| Ethereum | 12-15 seconds | 15 minutes |
| Optimism | 2 seconds | 7 days (challenge period) |
| Arbitrum | 0.26 seconds | 7 days (challenge period) |
| Base | 2 seconds | 7 days (challenge period) |
| Polygon | 2 seconds | ~10 minutes |

### Transaction Costs

| Network | Typical Cost | Native Token |
|---------|-------------|--------------|
| Ethereum | $5-$100+ | ETH |
| Optimism | $0.10-$1 | ETH |
| Arbitrum | $0.10-$1 | ETH |
| Base | $0.01-$0.50 | ETH |
| Polygon | < $0.01 | MATIC |

*Costs vary based on network congestion*

### Ecosystem Size

| Network | TVL | DApps | Maturity |
|---------|-----|-------|----------|
| Ethereum | Highest | Most | Oldest |
| Arbitrum | High | Many | Mature |
| Optimism | High | Many | Mature |
| Polygon | High | Many | Mature |
| Base | Growing | Growing | New |

## FAQ

**Q: Can I use the same address on all networks?**  
A: Yes! Your address (0x...) is the same on all EVM networks.

**Q: What happens if I send to wrong network?**  
A: Funds may be lost or stuck. Always verify network before sending.

**Q: How do I get native tokens for gas?**  
A: Bridge from Ethereum, buy on exchange, or use faucet for testnets.

**Q: Which network should I use?**  
A: Ethereum for security, Layer 2s for lower fees, Polygon for very low fees.

**Q: Can I add testnets?**  
A: Yes, use Custom RPC with testnet RPC URL and chain ID.

**Q: Are my keys safe on all networks?**  
A: Yes, your private key never leaves the HaLo chip regardless of network.

## Resources

### Network Documentation
- [Ethereum Docs](https://ethereum.org/developers)
- [Optimism Docs](https://community.optimism.io)
- [Arbitrum Docs](https://docs.arbitrum.io)
- [Base Docs](https://docs.base.org)
- [Polygon Docs](https://docs.polygon.technology)

### Tools
- [ChainList](https://chainlist.org) - Network directory
- [L2 Fees](https://l2fees.info) - Fee comparison
- [L2 Beat](https://l2beat.com) - L2 analytics

### Block Explorers
- Use network-specific explorers listed above
- [BlockScout](https://blockscout.com) - Multi-chain explorer

---

**Next:** Learn about [Token Management](TOKENS.md)

