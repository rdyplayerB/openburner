import { ethers } from "ethers";
import { knobs, net, forever } from "../scenario";
import { BALANCES } from "../fixtures";

export async function multicall3(): Promise<never[]> {
  return [];
}

export async function batchGetBalances(_provider: unknown, tokenAddresses: string[], _wallet: string, opts: { includeNative?: boolean } = {}) {
  await net();
  if (knobs.balances === "loading") return forever();
  if (knobs.balances === "error") throw Object.assign(new Error("could not detect network"), { code: "NETWORK_ERROR" });
  const empty = knobs.balances === "empty";
  const tokens = new Map<string, bigint>();
  for (const a of tokenAddresses) {
    const t = BALANCES[a.toLowerCase()];
    tokens.set(a.toLowerCase(), t && !empty ? ethers.parseUnits(t.balance, t.decimals) : 0n);
  }
  return {
    native: opts.includeNative ? (empty ? 0n : ethers.parseEther(BALANCES.native.balance)) : undefined,
    tokens,
  };
}

export async function batchGetTokenMetadata(_provider: unknown, tokenAddresses: string[]) {
  await net();
  const out = new Map<string, { symbol: string; name: string; decimals: number; success: boolean }>();
  for (const a of tokenAddresses) {
    const t = BALANCES[a.toLowerCase()];
    if (t) out.set(a.toLowerCase(), { symbol: t.symbol, name: t.name, decimals: t.decimals, success: true });
  }
  return out;
}
