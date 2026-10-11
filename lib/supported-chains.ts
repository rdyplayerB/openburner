/**
 * Single source of truth for the networks OpenBurner ships with: display name,
 * default RPC, logo, native currency, block explorer, CoinGecko ids and swap
 * support. Everything that needs "which chain is this?" should read from here.
 */

export interface ChainConfig {
  chainId: number;
  /** Display name used in the network picker and headers. */
  name: string;
  /** Short name used in compact UI ("on Base", "Arbitrum"). */
  shortName: string;
  rpcUrl: string;
  logo: string;
  /** Logo is a square mark (Base) rather than a round coin. */
  square?: boolean;
  nativeSymbol: string;
  nativeName: string;
  explorer: string;
  /** CoinGecko asset platform id (for contract-address price lookups). */
  coingeckoPlatform?: string;
  /** CoinGecko coin id of the native currency. */
  nativeCoingeckoId?: string;
  /**
   * Minimum native balance to keep back when the user hits "Max", on top of the
   * live gas estimate. Covers L1 data fees on rollups and fee spikes.
   */
  minGasReserve: string;
}

export const CHAINS: ChainConfig[] = [
  { chainId: 1, name: "Ethereum", shortName: "Ethereum", rpcUrl: "https://ethereum.publicnode.com", logo: "/images/chains/ethereum.png", nativeSymbol: "ETH", nativeName: "Ethereum", explorer: "https://etherscan.io", coingeckoPlatform: "ethereum", nativeCoingeckoId: "ethereum", minGasReserve: "0.0005" },
  { chainId: 8453, name: "Base", shortName: "Base", rpcUrl: "https://mainnet.base.org", logo: "/images/chains/base.svg", square: true, nativeSymbol: "ETH", nativeName: "Ethereum", explorer: "https://basescan.org", coingeckoPlatform: "base", nativeCoingeckoId: "ethereum", minGasReserve: "0.00002" },
  { chainId: 56, name: "BNB Chain", shortName: "BNB Chain", rpcUrl: "https://bsc-dataseed1.binance.org", logo: "/images/chains/binance.png", nativeSymbol: "BNB", nativeName: "BNB", explorer: "https://bscscan.com", coingeckoPlatform: "binance-smart-chain", nativeCoingeckoId: "binancecoin", minGasReserve: "0.0003" },
  { chainId: 42161, name: "Arbitrum One", shortName: "Arbitrum", rpcUrl: "https://arb1.arbitrum.io/rpc", logo: "/images/chains/arbitrum.png", nativeSymbol: "ETH", nativeName: "Ethereum", explorer: "https://arbiscan.io", coingeckoPlatform: "arbitrum-one", nativeCoingeckoId: "ethereum", minGasReserve: "0.00003" },
  { chainId: 43114, name: "Avalanche", shortName: "Avalanche", rpcUrl: "https://api.avax.network/ext/bc/C/rpc", logo: "/images/chains/avalanche.png", nativeSymbol: "AVAX", nativeName: "Avalanche", explorer: "https://snowtrace.io", coingeckoPlatform: "avalanche", nativeCoingeckoId: "avalanche-2", minGasReserve: "0.005" },
  { chainId: 81457, name: "Blast", shortName: "Blast", rpcUrl: "https://rpc.blast.io", logo: "/images/chains/blast.png", nativeSymbol: "ETH", nativeName: "Ethereum", explorer: "https://blastscan.io", coingeckoPlatform: "blast", nativeCoingeckoId: "ethereum", minGasReserve: "0.00002" },
  { chainId: 59144, name: "Linea Mainnet", shortName: "Linea", rpcUrl: "https://rpc.linea.build", logo: "/images/chains/linea.png", nativeSymbol: "ETH", nativeName: "Ethereum", explorer: "https://lineascan.build", coingeckoPlatform: "linea", nativeCoingeckoId: "ethereum", minGasReserve: "0.00003" },
  { chainId: 5000, name: "Mantle", shortName: "Mantle", rpcUrl: "https://rpc.mantle.xyz", logo: "/images/chains/mantle.png", nativeSymbol: "MNT", nativeName: "Mantle", explorer: "https://explorer.mantle.xyz", coingeckoPlatform: "mantle", nativeCoingeckoId: "mantle", minGasReserve: "0.5" },
  { chainId: 34443, name: "Mode Mainnet", shortName: "Mode", rpcUrl: "https://mainnet.mode.network", logo: "/images/chains/mode.png", nativeSymbol: "ETH", nativeName: "Ethereum", explorer: "https://explorer.mode.network", coingeckoPlatform: "mode", nativeCoingeckoId: "ethereum", minGasReserve: "0.00002" },
  { chainId: 10, name: "OP Mainnet", shortName: "Optimism", rpcUrl: "https://mainnet.optimism.io", logo: "/images/chains/optimism.png", nativeSymbol: "ETH", nativeName: "Ethereum", explorer: "https://optimistic.etherscan.io", coingeckoPlatform: "optimistic-ethereum", nativeCoingeckoId: "ethereum", minGasReserve: "0.00002" },
  { chainId: 137, name: "Polygon", shortName: "Polygon", rpcUrl: "https://polygon-rpc.com", logo: "/images/chains/polygon.png", nativeSymbol: "POL", nativeName: "Polygon", explorer: "https://polygonscan.com", coingeckoPlatform: "polygon-pos", nativeCoingeckoId: "polygon-ecosystem-token", minGasReserve: "0.05" },
  { chainId: 534352, name: "Scroll", shortName: "Scroll", rpcUrl: "https://rpc.scroll.io", logo: "/images/chains/scroll.png", nativeSymbol: "ETH", nativeName: "Ethereum", explorer: "https://scrollscan.com", coingeckoPlatform: "scroll", nativeCoingeckoId: "ethereum", minGasReserve: "0.00003" },
  { chainId: 130, name: "Unichain", shortName: "Unichain", rpcUrl: "https://mainnet.unichain.org", logo: "/images/chains/unichain.png", nativeSymbol: "ETH", nativeName: "Ethereum", explorer: "https://uniscan.xyz", coingeckoPlatform: "unichain", nativeCoingeckoId: "ethereum", minGasReserve: "0.00002" },
];

