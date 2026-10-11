import { connectToBridge, execBridgeCommand, disconnectBridge, isBridgeRunning } from "./burner-bridge";
import { scanCardKeys } from "./card/keys";
import { log } from "./log";

export interface BurnerKeyInfo {
  address: string;
  publicKey: string;
  keySlot: number;
}

/**
 * Read the wallet key from a Burner card on a USB NFC reader (HaLo Bridge).
 */
export async function getBurnerAddress(): Promise<BurnerKeyInfo> {
  try {
    await connectToBridge();
    const key = await scanCardKeys(execBridgeCommand, { allowPerSlotFallback: true });
    log.debug(`[Burner] Using key slot ${key.keySlot}`);
    return { address: key.address, publicKey: key.publicKey, keySlot: key.keySlot };
  } finally {
    disconnectBridge();
  }
}

/**
 * Run one HaLo command on the card via the USB bridge (connect → exec → disconnect).
 */
export async function runBridgeCommand(command: Record<string, unknown>): Promise<any> {
  if (!(await isBridgeRunning())) {
    throw new Error("No Burner card detected. Please place your Burner card on the reader and try again.");
  }
  try {
    await connectToBridge();
    return await execBridgeCommand(command);
  } finally {
    disconnectBridge();
  }
}
