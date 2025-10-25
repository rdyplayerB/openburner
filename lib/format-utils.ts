/**
 * Utility functions for formatting numbers and amounts
 */

/**
 * Format a token balance using industry best practices
 * - 4 decimal places for most tokens (ETH, BTC, etc.)
 * - 2 decimal places for stablecoins (USDC, USDT)
 * - 6 decimal places for very small amounts (< 0.0001)
 * - 8 decimal places for dust amounts (< 0.00001)
 */
export function formatTokenBalance(balance: string, isStablecoin: boolean = false): string {
  const num = parseFloat(balance);
  if (num === 0) return "0";
  
  // For dust amounts, show maximum precision
  if (num < 0.00001) return num.toFixed(8);
  
  // For very small amounts, show 6 decimal places
  if (num < 0.0001) return num.toFixed(6);
  
  // For stablecoins, show 2 decimal places
  if (isStablecoin) return num.toFixed(2);
  
  // For most tokens, show 4 decimal places
  const formatted = num.toFixed(4);
  return parseFloat(formatted).toString();
}

/**
 * Format a USD price with 2 decimal places
 */
export function formatUSDPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

/**
 * Format a balance for display in swap interface
 * Uses the same formatting as formatTokenBalance for consistency
 */
export function formatSwapBalance(balance: string, isStablecoin: boolean = false): string {
  return formatTokenBalance(balance, isStablecoin);
}
