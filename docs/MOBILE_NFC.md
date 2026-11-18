# Mobile NFC Integration

This document explains the mobile NFC implementation for the hosted version of OpenBurner.

## Overview

The hosted mobile version provides a streamlined experience where users simply tap their Burner Ethereum card to their smartphone to connect their wallet.

## Implementation Strategy

### Phone NFC (hosted, on a phone)
- **Implementation**: `lib/mobile/nfc.ts` sends each card command through libhalo's `execHaloCmdWeb` with `method: "credential"`. The phone shows its own NFC prompt and the card is read with one tap.
- **Status**: Implemented. Connecting and every signature use it.

### Gateway Mode (hosted, on a desktop)
- **Implementation**: Uses the HaLo Gateway with a smartphone as the NFC reader (`lib/burner-gateway.ts`)
- **Status**: Implemented

## Current Implementation

```typescript
// lib/mobile/nfc.ts
export async function connectWithMobileNFC(): Promise<BurnerKeyInfo> {
  // No per-slot fallback here: each extra command would be another tap.
  const key = await scanCardKeys(runNfcCommand);
  return { address: key.address, publicKey: key.publicKey, keySlot: key.keySlot };
}
```

`scanCardKeys` (`lib/card/keys.ts`) picks the wallet key by slot priority (9 > 8 > 2) and accepts only a valid secp256k1 public key. `runNfcCommand` gives up after 60 seconds without a tap, and a dismissed NFC prompt is treated as a cancel, not an error.

## User Experience

### Mobile UI
- Single "Tap Your Burner" button
- Clear instructions for card placement
- Mobile-optimized error handling
- Responsive design for all screen sizes

### Error Handling
- NFC not available: Enable NFC in settings; use Chrome on Android or Safari on iPhone
- Card not read: Reposition card
- NFC access blocked: Allow NFC when the phone asks
- Offline: Check internet connection
- Connection failed: Retry with clear instructions

## Testing

### Android Chrome
- Enable NFC in device settings
- Test with various Burner Ethereum cards
- Verify error handling for missing cards

### iOS Safari
- Tap the card to the top of the phone
- Verify connecting and signing

### Other Browsers
- Test error messages for unsupported browsers

## Browser Compatibility

The app's NFC error screen tells people to use Chrome on Android or Safari on iPhone. On a desktop, the hosted app uses the HaLo Gateway instead.

## Security Considerations

- The deployer's API keys stay on the server. Keys you enter in Settings are stored in this browser
- Card commands go through LibHalo
- Gateway mode uses secure WebSocket connection
- Every signature is checked against the connected card, as in bridge mode
