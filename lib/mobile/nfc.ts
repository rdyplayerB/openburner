import { ethers } from "ethers";
import { execHaloCmdWeb } from '@arx-research/libhalo/api/web';
import { connectWithMobileGateway } from './mobile-gateway';
import { BurnerKeyInfo } from '../burner';

/**
 * Connect with mobile NFC - uses execHaloCmdWeb for direct Halo connection
 */
export async function connectWithMobileNFC(): Promise<BurnerKeyInfo> {
  console.log("═══════════════════════════════════════════════════════");
  console.log("🎯 [Mobile NFC] connectWithMobileNFC() STARTED");
  console.log("═══════════════════════════════════════════════════════");
  console.log("⏰ [Mobile NFC] Timestamp:", new Date().toISOString());
  console.log("📱 [Mobile NFC] Starting direct Halo connection...");
  console.log("📱 [Mobile NFC] This will trigger the native iOS security key modal");
  
  try {
    // Use comprehensive data request approach like bridge and gateway
    console.log("🔍 [Mobile NFC] Scanning all key slots in single tap...");
    
    // Priority order: 9 (user wallet) > 8 (preloaded) > 2 (system)
    const targetSlots = [9, 8, 2];
    const availableSlots: Array<{ keyNo: number; address: string; publicKey: string; hasAttestation: boolean }> = [];
    
    // Single comprehensive call for efficiency
    console.log("📍 [Mobile NFC] Making comprehensive data request...");
    const scanStart = Date.now();
    
    try {
      // Use comprehensive spec: latchValue, graffiti, and all key data at once
      const comprehensiveSpec = "latchValue:2,graffiti:1,compressedPublicKey:2,compressedPublicKey:9,publicKeyAttest:9,compressedPublicKey:8,publicKeyAttest:8";
      
      console.log(`📡 [Mobile NFC] Executing get_data_struct with spec: ${comprehensiveSpec}`);
      const result = await execHaloCmdWeb({
        name: "get_data_struct",
        spec: comprehensiveSpec
      }, {
        method: "credential" // This triggers the native iOS security key modal
      });
      
      const scanDuration = Date.now() - scanStart;
      console.log(`✅ [Mobile NFC] Comprehensive data request completed in ${scanDuration}ms`);
      console.log("📋 [Mobile NFC] Full data result:", result);

      // The result from execHaloCmdWeb has a different structure
      // It's wrapped in a 'data' property, similar to the gateway response
      const cardData = result.data || result;
      console.log("📋 [Mobile NFC] Processing card data:", cardData);
      
      // Process the results for each target slot
      for (const keyNo of targetSlots) {
        try {
          console.log(`📍 [Mobile NFC] Processing key slot ${keyNo}...`);
          
          // Check for compressed public key first
          const compressedKey = cardData[`compressedPublicKey:${keyNo}`];
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
                console.log(`⚠️ [Mobile NFC] Compressed key too long, truncating to 66 chars`);
              } else if (compressedKey.length < 66) {
                // Pad with zeros if too short
                processedCompressedKey = compressedKey.padEnd(66, '0');
                console.log(`⚠️ [Mobile NFC] Compressed key too short, padding to 66 chars`);
              }
              
              // Convert compressed public key to full public key using ethers
              const fullPublicKey = ethers.SigningKey.computePublicKey("0x" + processedCompressedKey, true);
              publicKey = fullPublicKey.slice(2); // Remove 0x prefix
              address = ethers.computeAddress("0x" + publicKey);
              console.log(`✅ [Mobile NFC] Key slot ${keyNo}: ${address}`);
              console.log(`   Public Key: ${publicKey.substring(0, 20)}...`);
              console.log(`   Compressed Key: ${processedCompressedKey.substring(0, 20)}...`);
              console.log(`   🎯 Single tap success - no second request needed!`);
            } catch (e) {
              console.log(`⚠️ [Mobile NFC] Failed to expand compressed key for slot ${keyNo}:`, e);
              // Fallback to individual key info if compressed key expansion fails
              // Note: This would require a second tap, so we'll skip for now
              console.log(`⚠️ [Mobile NFC] Skipping fallback for slot ${keyNo} to avoid second tap`);
            }
          }
          
          if (publicKey && address) {
            // Check for attestation
            const hasAttestation = !!cardData[`publicKeyAttest:${keyNo}`];
            
            availableSlots.push({
              keyNo,
              address,
              publicKey,
              hasAttestation
            });
            
            console.log(`   Attestation: ${hasAttestation ? 'Yes' : 'No'}`);
            
            // If we found a key in the highest priority slot, we can stop here
            if (keyNo === targetSlots[0]) {
              console.log(`🎯 [Mobile NFC] Found highest priority key in slot ${keyNo}, stopping scan`);
              break;
            }
          } else {
            console.log(`⚠️ [Mobile NFC] Key slot ${keyNo}: No public key found in comprehensive scan`);
          }
        } catch (e) {
          console.log(`❌ [Mobile NFC] Key slot ${keyNo}: Error processing from comprehensive scan`);
          console.log(`   Error:`, e);
        }
      }
    } catch (e) {
      console.log("❌ [Mobile NFC] Comprehensive data request failed, falling back to mobile gateway");
      console.log("   Error:", e);
      
      // If comprehensive approach fails, fall back to mobile gateway
      console.log("📱 [Mobile NFC] Falling back to mobile gateway...");
      return await connectWithMobileGateway();
    }
    
    const scanDuration = Date.now() - scanStart;
    console.log(`✅ [Mobile NFC] Key slot scan completed in ${scanDuration}ms`);

    console.log("\n═══════════════════════════════════════════════════════");
    console.log(`📊 [Mobile NFC] SCAN COMPLETE - Found ${availableSlots.length} available key slots`);
    console.log("═══════════════════════════════════════════════════════");
    availableSlots.forEach((slot, idx) => {
      console.log(`${idx + 1}. Slot ${slot.keyNo}: ${slot.address} ${slot.hasAttestation ? '(attested)' : '(no attestation)'}`);
    });

    // Strategy: Use the first available slot (already in priority order)
    console.log("\n═══════════════════════════════════════════════════════");
    console.log("🎯 [Mobile NFC] SELECTING KEY SLOT");
    console.log("═══════════════════════════════════════════════════════");
    
    if (availableSlots.length > 0) {
      const bestSlot = availableSlots[0]; // First slot is highest priority
      console.log(`✅ [Mobile NFC] SELECTED: Key slot ${bestSlot.keyNo} (priority-based selection)`);
      console.log(`   Address: ${bestSlot.address}`);
      console.log(`   Public Key: ${bestSlot.publicKey.substring(0, 40)}...`);
      console.log(`   Has Attestation: ${bestSlot.hasAttestation}`);
      console.log(`   Strategy: Priority-based selection (9 > 8 > 2)`);
      
      console.log("\n═══════════════════════════════════════════════════════");
      console.log("🎉 [Mobile NFC] connectWithMobileNFC() COMPLETED SUCCESSFULLY");
      console.log("═══════════════════════════════════════════════════════");
      
      return {
        address: bestSlot.address,
        publicKey: bestSlot.publicKey,
        keySlot: bestSlot.keyNo,
      };
    }

    // NO FALLBACK - fail clearly if we couldn't find any valid key slots
    console.log("\n═══════════════════════════════════════════════════════");
    console.error("❌❌❌ [Mobile NFC] FATAL ERROR: No valid key slots found!");
    console.log("═══════════════════════════════════════════════════════");
    console.error("This likely means:");
    console.error("  1. The card was removed during key slot scanning");
    console.error("  2. The card has no initialized key slots");
    console.error("  3. The compressed key expansion failed");
    console.error("\nPlease try again:");
    console.error("  - Ensure card stays on device during connection");
    console.error("  - Try refreshing the page");
    
    throw new Error("No valid wallet keys found on card. Please ensure the card remains on your device and try again.");
    
  } catch (error: any) {
    console.log("\n═══════════════════════════════════════════════════════");
    console.error("❌❌❌ [Mobile NFC] connectWithMobileNFC() FAILED");
    console.log("═══════════════════════════════════════════════════════");
    console.error("Error details:", error);
    
    // If direct connection fails, fall back to mobile gateway
    console.log("📱 [Mobile NFC] Direct connection failed, falling back to mobile gateway...");
    return await connectWithMobileGateway();
  }
}


