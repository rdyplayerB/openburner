// Popular tokens for each chain
export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export const TOKEN_LISTS: Record<number, TokenInfo[]> = {
  // Ethereum Mainnet
  1: [
    { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
    { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", name: "Tether USD", decimals: 6 },
    { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "WBTC", name: "Wrapped BTC", decimals: 8 },
  ],
  
  // Base
  8453: [
    { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
    { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0xfe26e72431bd82c285655e897f25104e547c4c07", symbol: "USD2", name: "USD2", decimals: 6 },
  ],
  
  // Arbitrum One
  42161: [
    { address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
    { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", symbol: "USDT", name: "Tether USD", decimals: 6 },
    { address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", symbol: "WBTC", name: "Wrapped BTC", decimals: 8 },
  ],
  
  // Optimism
  10: [
    { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
    { address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", symbol: "USDT", name: "Tether USD", decimals: 6 },
    { address: "0x68f180fcCe6836688e9084f035309E29Bf0A2095", symbol: "WBTC", name: "Wrapped BTC", decimals: 8 },
    { address: "0x4200000000000000000000000000000000000042", symbol: "OP", name: "Optimism", decimals: 18 },
  ],
  
  // Polygon
  137: [
    { address: "0x455e53cbb86018ac2b8092fdcd39d8444affc3f6", symbol: "POL", name: "Polygon", decimals: 18 },
    { address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
    { address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", symbol: "USDT", name: "Tether USD", decimals: 6 },
    { address: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", symbol: "WBTC", name: "Wrapped BTC", decimals: 8 },
  ],
  
  // Blast
  81457: [
    { address: "0x4300000000000000000000000000000000000004", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
    { address: "0x4300000000000000000000000000000000000003", symbol: "USDB", name: "USDB", decimals: 18 },
  ],
  
  // Scroll
  534352: [
    { address: "0x5300000000000000000000000000000000000004", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
    { address: "0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df", symbol: "USDT", name: "Tether USD", decimals: 6 },
  ],
  
  // Linea
  59144: [
    { address: "0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
    { address: "0x176211869cA2b568f2A7D4EE941E073a821EE1ff", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0xA219439258ca9da29E9Cc4cE5596924745e12B93", symbol: "USDT", name: "Tether USD", decimals: 6 },
  ],
  
  // zkSync Era
  324: [
    { address: "0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
    { address: "0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0x493257fD37EDB34451f62EDf8D2a0C418852bA4C", symbol: "USDT", name: "Tether USD", decimals: 6 },
  ],
};

export function getTokenListForChain(chainId: number): TokenInfo[] {
  return TOKEN_LISTS[chainId] || [];
}
