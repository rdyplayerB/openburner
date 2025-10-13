# Security Model

## Overview

OpenBurner implements a defense-in-depth security model leveraging hardware-based key storage through HaLo NFC chips. This document outlines the security architecture, threat model, and best practices.

## Security Architecture

### Hardware Security Layer (HaLo Chip)

The HaLo chip is the foundation of OpenBurner's security:

**Secure Element Specifications:**
- **Certification**: EAL6+ certified secure element
- **Chip**: Tamper-resistant cryptographic processor
- **Key Storage**: Hardware-isolated private key storage
- **Signing**: On-chip ECDSA secp256k1 operations
- **Slots**: Up to 9 separate key slots per chip

**Security Properties:**
- Private keys never leave the secure element
- Keys generated on-chip with hardware entropy
- Tamper-evident packaging
- Side-channel attack resistance
- Secure boot and firmware verification

### Application Security Layer

**Key Management:**
```
┌───────────────────────────────────┐
│   Application (OpenBurner)        │
│                                   │
│  ✅ Handles: Public keys/addresses│
│  ✅ Builds: Unsigned transactions │
│  ✅ Receives: Signatures          │
│                                   │
│  ❌ Never sees: Private keys      │
│  ❌ Cannot: Extract keys          │
└───────────────────────────────────┘
```

**Transaction Flow Security:**
1. App builds unsigned transaction
2. Computes Keccak256 hash
3. Sends only hash to chip (not full transaction)
4. User physically taps chip to authorize
5. Chip signs with private key
6. App receives signature, serializes transaction
7. Broadcast to network

### Network Security Layer

**RPC Communication:**
- HTTPS for all RPC calls
- User-configurable RPC endpoints
- No sensitive data in RPC requests
- Support for private RPC providers

**WebSocket Bridge:**
- Local-only connection (127.0.0.1:32868)
- Not exposed to internet
- Command authentication
- Session-based communication

## Threat Model

### Protected Against ✅

| Attack Vector | Protection | Details |
|--------------|------------|---------|
| **Private key extraction** | Hardware isolation | Keys never leave secure element |
| **Malware/keyloggers** | No key exposure | Keys never enter computer memory |
| **Network eavesdropping** | HTTPS + public data only | Only public keys/addresses transmitted |
| **Remote attacks** | Physical requirement | Must physically possess chip to sign |
| **Brute force attacks** | Hardware key storage | Keys not accessible for offline attacks |
| **Side-channel attacks** | Secure element protection | EAL6+ certified against side channels |

### Partial Protection ⚠️

| Attack Vector | Mitigation | User Responsibility |
|--------------|------------|---------------------|
| **Phishing attacks** | Transaction review UI | User must verify transaction details |
| **Malicious transactions** | Physical tap required | User must review before tapping |
| **Physical chip theft** | Optional PIN protection | User should enable PIN and secure chip |
| **Malicious RPC** | HTTPS only | User should use trusted RPC providers |

### Not Protected Against ❌

| Attack Vector | Why | Mitigation |
|--------------|-----|------------|
| **Transaction details manipulation** | App controls display | Always verify on external source |
| **Malicious bridge** | Bridge could send wrong hashes | Use official bridge software only |
| **User approval errors** | User controls authorization | Carefully review all transactions |
| **Physical theft + PIN compromise** | Both factors compromised | Secure chip, use strong PIN |

## Security Best Practices

### For Users

**1. Physical Security**
- Keep HaLo chip in a secure location
- Don't share or lend your chip
- Report lost chips immediately
- Consider using a PIN-protected chip

**2. Transaction Verification**
- Always verify recipient address
- Double-check transaction amount
- Confirm you're on the correct network
- Review gas fees before signing

**3. RPC Selection**
- Use reputable RPC providers (Alchemy, Infura, Ankr)
- Prefer private RPCs over public endpoints
- Verify RPC URLs before connecting
- Don't use untrusted custom RPCs

**4. Network Safety**
- Verify chain ID matches network
- Be cautious with custom networks
- Understand network you're interacting with
- Watch for network switching attacks

**5. Software Security**
- Use official OpenBurner releases only
- Keep software updated
- Verify HaLo Bridge is official
- Use HTTPS for web access

### For Developers

**1. Key Handling**
- Never log private keys (none should exist)
- Never transmit private keys
- Only handle public keys and addresses
- Clear sensitive data from memory when possible

**2. Transaction Building**
- Validate all transaction parameters
- Sanitize user inputs
- Use ethers.js validation
- Implement nonce management

**3. Signing Flow**
- Only send transaction hashes to chip
- Validate signature format
- Verify recovered address matches
- Handle signing errors gracefully

**4. RPC Interaction**
- Always use HTTPS
- Validate RPC responses
- Implement request timeouts
- Handle network errors

