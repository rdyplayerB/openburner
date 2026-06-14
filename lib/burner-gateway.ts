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
 * Get the global gateway instance
 */
export function getGlobalGateway(): HaloGateway {
  if (!globalGateway) {
    throw new Error("Gateway not initialized. Please connect to wallet first.");
  }
  return globalGateway;
}

// ─── Session resilience ──────────────────────────────────────────────────
//
// The gateway has two links: this desktop tab ↔ server (the "requestor"
// socket, which we control) and the phone ↔ server (the "executor"). By
// default libhalo closes our requestor socket 3s after the phone drops
// (screen lock / backgrounded tab), which destroys the session and forces a
// brand-new QR scan. We cancel that timer so the session survives the phone
// being briefly asleep — when it reconnects to the same session, signing
// resumes with no re-pairing. Each signature still needs a physical card tap.

export type GatewayConnState = "connected" | "executor-away" | "closed";

interface SessionResilience {
  getState: () => GatewayConnState;
  waitForExecutor: (timeoutMs: number) => Promise<void>;
  onStateChange: (cb: (s: GatewayConnState) => void) => () => void;
}

let resilience: SessionResilience | null = null;

function installSessionResilience(gateway: HaloGateway): SessionResilience {
  // libhalo marks ws/closeTimeout as TS-private; they're plain props at runtime.
  const g = gateway as any;
  let state: GatewayConnState = "closed";
  const listeners = new Set<(s: GatewayConnState) => void>();

  const setState = (s: GatewayConnState) => {
    if (s === state) return;
    state = s;
    console.log(`🔌 [Gateway] Connection state: ${s}`);
    listeners.forEach((cb) => {
      try {
        cb(s);
      } catch {
        /* listener errors are non-fatal */
      }
    });
  };

  const cancelAutoClose = () => {
    if (g.closeTimeout !== null && g.closeTimeout !== undefined) {
      clearTimeout(g.closeTimeout);
      g.closeTimeout = null;
    }
  };

  g.ws.onUnpackedMessage.addListener((data: any) => {
    if (data?.type === "executor_connected") {
      cancelAutoClose();
      setState("connected");
    } else if (data?.type === "executor_disconnected") {
      // Keep the requestor socket open so the same session can be resumed.
      cancelAutoClose();
      setState("executor-away");
    }
  });

  g.ws.onClose.addListener(() => setState("closed"));

  const onStateChange = (cb: (s: GatewayConnState) => void) => {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  };

  const waitForExecutor = (timeoutMs: number) =>
    new Promise<void>((resolve, reject) => {
      if (state === "connected") return resolve();
      if (state === "closed") return reject(new Error("GATEWAY_SESSION_CLOSED"));
      let unsub = () => {};
      const timer = setTimeout(() => {
        unsub();
        reject(new Error("GATEWAY_EXECUTOR_TIMEOUT"));
      }, timeoutMs);
      unsub = onStateChange((s) => {
        if (s === "connected") {
          clearTimeout(timer);
          unsub();
          resolve();
        } else if (s === "closed") {
          clearTimeout(timer);
          unsub();
          reject(new Error("GATEWAY_SESSION_CLOSED"));
        }
      });
    });

  return { getState: () => state, waitForExecutor, onStateChange };
}

/** Current gateway link state, or "closed" if no session is active. */
export function getGatewayConnectionState(): GatewayConnState {
  return resilience ? resilience.getState() : "closed";
}

/** Subscribe to gateway connection-state changes. Returns an unsubscribe fn. */
export function onGatewayStateChange(
  cb: (s: GatewayConnState) => void
): () => void {
  if (!resilience) return () => {};
  return resilience.onStateChange(cb);
}

/**
 * Run a gateway command, tolerating the phone briefly dropping off. Waits for
 * the executor to be present (up to timeoutMs), and retries once if the link
 * blips mid-command while the session is still alive.
 */
async function execHaloCmdResilient(
  gate: HaloGateway,
  command: any,
  timeoutMs = 120_000
): Promise<any> {
  if (resilience) await resilience.waitForExecutor(timeoutMs);
  try {
    return await gate.execHaloCmd(command);
  } catch (e: any) {
    const msg = String(e?.message || e);
    const transient =
      msg.includes("no executor connected") ||
      msg.includes("Failed to send request");
    if (transient && resilience && resilience.getState() !== "closed") {
      console.log("🔁 [Gateway] Link blipped mid-command — waiting for phone to resume...");
      await resilience.waitForExecutor(timeoutMs);
      return await gate.execHaloCmd(command);
    }
    throw e;
  }
}

/**
 * Clean up gateway connection
 */
export function cleanupGateway() {
  if (globalGateway) {
    try {
      // Close the gateway connection
      globalGateway = null;
      resilience = null;
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
    // Single tap, comprehensive data request approach
    console.log("🔍 [Gateway] Scanning all key slots in single tap...");
    
    // Priority order: 9 (user wallet) > 8 (preloaded) > 2 (system)
    const targetSlots = [9, 8, 2];
    const availableSlots: Array<{ keyNo: number; address: string; publicKey: string; hasAttestation: boolean }> = [];
    
    // Single comprehensive call for efficiency
    console.log("📍 [Gateway] Making comprehensive data request...");
    const scanStart = Date.now();
    
    try {
      // Use comprehensive spec: latchValue, graffiti, and all key data at once
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
            // Use compressed public key directly to compute address
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

    // Keep the session alive across brief phone drops (no constant re-scanning)
    resilience = installSessionResilience(globalGateway);

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

    // Execute comprehensive data request
    console.log("🔍 [Gateway] Scanning for available key slots...");
    
    // Priority order: 9 (user wallet) > 8 (preloaded) > 2 (system)
    const targetSlots = [9, 8, 2];
    const availableSlots: Array<{ keyNo: number; address: string; publicKey: string; hasAttestation: boolean }> = [];
    
    try {
      // Use comprehensive spec: latchValue, graffiti, and all key data at once
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
            // Use compressed public key directly to compute address
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

    const result = await execHaloCmdResilient(gate, command);

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

/**
 * Sign a raw 32-byte digest via the gateway (for message / typed-data signing).
 */
export async function signDigestWithGateway(
  gate: HaloGateway,
  digest: string,
  keySlot: number = 1,
  pin?: string
): Promise<ethers.Signature> {
  try {
    const hex = digest.startsWith("0x") ? digest.slice(2) : digest;
    const command: any = { name: "sign", keyNo: keySlot, digest: hex };
    if (pin) command.password = pin;

    const result = await execHaloCmdResilient(gate, command);
    const sig = result.signature.raw || result.signature;
    let v = Number(sig.v);
    if (v < 27) v += 27;
    return ethers.Signature.from({ r: "0x" + sig.r, s: "0x" + sig.s, v });
  } catch (error: any) {
    console.error("Error signing digest via gateway:", error);
    throw new Error(error.message || "Failed to sign message via gateway");
  }
}
