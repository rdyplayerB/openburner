import QRCode from "qrcode";
import { knobs, sleep, forever } from "../scenario";
import { ME } from "../fixtures";

export type GatewayConnState = "connected" | "executor-away" | "closed";
export interface BurnerKeyInfo {
  address: string;
  publicKey: string;
  keySlot: number;
}
export interface GatewayPairInfo {
  qrCodeDataURL: string;
  execURL: string;
}

let state: GatewayConnState = "closed";
const listeners = new Set<(s: GatewayConnState) => void>();
const emit = (s: GatewayConnState) => {
  state = s;
  listeners.forEach((l) => l(s));
};

export function getGatewayConnectionState(): GatewayConnState {
  return state === "closed" ? knobs.phoneLink : state;
}
export function onGatewayStateChange(cb: (s: GatewayConnState) => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export function cleanupGateway() {
  state = "closed";
}
export async function startGatewayPairing(): Promise<GatewayPairInfo> {
  await sleep(900);
  const execURL = "https://halo.vrfy.ch/gateway/?id=demo-pairing-session";
  return { qrCodeDataURL: await QRCode.toDataURL(execURL, { width: 440, margin: 0 }), execURL };
}
/** Phone scans after ~4s, then the card is read ~2s later. */
export async function getBurnerAddressViaGateway(): Promise<BurnerKeyInfo> {
  await sleep(4000);
  if (knobs.card === "never") return forever();
  emit("connected");
  await sleep(2200);
  if (knobs.card === "no-card") throw new Error("No Burner card detected. Please place your Burner card on the reader and try again.");
  return { address: ME, publicKey: "0x02" + "ab".repeat(32), keySlot: 9 };
}
export async function runGatewayCommand(): Promise<unknown> {
  return {};
}
export function getGlobalGateway(): never {
  throw new Error("Not available in stories");
}
