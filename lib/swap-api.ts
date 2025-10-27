/**
 * 0x Standard Swap API Integration
 * Handles quote fetching, transaction building, and swap execution
 * 
 * Note: This uses 0x's standard swap API (not gasless API)
 * - Users must pay their own gas fees
 * - Uses /swap/allowance-holder/price and /swap/allowance-holder/quote endpoints
 * - Requires native tokens (ETH, BNB, POL, etc.) for gas fees
 */

import { ethers } from 'ethers';
import { rpcRateLimiter } from "./rpc-rate-limiter";

// 0x Standard Swap API Configuration
const ZEROX_API_BASE_URL = 'https://api.0x.org';
const ZEROX_API_KEY = process.env.NEXT_PUBLIC_0X_API_KEY;

// Default slippage tolerance (0.5%)
const DEFAULT_SLIPPAGE_PERCENTAGE = 0.5;

// Affiliate fee configuration
const AFFILIATE_FEE_RECIPIENT = '0x084A66020a0CAc73a7161dD473740C82295683Fb';
const AFFILIATE_FEE_BPS = 88; // 0.875% in basis points (88/10000 = 0.88%)

// Supported chains by 0x Standard Swap API
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

// Special address used by 0x Standard Swap API to represent native tokens (ETH, BNB, POL, etc.)
const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

