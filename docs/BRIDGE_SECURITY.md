# Bridge Security Considerations

## Overview

This document outlines the security considerations for USB NFC reader access through the HaLo Bridge. The bridge is used in local mode only: the hosted app on desktop connects through the HaLo Gateway, since a page served over HTTPS can't open the bridge's local `ws://` connection.

## Security Model

### 1. Consent-Based Access
- **User Consent Required**: The bridge connection requires explicit user consent before accessing USB NFC readers
- **Consent Page**: When the card needs your PIN, the bridge's own consent page opens in a small window (`http://localhost:32868/consent`)

### 2. Browser Security Limitations
- **No Direct USB Access**: Web browsers cannot directly access USB devices for security reasons
- **Bridge Software Required**: A local bridge software (Halo Bridge) must be installed and running
- **WebSocket Communication**: The web app communicates with the bridge via WebSocket on localhost

### 3. Network Security
- **Localhost Only**: Bridge communication is restricted to localhost (127.0.0.1:32868)
- **No External Network**: The bridge does not communicate over external networks

## Security Measures Implemented

### 1. Consent Flow
```typescript
// lib/burner-bridge.ts: the bridge asks for consent (PIN entry) on its own page
const consentUrl = `http://localhost:32868/consent?uid=${msg.uid}`;
window.open(consentUrl, "Burner PIN", "width=400,height=600");
```

### 2. Signature Verification
- Every signature must recover to the address you connected with before it's broadcast or returned to a dApp
- A malformed card key ends the connection instead of being repaired

### 3. Error Handling
- Gateway mode is available from the connect screen if the bridge isn't running
- Clear error messages for users
- No keys, signatures, pairing links or PINs in logs

### 4. Connection Validation
- Bridge connection status is continuously monitored
- Automatic cleanup on component unmount
- Proper error handling for connection failures

## Browser Compatibility

### Supported Browsers
- **Chrome**: Full support with proper consent handling
- **Edge**: Full support (Chromium-based)
- **Safari**: Limited support, may require additional permissions
- **Firefox**: Limited support, may require additional permissions

### Security Considerations by Browser

#### Chrome/Edge
- ✅ Full WebSocket support
- ✅ Proper consent handling
- ✅ Secure context requirements met

#### Safari
- ⚠️ May require additional user permissions
- ⚠️ WebSocket support may be limited
- ⚠️ Consent flow may be different

#### Firefox
- ⚠️ May require additional user permissions
- ⚠️ WebSocket support may be limited
- ⚠️ Security model may differ

## Best Practices

### 1. User Education
- Clear explanation of what the bridge does
- Visual indicators of connection status
- Helpful error messages with next steps

### 2. Fallback Options
- Gateway mode as alternative to bridge mode
- Clear instructions for installing bridge software
- Graceful degradation when bridge is unavailable

### 3. Security Monitoring
- Log security-related events
- Monitor for suspicious connection attempts
- Regular security audits of bridge communication

## Threat Model

### Potential Threats
1. **Malicious Websites**: Websites attempting to access bridge without consent
2. **Man-in-the-Middle**: Interception of bridge communication
3. **Privilege Escalation**: Unauthorized access to USB devices
4. **Data Exfiltration**: Unauthorized access to card data

### Mitigations
1. **Consent Verification**: User must explicitly grant consent
2. **Localhost Restriction**: Bridge only accessible from localhost
3. **Signature Checks**: Every signature must match the connected card
4. **Origin Validation**: Verify requesting website origin

## Implementation Notes

### Bridge Service
- `lib/burner-bridge.ts` talks to the bridge over WebSocket at `ws://127.0.0.1:32868/ws`
- Implements proper error handling and cleanup

### Consent Page
- Served by the bridge itself, not by OpenBurner

### Error Handling
- Graceful fallback to alternative connection methods
- Clear error messages for users
- Proper cleanup of resources

## Future Improvements

1. **Enhanced Consent**: More detailed consent information
2. **Audit Logging**: Log all bridge access attempts
3. **Permission Management**: Allow users to revoke consent
4. **Security Headers**: Implement additional security headers
5. **Rate Limiting**: Prevent abuse of bridge connections

## Conclusion

The bridge connection requires explicit consent on the bridge's own page, is restricted to localhost, and every signature is checked against the connected card. The HaLo Gateway is the alternative when the bridge isn't available.
