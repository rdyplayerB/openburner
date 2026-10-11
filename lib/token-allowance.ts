/**
 * Token Allowance Management
 * Handles ERC20 token approvals for 0x swap contracts.
 *
 * All amounts here are base units (wei-style integer strings), exactly as the
 * 0x quote returns them (`quote.sellAmount`).
 */

import { ethers } from "ethers";
import { rpcRateLimiter } from "./rpc-rate-limiter";

export interface AllowanceInfo {
  tokenAddress: string;
  symbol: string;
  spender: string;
  currentAllowance: string;
  requiredAmount: string;
  needsApproval: boolean;
  isInfinite: boolean;
}

const erc20 = new ethers.Interface([
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);

/**
 * Read the current allowance and compare it with the required amount (base units).
 */
export async function getAllowanceInfo(
  tokenAddress: string,
  symbol: string,
  spender: string,
  requiredAmount: string,
  owner: string,
  provider: ethers.Provider
): Promise<AllowanceInfo> {
  const raw = await rpcRateLimiter.makeRequest(() =>
    provider.call({ to: tokenAddress, data: erc20.encodeFunctionData("allowance", [owner, spender]) })
  );
  const allowance = erc20.decodeFunctionResult("allowance", raw)[0] as bigint;
  const required = BigInt(requiredAmount);
  const isInfinite = allowance === ethers.MaxUint256;
  return {
    tokenAddress,
    symbol,
    spender,
    currentAllowance: allowance.toString(),
    requiredAmount,
    needsApproval: !isInfinite && allowance < required,
    isInfinite,
  };
}

async function buildApprove(
  tokenAddress: string,
  spender: string,
  amount: bigint,
  owner: string,
  provider: ethers.Provider
): Promise<ethers.TransactionRequest> {
  const data = erc20.encodeFunctionData("approve", [spender, amount]);
  const [network, gasEstimate, nonce, feeData] = await Promise.all([
    provider.getNetwork(),
    rpcRateLimiter.makeRequest(() => provider.estimateGas({ to: tokenAddress, data, value: 0n, from: owner })),
    rpcRateLimiter.makeRequest(() => provider.getTransactionCount(owner, "pending")),
    rpcRateLimiter.makeRequest(() => provider.getFeeData()),
  ]);
  const isBaseNetwork = network.chainId === 8453n;
  return {
    to: tokenAddress,
    data,
    value: 0n,
    nonce,
    chainId: Number(network.chainId),
    type: isBaseNetwork ? 0 : 2, // Base: legacy pricing
    gasLimit: (gasEstimate * 120n) / 100n,
    ...(isBaseNetwork
      ? { gasPrice: feeData.gasPrice }
      : { maxFeePerGas: feeData.maxFeePerGas, maxPriorityFeePerGas: feeData.maxPriorityFeePerGas }),
  };
}

/**
 * Build an infinite approval transaction (approve max uint256)
 */
export async function buildInfiniteApprovalTransaction(
  tokenAddress: string,
  spender: string,
  owner: string,
  provider: ethers.Provider
): Promise<ethers.TransactionRequest> {
  return buildApprove(tokenAddress, spender, ethers.MaxUint256, owner, provider);
}

/**
 * Build an approval for exactly `amount` base units.
 */
export async function buildSpecificApprovalTransaction(
  tokenAddress: string,
  spender: string,
  amount: string,
  owner: string,
  provider: ethers.Provider
): Promise<ethers.TransactionRequest> {
  return buildApprove(tokenAddress, spender, BigInt(amount), owner, provider);
}

/**
 * Revoke token allowance (set to 0)
 */
export async function buildRevokeAllowanceTransaction(
  tokenAddress: string,
  spender: string,
  owner: string,
  provider: ethers.Provider
): Promise<ethers.TransactionRequest> {
  return buildApprove(tokenAddress, spender, 0n, owner, provider);
}

/**
 * Format allowance amount for display
 */
export function formatAllowanceAmount(allowance: string, decimals: number = 18): string {
  try {
    if (allowance === ethers.MaxUint256.toString()) return "Infinite";
    const num = parseFloat(ethers.formatUnits(allowance, decimals));
    if (num === 0) return "0";
    if (num < 0.0001) return num.toFixed(8);
    if (num < 1) return num.toFixed(6);
    if (num < 1000) return num.toFixed(4);
    return num.toFixed(2);
  } catch {
    return "Unknown";
  }
}
