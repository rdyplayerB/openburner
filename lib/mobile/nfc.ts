import { getBurnerAddressViaGateway } from '../burner-gateway';
import { BurnerKeyInfo } from '../burner';

/**
 * Connect with mobile NFC - uses Web NFC API when available, falls back to gateway
 */
export async function connectWithMobileNFC(): Promise<BurnerKeyInfo> {
  // Check if Web NFC is available (Chrome/Android)
  if ('NDEFReader' in window) {
    try {
      console.log("📱 [Mobile NFC] Web NFC API available, attempting direct connection...");
      return await connectWithWebNFC();
    } catch (error) {
      console.warn("📱 [Mobile NFC] Web NFC failed, falling back to gateway:", error);
      return await getBurnerAddressViaGateway();
    }
  } else {
    // Use gateway mode for iOS and other browsers
    console.log("📱 [Mobile NFC] Web NFC not available, using gateway mode...");
    return await getBurnerAddressViaGateway();
  }
}

/**
 * Connect using Web NFC API (Chrome/Android only)
 * FUTURE IMPLEMENTATION: This would use the Web NFC API directly
 */
async function connectWithWebNFC(): Promise<BurnerKeyInfo> {
  // FUTURE: Implement Web NFC API integration
  // For now, throw error to trigger gateway fallback
  throw new Error("Web NFC implementation pending - using gateway fallback");
  
  // FUTURE IMPLEMENTATION:
  // const reader = new NDEFReader();
  // await reader.scan();
  // // ... Web NFC implementation similar to burner.ts logic
}

/**
 * Check if Web NFC is supported on this device
 */
export function isWebNFCSupported(): boolean {
  return 'NDEFReader' in window;
}
