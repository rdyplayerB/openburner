import { execHaloCmdWeb } from '@arx-research/libhalo/api/web';
import { connectWithMobileGateway } from './mobile-gateway';
import { BurnerKeyInfo } from '../burner';

/**
 * Connect with mobile NFC - uses execHaloCmdWeb for direct Halo connection (like BurnerOS)
 */
export async function connectWithMobileNFC(): Promise<BurnerKeyInfo> {
  console.log("📱 [Mobile NFC] Starting direct Halo connection (BurnerOS method)...");
  console.log("📱 [Mobile NFC] This will trigger the native iOS security key modal");
  
  try {
    // Use the same approach as BurnerOS - execHaloCmdWeb with credential method
    const result = await execHaloCmdWeb({
      name: "get_data_struct",
      spec: "latchValue:2,graffiti:1,compressedPublicKey:2,compressedPublicKey:9,publicKeyAttest:9,compressedPublicKey:8,publicKeyAttest:8"
    }, {
      method: "credential" // This triggers the native iOS security key modal
    });

    console.log("✅ [Mobile NFC] Direct Halo connection successful");
    console.log("📋 [Mobile NFC] Card data received:", result);

    // Process the result to find the best key slot (same logic as BurnerOS)
    const availableSlots: Array<{ keyNo: number; address: string; publicKey: string; hasAttestation: boolean }> = [];
    
    // Priority order: 9 (user wallet) > 8 (preloaded) > 2 (system)
    const targetSlots = [9, 8, 2];
    
    for (const slot of targetSlots) {
      const addressKey = `etherAddress:${slot}`;
      const publicKeyKey = `publicKey:${slot}`;
      const attestKey = `publicKeyAttest:${slot}`;
      
      if (result[addressKey] && result[publicKeyKey]) {
        availableSlots.push({
          keyNo: slot,
          address: result[addressKey],
          publicKey: result[publicKeyKey],
          hasAttestation: result[attestKey] ? true : false
        });
        console.log(`✅ [Mobile NFC] Found key slot ${slot}: ${result[addressKey]}`);
      }
    }

    if (availableSlots.length === 0) {
      throw new Error("No valid wallet keys found on card. Please ensure the card remains on your device and try again.");
    }

    // Select the best key slot (priority: 9 > 8 > 2)
    const bestSlot = availableSlots[0];
    console.log(`🎯 [Mobile NFC] Selected key slot ${bestSlot.keyNo}`);
    console.log(`   Address: ${bestSlot.address}`);
    console.log(`   Public Key: ${bestSlot.publicKey.substring(0, 40)}...`);
    console.log(`   Has Attestation: ${bestSlot.hasAttestation}`);
    
    return {
      address: bestSlot.address,
      publicKey: bestSlot.publicKey,
      keySlot: bestSlot.keyNo,
    };
    
  } catch (error: any) {
    console.error("❌ [Mobile NFC] Direct Halo connection failed:", error);
    
    // If direct connection fails, fall back to mobile gateway
    console.log("📱 [Mobile NFC] Direct connection failed, falling back to mobile gateway...");
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
