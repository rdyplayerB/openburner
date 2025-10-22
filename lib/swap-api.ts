/**
 * 0x Swap API Integration
 * Handles quote fetching, transaction building, and swap execution
 */

import { ethers } from 'ethers';

// 0x API Configuration
const ZEROX_API_BASE_URL = 'https://api.0x.org';
const ZEROX_API_KEY = process.env.NEXT_PUBLIC_0X_API_KEY;

// Default slippage tolerance (0.5%)
const DEFAULT_SLIPPAGE_PERCENTAGE = 0.5;

// Supported chains by 0x API
export const SUPPORTED_CHAINS = {
  1: 'ethereum',      // Ethereum Mainnet
  8453: 'base',       // Base
  42161: 'arbitrum',  // Arbitrum One
  10: 'optimism',     // Optimism
  137: 'polygon',     // Polygon
  56: 'bsc',          // BNB Chain
  43114: 'avalanche', // Avalanche
  81457: 'blast',     // Blast
  59144: 'linea',     // Linea
  5000: 'mantle',     // Mantle
  34443: 'mode',      // Mode
  534352: 'scroll',   // Scroll
  324: 'zksync',      // zkSync Era
};

export interface SwapQuote {
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  buyAmount: string;
  allowanceTarget: string;
  price: string;
  guaranteedPrice: string;
  estimatedGas: string;
  gasPrice: string;
  minimumProtocolFee: string;
  protocolFee: string;
  value: string;
  to: string;
  data: string;
  from: string;
  chainId: number;
  slippagePercentage: number;
  priceImpact: string;
  estimatedGasTokenRefund: string;
  buyTokenToEthRate: string;
  sellTokenToEthRate: string;
  sources: Array<{
    name: string;
    proportion: string;
  }>;
  orders: Array<{
    makerToken: string;
    takerToken: string;
    makerAmount: string;
    takerAmount: string;
    fillData: any;
    source: string;
    sourcePathId: string;
    type: number;
  }>;
}

export interface SwapQuoteParams {
  sellToken: string;
  buyToken: string;
  sellAmount?: string;
  buyAmount?: string;
  slippagePercentage?: number;
  takerAddress: string;
  chainId: number;
}

export interface TokenAllowance {
  tokenAddress: string;
  spender: string;
  allowance: string;
  needsApproval: boolean;
}

/**
 * Get the 0x API base URL for the given chain
 */
function getApiUrl(chainId: number): string {
  const chainName = SUPPORTED_CHAINS[chainId as keyof typeof SUPPORTED_CHAINS];
  if (!chainName) {
    throw new Error(`Chain ${chainId} is not supported by 0x API`);
  }
  return `${ZEROX_API_BASE_URL}/swap/v1/quote`;
}

/**
 * Get headers for 0x API requests
 */
function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  if (ZEROX_API_KEY) {
    headers['0x-api-key'] = ZEROX_API_KEY;
  }

  return headers;
}

/**
 * Fetch a swap quote from 0x API
 */
export async function getSwapQuote(params: SwapQuoteParams): Promise<SwapQuote> {
  const { sellToken, buyToken, sellAmount, buyAmount, slippagePercentage, takerAddress, chainId } = params;

  // Validate required parameters
  if (!sellAmount && !buyAmount) {
    throw new Error('Either sellAmount or buyAmount must be provided');
  }

  if (!SUPPORTED_CHAINS[chainId as keyof typeof SUPPORTED_CHAINS]) {
    throw new Error(`Chain ${chainId} is not supported by 0x API`);
  }

  // Build query parameters
  const queryParams = new URLSearchParams({
    sellToken,
    buyToken,
    takerAddress,
    slippagePercentage: (slippagePercentage || DEFAULT_SLIPPAGE_PERCENTAGE).toString(),
  });

  if (sellAmount) {
    queryParams.set('sellAmount', sellAmount);
  } else if (buyAmount) {
    queryParams.set('buyAmount', buyAmount);
  }

  const url = `${getApiUrl(chainId)}?${queryParams.toString()}`;

  try {
    console.log('🔄 [0x API] Fetching swap quote:', { sellToken, buyToken, sellAmount, buyAmount, chainId });
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [0x API] Quote request failed:', response.status, errorText);
      
      if (response.status === 400) {
        throw new Error('Invalid swap parameters. Please check token addresses and amounts.');
      } else if (response.status === 404) {
        throw new Error('No liquidity available for this token pair.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`Failed to fetch quote: ${response.status}`);
      }
    }

    const quote: SwapQuote = await response.json();
    console.log('✅ [0x API] Quote received:', {
      sellAmount: quote.sellAmount,
      buyAmount: quote.buyAmount,
      price: quote.price,
      priceImpact: quote.priceImpact,
    });

    return quote;
  } catch (error: any) {
    console.error('❌ [0x API] Quote fetch error:', error);
    throw new Error(error.message || 'Failed to fetch swap quote');
  }
}

/**
 * Check if a token needs approval for the given spender
 */
