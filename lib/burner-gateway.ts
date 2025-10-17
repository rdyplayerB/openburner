import { ethers } from "ethers";
import { HaloGateway } from "@arx-research/libhalo/api/web";
import QRCode from "qrcode";

export interface BurnerKeyInfo {
  address: string;
  publicKey: string;
  keySlot?: number; // Which key slot was used
}

export interface GatewayPairInfo {
  execURL: string;
  qrCodeDataURL: string;
}

// Global gateway instance for persistence
let globalGateway: HaloGateway | null = null;

/**
 * Clean up gateway connection
 */
export function cleanupGateway() {
  if (globalGateway) {
    try {
      // Close the gateway connection
      globalGateway = null;
      console.log("🧹 [Gateway] Gateway connection cleaned up");
    } catch (error) {
      console.error("❌ [Gateway] Error cleaning up gateway:", error);
    }
  }
}

/**
 * Get the Ethereum address from a Burner card via HaLo Gateway
 * This uses the public HaLo Gateway with smartphone as NFC reader
 */
export async function getBurnerAddressViaGateway(): Promise<BurnerKeyInfo> {
  try {
    console.log("═══════════════════════════════════════════════════════");
    console.log("🎯 [Gateway] getBurnerAddressViaGateway() STARTED");
    console.log("═══════════════════════════════════════════════════════");
    console.log("⏰ [Gateway] Timestamp:", new Date().toISOString());
    console.log("🌐 [Gateway] Using existing gateway connection...");

    if (!globalGateway) {
      throw new Error("Gateway not initialized. Please start pairing first.");
    }

    // Wait for smartphone to connect
    console.log("⏳ [Gateway] Waiting for smartphone to connect...");
    const connectStart = Date.now();
    await globalGateway.waitConnected();
    const connectDuration = Date.now() - connectStart;
    console.log(`✅ [Gateway] Smartphone connected in ${connectDuration}ms`);

    // Use a single execHaloCmd call to get all key information at once
    // This matches BurnerOS approach - single tap, comprehensive data request
    console.log("🔍 [Gateway] Scanning all key slots in single tap (BurnerOS style)...");
    
    // Priority order: 9 (user wallet) > 8 (preloaded) > 2 (system)
    const targetSlots = [9, 8, 2];
    const availableSlots: Array<{ keyNo: number; address: string; publicKey: string; hasAttestation: boolean }> = [];
    
    // Single comprehensive call like BurnerOS does
    console.log("📍 [Gateway] Making comprehensive data request...");
    const scanStart = Date.now();
    
    try {
      // Use the same spec as BurnerOS: latchValue, graffiti, and all key data at once
      const comprehensiveSpec = "latchValue:2,graffiti:1,compressedPublicKey:2,compressedPublicKey:9,publicKeyAttest:9,compressedPublicKey:8,publicKeyAttest:8";
      
      console.log(`📡 [Gateway] Executing get_data_struct with spec: ${comprehensiveSpec}`);
      const dataResult = await globalGateway.execHaloCmd({
        name: "get_data_struct",
        spec: comprehensiveSpec
      });
      
      const scanDuration = Date.now() - scanStart;
      console.log(`✅ [Gateway] Comprehensive data request completed in ${scanDuration}ms`);
      console.log("📋 [Gateway] Full data result:", dataResult);
      
      // Process the results for each target slot
      for (const keyNo of targetSlots) {
        try {
          console.log(`📍 [Gateway] Processing key slot ${keyNo}...`);
          
          // Check for compressed public key first
          const compressedKey = dataResult.data[`compressedPublicKey:${keyNo}`];
          let publicKey = null;
          let address = null;
          
          if (compressedKey) {
            // Use compressed public key directly to compute address (like BurnerOS)
            // This eliminates the need for a second tap
            try {
              // Ensure compressed key is proper length (33 bytes = 66 hex chars)
              let processedCompressedKey = compressedKey;
              if (compressedKey.length > 66) {
                // Take first 66 characters if too long
                processedCompressedKey = compressedKey.substring(0, 66);
                console.log(`⚠️ [Gateway] Compressed key too long, truncating to 66 chars`);
              } else if (compressedKey.length < 66) {
                // Pad with zeros if too short
                processedCompressedKey = compressedKey.padEnd(66, '0');
                console.log(`⚠️ [Gateway] Compressed key too short, padding to 66 chars`);
              }
              
              // Convert compressed public key to full public key using ethers
              const fullPublicKey = ethers.SigningKey.computePublicKey("0x" + processedCompressedKey, true);
              publicKey = fullPublicKey.slice(2); // Remove 0x prefix
              address = ethers.computeAddress("0x" + publicKey);
              console.log(`✅ [Gateway] Key slot ${keyNo}: ${address}`);
              console.log(`   Public Key: ${publicKey.substring(0, 20)}...`);
              console.log(`   Compressed Key: ${processedCompressedKey.substring(0, 20)}...`);
              console.log(`   🎯 Single tap success - no second request needed!`);
            } catch (e) {
              console.log(`⚠️ [Gateway] Failed to expand compressed key for slot ${keyNo}:`, e);
              // Fallback to get_key_info if compressed key expansion fails
              const keyInfo = await globalGateway.execHaloCmd({
                name: "get_key_info",
                keyNo,
              });
              
              if (keyInfo.publicKey) {
                publicKey = keyInfo.publicKey;
                address = ethers.computeAddress("0x" + publicKey);
                console.log(`✅ [Gateway] Key slot ${keyNo} (fallback): ${address}`);
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
              console.log(`🎯 [Gateway] Found highest priority key in slot ${keyNo}, stopping scan`);
              break;
            }
          } else {
            console.log(`⚠️ [Gateway] Key slot ${keyNo}: No public key found in comprehensive scan`);
          }
        } catch (e) {
          console.log(`❌ [Gateway] Key slot ${keyNo}: Error processing from comprehensive scan`);
          console.log(`   Error:`, e);
        }
      }
    } catch (e) {
      console.log("❌ [Gateway] Comprehensive data request failed, falling back to individual calls");
      console.log("   Error:", e);
      
      // Fallback to individual calls if comprehensive approach fails
      for (const keyNo of targetSlots) {
        try {
          console.log(`📍 [Gateway] Fallback: Checking key slot ${keyNo}...`);
          const keyInfoStart = Date.now();
          
          const keyInfo = await globalGateway.execHaloCmd({
            name: "get_key_info",
            keyNo,
          });
          
          const keyInfoDuration = Date.now() - keyInfoStart;
          
          if (keyInfo.publicKey) {
            const addr = ethers.computeAddress("0x" + keyInfo.publicKey);
            console.log(`✅ [Gateway] Key slot ${keyNo} (${keyInfoDuration}ms): ${addr}`);
            console.log(`   Public Key: ${keyInfo.publicKey.substring(0, 20)}...`);
            
            // Check for attestation
            let hasAttestation = false;
            try {
              const attestResult = await globalGateway.execHaloCmd({
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
              console.log(`🎯 [Gateway] Found highest priority key in slot ${keyNo}, stopping scan`);
              break;
            }
          } else {
            console.log(`⚠️ [Gateway] Key slot ${keyNo}: No public key found`);
          }
        } catch (e) {
          console.log(`❌ [Gateway] Key slot ${keyNo}: Not available or not initialized`);
          console.log(`   Error:`, e);
        }
      }
    }
    
    const scanDuration = Date.now() - scanStart;
    console.log(`✅ [Gateway] Key slot scan completed in ${scanDuration}ms`);

    console.log("\n═══════════════════════════════════════════════════════");
    console.log(`📊 [Gateway] SCAN COMPLETE - Found ${availableSlots.length} available key slots`);
    console.log("═══════════════════════════════════════════════════════");
    availableSlots.forEach((slot, idx) => {
      console.log(`${idx + 1}. Slot ${slot.keyNo}: ${slot.address} ${slot.hasAttestation ? '(attested)' : '(no attestation)'}`);
    });

    // Strategy: Use the first available slot (already in priority order)
    console.log("\n═══════════════════════════════════════════════════════");
    console.log("🎯 [Gateway] SELECTING KEY SLOT");
    console.log("═══════════════════════════════════════════════════════");
    
    if (availableSlots.length > 0) {
      const bestSlot = availableSlots[0]; // First slot is highest priority
      console.log(`✅ [Gateway] SELECTED: Key slot ${bestSlot.keyNo} (priority-based selection)`);
      console.log(`   Address: ${bestSlot.address}`);
      console.log(`   Public Key: ${bestSlot.publicKey.substring(0, 40)}...`);
      console.log(`   Has Attestation: ${bestSlot.hasAttestation}`);
      console.log(`   Strategy: Priority-based selection (9 > 8 > 2)`);
      
      console.log("\n═══════════════════════════════════════════════════════");
      console.log("🎉 [Gateway] getBurnerAddressViaGateway() COMPLETED SUCCESSFULLY");
      console.log("═══════════════════════════════════════════════════════");
      
      return {
        address: bestSlot.address,
        publicKey: bestSlot.publicKey,
        keySlot: bestSlot.keyNo,
      };
    }

    // NO FALLBACK - fail clearly if we couldn't find any valid key slots
    console.log("\n═══════════════════════════════════════════════════════");
    console.error("❌❌❌ [Gateway] FATAL ERROR: No valid key slots found!");
    console.log("═══════════════════════════════════════════════════════");
    console.error("This likely means:");
    console.error("  1. The smartphone disconnected during key slot scanning");
    console.error("  2. The card was removed from the smartphone's NFC reader");
    console.error("  3. The card has no initialized key slots");
    console.error("\nPlease try again:");
    console.error("  - Ensure card stays on smartphone's NFC reader during connection");
    console.error("  - Check that smartphone is still connected to gateway");
    console.error("  - Try refreshing the page");
    
    throw new Error("No valid wallet keys found on card. Please ensure the card remains on the smartphone's NFC reader and try again.");
  } catch (error: any) {
    console.log("\n═══════════════════════════════════════════════════════");
    console.error("❌❌❌ [Gateway] getBurnerAddressViaGateway() FAILED");
    console.log("═══════════════════════════════════════════════════════");
    console.error("Error details:", error);
    
    throw new Error(error.message || "Failed to read Burner card via gateway");
  }
}

/**
 * Start gateway pairing and return QR code info
 */
export async function startGatewayPairing(): Promise<GatewayPairInfo> {
  try {
    console.log("═══════════════════════════════════════════════════════");
    console.log("🎯 [Gateway] startGatewayPairing() STARTED");
    console.log("═══════════════════════════════════════════════════════");
    console.log("⏰ [Gateway] Timestamp:", new Date().toISOString());
    console.log("🌐 [Gateway] Connecting to HaLo Gateway...");

    // Create gateway instance and store globally
    globalGateway = new HaloGateway('wss://s1.halo-gateway.arx.org', {
      createWebSocket: (url) => new WebSocket(url)
    });

    // Start pairing process
    console.log("📡 [Gateway] Starting pairing process...");
    const pairStart = Date.now();
    const pairInfo = await globalGateway.startPairing();
    const pairDuration = Date.now() - pairStart;
    console.log(`✅ [Gateway] Pairing started in ${pairDuration}ms`);
    console.log(`📱 [Gateway] Exec URL: ${pairInfo.execURL}`);

    // Generate QR code for display
    const qrCodeDataURL = await QRCode.toDataURL(pairInfo.execURL, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    console.log("📱 [Gateway] QR code generated for smartphone scanning");
    console.log("✅ [Gateway] startGatewayPairing() COMPLETED SUCCESSFULLY");

    return {
      execURL: pairInfo.execURL,
      qrCodeDataURL
    };
  } catch (error: any) {
    console.log("\n═══════════════════════════════════════════════════════");
    console.error("❌❌❌ [Gateway] startGatewayPairing() FAILED");
    console.log("═══════════════════════════════════════════════════════");
    console.error("Error details:", error);
    
    throw new Error(error.message || "Failed to start gateway pairing");
  }
}

/**
 * Wait for smartphone connection and get wallet info
 */
export async function waitForGatewayConnection(gate: HaloGateway): Promise<BurnerKeyInfo> {
  try {
    console.log("⏳ [Gateway] Waiting for smartphone to connect...");
    const connectStart = Date.now();
    await gate.waitConnected();
    const connectDuration = Date.now() - connectStart;
    console.log(`✅ [Gateway] Smartphone connected in ${connectDuration}ms`);

    // Execute comprehensive data request like BurnerOS
    console.log("🔍 [Gateway] Scanning for available key slots (BurnerOS style)...");
    
    // Priority order: 9 (user wallet) > 8 (preloaded) > 2 (system)
    const targetSlots = [9, 8, 2];
    const availableSlots: Array<{ keyNo: number; address: string; publicKey: string; hasAttestation: boolean }> = [];
    
    try {
      // Use the same spec as BurnerOS: latchValue, graffiti, and all key data at once
      const comprehensiveSpec = "latchValue:2,graffiti:1,compressedPublicKey:2,compressedPublicKey:9,publicKeyAttest:9,compressedPublicKey:8,publicKeyAttest:8";
      
      console.log(`📡 [Gateway] Executing get_data_struct with spec: ${comprehensiveSpec}`);
      const dataResult = await gate.execHaloCmd({
        name: "get_data_struct",
        spec: comprehensiveSpec
      });
      
      console.log("📋 [Gateway] Full data result:", dataResult);
      
      // Process the results for each target slot
      for (const keyNo of targetSlots) {
        try {
          console.log(`📍 [Gateway] Processing key slot ${keyNo}...`);
          
          // Check for compressed public key first
          const compressedKey = dataResult.data[`compressedPublicKey:${keyNo}`];
          let publicKey = null;
          let address = null;
          
          if (compressedKey) {
            // Use compressed public key directly to compute address (like BurnerOS)
            // This eliminates the need for a second tap
            try {
              // Ensure compressed key is proper length (33 bytes = 66 hex chars)
              let processedCompressedKey = compressedKey;
              if (compressedKey.length > 66) {
                // Take first 66 characters if too long
                processedCompressedKey = compressedKey.substring(0, 66);
                console.log(`⚠️ [Gateway] Compressed key too long, truncating to 66 chars`);
              } else if (compressedKey.length < 66) {
                // Pad with zeros if too short
                processedCompressedKey = compressedKey.padEnd(66, '0');
                console.log(`⚠️ [Gateway] Compressed key too short, padding to 66 chars`);
              }
              
              // Convert compressed public key to full public key using ethers
              const fullPublicKey = ethers.SigningKey.computePublicKey("0x" + processedCompressedKey, true);
              publicKey = fullPublicKey.slice(2); // Remove 0x prefix
              address = ethers.computeAddress("0x" + publicKey);
              console.log(`✅ [Gateway] Key slot ${keyNo}: ${address}`);
              console.log(`   Public Key: ${publicKey.substring(0, 20)}...`);
              console.log(`   Compressed Key: ${processedCompressedKey.substring(0, 20)}...`);
              console.log(`   🎯 Single tap success - no second request needed!`);
            } catch (e) {
              console.log(`⚠️ [Gateway] Failed to expand compressed key for slot ${keyNo}:`, e);
              // Fallback to get_key_info if compressed key expansion fails
              const keyInfo = await gate.execHaloCmd({
                name: "get_key_info",
                keyNo,
              });
              
              if (keyInfo.publicKey) {
                publicKey = keyInfo.publicKey;
                address = ethers.computeAddress("0x" + publicKey);
                console.log(`✅ [Gateway] Key slot ${keyNo} (fallback): ${address}`);
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
              console.log(`🎯 [Gateway] Found highest priority key in slot ${keyNo}, stopping scan`);
              break;
            }
          } else {
            console.log(`⚠️ [Gateway] Key slot ${keyNo}: No public key found in comprehensive scan`);
          }
        } catch (e) {
          console.log(`❌ [Gateway] Key slot ${keyNo}: Error processing from comprehensive scan`);
          console.log(`   Error:`, e);
        }
      }
    } catch (e) {
      console.log("❌ [Gateway] Comprehensive data request failed, falling back to individual calls");
      console.log("   Error:", e);
      
      // Fallback to individual calls if comprehensive approach fails
      for (const keyNo of targetSlots) {
        try {
          console.log(`📍 [Gateway] Fallback: Checking key slot ${keyNo}...`);
          const keyInfoStart = Date.now();
          
          const keyInfo = await gate.execHaloCmd({
            name: "get_key_info",
            keyNo,
          });
          
          const keyInfoDuration = Date.now() - keyInfoStart;
          
          if (keyInfo.publicKey) {
            const addr = ethers.computeAddress("0x" + keyInfo.publicKey);
            console.log(`✅ [Gateway] Key slot ${keyNo} (${keyInfoDuration}ms): ${addr}`);
            console.log(`   Public Key: ${keyInfo.publicKey.substring(0, 20)}...`);
            
            // Check for attestation
            let hasAttestation = false;
            try {
              const attestResult = await gate.execHaloCmd({
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
              console.log(`🎯 [Gateway] Found highest priority key in slot ${keyNo}, stopping scan`);
              break;
            }
          } else {
            console.log(`⚠️ [Gateway] Key slot ${keyNo}: No public key found`);
          }
        } catch (e) {
          console.log(`❌ [Gateway] Key slot ${keyNo}: Not available or not initialized`);
          console.log(`   Error:`, e);
        }
      }
    }

    console.log("\n═══════════════════════════════════════════════════════");
    console.log(`📊 [Gateway] SCAN COMPLETE - Found ${availableSlots.length} available key slots`);
    console.log("═══════════════════════════════════════════════════════");
    availableSlots.forEach((slot, idx) => {
      console.log(`${idx + 1}. Slot ${slot.keyNo}: ${slot.address} ${slot.hasAttestation ? '(attested)' : '(no attestation)'}`);
    });

    // Strategy: Use the first available slot (already in priority order)
    console.log("\n═══════════════════════════════════════════════════════");
    console.log("🎯 [Gateway] SELECTING KEY SLOT");
    console.log("═══════════════════════════════════════════════════════");
    
    if (availableSlots.length > 0) {
      const bestSlot = availableSlots[0]; // First slot is highest priority
      console.log(`✅ [Gateway] SELECTED: Key slot ${bestSlot.keyNo} (priority-based selection)`);
      console.log(`   Address: ${bestSlot.address}`);
      console.log(`   Public Key: ${bestSlot.publicKey.substring(0, 40)}...`);
      console.log(`   Has Attestation: ${bestSlot.hasAttestation}`);
      console.log(`   Strategy: Priority-based selection (9 > 8 > 2)`);
      
      console.log("\n═══════════════════════════════════════════════════════");
      console.log("🎉 [Gateway] waitForGatewayConnection() COMPLETED SUCCESSFULLY");
      console.log("═══════════════════════════════════════════════════════");
      
      return {
        address: bestSlot.address,
        publicKey: bestSlot.publicKey,
        keySlot: bestSlot.keyNo,
      };
    }

    // NO FALLBACK - fail clearly if we couldn't find any valid key slots
    console.log("\n═══════════════════════════════════════════════════════");
    console.error("❌❌❌ [Gateway] FATAL ERROR: No valid key slots found!");
    console.log("═══════════════════════════════════════════════════════");
    console.error("This likely means:");
    console.error("  1. The smartphone disconnected during key slot scanning");
    console.error("  2. The card was removed from the smartphone's NFC reader");
    console.error("  3. The card has no initialized key slots");
    console.error("\nPlease try again:");
    console.error("  - Ensure card stays on smartphone's NFC reader during connection");
    console.error("  - Check that smartphone is still connected to gateway");
    console.error("  - Try refreshing the page");
    
    throw new Error("No valid wallet keys found on card. Please ensure the card remains on the smartphone's NFC reader and try again.");
  } catch (error: any) {
    console.log("\n═══════════════════════════════════════════════════════");
    console.error("❌❌❌ [Gateway] waitForGatewayConnection() FAILED");
    console.log("═══════════════════════════════════════════════════════");
    console.error("Error details:", error);
    
    throw new Error(error.message || "Failed to get wallet info via gateway");
  }
}

/**
 * Sign a transaction using the Burner card via gateway
 */
export async function signTransactionWithGateway(
  gate: HaloGateway,
  transaction: ethers.TransactionRequest,
  keySlot: number = 1,
  pin?: string
): Promise<string> {
  try {
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

    // Sign with Burner card via Gateway
    console.log(`Signing with key slot ${keySlot} via gateway...`);
    const command: any = {
      name: "sign",
      keyNo: keySlot,
      digest,
    };
    
    // Add PIN if provided
    if (pin) {
      command.password = pin;
    }
    
    const result = await gate.execHaloCmd(command);

    // Construct the signature (gateway returns raw.r, raw.s, raw.v)
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
    console.error("Error signing with Burner card via gateway:", error);
    throw new Error(error.message || "Failed to sign transaction via gateway");
  }
}
