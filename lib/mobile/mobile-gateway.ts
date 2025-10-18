import { ethers } from "ethers";
import { HaloGateway } from '@arx-research/libhalo/api/web';
import { BurnerKeyInfo } from '../burner';

/**
 * Mobile-specific gateway connection that doesn't show QR codes
 * This is a simplified version of the desktop gateway for mobile use
 */
export async function connectWithMobileGateway(): Promise<BurnerKeyInfo> {
  console.log("📱 [Mobile Gateway] Starting mobile gateway connection...");
  console.log("📱 [Mobile Gateway] Please tap your Burner card to your device");
  
  let gateway: HaloGateway | null = null;
  
  try {
    // Create gateway instance
    console.log("🌐 [Mobile Gateway] Connecting to HaLo Gateway...");
    gateway = new HaloGateway('wss://s1.halo-gateway.arx.org', {
      createWebSocket: (url) => new WebSocket(url)
    });

    // Start pairing process
    console.log("📡 [Mobile Gateway] Starting pairing process...");
    const pairStart = Date.now();
    const pairInfo = await gateway.startPairing();
    const pairDuration = Date.now() - pairStart;
    console.log(`✅ [Mobile Gateway] Pairing started in ${pairDuration}ms`);
    console.log(`📱 [Mobile Gateway] Exec URL: ${pairInfo.execURL}`);

    // Wait for smartphone to connect (this is where the mobile device acts as the "smartphone")
    console.log("⏳ [Mobile Gateway] Waiting for card connection...");
    const connectStart = Date.now();
    await gateway.waitConnected();
    const connectDuration = Date.now() - connectStart;
    console.log(`✅ [Mobile Gateway] Card connected in ${connectDuration}ms`);
    
    // Get comprehensive data from the card
    console.log("📡 [Mobile Gateway] Executing comprehensive data scan...");
    const comprehensiveSpec = "latchValue:2,graffiti:1,compressedPublicKey:2,compressedPublicKey:9,publicKeyAttest:9,compressedPublicKey:8,publicKeyAttest:8";
    const result = await gateway.execHaloCmd({
      name: "get_data_struct",
      spec: comprehensiveSpec
    });
    console.log("📋 [Mobile Gateway] Card data received:", result);

    // Process the result to find the best key slot
    const availableSlots: Array<{ keyNo: number; address: string; publicKey: string; hasAttestation: boolean }> = [];
    
    // Priority order: 9 (user wallet) > 8 (preloaded) > 2 (system)
    const targetSlots = [9, 8, 2];
    
    // Process the results for each target slot
    for (const keyNo of targetSlots) {
      try {
        console.log(`📍 [Mobile Gateway] Processing key slot ${keyNo}...`);
        
        // Check for compressed public key first
        const compressedKey = result.data[`compressedPublicKey:${keyNo}`];
        let publicKey = null;
        let address = null;
        
        if (compressedKey) {
          // Use compressed public key directly to compute address
          // This eliminates the need for a second tap
          try {
            // Ensure compressed key is proper length (33 bytes = 66 hex chars)
            let processedCompressedKey = compressedKey;
            if (compressedKey.length > 66) {
              // Take first 66 characters if too long
              processedCompressedKey = compressedKey.substring(0, 66);
              console.log(`⚠️ [Mobile Gateway] Compressed key too long, truncating to 66 chars`);
            } else if (compressedKey.length < 66) {
              // Pad with zeros if too short
              processedCompressedKey = compressedKey.padEnd(66, '0');
              console.log(`⚠️ [Mobile Gateway] Compressed key too short, padding to 66 chars`);
            }
            
            // Convert compressed public key to full public key using ethers
            const fullPublicKey = ethers.SigningKey.computePublicKey("0x" + processedCompressedKey, true);
            publicKey = fullPublicKey.slice(2); // Remove 0x prefix
            address = ethers.computeAddress("0x" + publicKey);
            console.log(`✅ [Mobile Gateway] Key slot ${keyNo}: ${address}`);
            console.log(`   Public Key: ${publicKey.substring(0, 20)}...`);
            console.log(`   Compressed Key: ${processedCompressedKey.substring(0, 20)}...`);
            console.log(`   🎯 Single tap success - no second request needed!`);
          } catch (e) {
            console.log(`⚠️ [Mobile Gateway] Failed to expand compressed key for slot ${keyNo}:`, e);
            // Fallback to get_key_info if compressed key expansion fails
            const keyInfo = await gateway.execHaloCmd({
              name: "get_key_info",
              keyNo,
            });
            
            if (keyInfo.publicKey) {
              publicKey = keyInfo.publicKey;
              address = ethers.computeAddress("0x" + publicKey);
              console.log(`✅ [Mobile Gateway] Key slot ${keyNo} (fallback): ${address}`);
              console.log(`   Public Key: ${publicKey.substring(0, 20)}...`);
            }
          }
        }
        
        if (publicKey && address) {
          // Check for attestation
          const hasAttestation = !!result.data[`publicKeyAttest:${keyNo}`];
          
          availableSlots.push({
            keyNo,
            address,
            publicKey,
            hasAttestation
          });
          
          console.log(`   Attestation: ${hasAttestation ? 'Yes' : 'No'}`);
          
          // If we found a key in the highest priority slot, we can stop here
          if (keyNo === targetSlots[0]) {
            console.log(`🎯 [Mobile Gateway] Found highest priority key in slot ${keyNo}, stopping scan`);
            break;
          }
        } else {
          console.log(`⚠️ [Mobile Gateway] Key slot ${keyNo}: No public key found in comprehensive scan`);
        }
      } catch (e) {
        console.log(`❌ [Mobile Gateway] Key slot ${keyNo}: Error processing from comprehensive scan`);
        console.log(`   Error:`, e);
      }
    }

    if (availableSlots.length === 0) {
      throw new Error("No valid wallet keys found on card. Please ensure the card remains on your device and try again.");
    }

    // Select the best key slot (priority: 9 > 8 > 2)
    const bestSlot = availableSlots[0];
    console.log(`🎯 [Mobile Gateway] Selected key slot ${bestSlot.keyNo}`);
    console.log(`   Address: ${bestSlot.address}`);
    console.log(`   Public Key: ${bestSlot.publicKey.substring(0, 40)}...`);
    console.log(`   Has Attestation: ${bestSlot.hasAttestation}`);
    
    console.log("\n═══════════════════════════════════════════════════════");
    console.log("🎉 [Mobile Gateway] Connection completed successfully");
    console.log("═══════════════════════════════════════════════════════");
    
    return {
      address: bestSlot.address,
      publicKey: bestSlot.publicKey,
      keySlot: bestSlot.keyNo,
    };
    
  } catch (error: any) {
    console.error("❌ [Mobile Gateway] Connection failed:", error);
    throw new Error(error.message || "Failed to connect with your Burner card. Please ensure your card is properly positioned and try again.");
  } finally {
    // Clean up gateway connection
    if (gateway) {
      try {
        gateway = null;
        console.log("🧹 [Mobile Gateway] Gateway connection cleaned up");
      } catch (cleanupError) {
        console.warn("⚠️ [Mobile Gateway] Error during cleanup:", cleanupError);
      }
    }
  }
}
