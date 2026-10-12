import { ethers } from "ethers";
import { knobs, net } from "../scenario";
import { ME, RECENTS } from "../fixtures";

/** Any *.eth resolves to a made-up address, except names containing "nobody". */
const KNOWN: Record<string, string> = { "brantly.eth": RECENTS[1].address, "burner-demo.eth": ME };

export function looksLikeEns(value: string): boolean {
  return /^[^\s.]+(\.[^\s.]+)*\.(eth|xyz|box|com|id|art)$/i.test(value.trim());
}
export async function resolveEns(name: string): Promise<string | null> {
  await net();
  const n = name.trim().toLowerCase();
  if (n.includes("nobody")) return null;
  return KNOWN[n] ?? ethers.getAddress(ethers.dataSlice(ethers.id(n), 12));
}
export async function lookupEnsName(address: string): Promise<string | null> {
  await net();
  return cachedEnsName(address);
}
export function cachedEnsName(address: string): string | null {
  if (knobs.ens && address.toLowerCase() === ME.toLowerCase()) return "burner-demo.eth";
  const hit = Object.entries(KNOWN).find(([, a]) => a.toLowerCase() === address.toLowerCase() && a !== ME);
  return hit ? hit[0] : null;
}