const BY_ID = new Map(CHAINS.map((c) => [c.chainId, c]));

export function getChainConfig(chainId: number): ChainConfig | undefined {
  return BY_ID.get(chainId);
}

/** Native currency symbol for a chain (ETH for unknown/custom chains). */
export function getNativeSymbol(chainId: number): string {
  return BY_ID.get(chainId)?.nativeSymbol ?? "ETH";
}

export function getNativeName(chainId: number): string {
  return BY_ID.get(chainId)?.nativeName ?? "Ether";
}

/** Human chain name; falls back to the given name (custom RPC) or "Chain N". */
export function getChainDisplayName(chainId: number, fallback?: string): string {
  return BY_ID.get(chainId)?.name ?? fallback ?? `Chain ${chainId}`;
}

/** Explorer base URL, or null for custom chains we know nothing about. */
export function getExplorerBase(chainId: number): string | null {
  return BY_ID.get(chainId)?.explorer ?? null;
}

export function getExplorerTxUrl(chainId: number, txHash: string): string | null {
  const base = getExplorerBase(chainId);
  return base ? `${base}/tx/${txHash}` : null;
}

export function getExplorerAddressUrl(chainId: number, address: string): string | null {
  const base = getExplorerBase(chainId);
  return base ? `${base}/address/${address}` : null;
}

/**
 * Chains supported by the 0x swap API *and* our /api/swap/quote proxy.
 * (Unichain is supported by 0x but not yet whitelisted by the proxy.)
 */
export const SUPPORTED_SWAP_CHAINS = new Set([
  1, 10, 56, 137, 5000, 8453, 34443, 42161, 43114, 59144, 81457, 534352,
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
  return `Swap is not supported on ${chainName}. Please switch to a supported chain.`;
}

/**
 * Get list of supported chain names for display
 */
export function getSupportedChainNames(): string[] {
  return CHAINS.filter((c) => SUPPORTED_SWAP_CHAINS.has(c.chainId)).map((c) => c.shortName);
}