**5. Bridge Communication**
- Validate bridge is on localhost
- Implement command timeouts
- Handle connection errors
- Log security-relevant events

## Attack Scenarios & Defenses

### Scenario 1: Compromised Computer

**Attack**: Malware on user's computer tries to steal keys

**Defense**:
- ✅ Keys never on computer (in secure element)
- ✅ Malware can't extract from chip
- ⚠️ Malware could manipulate transaction display
- ⚠️ User must verify transactions

**Outcome**: Private keys safe, but user must be vigilant

### Scenario 2: Man-in-the-Middle (MITM)

**Attack**: Attacker intercepts network traffic

**Defense**:
- ✅ HTTPS encrypts RPC traffic
- ✅ Only public data transmitted
- ✅ Signatures computed locally
- ✅ No secrets in transit

**Outcome**: Attack ineffective, no sensitive data exposed

### Scenario 3: Phishing Website

**Attack**: Fake website tries to steal funds

**Defense**:
- ✅ Physical chip tap required for signatures
- ⚠️ User sees transaction details before signing
- ⚠️ User must verify recipient address
- ❌ User could approve malicious transaction

**Outcome**: User education critical, hardware prevents remote attacks

### Scenario 4: Physical Chip Theft

**Attack**: Attacker steals HaLo chip

**Defense**:
- ⚠️ Optional PIN protection available
- ⚠️ Limited signing attempts before lockout
- ❌ Unprotected chip fully accessible
- ❌ User must report theft immediately

**Outcome**: PIN protection recommended for high-value use

### Scenario 5: Malicious Bridge

**Attack**: Compromised HaLo Bridge software

**Defense**:
- ⚠️ Bridge can't extract keys from chip
- ❌ Bridge could send wrong transaction hashes
- ❌ Bridge could manipulate responses
- ✅ Use official bridge software only

**Outcome**: Use official, verified bridge software

## Comparison with Other Wallets

### vs Software Wallets (MetaMask)

| Aspect | OpenBurner | MetaMask |
|--------|-----------|----------|
| Key Storage | Hardware (chip) | Software (encrypted) |
| Malware Risk | Low | Medium-High |
| Phishing Risk | Low | High |
| User Experience | Physical tap required | Click to sign |
| Recovery | Chip backup needed | Seed phrase |
| Cost | Hardware required | Free |

### vs Hardware Wallets (Ledger)

| Aspect | OpenBurner | Ledger |
|--------|-----------|--------|
| Key Storage | Secure element (HaLo) | Secure element |
| Form Factor | NFC chip/card | USB device |
| Transaction Review | On screen | On device screen |
| Portability | Very portable | Portable |
| Price | Lower | Higher |
| Screen | None (trust app) | Built-in display |

### Security Trade-offs

**OpenBurner Advantages:**
- Hardware-secured keys
- Portable form factor
- No battery/charging needed
- Lower cost than traditional hardware wallets

**OpenBurner Considerations:**
- No built-in screen (trust application display)
- Requires NFC reader or phone
- Physical chip must be secure
- Transaction review on potentially compromised device

## Security Roadmap

### Planned Enhancements

1. **PIN Protection Integration**
   - UI for PIN entry
   - PIN change functionality
   - Lockout after failed attempts

2. **Transaction Simulation**
   - Pre-signing simulation
   - Balance change preview
   - Warning for suspicious transactions

3. **Trusted Display**
   - QR code verification
   - External display confirmation
   - Mobile app transaction review

4. **Multi-Signature Support**
   - Multiple chip approval
   - Threshold signatures
   - Social recovery

5. **Audit Logging**
   - Transaction history
   - Failed signing attempts
   - Security event logging

## Security Audits

**Status**: No formal audit yet

**Recommended Actions:**
- Professional security audit recommended for production use
- Smart contract interactions should be audited
- Regular security reviews of dependencies
- Bug bounty program consideration

## Reporting Security Issues

**Do NOT** open public GitHub issues for security vulnerabilities.

**Instead:**
- Email: security@openburner.io
- Include detailed description
- Provide reproduction steps
- Allow time for fix before disclosure

**We commit to:**
- Acknowledge within 48 hours
- Provide status updates
- Credit reporters (if desired)
- Fix critical issues promptly

## Resources

### Official Documentation
- [HaLo Security Overview](https://docs.arx.org/security)
- [Secure Element Standards](https://www.commoncriteriaportal.org/)
- [EIP-712 Typed Data](https://eips.ethereum.org/EIPS/eip-712)

### Security Best Practices
- [Web3 Security Checklist](https://ethereum.org/en/security)
- [Hardware Wallet Best Practices](https://blog.ledger.com/security)
- [Smart Contract Security](https://consensys.github.io/smart-contract-best-practices/)

---

**Remember**: Hardware security is only as strong as its weakest link. Always practice good operational security and verify transactions carefully.

