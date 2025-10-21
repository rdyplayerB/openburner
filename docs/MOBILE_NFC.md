# Mobile NFC Integration

This document explains the mobile NFC implementation for the hosted version of OpenBurner.

## Overview

The hosted mobile version provides a streamlined experience where users simply tap their Burner card to their smartphone to connect their wallet.

## Implementation Strategy

### Web NFC API (Primary)
- **Supported**: Chrome/Android devices
- **Implementation**: Direct NFC communication with Burner cards
- **Status**: Prepared for future implementation

### Gateway Mode (Fallback)
- **Supported**: All devices with NFC
- **Implementation**: Uses HaLo Gateway with smartphone as NFC reader
- **Status**: Currently implemented and working

## Current Implementation

```typescript
// lib/mobile/nfc.ts
export async function connectWithMobileNFC(): Promise<BurnerKeyInfo> {
  if ('NDEFReader' in window) {
    try {
      return await connectWithWebNFC();
    } catch (error) {
      // Fallback to gateway mode
      return await getBurnerAddressViaGateway();
    }
  } else {
    // Use gateway mode for iOS and other browsers
    return await getBurnerAddressViaGateway();
  }
}
```

## User Experience

### Mobile UI
- Single "Tap Your Burner" button
- Clear instructions for card placement
- Mobile-optimized error handling
- Responsive design for all screen sizes

### Error Handling
- NFC not available: Enable NFC in settings
- Card not detected: Reposition card
- Connection failed: Retry with clear instructions
- Network issues: Check internet connection

## Future Web NFC Implementation

When Web NFC API is implemented:

```typescript
async function connectWithWebNFC(): Promise<BurnerKeyInfo> {
  const reader = new NDEFReader();
  await reader.scan();
  
  // Similar logic to burner.ts but using Web NFC API
  // Single tap to get all key information
  // Priority-based key selection (9 > 8 > 2)
  // Compressed key expansion for efficiency
}
```

## Testing

### Android Chrome
- Enable NFC in device settings
- Test with various Burner cards
- Verify error handling for missing cards

### iOS Safari
- Should automatically use gateway mode
- Test QR code scanning flow
- Verify smartphone connection

### Other Browsers
- Should fallback to gateway mode
- Test error messages for unsupported browsers

## Browser Compatibility

| Browser | Web NFC | Gateway Mode | Status |
|---------|---------|--------------|--------|
| Chrome/Android | ✅ | ✅ | Full support |
| Safari/iOS | ❌ | ✅ | Gateway only |
| Firefox | ❌ | ✅ | Gateway only |
| Edge | ❌ | ✅ | Gateway only |

## Security Considerations

- No API keys stored on device
- All wallet operations use existing LibBurner and LibHalo libraries
- Gateway mode uses secure WebSocket connection
- Web NFC will use same security model as bridge mode
