export * from "@/lib/token-allowance";
import { ethers } from "ethers";
import { knobs, net } from "../scenario";

const approved = new Set<string>();
const erc20 = new ethers.Interface(["function approve(address spender, uint256 amount) returns (bool)"]);

export async function getAllowanceInfo(tokenAddress: string, symbol: string, spender: string, required: string) {
  await net();
  const needs = knobs.needsApproval && !approved.has(tokenAddress.toLowerCase());
  return {
    tokenAddress,
    symbol,
    spender,
    currentAllowance: needs ? "0" : ethers.MaxUint256.toString(),
    requiredAmount: required,
    needsApproval: needs,
    isInfinite: !needs,
  };
}

function approval(token: string, spender: string, amount: bigint): ethers.TransactionRequest {
  // Pretend the approval lands once it's been built and signed.
  setTimeout(() => approved.add(token.toLowerCase()), 2500);
  return { to: token, data: erc20.encodeFunctionData("approve", [spender, amount]), value: 0n, gasLimit: 60_000n };
}
export async function buildInfiniteApprovalTransaction(token: string, spender: string) {
  return approval(token, spender, ethers.MaxUint256);
}
export async function buildSpecificApprovalTransaction(token: string, spender: string, amount: string) {
  return approval(token, spender, BigInt(amount));
}
export async function buildRevokeAllowanceTransaction(token: string, spender: string) {
  return approval(token, spender, 0n);
}
