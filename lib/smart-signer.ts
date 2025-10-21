import { ethers } from 'ethers';
import { getAppConfig, AppConfig } from './config/environment';
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
  pin?: string,
  config?: AppConfig
): Promise<string> {
  console.log("🚀 [Smart Signer] ENTRY - signTransactionSmart called");
  console.log("🚀 [Smart Signer] Config passed:", config);
  
  // Use provided config or fall back to server-side config
  const environmentConfig = config || getAppConfig();
  
  console.log("🔍 [Smart Signer] Detecting signing method...");
  console.log(`   Mode: ${environmentConfig.mode}`);
  console.log(`   Device: ${environmentConfig.deviceType}`);
  console.log(`   Is Hosted: ${environmentConfig.isHosted}`);
  console.log(`   Is Mobile: ${environmentConfig.isMobile}`);
  
  try {
    if (environmentConfig.isHosted && environmentConfig.isMobile) {
      // Mobile hosted version - use mobile NFC (direct connection)
      console.log("📱 [Smart Signer] Using mobile NFC signing");
      return await signTransactionWithMobileNFC(transaction, keySlot, pin);
    } else if (environmentConfig.isHosted && environmentConfig.isDesktop) {
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
 * Get the existing gateway instance for desktop hosted version
 * This reuses the global gateway instance created during pairing
 */
async function getGatewayInstance(): Promise<any> {
  // Import the global gateway instance from burner-gateway
  const { getGlobalGateway } = await import('./burner-gateway');
  return getGlobalGateway();
}
