import { BurnerKeyInfo } from '../burner';

/**
 * Connect with mobile NFC - uses Web NFC API when available, falls back to error
 */
export async function connectWithMobileNFC(): Promise<BurnerKeyInfo> {
  // Check if Web NFC is available (Chrome/Android)
  if ('NDEFReader' in window) {
    try {
      console.log("📱 [Mobile NFC] Web NFC API available, attempting direct connection...");
      return await connectWithWebNFC();
    } catch (error) {
      console.warn("📱 [Mobile NFC] Web NFC failed:", error);
      throw new Error("Web NFC connection failed. Please ensure your device supports NFC and try again.");
    }
  } else {
    // Web NFC not available - provide helpful error message
    console.log("📱 [Mobile NFC] Web NFC not available on this device");
    throw new Error("NFC not supported on this device. Please use a device with Web NFC support (Chrome on Android) or connect via desktop.");
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
