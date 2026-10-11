import { ethers } from "ethers";
import { getChainConfig } from "./supported-chains";

/**
 * Truncate a decimal string to a token's precision so it is safe to pass to
 * ethers.parseUnits (which throws a NUMERIC_FAULT "underflow" otherwise).
 */
export function truncateToDecimals(amount: string, decimals: number): string {
  const trimmed = amount.trim();
  const [whole, fraction] = trimmed.split(".");
  if (fraction === undefined) return trimmed;
  if (decimals === 0) return whole || "0";
  return `${whole || "0"}.${fraction.slice(0, decimals)}`;
}

/** Parse a user-entered amount to base units, or null if it isn't a valid number. */
export function parseAmount(amount: string, decimals: number): bigint | null {
  const value = amount.trim();
  if (value === "" || value === "." || !/^\d*\.?\d*$/.test(value)) return null;
  try {
    return ethers.parseUnits(truncateToDecimals(value, decimals), decimals);
  } catch {
    return null;
  }
}

/** Format base units for an input field without a trailing ".0". */
export function formatAmountForInput(value: bigint, decimals: number): string {
  const s = ethers.formatUnits(value, decimals);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

/**
 * Native-currency amount to keep back when the user hits "Max": the larger of
 * (estimated fee x 1.5) and a per-chain floor that covers rollup L1 data fees.
 */
export async function getNativeGasReserve(
  provider: ethers.Provider,
  chainId: number,
  gasLimit: bigint
): Promise<bigint> {
  const floor = ethers.parseEther(getChainConfig(chainId)?.minGasReserve ?? "0.001");
  try {
    const fee = await provider.getFeeData();
    const price = fee.maxFeePerGas ?? fee.gasPrice ?? 0n;
    const estimate = (gasLimit * price * 3n) / 2n;
    return estimate > floor ? estimate : floor;
  } catch {
    return floor * 2n;
  }
}
