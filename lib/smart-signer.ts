import { ethers } from 'ethers';
import { getAppConfig } from './config/environment';
import { signTransactionWithBurner } from './burner';
import { signTransactionWithMobileNFC } from './mobile/nfc';
import { signTransactionWithGateway } from './burner-gateway';

/**
 * Smart transaction signing that automatically detects the connection mode
 * and uses the appropriate signing method
 */
export async function signTransactionSmart(
  transaction: ethers.TransactionRequest,
  keySlot: number = 1,
  pin?: string
): Promise<string> {
  const config = getAppConfig();
  
  console.log("🔍 [Smart Signer] Detecting signing method...");
  console.log(`   Mode: ${config.mode}`);
  console.log(`   Device: ${config.deviceType}`);
  console.log(`   Is Hosted: ${config.isHosted}`);
  console.log(`   Is Mobile: ${config.isMobile}`);
  
  try {
    if (config.isHosted && config.isMobile) {
      // Mobile hosted version - use mobile NFC (direct connection)
      console.log("📱 [Smart Signer] Using mobile NFC signing");
      return await signTransactionWithMobileNFC(transaction, keySlot, pin);
    } else if (config.isHosted && config.isDesktop) {
      // Desktop hosted version - use regular gateway
      console.log("🖥️ [Smart Signer] Using desktop gateway signing");
      return await signTransactionWithGateway(await getGatewayInstance(), transaction, keySlot, pin);
    } else {
      // Local version - use bridge
      console.log("🔌 [Smart Signer] Using bridge signing");
      return await signTransactionWithBurner(transaction, keySlot, pin);
    }
  } catch (error: any) {
    console.error("❌ [Smart Signer] Signing failed:", error);
    throw new Error(error.message || "Failed to sign transaction");
  }
}

/**
 * Get or create a gateway instance for desktop hosted version
 * This is a simplified version - in a real implementation, you'd want to
 * store the gateway instance properly
 */
async function getGatewayInstance(): Promise<any> {
  // For now, we'll create a new gateway instance
  // In a real implementation, you'd want to store and reuse the gateway instance
  const { HaloGateway } = await import('@arx-research/libhalo/api/web');
  return new HaloGateway('wss://s1.halo-gateway.arx.org', {
    createWebSocket: (url: string) => new WebSocket(url)
  });
}
