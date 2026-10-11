import { execHaloCmdWeb } from "@arx-research/libhalo/api/web";
import { scanCardKeys } from "../card/keys";
import { log } from "../log";
import type { BurnerKeyInfo } from "../burner";

/** How long to wait for a tap before giving up. */
const NFC_TIMEOUT_MS = 60_000;

export class NfcCancelledError extends Error {
  readonly code = "NFC_CANCELLED";
  constructor() {
    super("Card read cancelled.");
    this.name = "NfcCancelledError";
  }
}

function isCancel(error: any): boolean {
  const name = String(error?.name || "");
  const message = String(error?.message || "");
  return (
    name === "NotAllowedError" ||
    name === "AbortError" ||
    message.includes("NotAllowedError") ||
    message.includes("cancel")
  );
}

/**
 * Run one HaLo command by tapping the card to this phone (Web NFC / credential
 * prompt). Every call is a separate tap.
 */
export async function runNfcCommand(command: Record<string, unknown>): Promise<any> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("No card detected. Hold your card to the top of your phone and try again.")),
      NFC_TIMEOUT_MS
    );
  });
  try {
    return await Promise.race([
      execHaloCmdWeb(command as any, { method: "credential" }),
      timeout,
    ]);
  } catch (error) {
    if (isCancel(error)) throw new NfcCancelledError();
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Connect by tapping the card to the phone: one tap reads the wallet key.
 */
export async function connectWithMobileNFC(): Promise<BurnerKeyInfo> {
  // No per-slot fallback here: each extra command would be another tap.
  const key = await scanCardKeys(runNfcCommand);
  log.debug(`[Mobile NFC] Using key slot ${key.keySlot}`);
  return { address: key.address, publicKey: key.publicKey, keySlot: key.keySlot };
}
