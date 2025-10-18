import { ethers } from "ethers";
import { connectToBridge, execBridgeCommand, disconnectBridge } from "./burner-bridge";

export interface BurnerKeyInfo {
  address: string;
  publicKey: string;
  keySlot?: number; // Which key slot was used
}

/**
 * Get the Ethereum address from a Burner card via web browser
 * This uses HaLo Bridge with USB NFC reader
 */
export async function getBurnerAddress(): Promise<BurnerKeyInfo> {
  try {
    console.log("═══════════════════════════════════════════════════════");
    console.log("🎯 [Burner] getBurnerAddress() STARTED");
    console.log("═══════════════════════════════════════════════════════");
    console.log("⏰ [Burner] Timestamp:", new Date().toISOString());
    console.log("🔌 [Burner] Connecting to HaLo Bridge...");

    // Connect to the bridge and wait for card detection
    const connectStart = Date.now();
    await connectToBridge();
    const connectDuration = Date.now() - connectStart;
    console.log(`✅ [Burner] Bridge connected in ${connectDuration}ms`);

    // Execute get_pkeys command for basic key info
    console.log("📡 [Burner] Executing get_pkeys command...");
    const getPkeysStart = Date.now();
    const result = await execBridgeCommand({
      name: "get_pkeys",
    });
    const getPkeysDuration = Date.now() - getPkeysStart;
    console.log(`✅ [Burner] get_pkeys completed in ${getPkeysDuration}ms`);

    console.log("📋 [Burner] Full result from card:", result);
    console.log("📬 [Burner] Available addresses:", result.etherAddresses);
    console.log("🔑 [Burner] Available public keys:", result.publicKeys);

    // Use comprehensive data request for consistency
    console.log("\n═══════════════════════════════════════════════════════");
    console.log("🔍 [Burner] COMPREHENSIVE DATA SCANNING");
    console.log("═══════════════════════════════════════════════════════");
    const availableSlots: Array<{ keyNo: number; address: string; publicKey: string; hasAttestation: boolean }> = [];
    
    // Priority order: 9 (user wallet) > 8 (preloaded) > 2 (system)
    const targetSlots = [9, 8, 2];
    
    try {
      // Use comprehensive spec for all key data
      const comprehensiveSpec = "latchValue:2,graffiti:1,compressedPublicKey:2,compressedPublicKey:9,publicKeyAttest:9,compressedPublicKey:8,publicKeyAttest:8";
      
      console.log(`📡 [Burner] Executing get_data_struct with spec: ${comprehensiveSpec}`);
      const dataResult = await execBridgeCommand({
        name: "get_data_struct",
        spec: comprehensiveSpec
      });
      
      console.log("📋 [Burner] Full data result:", dataResult);
      
      // Process the results for each target slot
      for (const keyNo of targetSlots) {
        try {
          console.log(`📍 [Burner] Processing key slot ${keyNo}...`);
          
          // Check for compressed public key first
          const compressedKey = dataResult.data[`compressedPublicKey:${keyNo}`];
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
                console.log(`⚠️ [Burner] Compressed key too long, truncating to 66 chars`);
              } else if (compressedKey.length < 66) {
                // Pad with zeros if too short
                processedCompressedKey = compressedKey.padEnd(66, '0');
                console.log(`⚠️ [Burner] Compressed key too short, padding to 66 chars`);
              }
              
              // Convert compressed public key to full public key using ethers
              const fullPublicKey = ethers.SigningKey.computePublicKey("0x" + processedCompressedKey, true);
              publicKey = fullPublicKey.slice(2); // Remove 0x prefix
              address = ethers.computeAddress("0x" + publicKey);
              console.log(`✅ [Burner] Key slot ${keyNo}: ${address}`);
              console.log(`   Public Key: ${publicKey.substring(0, 20)}...`);
              console.log(`   Compressed Key: ${processedCompressedKey.substring(0, 20)}...`);
              console.log(`   🎯 Single tap success - no second request needed!`);
            } catch (e) {
              console.log(`⚠️ [Burner] Failed to expand compressed key for slot ${keyNo}:`, e);
              // Fallback to get_key_info if compressed key expansion fails
              const keyInfo = await execBridgeCommand({
                name: "get_key_info",
                keyNo,
              });
              
              if (keyInfo.publicKey) {
                publicKey = keyInfo.publicKey;
                address = ethers.computeAddress("0x" + publicKey);
                console.log(`✅ [Burner] Key slot ${keyNo} (fallback): ${address}`);
                console.log(`   Public Key: ${publicKey.substring(0, 20)}...`);
              }
            }
          }
          
          if (publicKey && address) {
            // Check for attestation
            const hasAttestation = !!dataResult.data[`publicKeyAttest:${keyNo}`];
            
            availableSlots.push({
              keyNo,
              address,
              publicKey,
              hasAttestation
            });
            
            console.log(`   Attestation: ${hasAttestation ? 'Yes' : 'No'}`);
            
            // If we found a key in the highest priority slot, we can stop here
            if (keyNo === targetSlots[0]) {
              console.log(`🎯 [Burner] Found highest priority key in slot ${keyNo}, stopping scan`);
              break;
            }
          } else {
            console.log(`⚠️ [Burner] Key slot ${keyNo}: No public key found in comprehensive scan`);
          }
        } catch (e) {
          console.log(`❌ [Burner] Key slot ${keyNo}: Error processing from comprehensive scan`);
          console.log(`   Error:`, e);
        }
      }
    } catch (e) {
      console.log("❌ [Burner] Comprehensive data request failed, falling back to individual calls");
      console.log("   Error:", e);
      
      // Fallback to individual calls if comprehensive approach fails
      for (const keyNo of targetSlots) {
        try {
          console.log(`📍 [Burner] Fallback: Checking key slot ${keyNo}...`);
          const keyInfoStart = Date.now();
          const keyInfo = await execBridgeCommand({
            name: "get_key_info",
            keyNo,
          });
          const keyInfoDuration = Date.now() - keyInfoStart;
          
          if (keyInfo.publicKey) {
            const addr = ethers.computeAddress("0x" + keyInfo.publicKey);
            console.log(`✅ [Burner] Key slot ${keyNo} (${keyInfoDuration}ms): ${addr}`);
            console.log(`   Public Key: ${keyInfo.publicKey.substring(0, 20)}...`);
            
            // Check for attestation by trying to get public key attest
            let hasAttestation = false;
            try {
              const attestResult = await execBridgeCommand({
                name: "get_data_struct",
                spec: `publicKeyAttest:${keyNo}`
              });
              hasAttestation = !!attestResult.data[`publicKeyAttest:${keyNo}`];
            } catch (e) {
              // Attestation not available, that's okay
            }
            
            availableSlots.push({
              keyNo,
              address: addr,
              publicKey: keyInfo.publicKey,
              hasAttestation
            });
            
            console.log(`   Attestation: ${hasAttestation ? 'Yes' : 'No'}`);
            
            if (keyNo === targetSlots[0]) {
              console.log(`🎯 [Burner] Found highest priority key in slot ${keyNo}, stopping scan`);
              break;
            }
          } else {
            console.log(`⚠️ [Burner] Key slot ${keyNo}: No public key found`);
          }
        } catch (e) {
          console.log(`❌ [Burner] Key slot ${keyNo}: Not available or not initialized`);
          console.log(`   Error:`, e);
        }
      }
    }

    console.log("\n═══════════════════════════════════════════════════════");
    console.log(`📊 [Burner] TARGETED SCAN COMPLETE - Found ${availableSlots.length} available key slots`);
    console.log("═══════════════════════════════════════════════════════");
    availableSlots.forEach((slot, idx) => {
      console.log(`${idx + 1}. Slot ${slot.keyNo}: ${slot.address} ${slot.hasAttestation ? '(attested)' : '(no attestation)'}`);
    });

    // Strategy: Use the first available slot (already in priority order)
    console.log("\n═══════════════════════════════════════════════════════");
    console.log("🎯 [Burner] SELECTING KEY SLOT");
    console.log("═══════════════════════════════════════════════════════");
    
    if (availableSlots.length > 0) {
      const bestSlot = availableSlots[0]; // First slot is highest priority
      console.log(`✅ [Burner] SELECTED: Key slot ${bestSlot.keyNo} (priority-based selection)`);
      console.log(`   Address: ${bestSlot.address}`);
      console.log(`   Public Key: ${bestSlot.publicKey.substring(0, 40)}...`);
      console.log(`   Has Attestation: ${bestSlot.hasAttestation}`);
      console.log(`   Strategy: Priority-based selection (9 > 8 > 2)`);
      
      console.log("\n═══════════════════════════════════════════════════════");
      console.log("🎉 [Burner] getBurnerAddress() COMPLETED SUCCESSFULLY");
      console.log("═══════════════════════════════════════════════════════");
      
      // Clean up bridge connection
      disconnectBridge();
      
      return {
        address: bestSlot.address,
        publicKey: bestSlot.publicKey,
        keySlot: bestSlot.keyNo,
      };
    }

    // NO FALLBACK - fail clearly if we couldn't find any valid key slots
    console.log("\n═══════════════════════════════════════════════════════");
    console.error("❌❌❌ [Burner] FATAL ERROR: No valid key slots found!");
    console.log("═══════════════════════════════════════════════════════");
    console.error("This likely means:");
    console.error("  1. The bridge disconnected during key slot scanning");
    console.error("  2. The card was removed from the reader");
    console.error("  3. The card has no initialized key slots");
    console.error("\nPlease try again:");
    console.error("  - Ensure card stays on reader during connection");
    console.error("  - Check that HaLo Bridge is still running");
    console.error("  - Try refreshing the page");
    
    // Clean up bridge connection before throwing
    disconnectBridge();
    throw new Error("No valid wallet keys found on card. Please ensure the card remains on the reader and try again.");
  } catch (error: any) {
    console.log("\n═══════════════════════════════════════════════════════");
    console.error("❌❌❌ [Burner] getBurnerAddress() FAILED");
    console.log("═══════════════════════════════════════════════════════");
    console.error("Error details:", error);
    
    // Clean up bridge connection before throwing
    disconnectBridge();
    throw new Error(error.message || "Failed to read Burner card");
  }
}