/**
 * Sign a transaction using mobile NFC (direct connection)
 * This uses the same direct NFC approach as connectWithMobileNFC
 */
export async function signTransactionWithMobileNFC(
  transaction: ethers.TransactionRequest,
  keySlot: number = 1,
  pin?: string
): Promise<string> {
  console.log("📱 [Mobile NFC] Starting transaction signing...");
  
  try {
    // Check if we're on Base network (which doesn't support EIP-1559 properly)
    const isBaseNetwork = transaction.chainId === 8453;
    
    // Create a Transaction object with appropriate transaction type
    const tx = ethers.Transaction.from({
      to: transaction.to as string,
      value: transaction.value?.toString(),
      data: transaction.data as string,
      nonce: transaction.nonce as number,
      gasLimit: transaction.gasLimit?.toString(),
      chainId: transaction.chainId as number,
      type: isBaseNetwork ? 0 : 2, // Use legacy format for Base network
      // Use gasPrice for Base network, maxFeePerGas/maxPriorityFeePerGas for others
      ...(isBaseNetwork 
        ? { gasPrice: transaction.gasPrice?.toString() }
        : { 
            maxFeePerGas: transaction.maxFeePerGas?.toString(),
            maxPriorityFeePerGas: transaction.maxPriorityFeePerGas?.toString()
          }
      ),
    });

    const txHash = tx.unsignedHash;

    // Remove '0x' prefix for Burner
    const digest = txHash.slice(2);

    // Sign with Burner card via direct NFC
    console.log(`📱 [Mobile NFC] Signing with key slot ${keySlot} via direct NFC...`);
    const command: any = {
      name: "sign",
      keyNo: keySlot,
      digest,
    };
    
    // Add PIN if provided
    if (pin) {
      command.password = pin;
    }
    
    const result = await execHaloCmdWeb(command, {
      method: "credential" // This triggers the native iOS security key modal
    });

    // Construct the signature (direct NFC returns raw.r, raw.s, raw.v)
    const sig = result.signature.raw || result.signature;
    const signature = ethers.Signature.from({
      r: "0x" + sig.r,
      s: "0x" + sig.s,
      v: sig.v,
    });

    // Apply signature to transaction
    tx.signature = signature;

    console.log("✅ [Mobile NFC] Transaction signed successfully");
    return tx.serialized;
  } catch (error: any) {
    console.error("❌ [Mobile NFC] Transaction signing failed:", error);
    throw new Error(error.message || "Failed to sign transaction via mobile NFC");
  }
}

/**
 * Sign a raw 32-byte digest via direct mobile NFC (for message / typed-data signing).
 */
export async function signDigestWithMobileNFC(
  digest: string,
  keySlot: number = 1,
  pin?: string
): Promise<ethers.Signature> {
  try {
    const hex = digest.startsWith("0x") ? digest.slice(2) : digest;
    const command: any = { name: "sign", keyNo: keySlot, digest: hex };
    if (pin) command.password = pin;

    const result = await execHaloCmdWeb(command, { method: "credential" });
    const sig = result.signature.raw || result.signature;
    let v = Number(sig.v);
    if (v < 27) v += 27;
    return ethers.Signature.from({ r: "0x" + sig.r, s: "0x" + sig.s, v });
  } catch (error: any) {
    console.error("❌ [Mobile NFC] Digest signing failed:", error);
    throw new Error(error.message || "Failed to sign message via mobile NFC");
  }
}