export interface SwapQuote {
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  buyAmount: string;
  allowanceTarget: string;
  blockNumber: string;
  minBuyAmount: string;
  liquidityAvailable: boolean;
  price?: string;
  priceImpact?: string;
  sellTokenAddress?: string;
  buyTokenAddress?: string;
  to?: string;
  toAddress?: string;
  data?: string;
  callData?: string;
  issues?: {
    allowance?: {
      actual: string;
      spender: string;
    };
    balance?: {
      token: string;
      actual: string;
      expected: string;
    };
    simulationIncomplete?: boolean;
    invalidSourcesPassed?: string[];
  };
  transaction: {
    to: string;
    data: string;
    gas: string;
    gasPrice: string;
    value: string;
  };
  route?: {
    fills: Array<{
      from: string;
      to: string;
      source: string;
      proportionBps: string;
    }>;
    tokens: Array<{
      address: string;
      symbol: string;
    }>;
  };
  fees?: {
    integratorFee: any;
    zeroExFee?: {
      amount: string;
      token: string;
      type: string;
    };
    gasFee: any;
  };
  tokenMetadata?: {
    buyToken: {
      buyTaxBps: string;
      sellTaxBps: string;
    };
    sellToken: {
      buyTaxBps: string;
      sellTaxBps: string;
    };
  };
  totalNetworkFee?: string;
  zid?: string;
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
 * Convert native token address to the special address used by 0x Standard Swap API
 */
function convertNativeToZeroXFormat(tokenAddress: string): string {
  if (tokenAddress === 'native') {
    return NATIVE_TOKEN_ADDRESS;
  }
  return tokenAddress;
}

/**
 * Get the API URL for the given chain
 * Uses our Next.js API route to proxy 0x Standard Swap API requests and avoid CORS issues
 */
function getApiUrl(chainId: number): string {
  const chainName = SUPPORTED_CHAINS[chainId as keyof typeof SUPPORTED_CHAINS];
  if (!chainName) {
    throw new Error(`Chain ${chainId} is not supported by 0x API`);
  }
  // Use our Next.js API route instead of direct 0x API call
  return '/api/swap/quote';
}

/**
 * Get headers for 0x Standard Swap API requests
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
 * Check price and liquidity availability from 0x Standard Swap API
 */
export async function getSwapPrice(params: SwapQuoteParams): Promise<any> {
  const { sellToken, buyToken, sellAmount, buyAmount, takerAddress, chainId } = params;

  // Validate required parameters
  if (!sellAmount && !buyAmount) {
    throw new Error('Either sellAmount or buyAmount must be provided');
  }

  if (!SUPPORTED_CHAINS[chainId as keyof typeof SUPPORTED_CHAINS]) {
    throw new Error(`Chain ${chainId} is not supported by 0x API`);
  }

  // Convert native tokens to the special address used by 0x API
  const convertedSellToken = convertNativeToZeroXFormat(sellToken);
  const convertedBuyToken = convertNativeToZeroXFormat(buyToken);

  // Build query parameters
  const queryParams = new URLSearchParams({
    sellToken: convertedSellToken,
    buyToken: convertedBuyToken,
    taker: takerAddress,
    chainId: chainId.toString(),
    // Affiliate fee parameters
    swapFeeRecipient: AFFILIATE_FEE_RECIPIENT,
    swapFeeBps: AFFILIATE_FEE_BPS.toString(),
    swapFeeToken: convertedSellToken, // Receive fees in sell token
  });

  if (sellAmount) {
    queryParams.set('sellAmount', sellAmount);
  } else if (buyAmount) {
    queryParams.set('buyAmount', buyAmount);
  }

  const url = `${getApiUrl(chainId)}?${queryParams.toString()}&endpoint=price`;

  try {
    console.log('🔄 [Swap API] Fetching swap price via proxy:', { 
      originalSellToken: sellToken, 
      originalBuyToken: buyToken,
      convertedSellToken, 
      convertedBuyToken, 
      sellAmount, 
      buyAmount, 
      chainId 
    });
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [Swap API] Price request failed:', response.status, errorText);
      
      if (response.status === 400) {
        throw new Error('Invalid swap parameters. Please check token addresses and amounts.');
      } else if (response.status === 404) {
        throw new Error('No liquidity available for this token pair.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`Failed to fetch price: ${response.status}`);
      }
    }

    const price = await response.json();
    console.log('✅ [Swap API] Price received:', {
      liquidityAvailable: price.liquidityAvailable,
      buyAmount: price.buyAmount,
      issues: price.issues,
    });

    return price;
  } catch (error: any) {
    console.error('❌ [Swap API] Price fetch error:', error);
    throw new Error(error.message || 'Failed to fetch swap price');
  }
}

/**
 * Fetch a swap quote from 0x Standard Swap API
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

  // Convert native tokens to the special address used by 0x API
  const convertedSellToken = convertNativeToZeroXFormat(sellToken);
  const convertedBuyToken = convertNativeToZeroXFormat(buyToken);

  // Build query parameters
  const queryParams = new URLSearchParams({
    sellToken: convertedSellToken,
    buyToken: convertedBuyToken,
    taker: takerAddress,
    chainId: chainId.toString(),
    slippagePercentage: (slippagePercentage || DEFAULT_SLIPPAGE_PERCENTAGE).toString(),
    // Affiliate fee parameters
    swapFeeRecipient: AFFILIATE_FEE_RECIPIENT,
    swapFeeBps: AFFILIATE_FEE_BPS.toString(),
    swapFeeToken: convertedSellToken, // Receive fees in sell token
  });

  if (sellAmount) {
    queryParams.set('sellAmount', sellAmount);
  } else if (buyAmount) {
    queryParams.set('buyAmount', buyAmount);
  }

  const url = `${getApiUrl(chainId)}?${queryParams.toString()}`;

  try {
    console.log('🔄 [Swap API] Fetching swap quote via proxy:', { 
      originalSellToken: sellToken, 
      originalBuyToken: buyToken,
      convertedSellToken, 
      convertedBuyToken, 
      sellAmount, 
      buyAmount, 
      chainId 
    });
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [Swap API] Quote request failed:', response.status, errorText);
      
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
    console.log('✅ [Swap API] Quote received:', {
      sellAmount: quote.sellAmount,
      buyAmount: quote.buyAmount,
      price: quote.price,
      priceImpact: quote.priceImpact,
    });
    console.log('✅ [Swap API] Full quote structure:', Object.keys(quote));

    return quote;
  } catch (error: any) {
    console.error('❌ [Swap API] Quote fetch error:', error);
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
      gasLimit,
      gasPrice: feeData.gasPrice, // Use gasPrice for all networks (simpler)
    };

    console.log('🔧 [Approval] Transaction built:', {
      tokenAddress,
      spender,
      amount: amountWei.toString(),
      nonce,
      gasLimit: gasLimit.toString(),
      gasEstimate: gasEstimate.toString(),
      gasPrice: feeData.gasPrice?.toString(),
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
export async function buildSwapTransaction(quote: SwapQuote, from: string, provider: ethers.Provider, chainId?: number): Promise<ethers.TransactionRequest> {
  try {
    // Check if we're on Base network (which doesn't support EIP-1559 properly)
    const isBaseNetwork = chainId === 8453;
    
    // Get gas limit from quote and add 10% buffer for safety
    const baseGasLimit = ethers.getBigInt(quote.transaction.gas);
    const gasLimit = (baseGasLimit * 110n) / 100n; // Add 10% buffer
    
    // Get the current nonce for the from address with rate limiting
    const nonce = await rpcRateLimiter.makeRequest(async () => {
      return await provider.getTransactionCount(from, 'pending');
    });
    
    // Get fee data for gas pricing with rate limiting
    const feeData = await rpcRateLimiter.makeRequest(async () => {
      return await provider.getFeeData();
    });
    
    const transaction: ethers.TransactionRequest = {
      to: quote.transaction.to,
      data: quote.transaction.data,
      value: quote.transaction.value ? ethers.getBigInt(quote.transaction.value) : undefined,
      from,
      nonce,
      gasLimit,
      chainId,
      type: isBaseNetwork ? 0 : 2, // Use legacy format for Base network
      ...(isBaseNetwork
        ? { gasPrice: feeData.gasPrice }
        : {
            maxFeePerGas: feeData.maxFeePerGas,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
          }
      ),
    };

    console.log('🔧 [Swap] Transaction built:', {
      to: quote.transaction.to,
      value: quote.transaction.value,
      baseGasLimit: quote.transaction.gas,
      gasLimit: gasLimit.toString(),
      nonce,
      chainId,
      type: isBaseNetwork ? 0 : 2,
      gasPrice: isBaseNetwork ? feeData.gasPrice?.toString() : undefined,
      maxFeePerGas: !isBaseNetwork ? feeData.maxFeePerGas?.toString() : undefined,
      maxPriorityFeePerGas: !isBaseNetwork ? feeData.maxPriorityFeePerGas?.toString() : undefined,
    });

    return transaction;
  } catch (error: any) {
    console.error('❌ [Swap] Build failed:', error);
    throw new Error(`Failed to build swap transaction: ${error.message}`);
  }
}

/**
 * Submit a swap transaction to the blockchain
 */
export async function submitSwapTransaction(
  quote: SwapQuote, 
  signer: ethers.Signer
): Promise<ethers.TransactionResponse> {
  try {
    console.log('🚀 [Swap] Submitting transaction...');
    
    const transaction = {
      to: quote.transaction.to,
      data: quote.transaction.data,
      value: quote.transaction.value ? BigInt(quote.transaction.value) : undefined,
    };

    console.log('🔧 [Swap] Transaction details:', {
      to: transaction.to,
      value: transaction.value,
      dataLength: transaction.data.length,
    });

    const txResponse = await signer.sendTransaction(transaction);
    
    console.log('✅ [Swap] Transaction submitted:', {
      hash: txResponse.hash,
      to: txResponse.to,
      value: txResponse.value?.toString(),
    });

    return txResponse;
  } catch (error: any) {
    console.error('❌ [Swap] Transaction submission failed:', error);
    throw new Error(`Failed to submit swap transaction: ${error.message}`);
  }
}

/**
 * Validate a swap quote
 */
export function validateSwapQuote(quote: SwapQuote, expectedSellAmount?: string, expectedBuyAmount?: string): boolean {
  try {
    // Log the full quote for debugging
    console.log('🔍 [Quote] Validating quote:', quote);
    console.log('🔍 [Quote] Available fields:', Object.keys(quote));
    
    // Check required fields - be more flexible with field names
    const hasSellToken = quote.sellToken || quote.sellTokenAddress;
    const hasBuyToken = quote.buyToken || quote.buyTokenAddress;
    const hasTo = quote.to || quote.toAddress;
    const hasData = quote.data || quote.callData;
    
    // Check liquidity availability first
    if (quote.liquidityAvailable === false) {
      console.warn('⚠️ [Quote] Insufficient liquidity available');
      return false;
    }
    
    // Check if we have the basic structure
    if (!quote.sellAmount || !quote.buyAmount) {
      console.warn('⚠️ [Quote] Missing amount fields:', {
        sellAmount: !!quote.sellAmount,
        buyAmount: !!quote.buyAmount,
        availableFields: Object.keys(quote),
      });
      return false;
    }
    
    // Check if we have transaction data (using the actual API structure)
    if (!quote.transaction || !quote.transaction.to || !quote.transaction.data) {
      console.warn('⚠️ [Quote] Missing transaction data:', {
        transaction: !!quote.transaction,
        to: !!quote.transaction?.to,
        data: !!quote.transaction?.data,
        availableFields: Object.keys(quote),
      });
      return false;
    }

    // Check for reasonable values
    if (quote.sellAmount === '0' || quote.buyAmount === '0') {
      console.warn('⚠️ [Quote] Zero amounts detected:', {
        sellAmount: quote.sellAmount,
        buyAmount: quote.buyAmount,
      });
      return false;
    }

    // Check for valid numeric amounts
    const sellAmountNum = BigInt(quote.sellAmount);
    const buyAmountNum = BigInt(quote.buyAmount);
    
    if (sellAmountNum <= 0n || buyAmountNum <= 0n) {
      console.warn('⚠️ [Quote] Invalid amounts:', {
        sellAmount: quote.sellAmount,
        buyAmount: quote.buyAmount,
      });
      return false;
    }

    // Log successful validation for debugging
    console.log('✅ [Quote] Validation passed:', {
      sellAmount: quote.sellAmount,
      buyAmount: quote.buyAmount,
      price: quote.price,
    });

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
export function formatPriceImpact(priceImpact: string | number | undefined): string {
  if (!priceImpact || priceImpact === 'undefined' || priceImpact === 'null') {
    return '0.00%';
  }
  
  const impact = typeof priceImpact === 'string' ? parseFloat(priceImpact) : priceImpact;
  
  if (isNaN(impact)) {
    return '0.00%';
  }
  
  return `${impact.toFixed(2)}%`;
}

/**
 * Format exchange rate for display
 */
export function formatExchangeRate(quote: SwapQuote, fromTokenSymbol?: string, toTokenSymbol?: string, fromTokenDecimals?: number, toTokenDecimals?: number): string {
  // Convert amounts using correct decimals
  const sellAmount = parseFloat(ethers.formatUnits(quote.sellAmount, fromTokenDecimals || 18));
  const buyAmount = parseFloat(ethers.formatUnits(quote.buyAmount, toTokenDecimals || 18));
  const rate = buyAmount / sellAmount;
  
  // Use provided symbols or fallback to contract addresses
  const sellSymbol = fromTokenSymbol || 'Token';
  const buySymbol = toTokenSymbol || 'Token';
  
  return `1 ${sellSymbol} = ${rate.toFixed(6)} ${buySymbol}`;
}
