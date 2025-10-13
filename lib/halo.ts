import { ethers } from "ethers";
import { connectToBridge, execBridgeCommand, disconnectBridge } from "./halo-bridge";

export interface HaloKeyInfo {
  address: string;
  publicKey: string;
  keySlot?: number; // Which key slot was used
}

/**
 * Get the Ethereum address from a HaLo chip via web browser
 * This uses HaLo Bridge with USB NFC reader
 */
export async function getHaloAddress(): Promise<HaloKeyInfo> {
  try {
    console.log("Connecting to HaLo Bridge...");

    // Connect to the bridge and wait for chip detection
    await connectToBridge();

    // Execute get_pkeys command
    const result = await execBridgeCommand({
      name: "get_pkeys",
    });

    console.log("Full result from chip:", result);
    console.log("Available addresses:", result.etherAddresses);
    console.log("Available public keys:", result.publicKeys);

    // Manually verify address computation for key slot 1
    const pubKey1 = result.publicKeys['1'];
    const computedAddr1 = ethers.computeAddress("0x" + pubKey1);
    console.log("Manual address computation from public key 1:", computedAddr1);
    console.log("Bridge-provided address for key 1:", result.etherAddresses['1']);
    console.log("Do they match?", computedAddr1.toLowerCase() === result.etherAddresses['1'].toLowerCase());

    // Try reading NDEF record (dynamic URL) - this is what mobile apps typically use
    let expectedAddress: string | null = null;
    try {
      console.log("Trying to read NDEF record...");
      const ndefResult = await execBridgeCommand({
        name: "read_ndef",
      });
      console.log("NDEF result:", ndefResult);
      console.log("NDEF result keys:", Object.keys(ndefResult));
      console.log("NDEF result stringified:", JSON.stringify(ndefResult, null, 2));
      
      // Check if there's a pkN (additional public key) in the NDEF
      if (ndefResult.qs && ndefResult.qs.pkN) {
        console.log("Found pkN in NDEF:", ndefResult.qs.pkN);
        
        // pkN has a special format: 080004 + 64 bytes of public key
        // The 08 00 04 is a header, where 04 indicates uncompressed public key
        try {
          let pkN = ndefResult.qs.pkN;
          
          // Strip the 080004 header (first 6 hex chars / 3 bytes)
          if (pkN.startsWith('080004') || pkN.startsWith('080002')) {
            pkN = pkN.slice(6); // Remove header
            console.log("Stripped pkN header, remaining:", pkN);
            
            // Now prepend 04 for standard uncompressed public key format
            pkN = '04' + pkN;
            console.log("Formatted pkN as uncompressed key:", pkN);
            
            const addrFromPkN = ethers.computeAddress("0x" + pkN);
            console.log("✅ Primary address from pkN:", addrFromPkN);
            
            // Use this pkN address to find the correct key slot
            // Store it for use below
            expectedAddress = addrFromPkN;
          }
        } catch (e) {
          console.log("Could not derive address from pkN:", e);
        }
      }
      
      // Also check pk1 and pk2 from NDEF (just to be thorough)
      if (ndefResult.qs) {
        ['pk1', 'pk2'].forEach((keyName, idx) => {
          if (ndefResult.qs[keyName]) {
            const addr = ethers.computeAddress("0x" + ndefResult.qs[keyName]);
            console.log(`Address from NDEF ${keyName}:`, addr);
          }
        });
      }
      
      // Parse the NDEF URL for logging
      const ndefUrl = ndefResult.ndef || ndefResult.url || ndefResult.uri || ndefResult;
      if (ndefUrl && typeof ndefUrl === 'string') {
        console.log("NDEF URL:", ndefUrl);
      }
    } catch (e) {
      console.log("Could not read NDEF:", e);
    }

    // Check all key slots (1-9) to find available addresses
    console.log("\n🔍 Checking all key slots for available addresses...");
    const availableSlots: Array<{ keyNo: number; address: string; publicKey: string }> = [];
    
    for (let keyNo = 1; keyNo <= 9; keyNo++) {
      try {
        const keyInfo = await execBridgeCommand({
          name: "get_key_info",
          keyNo,
        });
        
        if (keyInfo.publicKey) {
          const addr = ethers.computeAddress("0x" + keyInfo.publicKey);
          console.log(`Key slot ${keyNo}: ${addr}`);
          availableSlots.push({
            keyNo,
            address: addr,
            publicKey: keyInfo.publicKey,
          });
          
          // If we have an expected address from pkN, check if it matches
          if (expectedAddress && addr.toLowerCase() === expectedAddress.toLowerCase()) {
            console.log(`✅ pkN address matches key slot ${keyNo}!`);
          }
        }
      } catch (e) {
        console.log(`Key slot ${keyNo}: Not available or not initialized`);
      }
    }

    console.log(`\n📊 Found ${availableSlots.length} available key slots`);

    // Strategy: Use the highest numbered key slot (typically the user's main address)
    // Key slots are often used as: 1-2 for internal/system, higher numbers for user wallets
    if (availableSlots.length > 0) {
      const bestSlot = availableSlots[availableSlots.length - 1]; // Highest numbered slot
      console.log(`✅ Using key slot ${bestSlot.keyNo} (highest available) - Address: ${bestSlot.address}`);
      
      if (expectedAddress && bestSlot.address.toLowerCase() !== expectedAddress.toLowerCase()) {
        console.log(`ℹ️ Note: pkN address (${expectedAddress}) differs from selected key slot address`);
        console.log(`ℹ️ pkN might be an attestation key rather than the wallet key`);
      }
      
      return {
        address: bestSlot.address,
        publicKey: bestSlot.publicKey,
        keySlot: bestSlot.keyNo,
      };
    }

    // Last resort fallback to key slot 1
    const address = result.etherAddresses['1'];
    const publicKeyHex = result.publicKeys['1'];
    console.log("\n⚠️ Using key slot 1 as last resort fallback - Address:", address);

    return {
      address,
      publicKey: publicKeyHex,
      keySlot: 1,
    };
  } catch (error: any) {
    console.error("Error reading HaLo chip:", error);
    throw new Error(error.message || "Failed to read HaLo chip");
  }
}

/**
 * Sign a transaction using the HaLo chip
 */
export async function signTransactionWithHalo(
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

    // Remove '0x' prefix for HaLo
    const digest = txHash.slice(2);

    // Sign with HaLo chip via Bridge
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
    console.error("Error signing with HaLo chip:", error);
    throw new Error(error.message || "Failed to sign transaction");
  } finally {
    disconnectBridge();
  }
}
