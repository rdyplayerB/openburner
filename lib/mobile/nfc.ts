import { connectWithMobileGateway } from './mobile-gateway';
import { BurnerKeyInfo } from '../burner';

/**
 * Connect with mobile NFC - uses Web NFC API when available, falls back to mobile gateway
 */
export async function connectWithMobileNFC(): Promise<BurnerKeyInfo> {
  // Check if Web NFC is available (Chrome/Android)
  if ('NDEFReader' in window) {
    try {
      console.log("📱 [Mobile NFC] Web NFC API available, attempting direct connection...");
      return await connectWithWebNFC();
    } catch (error) {
      console.warn("📱 [Mobile NFC] Web NFC failed, falling back to mobile gateway:", error);
      return await connectWithMobileGateway();
    }
  } else {
    // Web NFC not available - use mobile gateway approach
    console.log("📱 [Mobile NFC] Web NFC not available, using mobile gateway...");
    return await connectWithMobileGateway();
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
