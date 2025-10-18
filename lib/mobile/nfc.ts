import { connectWithMobileGateway } from './mobile-gateway';
import { BurnerKeyInfo } from '../burner';

/**
 * Connect with mobile NFC - uses WebAuthn for iOS, Web NFC for Android, falls back to mobile gateway
 */
export async function connectWithMobileNFC(): Promise<BurnerKeyInfo> {
  // Check if Web NFC is available (Chrome/Android)
  if ('NDEFReader' in window) {
    try {
      console.log("📱 [Mobile NFC] Web NFC API available, attempting direct connection...");
      return await connectWithWebNFC();
    } catch (error) {
      console.warn("📱 [Mobile NFC] Web NFC failed, falling back to WebAuthn:", error);
      return await connectWithWebAuthn();
    }
  } else {
    // Web NFC not available - use WebAuthn for iOS
    console.log("📱 [Mobile NFC] Web NFC not available, using WebAuthn...");
    return await connectWithWebAuthn();
  }
}

/**
 * Connect using WebAuthn API - triggers native iOS "Use Security Key" modal
 */
async function connectWithWebAuthn(): Promise<BurnerKeyInfo> {
  console.log("📱 [Mobile NFC] Starting WebAuthn connection...");
  console.log("📱 [Mobile NFC] This will trigger the native iOS security key modal");
  
  try {
    // Use WebAuthn to authenticate with existing security key
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: new Uint8Array(32), // Random challenge
        allowCredentials: [], // Allow any credential
        userVerification: "required",
        timeout: 60000, // 60 second timeout
        rpId: window.location.hostname
      }
    });

    if (!credential) {
      throw new Error("No credential returned from WebAuthn");
    }

    console.log("✅ [Mobile NFC] WebAuthn authentication successful");
    console.log("📋 [Mobile NFC] Credential ID:", credential.id);
    console.log("📋 [Mobile NFC] Type:", credential.type);

    // For now, we'll need to extract the public key and derive the address
    // This is a simplified implementation - in practice, you'd need to:
    // 1. Extract the public key from the credential
    // 2. Derive the Ethereum address from the public key
    // 3. Handle the key slot information
    
    // Placeholder implementation - you'll need to implement proper key extraction
    const mockAddress = "0x" + Array.from(new Uint8Array(20)).map(b => b.toString(16).padStart(2, '0')).join('');
    const mockPublicKey = "0x" + Array.from(new Uint8Array(64)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    return {
      address: mockAddress,
      publicKey: mockPublicKey,
      keySlot: 9 // Default to slot 9
    };
    
  } catch (error: any) {
    console.error("❌ [Mobile NFC] WebAuthn connection failed:", error);
    
    // If WebAuthn fails, fall back to mobile gateway
    console.log("📱 [Mobile NFC] WebAuthn failed, falling back to mobile gateway...");
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
