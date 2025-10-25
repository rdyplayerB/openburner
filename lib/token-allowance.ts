/**
 * Token Allowance Management
 * Handles ERC20 token approvals for 0x swap contracts
 */

import { ethers } from 'ethers';
import { rpcRateLimiter } from "./rpc-rate-limiter";
import { checkTokenAllowance, buildApprovalTransaction } from './swap-api';

export interface AllowanceInfo {
  tokenAddress: string;
  symbol: string;
  spender: string;
  currentAllowance: string;
  requiredAmount: string;
  needsApproval: boolean;
  isInfinite: boolean;
}

/**
 * Get comprehensive allowance information for a token
 */
export async function getAllowanceInfo(
  tokenAddress: string,
  symbol: string,
  spender: string,
  requiredAmount: string,
  owner: string,
  provider: ethers.Provider
): Promise<AllowanceInfo> {
  try {
    const allowance = await checkTokenAllowance(tokenAddress, spender, owner, requiredAmount, provider);
    
    const isInfinite = allowance.allowance === ethers.MaxUint256.toString();
    const needsApproval = !isInfinite && allowance.needsApproval;

    return {
      tokenAddress,
      symbol,
      spender,
      currentAllowance: allowance.allowance,
      requiredAmount,
      needsApproval,
      isInfinite,
    };
  } catch (error: any) {
    console.error('❌ [Allowance] Failed to get allowance info:', error);
    throw new Error(`Failed to check allowance for ${symbol}: ${error.message}`);
  }
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
  try {
    // ERC20 ABI for approval
    const erc20Abi = [
      'function approve(address spender, uint256 amount) returns (bool)',
    ];

    const contract = new ethers.Contract(tokenAddress, erc20Abi, provider);
    
    // Approve max uint256 for infinite allowance
    const data = contract.interface.encodeFunctionData('approve', [spender, ethers.MaxUint256]);

    // Get chain ID to determine transaction type with rate limiting
    const network = await rpcRateLimiter.makeRequest(async () => {
      return await provider.getNetwork();
    });
    const isBaseNetwork = network.chainId === 8453n;

    // Estimate gas for the approval transaction with rate limiting
    const gasEstimate = await rpcRateLimiter.makeRequest(async () => {
      return await provider.estimateGas({
        to: tokenAddress,
        data,
        value: 0n,
        from: owner, // Include the from address for proper gas estimation
      });
    });

    // Add 20% buffer to gas estimate
    const gasLimit = (gasEstimate * 120n) / 100n;

    // Get the current nonce for the owner address with rate limiting
    const nonce = await rpcRateLimiter.makeRequest(async () => {
      return await provider.getTransactionCount(owner, 'pending');
    });

    // Get fee data for gas pricing with rate limiting
    const feeData = await rpcRateLimiter.makeRequest(async () => {
      return await provider.getFeeData();
    });

    const transaction: ethers.TransactionRequest = {
      to: tokenAddress,
      data,
      value: 0n,
      nonce,
      chainId: Number(network.chainId),
      type: isBaseNetwork ? 0 : 2, // Use legacy format for Base network
      gasLimit,
      ...(isBaseNetwork
        ? { gasPrice: feeData.gasPrice }
        : {
            maxFeePerGas: feeData.maxFeePerGas,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
          }
      ),
    };

    console.log('🔧 [Infinite Approval] Transaction built:', {
      tokenAddress,
      spender,
      owner,
      amount: 'infinite',
      nonce,
      chainId: Number(network.chainId),
      type: isBaseNetwork ? 0 : 2,
      gasLimit: gasLimit.toString(),
      gasEstimate: gasEstimate.toString(),
      gasPrice: isBaseNetwork ? feeData.gasPrice?.toString() : undefined,
      maxFeePerGas: !isBaseNetwork ? feeData.maxFeePerGas?.toString() : undefined,
      maxPriorityFeePerGas: !isBaseNetwork ? feeData.maxPriorityFeePerGas?.toString() : undefined,
    });

    return transaction;
  } catch (error: any) {
    console.error('❌ [Infinite Approval] Build failed:', error);
    throw new Error(`Failed to build infinite approval transaction: ${error.message}`);
  }
}

/**
 * Build a specific amount approval transaction
 */
export async function buildSpecificApprovalTransaction(
  tokenAddress: string,
  spender: string,
  amount: string,
  provider: ethers.Provider
): Promise<ethers.TransactionRequest> {
  return buildApprovalTransaction(tokenAddress, spender, amount, '', provider);
}

/**
 * Check if user has infinite allowance for a token
 */
export async function hasInfiniteAllowance(
  tokenAddress: string,
  spender: string,
  owner: string,
  provider: ethers.Provider
): Promise<boolean> {
  try {
    const allowance = await checkTokenAllowance(tokenAddress, spender, owner, '0', provider);
    return allowance.allowance === ethers.MaxUint256.toString();
  } catch (error) {
    console.error('❌ [Allowance] Failed to check infinite allowance:', error);
    return false;
  }
}

/**
 * Revoke token allowance (set to 0)
 */
export async function buildRevokeAllowanceTransaction(
  tokenAddress: string,
  spender: string,
  provider: ethers.Provider
): Promise<ethers.TransactionRequest> {
  try {
    // ERC20 ABI for approval
    const erc20Abi = [
      'function approve(address spender, uint256 amount) returns (bool)',
    ];

    const contract = new ethers.Contract(tokenAddress, erc20Abi, provider);
    
    // Approve 0 to revoke allowance
    const data = contract.interface.encodeFunctionData('approve', [spender, 0]);

    const transaction: ethers.TransactionRequest = {
      to: tokenAddress,
      data,
      value: 0n,
    };

    console.log('🔧 [Revoke] Transaction built:', {
      tokenAddress,
      spender,
      amount: '0',
    });

    return transaction;
  } catch (error: any) {
    console.error('❌ [Revoke] Build failed:', error);
    throw new Error(`Failed to build revoke allowance transaction: ${error.message}`);
  }
}

/**
 * Format allowance amount for display
 */
export function formatAllowanceAmount(allowance: string, decimals: number = 18): string {
  try {
    if (allowance === ethers.MaxUint256.toString()) {
      return 'Infinite';
    }
    
    const formatted = ethers.formatUnits(allowance, decimals);
    const num = parseFloat(formatted);
    
    if (num === 0) return '0';
    if (num < 0.0001) return num.toFixed(8);
    if (num < 1) return num.toFixed(6);
    if (num < 1000) return num.toFixed(4);
    return num.toFixed(2);
  } catch (error) {
    console.error('❌ [Allowance] Format failed:', error);
    return 'Unknown';
  }
}

/**
 * Get allowance status for display
 */
export function getAllowanceStatus(allowanceInfo: AllowanceInfo): {
  status: 'none' | 'insufficient' | 'sufficient' | 'infinite';
  message: string;
  action: 'approve' | 'revoke' | 'none';
} {
  if (allowanceInfo.isInfinite) {
    return {
      status: 'infinite',
      message: 'Infinite allowance granted',
      action: 'revoke',
    };
  }

  if (allowanceInfo.needsApproval) {
    return {
      status: 'insufficient',
      message: 'Insufficient allowance',
      action: 'approve',
    };
  }

  if (parseFloat(allowanceInfo.currentAllowance) > 0) {
    return {
      status: 'sufficient',
      message: 'Sufficient allowance',
      action: 'none',
    };
  }

  return {
    status: 'none',
    message: 'No allowance',
    action: 'approve',
  };
}
