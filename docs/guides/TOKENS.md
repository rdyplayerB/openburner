# Token Management Guide

Complete guide to managing ERC-20 tokens in OpenBurner.

## Overview

OpenBurner automatically detects popular ERC-20 tokens across 9 different networks. You can also add custom tokens manually.

## Understanding Tokens

### Token Types

**Native Tokens:**
- ETH (Ethereum, Base, Arbitrum, Optimism, etc.)
- MATIC (Polygon)
- Built into the blockchain
- Required for gas fees
- Displayed prominently at top

**ERC-20 Tokens:**
- Built on top of blockchains
- Follow ERC-20 standard
- Most tokens you'll use (USDC, USDT, WETH, etc.)
- Displayed in token list
- Require gas in native token

**Key Difference:**
- Native tokens = Part of the blockchain
- ERC-20 tokens = Smart contracts on the blockchain

### Token Addresses

**Your Wallet Address (0x123...):**
- Same across all EVM networks
- Where you receive ALL tokens
- Public, safe to share

**Token Contract Address (0xABC...):**
- Identifies the token itself
- Different per network
- Used to add custom tokens
- Find on CoinGecko or Etherscan

**Important:** Token contract ≠ Your wallet address

## Auto-Detected Tokens

### Supported Networks

OpenBurner auto-detects tokens on:
- ✅ Ethereum Mainnet (1)
- ✅ Base (8453)
- ✅ Arbitrum One (42161)
- ✅ Optimism (10)
- ✅ Polygon (137)
- ✅ Blast (81457)
- ✅ Scroll (534352)
- ✅ Linea (59144)
- ✅ zkSync Era (324)

### Popular Tokens by Network

**Ethereum Mainnet:**
- USDC, USDT, DAI (stablecoins)
- WETH (wrapped ETH)
- UNI, AAVE, LINK, CRV, MKR, SNX, COMP (DeFi)
- PEPE, SHIB, APE (meme/other)

**Base:**
- USDC, USDbC (stablecoins)
- WETH (wrapped ETH)

**Arbitrum One:**
- USDC, USDT (stablecoins)
- WETH (wrapped ETH)
- ARB (native governance)

**Optimism:**
- USDC, USDT (stablecoins)
- WETH (wrapped ETH)
- OP (native governance)

**Polygon:**
- USDC, USDT (stablecoins)
- WETH, WBTC, WMATIC (wrapped)

**Other Networks:**
- Network-specific tokens
- Cross-chain bridges
- Native governance tokens

### Auto-Detection Behavior

**Tokens are shown if:**
- ✅ You have a balance > 0
- ✅ Token is in our curated list
- ✅ You're on the correct network

**Tokens are hidden if:**
- ❌ Balance is zero
- ❌ You're on different network
- ❌ Token not in our list (add manually)

## Adding Custom Tokens

### When to Add Custom Tokens

- Token not auto-detected
- New token launch
- Rare/niche tokens
- Testnet tokens
- Your own token contracts

### Step-by-Step

1. **Get Token Contract Address**
   - From CoinGecko
   - From Etherscan
   - From project website
   - From trusted source

2. **Add Token**
   - Click "Add Token" button
   - Paste contract address
   - Click "Add Token"

3. **Verification**
   - App verifies it's valid ERC-20
   - Checks your balance
   - Fetches token metadata (symbol, name, decimals)
   - Adds to list if balance > 0

**Note:** You can only add tokens where you have a balance.

### Finding Token Contract Addresses

**Method 1: CoinGecko**
1. Search token on coingecko.com
2. Look for "Contract" section
3. Select correct network
4. Copy address

**Method 2: Etherscan**
1. Search token on etherscan.io (or network explorer)
2. Find verified token contract
3. Copy address from URL or page

**Method 3: Official Website**
1. Visit project's official site
2. Look for "Token Address" or "Contract"
3. Verify on block explorer
4. Copy address

**Security Warning:** Only use contract addresses from trusted sources!

### Validation

OpenBurner validates:
- ✅ Address format (0x + 40 characters)
- ✅ Valid ERC-20 contract
- ✅ Has required functions (balanceOf, symbol, name, decimals)
- ✅ Non-zero balance

If validation fails:
- ❌ Not an ERC-20 token
- ❌ Invalid contract address
- ❌ Zero balance
- ❌ Wrong network

## Managing Tokens

### Viewing Token Details

Each token shows:
- **Symbol**: USDC, WETH, etc.
- **Name**: USD Coin, Wrapped Ether
- **Balance**: How much you hold
- **USD Value**: Approximate $ value (when available)
- **Custom Badge**: For manually added tokens

### Token Actions

**Send:**
- Click send icon (➡️) next to token
- Enter recipient and amount
- Sign with HaLo chip
- Confirm transaction

