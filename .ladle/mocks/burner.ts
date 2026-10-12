import { knobs, sleep } from "../scenario";
import { ME } from "../fixtures";

export interface BurnerKeyInfo {
  address: string;
  publicKey: string;
  keySlot: number;
}
const KEY: BurnerKeyInfo = { address: ME, publicKey: "0x02" + "ab".repeat(32), keySlot: 9 };

export async function getBurnerAddress(): Promise<BurnerKeyInfo> {
  await sleep(1400);
  if (knobs.bridge === "down") throw new Error("Failed to connect to HaLo Bridge");
  if (knobs.card === "no-card") throw new Error("No Burner card detected. Please place your Burner card on the reader and try again.");
  return KEY;
}
export async function runBridgeCommand(): Promise<unknown> {
  return {};
}
export { KEY as DEMO_KEY };
