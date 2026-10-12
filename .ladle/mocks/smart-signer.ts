import { ethers } from "ethers";
import { setCardPhase } from "@/store/signing-store";
import { knobs, sleep, forever } from "../scenario";

/** The card, played by a timer. The `card` knob decides how it behaves. */
async function tap<T>(result: () => T): Promise<T> {
  setCardPhase("tap");
  await sleep(1900);
  if (knobs.card === "never") return forever();
  if (knobs.card === "wrong-pin") {
    setCardPhase("idle");
    throw new Error("Incorrect PIN. Please try again.");
  }
  if (knobs.card === "no-card") {
    setCardPhase("idle");
    throw new Error("No Burner card detected. Please place your Burner card on the reader and try again.");
  }
  setCardPhase("signed");
  await sleep(500);
  return result();
}

const fakeSig = () => ethers.hexlify(ethers.randomBytes(65));

export async function signTransactionSmart(): Promise<string> {
  return tap(() => ethers.hexlify(ethers.randomBytes(120)));
}
export async function signDigestSmart(): Promise<ethers.Signature> {
  return tap(() => ethers.Signature.from({ r: ethers.hexlify(ethers.randomBytes(32)), s: "0x" + "1".padStart(64, "0"), v: 27 }));
}
export async function signMessageSmart(): Promise<string> {
  return tap(fakeSig);
}
export async function signTypedDataSmart(): Promise<string> {
  return tap(fakeSig);
}
