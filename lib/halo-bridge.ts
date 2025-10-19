// HaloBridge service using @arx-research/libhalo for proper consent handling
// This provides bridge connection with consent flow for hosted versions

import { HaloBridge, execHaloCmdWeb } from '@arx-research/libhalo/api/web';
import {
  NFCBadTransportError,
  NFCAbortedError,
  NFCBridgeConsentError,
  BaseHaloAPI,
} from '@arx-research/libhalo/api/common';
import { ExecHaloCmdWebOptions } from '@arx-research/libhalo/types';

export interface BurnerKeyInfo {
  address: string;
  publicKey: string;
  keySlot?: number;
}

export interface HaloBridgeService {
  connect(): Promise<void>;
  disconnect(): void;
  executeCommand(command: any): Promise<any>;
  isConnected(): boolean;
  getConsentURL(): string | null;
}

class HaloBridgeServiceImpl implements HaloBridgeService {
  private bridge: HaloBridge | null = null;
  private isConnecting = false;
  private consentURL: string | null = null;

  async connect(): Promise<void> {
    if (this.bridge) {
      console.log("✅ HaloBridge already connected");
      return;
    }

    if (this.isConnecting) {
      console.log("⏳ HaloBridge connection already in progress");
      return;
    }

    this.isConnecting = true;
    console.log("🔌 [HaloBridge] Starting connection...");

    try {
      this.bridge = new HaloBridge({});
      
      // Set up disconnection handler
      this.bridge.onDisconnected().sub(() => {
        console.log("🔌 [HaloBridge] Bridge disconnected");
        this.bridge = null;
        this.consentURL = null;
      });

      await this.bridge.connect();
      console.log("✅ [HaloBridge] Connected successfully");
    } catch (error) {
      console.error("❌ [HaloBridge] Connection failed:", error);
      
      if (error instanceof NFCBridgeConsentError && this.bridge) {
        console.log("🔐 [HaloBridge] Consent required - getting consent URL");
        this.consentURL = this.bridge.getConsentURL(window.location.origin, {});
        console.log("🔗 [HaloBridge] Consent URL:", this.consentURL);
        throw new Error("CONSENT_REQUIRED");
      }
      
      this.bridge = null;
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  disconnect(): void {
    if (this.bridge) {
      console.log("🔌 [HaloBridge] Disconnecting...");
      this.bridge.close();
      this.bridge = null;
      this.consentURL = null;
    }
  }

  async executeCommand(command: any): Promise<any> {
    if (!this.bridge) {
      throw new Error("Bridge not connected");
    }

    console.log("📡 [HaloBridge] Executing command:", command);
    
    try {
      const result = await this.bridge.execHaloCmd(command);
      console.log("✅ [HaloBridge] Command executed successfully");
      return result;
    } catch (error) {
      console.error("❌ [HaloBridge] Command execution failed:", error);
      
      if (error instanceof NFCBadTransportError) {
        // Bridge connection lost, need to reconnect
        this.bridge = null;
        throw new Error("Bridge connection lost. Please try again.");
      }
      
      throw error;
    }
  }

  isConnected(): boolean {
    return this.bridge !== null;
  }

  getConsentURL(): string | null {
    return this.consentURL;
  }
}

// Singleton instance
let bridgeService: HaloBridgeService | null = null;

export function getHaloBridgeService(): HaloBridgeService {
  if (!bridgeService) {
    bridgeService = new HaloBridgeServiceImpl();
  }
  return bridgeService;
}

// Utility function to get Burner address via bridge
export async function getBurnerAddressViaBridge(): Promise<BurnerKeyInfo> {
  const bridge = getHaloBridgeService();
  
  try {
    console.log("🔌 [HaloBridge] Connecting to bridge...");
    await bridge.connect();
    
    console.log("📡 [HaloBridge] Getting burner address...");
    const result = await bridge.executeCommand({
      name: "get_pkeys",
    });

    console.log("📋 [HaloBridge] Bridge result:", result);

    if (!result.etherAddresses || result.etherAddresses.length === 0) {
      throw new Error("No Ethereum addresses found on the card");
    }

    if (!result.publicKeys || result.publicKeys.length === 0) {
      throw new Error("No public keys found on the card");
    }

    // Use the first available address and key
    const address = result.etherAddresses[0];
    const publicKey = result.publicKeys[0];
    const keySlot = 0; // Default to first key slot

    console.log("✅ [HaloBridge] Successfully retrieved burner info:");
    console.log(`   Address: ${address}`);
    console.log(`   Public Key: ${publicKey.substring(0, 40)}...`);
    console.log(`   Key Slot: ${keySlot}`);

    return {
      address,
      publicKey,
      keySlot,
    };
  } catch (error) {
    console.error("❌ [HaloBridge] Failed to get burner address:", error);
    throw error;
  }
}

// Cleanup function
export function cleanupHaloBridge(): void {
  if (bridgeService) {
    bridgeService.disconnect();
    bridgeService = null;
  }
}
