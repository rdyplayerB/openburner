import { HaloGateway } from '@arx-research/libhalo/api/web';
import { BurnerKeyInfo } from '../burner';
import { ethers } from 'ethers';

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
    const comprehensiveSpec = "publicKey:9,publicKey:8,publicKey:2,etherAddress:9,etherAddress:8,etherAddress:2,publicKeyAttest:9,publicKeyAttest:8,publicKeyAttest:2";
    const result = await gateway.execHaloCmd({
      name: "get_data_struct",
      spec: comprehensiveSpec
    });
    console.log("📋 [Mobile Gateway] Card data received:", result);

    // Process the result to find the best key slot
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
        console.log(`✅ [Mobile Gateway] Found key slot ${slot}: ${result[addressKey]}`);
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

/**
 * Sign a transaction using the mobile gateway connection
 * This function creates a new gateway connection for each signing attempt
 * which is the correct approach for mobile hosted version
 */
export async function signTransactionWithMobileGateway(
  transaction: ethers.TransactionRequest,
  keySlot: number = 1,
  pin?: string
): Promise<string> {
  console.log("📱 [Mobile Gateway] Starting transaction signing...");
  
  let gateway: HaloGateway | null = null;
  
  try {
    // Create gateway instance
    console.log("🌐 [Mobile Gateway] Connecting to HaLo Gateway for signing...");
    gateway = new HaloGateway('wss://s1.halo-gateway.arx.org', {
      createWebSocket: (url) => new WebSocket(url)
    });

    // Start pairing process
    console.log("📡 [Mobile Gateway] Starting pairing process for signing...");
    const pairInfo = await gateway.startPairing();
    console.log(`📱 [Mobile Gateway] Exec URL: ${pairInfo.execURL}`);

    // Wait for smartphone to connect
    console.log("⏳ [Mobile Gateway] Waiting for card connection for signing...");
    await gateway.waitConnected();
    console.log(`✅ [Mobile Gateway] Card connected for signing`);

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
    console.log(`📱 [Mobile Gateway] Signing with key slot ${keySlot} via gateway...`);
    const command: any = {
      name: "sign",
      keyNo: keySlot,
      digest,
    };
    
    // Add PIN if provided
    if (pin) {
      command.password = pin;
    }
    
    const result = await gateway.execHaloCmd(command);

    // Construct the signature (gateway returns raw.r, raw.s, raw.v)
    const sig = result.signature.raw || result.signature;
    const signature = ethers.Signature.from({
      r: "0x" + sig.r,
      s: "0x" + sig.s,
      v: sig.v,
    });

    // Apply signature to transaction
    tx.signature = signature;

    console.log("✅ [Mobile Gateway] Transaction signed successfully");
    return tx.serialized;
  } catch (error: any) {
    console.error("❌ [Mobile Gateway] Transaction signing failed:", error);
    throw new Error(error.message || "Failed to sign transaction via mobile gateway");
  } finally {
    // Clean up gateway connection
    if (gateway) {
      try {
        gateway = null;
        console.log("🧹 [Mobile Gateway] Gateway connection cleaned up after signing");
      } catch (cleanupError) {
        console.warn("⚠️ [Mobile Gateway] Error during cleanup after signing:", cleanupError);
      }
    }
  }
}
