import { knobs, sleep, forever } from "../scenario";
import { ME } from "../fixtures";

export class NfcCancelledError extends Error {
  readonly code = "NFC_CANCELLED";
  constructor() {
    super("Card read cancelled.");
    this.name = "NfcCancelledError";
  }
}
export async function runNfcCommand(): Promise<unknown> {
  return {};
}
export async function connectWithMobileNFC() {
  await sleep(2600);
  if (knobs.card === "never") return forever();
  if (knobs.card === "no-card") throw new Error("No card detected. Hold your card to the top of your phone and try again.");
  return { address: ME, publicKey: "0x02" + "ab".repeat(32), keySlot: 9 };
}