**Remove (Custom Tokens Only):**
- Hover over custom token
- Click X icon
- Token removed from list
- (Auto-detected tokens can't be removed)

### Refreshing Tokens

**Manual Refresh:**
- Click refresh icon (🔄)
- Updates all balances
- Fetches new prices
- Re-checks for new tokens

**Automatic Updates:**
- Balances cached until manual refresh
- Prices cached for 3-30 minutes (based on token type)
- Token list persists across sessions

## Token Prices

### Price Sources

**CoinGecko API:**
- Real-time price data
- 25+ supported tokens
- Multi-tier caching
- Free tier (no API key needed)

### Supported Price Tokens

**Stablecoins (30min cache):**
- USDC, USDT, DAI, USDB, USDbC

**Major Tokens (5min cache):**
- ETH, WETH, BTC, WBTC, MATIC, WMATIC, BNB

**Other Tokens (3min cache):**
- UNI, AAVE, LINK, CRV, MKR, SNX, COMP
- ARB, OP, PEPE, SHIB, APE

### When Prices Don't Show

**"Price unavailable" means:**
- Token not supported by CoinGecko
- API rate limit reached (wait 60s)
- Network connection issue
- Unknown/new token

**Token value still works:**
- You can still send/receive
- Only price display affected
- Functionality unaffected

## Sending Tokens

### Sending ERC-20 Tokens

1. **Select Token**
   - Click send icon next to token

2. **Enter Details**
   - Recipient address (0x...)
   - Amount to send
   - Review details

3. **Gas Fee**
   - Paid in native token (ETH, MATIC)
   - Make sure you have enough
   - Fixed gas limit (100,000)

4. **Sign & Send**
   - Click "Sign & Send"
   - Tap HaLo chip
   - Wait for confirmation

### Important Notes

**Gas Requirements:**
- Need native token for gas
- ERC-20 transfers cost more gas than native
- Can't send tokens without gas

**Token Approvals:**
- Some dApps require approvals
- OpenBurner handles transfers directly
- No approval needed for direct sends

**Network Verification:**
- Token must exist on current network
- Verify recipient is on same network
- Can't send cross-chain directly

## Best Practices

### Token Security

✅ **Do:**
- Verify contract address before adding
- Use official sources for addresses
- Check token on block explorer
- Test with small amounts first
- Verify network matches

❌ **Don't:**
- Add random token addresses
- Trust addresses from strangers
- Ignore validation warnings
- Send without verification
- Mix up networks

### Portfolio Management

**Regular Review:**
- Check token balances periodically
- Remove unused custom tokens
- Update prices manually if needed
- Track large holdings on block explorer

**Gas Management:**
- Always keep some native token
- Need gas even for token transfers
- Bridge native token if needed
- Monitor gas prices

**Network Organization:**
- Keep tokens on appropriate networks
- Use L2s for smaller amounts
- Use mainnet for large holdings
- Bridge as needed

## Troubleshooting

### "Token not found"

**Causes:**
- Wrong network selected
- Invalid contract address
- Not an ERC-20 token
- Token doesn't exist

**Solutions:**
- Verify you're on correct network
- Check contract address is correct
- Confirm token is ERC-20
- Use block explorer to verify

### "Zero balance - cannot add"

**Causes:**
- You don't have any of this token
- Balance is on different network
- Wrong wallet address

**Solutions:**
- Get some tokens first
- Check on correct network
- Verify wallet address
- Check block explorer

### "Token shows incorrect balance"

**Causes:**
- Recent transaction not confirmed
- Cache needs refresh
- RPC lag
- Display decimals issue

**Solutions:**
- Wait for confirmation
- Click refresh button
- Check on block explorer
- Wait a moment and retry

### "Can't send token"

**Causes:**
- Insufficient token balance
- Insufficient gas (native token)
- Invalid recipient address
- Network issues

**Solutions:**
- Check token balance
- Get native token for gas
- Verify recipient address format
- Try different RPC

## Advanced Topics

### Token Standards

**ERC-20:**
- Standard fungible tokens
- Most common type
- Fully supported

**ERC-721:**
- NFTs (Non-Fungible Tokens)
- Not yet supported
- Coming in future update

**ERC-1155:**
- Multi-token standard
- Not yet supported
- Coming in future update

### Token Decimals

**Understanding Decimals:**
- Tokens have different decimal places
- USDC: 6 decimals
- WETH: 18 decimals
- Affects smallest unit

**Display:**
- App handles decimals automatically
- Shows human-readable amounts
- Properly formats based on token

### Batch Operations

**Current Limitations:**
- One token operation at a time
- Multiple requires multiple transactions
- Each pays separate gas

**Future Features:**
- Batch sending
- Multi-token approval
- Gas optimization

## Token Lists

### Default Token Lists

OpenBurner uses curated lists:
- Popular tokens per network
- Verified contracts
- Updated regularly
- Sourced from trusted providers

### Custom Token Lists

**User-Added Tokens:**
- Stored per network
- Persisted in browser
- Synced across sessions
- Can be removed anytime

**Token List Storage:**
- localStorage key: `tokens_{chainId}`
- JSON array of addresses
- Network-specific
- Survives page refresh

## FAQ

**Q: Why isn't my token showing?**  
A: Check if you have a balance and you're on the correct network. Add manually if needed.

**Q: Can I send tokens to any address?**  
A: Yes, any valid Ethereum address. Verify recipient can receive that token.

**Q: Do I need approval to send?**  
A: No for direct transfers. Approvals only needed for smart contract interactions.

**Q: Why do I need ETH to send USDC?**  
A: Gas fees are always paid in native token (ETH, MATIC, etc.), not the token you're sending.

**Q: Can I send tokens between networks?**  
A: No, use a bridge. Direct sends go to same network.

**Q: Where are my tokens stored?**  
A: In your wallet on the blockchain. The app just displays them.

**Q: Are custom tokens safe?**  
A: Only add tokens from trusted sources. Malicious tokens exist.

**Q: How often do prices update?**  
A: 3-30 minutes depending on token type. Refresh manually for latest.

## Resources

### Finding Tokens
- [CoinGecko](https://www.coingecko.com) - Token data and addresses
- [Etherscan](https://etherscan.io) - Ethereum token explorer
- [DexScreener](https://dexscreener.com) - New token launches

### Learning More
- [ERC-20 Standard](https://eips.ethereum.org/EIPS/eip-20)
- [Token Safety](https://ethereum.org/en/developers/docs/standards/tokens/erc-20/)
- [Understanding Decimals](https://docs.openzeppelin.com/contracts/4.x/erc20#a-note-on-decimals)

---

**Next:** Read about [Network Management](NETWORKS.md) or return to [User Guide](USER_GUIDE.md)

