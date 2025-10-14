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

    // Execute get_pkeys command
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

    // Manually verify address computation for key slot 1
    const pubKey1 = result.publicKeys['1'];
    const computedAddr1 = ethers.computeAddress("0x" + pubKey1);
    console.log("Manual address computation from public key 1:", computedAddr1);
    console.log("Bridge-provided address for key 1:", result.etherAddresses['1']);
    console.log("Do they match?", computedAddr1.toLowerCase() === result.etherAddresses['1'].toLowerCase());

    // SKIP NDEF read - it causes 30s timeout and disconnects the bridge
    // We'll scan all key slots instead to find the primary wallet
    console.log("ℹ️ [Burner] Skipping NDEF read to avoid timeouts");
    console.log("ℹ️ [Burner] Will scan key slots (1-9) to find primary wallet instead");
    let expectedAddress: string | null = null;

    // Check all key slots (1-9) to find available addresses
    console.log("\n═══════════════════════════════════════════════════════");
    console.log("🔍 [Burner] SCANNING ALL KEY SLOTS (1-9)");
    console.log("═══════════════════════════════════════════════════════");
    const availableSlots: Array<{ keyNo: number; address: string; publicKey: string }> = [];
    
    for (let keyNo = 1; keyNo <= 9; keyNo++) {
      try {
        console.log(`📍 [Burner] Checking key slot ${keyNo}...`);
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
          availableSlots.push({
            keyNo,
            address: addr,
            publicKey: keyInfo.publicKey,
          });
          
          // If we have an expected address from pkN, check if it matches
          if (expectedAddress && addr.toLowerCase() === expectedAddress.toLowerCase()) {
            console.log(`🎯 [Burner] ✅ pkN address MATCHES key slot ${keyNo}!`);
          }
        } else {
          console.log(`⚠️ [Burner] Key slot ${keyNo}: No public key found`);
        }
      } catch (e) {
        console.log(`❌ [Burner] Key slot ${keyNo}: Not available or not initialized`);
        console.log(`   Error:`, e);
      }
    }

    console.log("\n═══════════════════════════════════════════════════════");
    console.log(`📊 [Burner] SCAN COMPLETE - Found ${availableSlots.length} available key slots`);
    console.log("═══════════════════════════════════════════════════════");
    availableSlots.forEach((slot, idx) => {
      console.log(`${idx + 1}. Slot ${slot.keyNo}: ${slot.address}`);
    });

    // Strategy: Use the highest numbered key slot (typically the user's main address)
    // Key slots are often used as: 1-2 for internal/system, higher numbers for user wallets
    console.log("\n═══════════════════════════════════════════════════════");
    console.log("🎯 [Burner] SELECTING KEY SLOT");
    console.log("═══════════════════════════════════════════════════════");
    
    if (availableSlots.length > 0) {
      const bestSlot = availableSlots[availableSlots.length - 1]; // Highest numbered slot
      console.log(`✅ [Burner] SELECTED: Key slot ${bestSlot.keyNo} (highest available)`);
      console.log(`   Address: ${bestSlot.address}`);
      console.log(`   Public Key: ${bestSlot.publicKey.substring(0, 40)}...`);
      console.log(`   Strategy: Using highest numbered slot as primary wallet`);
      
      if (expectedAddress && bestSlot.address.toLowerCase() !== expectedAddress.toLowerCase()) {
        console.log(`⚠️ [Burner] Note: pkN address (${expectedAddress}) differs from selected key slot address`);
        console.log(`ℹ️ [Burner] pkN might be an attestation key rather than the wallet key`);
      }
      
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

