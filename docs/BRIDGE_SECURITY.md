# Bridge Security Considerations

## Overview

This document outlines the security considerations for USB NFC reader access via web browsers in the hosted version of OpenBurner.

## Security Model

### 1. Consent-Based Access
- **User Consent Required**: The bridge connection requires explicit user consent before accessing USB NFC readers
- **Consent Modal**: A modal dialog matches the BurnerOS approval prompt, clearly explaining what access is being requested
- **Website Verification**: The consent modal displays the requesting website URL for user verification

### 2. Browser Security Limitations
- **No Direct USB Access**: Web browsers cannot directly access USB devices for security reasons
- **Bridge Software Required**: A local bridge software (Halo Bridge) must be installed and running
- **WebSocket Communication**: The web app communicates with the bridge via WebSocket on localhost

### 3. Network Security
- **Localhost Only**: Bridge communication is restricted to localhost (127.0.0.1:32868)
- **No External Network**: The bridge does not communicate over external networks
- **HTTPS Required**: The hosted version must be served over HTTPS for security

## Security Measures Implemented

### 1. Consent Flow
```typescript
// Consent is required before bridge connection
if (error instanceof NFCBridgeConsentError) {
  const consentURL = bridge.getConsentURL(window.location.origin, {});
  // Show consent modal to user
}
```

### 2. Origin Verification
- The consent URL includes the website origin for verification
- Users can verify they're granting access to the correct website
- The consent modal displays the full website URL

### 3. Error Handling
- Graceful fallback to gateway mode if bridge fails
- Clear error messages for users
- No sensitive information exposed in error messages

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
3. **HTTPS Enforcement**: Secure communication channel
4. **Origin Validation**: Verify requesting website origin

## Implementation Notes

### Bridge Service
- Uses `@arx-research/libhalo` for proper consent handling
- Implements proper error handling and cleanup
- Follows security best practices for WebSocket communication

### Consent Modal
- Matches BurnerOS approval prompt design
- Clear explanation of permissions requested
- User-friendly interface with proper accessibility

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

The bridge implementation follows security best practices by requiring explicit user consent, restricting access to localhost, and providing clear fallback options. The consent flow matches the BurnerOS approval prompt to maintain consistency and user trust.