export async function checkTokenAllowance(
  tokenAddress: string,
  spender: string,
  owner: string,
  amount: string,
  provider: ethers.Provider
): Promise<TokenAllowance> {
  try {
    // ERC20 ABI for allowance check
    const erc20Abi = [
      'function allowance(address owner, address spender) view returns (uint256)',
      'function decimals() view returns (uint8)',
    ];

    const contract = new ethers.Contract(tokenAddress, erc20Abi, provider);
    
    const [allowance, decimals] = await Promise.all([
      contract.allowance(owner, spender),
      contract.decimals(),
    ]);

    const allowanceWei = ethers.getBigInt(allowance);
    const amountWei = ethers.parseUnits(amount, decimals);
    const needsApproval = allowanceWei < amountWei;

    console.log('🔍 [Allowance] Check result:', {
      tokenAddress,
      spender,
      allowance: allowanceWei.toString(),
      amount: amountWei.toString(),
      needsApproval,
    });

    return {
      tokenAddress,
      spender,
      allowance: allowanceWei.toString(),
      needsApproval,
    };
  } catch (error: any) {
    console.error('❌ [Allowance] Check failed:', error);
    throw new Error(`Failed to check token allowance: ${error.message}`);
  }
}

/**
 * Build an approval transaction for a token
 */
export async function buildApprovalTransaction(
  tokenAddress: string,
  spender: string,
  amount: string,
  owner: string,
  provider: ethers.Provider
): Promise<ethers.TransactionRequest> {
  try {
    // ERC20 ABI for approval
    const erc20Abi = [
      'function approve(address spender, uint256 amount) returns (bool)',
      'function decimals() view returns (uint8)',
    ];

    const contract = new ethers.Contract(tokenAddress, erc20Abi, provider);
    
    const decimals = await contract.decimals();
    const amountWei = ethers.parseUnits(amount, decimals);

    const data = contract.interface.encodeFunctionData('approve', [spender, amountWei]);

    const transaction: ethers.TransactionRequest = {
      to: tokenAddress,
      data,
      value: 0n,
    };

    console.log('🔧 [Approval] Transaction built:', {
      tokenAddress,
      spender,
      amount: amountWei.toString(),
    });

    return transaction;
  } catch (error: any) {
    console.error('❌ [Approval] Build failed:', error);
    throw new Error(`Failed to build approval transaction: ${error.message}`);
  }
}

/**
 * Build a swap transaction from a quote
 */
export function buildSwapTransaction(quote: SwapQuote, from: string): ethers.TransactionRequest {
  try {
    const transaction: ethers.TransactionRequest = {
      to: quote.to,
      data: quote.data,
      value: ethers.getBigInt(quote.value),
      from,
      gasLimit: ethers.getBigInt(quote.estimatedGas),
    };

    console.log('🔧 [Swap] Transaction built:', {
      to: quote.to,
      value: quote.value,
      gasLimit: quote.estimatedGas,
    });

    return transaction;
  } catch (error: any) {
    console.error('❌ [Swap] Build failed:', error);
    throw new Error(`Failed to build swap transaction: ${error.message}`);
  }
}

/**
 * Validate a swap quote
 */
export function validateSwapQuote(quote: SwapQuote, expectedSellAmount?: string, expectedBuyAmount?: string): boolean {
  try {
    // Check required fields
    if (!quote.sellToken || !quote.buyToken || !quote.to || !quote.data) {
      return false;
    }

    // Check amounts if provided
    if (expectedSellAmount && quote.sellAmount !== expectedSellAmount) {
      console.warn('⚠️ [Quote] Sell amount mismatch:', {
        expected: expectedSellAmount,
        actual: quote.sellAmount,
      });
      return false;
    }

    if (expectedBuyAmount && quote.buyAmount !== expectedBuyAmount) {
      console.warn('⚠️ [Quote] Buy amount mismatch:', {
        expected: expectedBuyAmount,
        actual: quote.buyAmount,
      });
      return false;
    }

    // Check for reasonable values
    if (quote.sellAmount === '0' || quote.buyAmount === '0') {
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ [Quote] Validation failed:', error);
    return false;
  }
}

/**
 * Get price impact warning level
 */
export function getPriceImpactWarning(priceImpact: string): 'none' | 'low' | 'medium' | 'high' {
  const impact = parseFloat(priceImpact);
  
  if (impact < 0.1) return 'none';
  if (impact < 1) return 'low';
  if (impact < 3) return 'medium';
  return 'high';
}

/**
 * Format price impact for display
 */
export function formatPriceImpact(priceImpact: string): string {
  const impact = parseFloat(priceImpact);
  return `${impact.toFixed(2)}%`;
}

/**
 * Format exchange rate for display
 */
export function formatExchangeRate(quote: SwapQuote): string {
  const sellAmount = parseFloat(ethers.formatEther(quote.sellAmount));
  const buyAmount = parseFloat(ethers.formatEther(quote.buyAmount));
  const rate = buyAmount / sellAmount;
  
  return `1 ${quote.sellToken} = ${rate.toFixed(6)} ${quote.buyToken}`;
}
