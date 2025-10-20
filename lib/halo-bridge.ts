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
  retryAfterConsent(): Promise<void>;
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
      // Try the official HaloBridge class with proper configuration
      // The HaloBridge class uses mDNS discovery to find the local bridge service
      // It will attempt to connect to wss://halo-bridge.local:32869/ws (secure WebSocket)
      this.bridge = new HaloBridge({});
      
      // Set up disconnection handler
      this.bridge.onDisconnected().sub(() => {
        console.log("🔌 [HaloBridge] Bridge disconnected");
        this.bridge = null;
        this.consentURL = null;
      });

      // Try to connect - this should trigger bridge discovery
      // This may throw NFCBridgeConsentError if consent is required
      await this.bridge.connect();
      console.log("✅ [HaloBridge] Connected successfully via HaloBridge class");
    } catch (error) {
      console.error("❌ [HaloBridge] HaloBridge class connection failed:", error);
      
      // Handle consent error - this is expected and part of the normal flow
      if (error instanceof NFCBridgeConsentError) {
        console.log("🔐 [HaloBridge] Consent required - getting consent URL");
        // Store the bridge instance - we'll need it after consent is granted
        if (this.bridge) {
          this.consentURL = this.bridge.getConsentURL(window.location.origin, {});
          console.log("🔗 [HaloBridge] Consent URL:", this.consentURL);
          // Don't set bridge to null - we need it for retry after consent
          throw new Error("CONSENT_REQUIRED");
        } else {
          // If no bridge instance, create a consent URL manually
          this.consentURL = `http://127.0.0.1:32868/consent?website=${window.location.origin}`;
          console.log("🔗 [HaloBridge] Manual consent URL:", this.consentURL);
          throw new Error("CONSENT_REQUIRED");
        }
      }
      
      // Check if it's a bridge discovery error - try direct connection as fallback
      if (error instanceof Error && (
        error.message.includes("Unable to locate halo bridge") ||
        error.message.includes("WebSocket connection failed")
      )) {
        console.log("🔌 [HaloBridge] Bridge discovery failed, trying direct connection...");
        
        try {
          await this.connectDirectSecureWebSocket();
          console.log("✅ [HaloBridge] Connected successfully via direct secure WebSocket");
          return;
        } catch (directError) {
          console.log("🔌 [HaloBridge] Direct connection also failed, bridge service may not be running");
          this.bridge = null;
          throw new Error("BRIDGE_NOT_AVAILABLE");
        }
      }
      
      // All other errors
      console.log("🔌 [HaloBridge] Bridge connection failed:", error instanceof Error ? error.message : String(error));
      
      this.bridge = null;
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  async retryAfterConsent(): Promise<void> {
    console.log("🔄 [HaloBridge] Retrying connection after consent...");
    this.isConnecting = true;

    try {
      // If we have a bridge instance, try to reconnect it
      if (this.bridge) {
        await this.bridge.connect();
        console.log("✅ [HaloBridge] Connected successfully after consent with existing bridge");
      } else {
        // If no bridge instance, create a new one and connect
        console.log("🔄 [HaloBridge] Creating new bridge instance for retry...");
        this.bridge = new HaloBridge({});
        await this.bridge.connect();
        console.log("✅ [HaloBridge] Connected successfully after consent with new bridge");
      }
      
      this.consentURL = null; // Clear consent URL since we're now connected
    } catch (error) {
      console.error("❌ [HaloBridge] Retry after consent failed:", error);
      this.bridge = null;
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  private async connectDirectSecureWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket("wss://halo-bridge.local:32869/ws");
      let currentHandle: string | null = null;
      
      ws.onopen = () => {
        console.log("✅ [HaloBridge] Direct secure WebSocket connected");
        
        // Wait for reader to be detected before resolving
        const checkForReader = () => {
          if (currentHandle) {
            console.log("✅ [HaloBridge] Reader detected, bridge ready");
            resolve();
          } else {
            // Wait a bit more for reader detection
            setTimeout(checkForReader, 1000);
          }
        };
        
        // Start checking for reader after a short delay
        setTimeout(checkForReader, 500);
        
        // Create a mock bridge object for compatibility
        this.bridge = {
          execHaloCmd: async (command: any) => {
            return new Promise((execResolve, execReject) => {
              if (!currentHandle) {
                execReject(new Error("No card detected. Please place your Burner card on the reader."));
                return;
              }
              
              const uid = Math.random().toString();
              const message = {
                uid,
                type: "exec_halo",
                handle: currentHandle,
                command,
              };
              
              const handleMessage = (event: MessageEvent) => {
                const msg = JSON.parse(event.data);
                if (msg.uid === uid) {
                  ws.removeEventListener('message', handleMessage);
                  if (msg.event === "exec_success") {
                    execResolve(msg.data.res);
                  } else if (msg.event === "exec_exception") {
                    execReject(new Error(msg.data.exception.message));
                  }
                }
              };
              
              ws.addEventListener('message', handleMessage);
              ws.send(JSON.stringify(message));
              
              // Timeout after 30 seconds
              setTimeout(() => {
                ws.removeEventListener('message', handleMessage);
                execReject(new Error("Command timeout"));
              }, 30000);
            });
          },
          close: () => {
            ws.close();
          },
          onDisconnected: () => ({
            sub: (callback: () => void) => {
              ws.addEventListener('close', callback);
            }
          }),
          getConsentURL: (origin: string) => {
            return `http://127.0.0.1:32868/consent?website=${origin}`;
          }
        } as any;
      };
      
      ws.onmessage = (event: MessageEvent) => {
        const msg = JSON.parse(event.data);
        console.log("🔌 [HaloBridge] Bridge message:", msg);
        
        if (msg.event === "handle_added") {
          currentHandle = msg.data.handle;
          console.log("✅ [HaloBridge] Card detected, handle:", currentHandle);
        } else if (msg.event === "reader_added") {
          console.log("✅ [HaloBridge] Reader added:", msg.data.reader_name);
        } else if (msg.event === "ws_connected") {
          console.log("✅ [HaloBridge] Bridge service connected");
        }
      };
      
      ws.onerror = (error) => {
        console.error("❌ [HaloBridge] Direct secure WebSocket connection failed:", error);
        reject(new Error("Failed to connect to HaLo Bridge via secure WebSocket"));
      };
      
      ws.onclose = () => {
        console.log("🔌 [HaloBridge] Direct secure WebSocket connection closed");
        this.bridge = null;
        currentHandle = null;
      };
    });
  }

  private async connectDirectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket("ws://127.0.0.1:32868/ws");
      let currentHandle: string | null = null;
      
      ws.onopen = () => {
        console.log("✅ [HaloBridge] Direct WebSocket connected");
        
        // Wait for reader to be detected before resolving
        const checkForReader = () => {
          if (currentHandle) {
            console.log("✅ [HaloBridge] Reader detected, bridge ready");
            resolve();
          } else {
            // Wait a bit more for reader detection
            setTimeout(checkForReader, 1000);
          }
        };
        
        // Start checking for reader after a short delay
        setTimeout(checkForReader, 500);
        
        // Create a mock bridge object for compatibility
        this.bridge = {
          execHaloCmd: async (command: any) => {
            return new Promise((execResolve, execReject) => {
              if (!currentHandle) {
                execReject(new Error("No card detected. Please place your Burner card on the reader."));
                return;
              }
              
              const uid = Math.random().toString();
              const message = {
                uid,
                type: "exec_halo",
                handle: currentHandle,
                command,
              };
              
              const handleMessage = (event: MessageEvent) => {
                const msg = JSON.parse(event.data);
                if (msg.uid === uid) {
                  ws.removeEventListener('message', handleMessage);
                  if (msg.event === "exec_success") {
                    execResolve(msg.data.res);
                  } else if (msg.event === "exec_exception") {
                    execReject(new Error(msg.data.exception.message));
                  }
                }
              };
              
              ws.addEventListener('message', handleMessage);
              ws.send(JSON.stringify(message));
              
              // Timeout after 30 seconds
              setTimeout(() => {
                ws.removeEventListener('message', handleMessage);
                execReject(new Error("Command timeout"));
              }, 30000);
            });
          },
          close: () => {
            ws.close();
          },
          onDisconnected: () => ({
            sub: (callback: () => void) => {
              ws.addEventListener('close', callback);
            }
          }),
          getConsentURL: (origin: string) => {
            return `http://127.0.0.1:32868/consent?website=${origin}`;
          }
        } as any;
      };
      
      ws.onmessage = (event: MessageEvent) => {
        const msg = JSON.parse(event.data);
        console.log("🔌 [HaloBridge] Bridge message:", msg);
        
        if (msg.event === "handle_added") {
          currentHandle = msg.data.handle;
          console.log("✅ [HaloBridge] Card detected, handle:", currentHandle);
        } else if (msg.event === "reader_added") {
          console.log("✅ [HaloBridge] Reader added:", msg.data.reader_name);
        } else if (msg.event === "ws_connected") {
          console.log("✅ [HaloBridge] Bridge service connected");
        }
      };
      
      ws.onerror = (error) => {
        console.error("❌ [HaloBridge] Direct WebSocket connection failed:", error);
        reject(new Error("Failed to connect to HaLo Bridge via WebSocket"));
      };
      
      ws.onclose = () => {
        console.log("🔌 [HaloBridge] Direct WebSocket connection closed");
        this.bridge = null;
        currentHandle = null;
      };
    });
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
      // Try alternative field names
      const altAddresses = result.etherAddress || result.addresses || result.ethAddresses || result.ethereumAddresses;
      if (altAddresses && altAddresses.length > 0) {
        result.etherAddresses = altAddresses;
      } else {
        throw new Error("No Ethereum addresses found on the card");
      }
    }

    if (!result.publicKeys || result.publicKeys.length === 0) {
      // Try alternative field names
      const altKeys = result.publicKey || result.keys || result.pubKeys || result.ethereumKeys;
      if (altKeys && altKeys.length > 0) {
        result.publicKeys = altKeys;
      } else {
        throw new Error("No public keys found on the card");
      }
    }

    // Use the first available address and key
    const address = result.etherAddresses[0];
    const publicKey = result.publicKeys[0];
    const keySlot = 0; // Default to first key slot

    console.log("✅ [HaloBridge] Successfully retrieved burner info:");
    console.log(`   Address: ${address}`);
    console.log(`   Public Key: ${publicKey ? publicKey.substring(0, 40) + '...' : 'undefined'}`);
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
