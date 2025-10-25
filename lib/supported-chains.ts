/**
 * Chains supported by 0x API for swapping
 * Based on 0x API documentation: https://0x.org/docs/category/swap-api
 */

export const SUPPORTED_SWAP_CHAINS = new Set([
  // Ethereum
  1,
  
  // Optimism
  10,
  
  // BSC (Binance Smart Chain)
  56,
  
  // Polygon
  137,
  
  // Fantom
  250,
  
  // Worldchain
  480,
  
  // Mantle
  5000,
  
  // Base
  8453,
  
  // Mode
  34443,
  
  // Arbitrum
  42161,
  
  // Avalanche
  43114,
  
  // Celo
  42220,
  
  // Linea
  59144,
  
  // Blast
  81457,
  
  // Scroll
  534352,
  
  // Unichain
  130,
  
  // Berachain
  80094,
  
  // Ink
  57073,
  
  // Monad
  10143,
]);

/**
 * Check if a chain ID is supported for swapping
 */
export function isSwapSupported(chainId: number): boolean {
  return SUPPORTED_SWAP_CHAINS.has(chainId);
}

/**
 * Get a user-friendly message for unsupported chains
 */
export function getUnsupportedChainMessage(chainId: number, chainName: string): string {
  return `Swap not supported on ${chainName}. Please switch to a supported chain.`;
}

/**
 * Get list of supported chain names for display
 */
export function getSupportedChainNames(): string[] {
  return [
    'Ethereum',
    'Optimism', 
    'BSC',
    'Polygon',
    'Fantom',
    'Worldchain',
    'Mantle',
    'Base',
    'Mode',
    'Arbitrum',
    'Avalanche',
    'Celo',
    'Linea',
    'Blast',
    'Scroll',
    'Unichain',
    'Berachain',
    'Ink',
    'Monad'
  ];
}