/**
 * Sign a transaction using the Burner card
 */
export async function signTransactionWithBurner(
  transaction: ethers.TransactionRequest,
  keySlot: number = 1,
  pin?: string
): Promise<string> {
  try {
    await connectToBridge();
    
    // Create a Transaction object with explicit string types
    const tx = ethers.Transaction.from({
      to: transaction.to as string,
      value: transaction.value?.toString(),
      data: transaction.data as string,
      nonce: transaction.nonce as number,
      gasLimit: transaction.gasLimit?.toString(),
      maxFeePerGas: transaction.maxFeePerGas?.toString(),
      maxPriorityFeePerGas: transaction.maxPriorityFeePerGas?.toString(),
      chainId: transaction.chainId as number,
      type: 2,
    });

    const txHash = tx.unsignedHash;

    // Remove '0x' prefix for Burner
    const digest = txHash.slice(2);

    // Sign with Burner card via Bridge
    console.log(`Signing with key slot ${keySlot}...`);
    const command: any = {
      name: "sign",
      keyNo: keySlot,
      digest,
    };
    
    // Add PIN if provided
    if (pin) {
      command.password = pin;
    }
    
    const result = await execBridgeCommand(command);

    // Construct the signature (bridge returns raw.r, raw.s, raw.v)
    const sig = result.signature.raw || result.signature;
    const signature = ethers.Signature.from({
      r: "0x" + sig.r,
      s: "0x" + sig.s,
      v: sig.v,
    });

    // Apply signature to transaction
    tx.signature = signature;

    // Return signed transaction
    return tx.serialized;
  } catch (error: any) {
    console.error("Error signing with Burner card:", error);
    throw new Error(error.message || "Failed to sign transaction");
  } finally {
    disconnectBridge();
  }
}

