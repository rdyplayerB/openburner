# OpenBurner User Guide

A complete guide to using OpenBurner wallet with your HaLo NFC chip.

## Table of Contents

- [Getting Started](#getting-started)
- [Connecting Your Wallet](#connecting-your-wallet)
- [Viewing Your Balance](#viewing-your-balance)
- [Managing Networks](#managing-networks)
- [Sending Transactions](#sending-transactions)
- [Managing Tokens](#managing-tokens)
- [Receiving Funds](#receiving-funds)
- [Security Tips](#security-tips)
- [Troubleshooting](#troubleshooting)

## Getting Started

### What You Need

1. **HaLo NFC Chip** - Your hardware wallet
2. **NFC Reader** - USB reader connected to your computer
3. **HaLo Bridge** - Software running on your computer
4. **OpenBurner** - This web application

### First Time Setup

1. Install the HaLo Bridge software
2. Connect your USB NFC reader
3. Start the HaLo Bridge (it runs on port 32868)
4. Open OpenBurner in your browser
5. Tap your HaLo chip to connect

See [Setup Guide](../setup/SETUP_GUIDE.md) for detailed installation instructions.

## Connecting Your Wallet

### Step 1: Start the Bridge

Make sure your HaLo Bridge is running:
```
✓ Bridge running on ws://127.0.0.1:32868
```

### Step 2: Connect to Bridge

1. Click **"Connect HaLo Chip"** button
2. Wait for connection (you'll see "Connecting...")
3. When prompted, **tap your HaLo chip** on the NFC reader

### Step 3: Chip Detection

The app will:
- Detect your chip
- Read your public key
- Derive your Ethereum address
- Display your wallet

**First time?** Your address might have zero balance. That's normal!

### What If It Doesn't Connect?

**Check:**
- Bridge is running (`ws://127.0.0.1:32868`)
- NFC reader is connected
- Chip is close enough to reader (try tapping directly)
- No other NFC software is interfering

See [Troubleshooting](#troubleshooting) section below.

## Viewing Your Balance

### Main Balance Display

After connecting, you'll see:

```
┌────────────────────────────────┐
│  Total Balance                 │
│  5.2847 ETH                   │
│  ≈ $18,256.45 USD             │
└────────────────────────────────┘
```

- **Top number**: Your native token balance (ETH, MATIC, etc.)
- **Bottom number**: Approximate USD value (from CoinGecko)

### Token List

Below your main balance, you'll see all detected tokens:

```
┌────────────────────────────────┐
│  ETH                          │
│  Ethereum              5.2847  │
│  ≈ $18,256.45                 │
├────────────────────────────────┤
│  USDC                         │
│  USD Coin            1,000.00  │
│  ≈ $1,000.00                  │
└────────────────────────────────┘
```

**Automatic Detection:** Popular tokens are automatically detected if you have a balance.

### Refreshing Balances

Click the **refresh icon** (🔄) to update all balances.

Prices update automatically but you can force a refresh.

## Managing Networks

### Switching Networks

1. Click the **network dropdown** (shows current network)
2. Select from popular networks:
   - Ethereum Mainnet
   - Base
   - Arbitrum One
   - Optimism
   - Polygon
   - And more...

### Your balance and tokens will update for the new network

### Adding Custom Networks

1. Click network dropdown
2. Click **"Custom RPC"**
3. Enter:
   - **Network Name**: e.g., "Optimism"
   - **RPC URL**: e.g., "https://mainnet.optimism.io"
   - **Chain ID**: e.g., "10"
4. Click **"Connect"**

**Find RPC URLs:** Check [chainlist.org](https://chainlist.org) for verified RPC endpoints.

### Network Information

Each network displays:
- Network name (Ethereum, Base, etc.)
- Chain ID
- Native token symbol
- Your address on that network

**Note:** Your address is the same on all EVM-compatible networks.

See [Network Management Guide](NETWORKS.md) for details.

## Sending Transactions

### Sending Native Tokens (ETH, MATIC)

1. Click **"Send"** button on main balance
2. Enter **recipient address** (0x...)
3. Enter **amount** to send
4. Review transaction details:
   - Recipient
   - Amount
   - Gas fee estimate
   - Total cost
5. Click **"Sign & Send"**
6. **Tap your HaLo chip** when prompted
7. Wait for confirmation

### Sending ERC-20 Tokens

1. Find the token in your token list
2. Click the **send icon** (➡️) next to the token
3. Enter recipient and amount
4. Review details
5. Sign with your chip
6. Confirm transaction

### Transaction Status

After sending, you'll see:
- ⏳ **Pending**: Transaction submitted
- ✅ **Confirmed**: Transaction completed
- ❌ **Failed**: Transaction rejected

Click the transaction hash to view on block explorer.

### Important: Gas Fees

- **Native token required**: Need ETH (or MATIC on Polygon) for gas
- **Gas prices vary**: Higher gas = faster confirmation
- **Check balance**: Make sure you have enough for amount + gas

**Pro Tip:** Keep some native tokens for gas, even when holding only ERC-20s.

## Managing Tokens

### Auto-Detected Tokens

Popular tokens are automatically detected:
- USDC, USDT (stablecoins)
- WETH, WBTC (wrapped tokens)
- UNI, AAVE, LINK (DeFi tokens)
- And many more...

**Only tokens with balance are shown.**

### Adding Custom Tokens

1. Click **"Add Token"** button
2. Enter **token contract address**
3. Click **"Add Token"**

The app will:
- Verify it's a valid ERC-20 token
- Check your balance
- Add to your token list (if balance > 0)

**Finding contract addresses:**
- [CoinGecko](https://www.coingecko.com) - Search token, copy contract address
- [Etherscan](https://etherscan.io) - Verified contract addresses
- Project's official website

### Removing Tokens

1. Hover over a custom token
2. Click the **X** icon
3. Token is removed from your list

**Note:** You can only remove custom tokens. Auto-detected tokens remain.

See [Token Management Guide](TOKENS.md) for details.

## Receiving Funds

### Your Address

Click your address at the top to:
- **Copy** to clipboard
- View **QR code** for scanning

### Receiving Crypto

1. Click **"Receive"** button
2. Show QR code or share your address
3. Sender sends funds to your address
4. Funds appear in your wallet

### Important Notes

**Same address across networks:**
- Your address (0x123...) is the same on all EVM chains
- **Always verify the network** with sender
- Sending ETH on wrong network may cause loss

**ERC-20 Token Addresses:**
- You receive ERC-20 tokens at your main wallet address
- No separate address per token
- Token contract address ≠ your wallet address

**Best Practice:**
- Always test with small amount first
- Verify network matches before large transfers
- Double-check address before sharing

## Security Tips

### Do's ✅

- **Verify transactions** before signing
- **Check recipient address** carefully
- **Confirm network** is correct
- **Use trusted RPCs** only
- **Keep chip physically secure**
- **Enable PIN** if supported
- **Test small amounts** first
- **Bookmark OpenBurner URL**

### Don'ts ❌

- **Never share your chip** with anyone
- **Don't sign unknown transactions**
- **Don't use untrusted RPCs**
- **Don't ignore warnings**
- **Don't rush transactions**
- **Don't click suspicious links**
- **Don't enter seed phrases** (HaLo doesn't use them)

### Recognizing Scams

**Red Flags:**
- Unsolicited "support" messages
- Requests for your seed phrase (HaLo doesn't have one)
- "Urgent" transaction requests
- Too-good-to-be-true offers
- Unverified token airdrops
- Pressure to sign immediately

**When in doubt, don't sign!**

## Troubleshooting

### Connection Issues

**Problem:** "Failed to connect to bridge"

**Solutions:**
- Verify bridge is running (check port 32868)
- Restart HaLo Bridge
- Check firewall isn't blocking localhost
- Try different browser
- Check browser console for errors

**Problem:** "Chip not detected"

**Solutions:**
- Tap chip closer to reader
- Hold chip steady for 2-3 seconds
- Try different position on reader
- Check reader is connected
- Restart NFC reader

### Transaction Issues

**Problem:** "Insufficient funds"

**Solutions:**
- Check you have enough tokens
- Verify gas fee can be paid
- Try lower amount
- Make sure you're on right network

**Problem:** "Transaction failed"

**Solutions:**
- Check gas limit is sufficient
- Verify recipient address is valid
- Try increasing gas price
- Check network isn't congested

### Balance Issues

**Problem:** "Balance not updating"

**Solutions:**
- Click refresh button
- Wait for network confirmations
- Check you're on correct network
- Verify transaction was confirmed
- Clear cache and reload

**Problem:** "Token not showing"

**Solutions:**
- Check you have a balance (>0)
- Add token manually with contract address
- Verify token is on current network
- Refresh token list

### Display Issues

**Problem:** "Price not showing"

**Solutions:**
- Check internet connection
- Wait 60 seconds (price cache)
- Refresh page
- Check CoinGecko API status

**Problem:** "Wallet looks broken"

**Solutions:**
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Clear browser cache
- Try incognito/private mode
- Use different browser

### Getting More Help

**Can't solve your issue?**

1. Check [GitHub Issues](https://github.com/yourusername/OpenBurner/issues)
2. Join our [Discord](#) for community support
3. Open a [new issue](https://github.com/yourusername/OpenBurner/issues/new)
4. Email support@openburner.io

**When reporting issues, include:**
- Browser and version
- Operating system
- Bridge version
- Error messages
- Steps to reproduce

## Advanced Features

### Multiple Chips

You can use multiple HaLo chips:
- Each chip has different address
- Disconnect current chip
- Tap new chip to switch
- Each chip maintains separate balance

### Key Slots

HaLo chips support up to 9 key slots:
- Currently uses highest available slot
- Future update will allow slot selection
- Each slot = separate address

### Custom Gas Settings

Advanced users can adjust:
- Gas limit (fixed currently)
- Gas price (uses EIP-1559)
- Priority fee (for faster confirmation)

*Coming soon in future updates*

## Best Practices

### For Daily Use

1. **Start each session:** Connect chip
2. **Verify network:** Check you're on correct chain
3. **Check balance:** Ensure sufficient funds
4. **Review transaction:** Read all details
5. **Sign carefully:** Tap chip only after verification
6. **Confirm success:** Check block explorer

### For Large Transfers

1. **Test first:** Send small amount
2. **Verify receipt:** Confirm test transaction
3. **Send main amount:** After test succeeds
4. **Wait for confirms:** Don't rush
5. **Save hash:** Keep transaction record

### For Long-Term Storage

1. **Secure chip:** Safe location
2. **Backup address:** Write down/save
3. **Test recovery:** Verify chip works
4. **Document networks:** Note which chains used
5. **Track tokens:** List of holdings

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Esc` | Close modal |
| `Ctrl/Cmd + C` | Copy address (when visible) |
| `R` | Refresh balances (when focused) |

*More shortcuts coming in future updates*

## Next Steps

Now that you know the basics:

- Read [Network Management](NETWORKS.md) for advanced network features
- Learn [Token Management](TOKENS.md) for custom tokens
- Review [Security Guide](../technical/SECURITY.md) for deeper security understanding
- Explore [API Documentation](../technical/API_REFERENCE.md) if you're a developer

---

**Questions?** Check our [FAQ](#) or join the [community Discord](#).

**Found a bug?** Report it on [GitHub Issues](https://github.com/yourusername/OpenBurner/issues).

