import { ethers } from "ethers";
import { execHaloCmdWeb } from '@arx-research/libhalo/api/web';
import { connectWithMobileGateway } from './mobile-gateway';
import { BurnerKeyInfo } from '../burner';

/**
 * Connect with mobile NFC - uses execHaloCmdWeb for direct Halo connection
 */
export async function connectWithMobileNFC(): Promise<BurnerKeyInfo> {
  console.log("📱 [Mobile NFC] Starting direct Halo connection...");
  console.log("📱 [Mobile NFC] This will trigger the native iOS security key modal");
  
  try {
    // Use execHaloCmdWeb with credential method for direct Halo connection
    const result = await execHaloCmdWeb({
      name: "get_data_struct",
      spec: "latchValue:2,graffiti:1,compressedPublicKey:2,compressedPublicKey:9,publicKeyAttest:9,compressedPublicKey:8,publicKeyAttest:8"
    }, {
      method: "credential" // This triggers the native iOS security key modal
    });

    console.log("✅ [Mobile NFC] Direct Halo connection successful");
    console.log("📋 [Mobile NFC] Card data received:", result);

    // The result from execHaloCmdWeb has a different structure
    // It's wrapped in a 'data' property, similar to the gateway response
    const cardData = result.data || result;
    console.log("📋 [Mobile NFC] Processing card data:", cardData);

    // Process the result to find the best key slot
    const availableSlots: Array<{ keyNo: number; address: string; publicKey: string; hasAttestation: boolean }> = [];
    
    // Priority order: 9 (user wallet) > 8 (preloaded) > 2 (system)
    const targetSlots = [9, 8, 2];
    
    for (const slot of targetSlots) {
      const addressKey = `etherAddress:${slot}`;
      const publicKeyKey = `publicKey:${slot}`;
      const attestKey = `publicKeyAttest:${slot}`;
      
      if (cardData[addressKey] && cardData[publicKeyKey]) {
        availableSlots.push({
          keyNo: slot,
          address: cardData[addressKey],
          publicKey: cardData[publicKeyKey],
          hasAttestation: cardData[attestKey] ? true : false
        });
        console.log(`✅ [Mobile NFC] Found key slot ${slot}: ${cardData[addressKey]}`);
      }
    }

    if (availableSlots.length === 0) {
      // If no addresses found, try looking for compressed public keys and derive addresses
      console.log("📋 [Mobile NFC] No addresses found, trying to derive from compressed public keys...");
      
      for (const slot of targetSlots) {
        const compressedKeyKey = `compressedPublicKey:${slot}`;
        const attestKey = `publicKeyAttest:${slot}`;
        
        const compressedKey = cardData[compressedKeyKey];
        
        // Check if we have a valid compressed key (string) and not an error object
        if (compressedKey && typeof compressedKey === 'string') {
          try {
            // Ensure compressed key is proper length (33 bytes = 66 hex chars)
            let processedCompressedKey = compressedKey;
            if (compressedKey.length > 66) {
              // Take first 66 characters if too long
              processedCompressedKey = compressedKey.substring(0, 66);
              console.log(`⚠️ [Mobile NFC] Compressed key too long, truncating to 66 chars`);
            } else if (compressedKey.length < 66) {
              // Pad with zeros if too short
              processedCompressedKey = compressedKey.padEnd(66, '0');
              console.log(`⚠️ [Mobile NFC] Compressed key too short, padding to 66 chars`);
            }
            
            // Convert compressed public key to full public key using ethers
            const fullPublicKey = ethers.SigningKey.computePublicKey("0x" + processedCompressedKey, true);
            const publicKey = fullPublicKey.slice(2); // Remove 0x prefix
            const address = ethers.computeAddress("0x" + publicKey);
            
            availableSlots.push({
              keyNo: slot,
              address: address,
              publicKey: publicKey,
              hasAttestation: cardData[attestKey] && typeof cardData[attestKey] === 'string' ? true : false
            });
            console.log(`✅ [Mobile NFC] Found compressed key slot ${slot}: ${address}`);
            console.log(`   Public Key: ${publicKey.substring(0, 20)}...`);
            console.log(`   Compressed Key: ${processedCompressedKey.substring(0, 20)}...`);
          } catch (e) {
            console.log(`⚠️ [Mobile NFC] Failed to expand compressed key for slot ${slot}:`, e);
          }
        } else if (compressedKey && compressedKey.error) {
          console.log(`⚠️ [Mobile NFC] Key slot ${slot} not generated: ${compressedKey.error}`);
        }
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
