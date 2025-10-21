import { ethers } from 'ethers';
import { getAppConfig, AppConfig } from './config/environment';
import { signTransactionWithBurner } from './burner';
import { signTransactionWithMobileNFC } from './mobile/nfc';
import { signTransactionWithGateway } from './burner-gateway';
import { useWalletStore } from '../store/wallet-store';

// Track ongoing signing operations to prevent parallel calls
const ongoingSigning = new Set<string>();

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
  
  // Create a unique key for this signing operation
  const operationKey = `${transaction.to}-${transaction.value}-${Date.now()}`;
  
  // Check if there's already an ongoing signing operation
  if (ongoingSigning.size > 0) {
    console.log("⚠️ [Smart Signer] Another signing operation is in progress, waiting...");
    // Wait a bit and try again
    await new Promise(resolve => setTimeout(resolve, 100));
    if (ongoingSigning.size > 0) {
      throw new Error("Another signing operation is in progress. Please wait and try again.");
    }
  }
  
  // Mark this operation as ongoing
  ongoingSigning.add(operationKey);
  console.log("🔒 [Smart Signer] Marked operation as ongoing:", operationKey);
  
  try {
    // Use provided config or fall back to server-side config
    const environmentConfig = config || getAppConfig();
    
    // Get connection mode from wallet store
    const { connectionMode } = useWalletStore.getState();
  
    console.log("🔍 [Smart Signer] Detecting signing method...");
    console.log(`   Mode: ${environmentConfig.mode}`);
    console.log(`   Device: ${environmentConfig.deviceType}`);
    console.log(`   Is Hosted: ${environmentConfig.isHosted}`);
    console.log(`   Is Mobile: ${environmentConfig.isMobile}`);
    console.log(`   Connection Mode: ${connectionMode}`);
    
    if (environmentConfig.isHosted && environmentConfig.isMobile) {
      // Mobile hosted version - use mobile NFC (direct connection)
      console.log("📱 [Smart Signer] Using mobile NFC signing");
      return await signTransactionWithMobileNFC(transaction, keySlot, pin);
    } else if (environmentConfig.isHosted && environmentConfig.isDesktop) {
      // Desktop hosted version - use regular gateway
      console.log("🖥️ [Smart Signer] Using desktop gateway signing");
      return await signTransactionWithGateway(await getGatewayInstance(), transaction, keySlot, pin);
    } else if (!environmentConfig.isHosted && connectionMode === 'gateway') {
      // Local desktop version, explicitly connected via gateway
      console.log("🖥️ [Smart Signer] Using local desktop gateway signing");
      return await signTransactionWithGateway(await getGatewayInstance(), transaction, keySlot, pin);
    } else {
      // Default to bridge for local (e.g., local desktop with no gateway, or local mobile)
      console.log("🔌 [Smart Signer] Using bridge signing");
      return await signTransactionWithBurner(transaction, keySlot, pin);
    }
  } catch (error: any) {
    console.error("❌ [Smart Signer] Signing failed:", error);
    throw new Error(error.message || "Failed to sign transaction");
  } finally {
    // Always clean up the ongoing operation
    ongoingSigning.delete(operationKey);
    console.log("🔓 [Smart Signer] Cleared ongoing operation:", operationKey);
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
