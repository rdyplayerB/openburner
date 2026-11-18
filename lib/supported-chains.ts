/**
 * Single source of truth for the preset networks: display name, public RPCs,
 * logo, native currency, block explorer, CoinGecko ids and swap support.
 * Everything that needs "which chain is this?" should read from here. Any other
 * EVM network can be added in the app with its own RPC URL.
 */

export interface ChainConfig {
  chainId: number;
  /** Display name used in the network picker and headers. */
  name: string;
  /** Short name used in compact UI ("on Base", "Arbitrum"). */
  shortName: string;
  /** Primary public RPC (rpcUrls[0]). */
  rpcUrl: string;
  /**
   * Public RPCs in order: the primary, then a backup from a different operator.
   * The network's official RPC is primary when it held up under load, otherwise
   * it's the backup (tested for CORS, batching and load, Nov 2026). The app moves
   * to the backup when the primary stops answering.
   */
  rpcUrls: string[];
  logo: string;
  /** Logo is a square mark (Base, OP Mainnet) rather than a round coin. */
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
  { chainId: 1, name: "Ethereum", shortName: "Ethereum", rpcUrl: "https://ethereum-rpc.publicnode.com", rpcUrls: ["https://ethereum-rpc.publicnode.com", "https://eth.blockrazor.xyz"], logo: "/images/chains/ethereum.png", nativeSymbol: "ETH", nativeName: "Ethereum", explorer: "https://etherscan.io", coingeckoPlatform: "ethereum", nativeCoingeckoId: "ethereum", minGasReserve: "0.0005" },
  { chainId: 8453, name: "Base", shortName: "Base", rpcUrl: "https://base-rpc.publicnode.com", rpcUrls: ["https://base-rpc.publicnode.com", "https://mainnet.base.org"], logo: "/images/chains/base.svg", square: true, nativeSymbol: "ETH", nativeName: "Ethereum", explorer: "https://basescan.org", coingeckoPlatform: "base", nativeCoingeckoId: "ethereum", minGasReserve: "0.00002" },
  { chainId: 56, name: "BNB Chain", shortName: "BNB Chain", rpcUrl: "https://bsc-dataseed.bnbchain.org", rpcUrls: ["https://bsc-dataseed.bnbchain.org", "https://bsc-rpc.publicnode.com"], logo: "/images/chains/binance.png", nativeSymbol: "BNB", nativeName: "BNB", explorer: "https://bscscan.com", coingeckoPlatform: "binance-smart-chain", nativeCoingeckoId: "binancecoin", minGasReserve: "0.0003" },
  { chainId: 42161, name: "Arbitrum One", shortName: "Arbitrum", rpcUrl: "https://arbitrum-one-rpc.publicnode.com", rpcUrls: ["https://arbitrum-one-rpc.publicnode.com", "https://arb1.arbitrum.io/rpc"], logo: "/images/chains/arbitrum.png", nativeSymbol: "ETH", nativeName: "Ethereum", explorer: "https://arbiscan.io", coingeckoPlatform: "arbitrum-one", nativeCoingeckoId: "ethereum", minGasReserve: "0.00003" },
  { chainId: 43114, name: "Avalanche", shortName: "Avalanche", rpcUrl: "https://api.avax.network/ext/bc/C/rpc", rpcUrls: ["https://api.avax.network/ext/bc/C/rpc", "https://avalanche-c-chain-rpc.publicnode.com"], logo: "/images/chains/avalanche.png", nativeSymbol: "AVAX", nativeName: "Avalanche", explorer: "https://snowtrace.io", coingeckoPlatform: "avalanche", nativeCoingeckoId: "avalanche-2", minGasReserve: "0.005" },
  { chainId: 59144, name: "Linea Mainnet", shortName: "Linea", rpcUrl: "https://rpc.linea.build", rpcUrls: ["https://rpc.linea.build", "https://linea-rpc.publicnode.com"], logo: "/images/chains/linea.png", nativeSymbol: "ETH", nativeName: "Ethereum", explorer: "https://lineascan.build", coingeckoPlatform: "linea", nativeCoingeckoId: "ethereum", minGasReserve: "0.00003" },
  { chainId: 5000, name: "Mantle", shortName: "Mantle", rpcUrl: "https://mantle-rpc.publicnode.com", rpcUrls: ["https://mantle-rpc.publicnode.com", "https://rpc.mantle.xyz"], logo: "/images/chains/mantle.png", nativeSymbol: "MNT", nativeName: "Mantle", explorer: "https://explorer.mantle.xyz", coingeckoPlatform: "mantle", nativeCoingeckoId: "mantle", minGasReserve: "0.5" },
  { chainId: 34443, name: "Mode Mainnet", shortName: "Mode", rpcUrl: "https://mainnet.mode.network", rpcUrls: ["https://mainnet.mode.network", "https://mode-mainnet.rpc.sentio.xyz"], logo: "/images/chains/mode.png", nativeSymbol: "ETH", nativeName: "Ethereum", explorer: "https://explorer.mode.network", coingeckoPlatform: "mode", nativeCoingeckoId: "ethereum", minGasReserve: "0.00002" },
  { chainId: 10, name: "OP Mainnet", shortName: "Optimism", rpcUrl: "https://optimism-rpc.publicnode.com", rpcUrls: ["https://optimism-rpc.publicnode.com", "https://mainnet.optimism.io"], logo: "/images/chains/optimism.svg", square: true, nativeSymbol: "ETH", nativeName: "Ethereum", explorer: "https://optimistic.etherscan.io", coingeckoPlatform: "optimistic-ethereum", nativeCoingeckoId: "ethereum", minGasReserve: "0.00002" },
  { chainId: 137, name: "Polygon", shortName: "Polygon", rpcUrl: "https://polygon-bor-rpc.publicnode.com", rpcUrls: ["https://polygon-bor-rpc.publicnode.com", "https://polygon.drpc.org"], logo: "/images/chains/polygon.png", nativeSymbol: "POL", nativeName: "Polygon", explorer: "https://polygonscan.com", coingeckoPlatform: "polygon-pos", nativeCoingeckoId: "polygon-ecosystem-token", minGasReserve: "0.05" },
  { chainId: 534352, name: "Scroll", shortName: "Scroll", rpcUrl: "https://rpc.scroll.io", rpcUrls: ["https://rpc.scroll.io", "https://scroll-rpc.publicnode.com"], logo: "/images/chains/scroll.png", nativeSymbol: "ETH", nativeName: "Ethereum", explorer: "https://scrollscan.com", coingeckoPlatform: "scroll", nativeCoingeckoId: "ethereum", minGasReserve: "0.00003" },
  { chainId: 130, name: "Unichain", shortName: "Unichain", rpcUrl: "https://mainnet.unichain.org", rpcUrls: ["https://mainnet.unichain.org", "https://unichain-rpc.publicnode.com"], logo: "/images/chains/unichain.png", nativeSymbol: "ETH", nativeName: "Ethereum", explorer: "https://uniscan.xyz", coingeckoPlatform: "unichain", nativeCoingeckoId: "ethereum", minGasReserve: "0.00002" },
  { chainId: 4663, name: "Robinhood Chain", shortName: "Robinhood", rpcUrl: "https://robinhood-rpc.publicnode.com", rpcUrls: ["https://robinhood-rpc.publicnode.com", "https://rpc.mainnet.chain.robinhood.com"], logo: "/images/chains/robinhood.svg", nativeSymbol: "ETH", nativeName: "Ethereum", explorer: "https://robinhoodchain.blockscout.com", coingeckoPlatform: "robinhood", nativeCoingeckoId: "ethereum", minGasReserve: "0.00002" },
];

/** Former presets whose networks have shut down (Blast, October 2026). Saved sessions on them move to Ethereum. */
export const RETIRED_CHAIN_IDS = new Set([81457]);

const BY_ID = new Map(CHAINS.map((c) => [c.chainId, c]));

/** A preset's RPCs, primary first; null for networks added by the user. */
export function getPresetRpcUrls(chainId: number): string[] | null {
  return BY_ID.get(chainId)?.rpcUrls ?? null;
}

export function getChainConfig(chainId: number): ChainConfig | undefined {
  return BY_ID.get(chainId);
}

/** Currency symbols a custom network may use (shown as the native coin). */
export const CURRENCY_SYMBOL_RE = /^[A-Za-z0-9.$-]{1,11}$/;

/** A saved custom network's currency, from the add-network form or an app's request. */
function customCurrency(chainId: number): { symbol?: string; currencyName?: string } {
  if (typeof window === "undefined") return {};
  try {
    const saved = JSON.parse(localStorage.getItem("customRPCs") || "{}")[String(chainId)];
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

/** The symbol a custom network's owner (or the app that added it) gave its coin, if any. */
export function getCustomCurrencySymbol(chainId: number): string | null {
  if (BY_ID.has(chainId)) return null;
  const symbol = customCurrency(chainId).symbol;
  return symbol && CURRENCY_SYMBOL_RE.test(symbol) ? symbol : null;
}

/** Native currency symbol for a chain (a custom network's own symbol, else ETH). */
export function getNativeSymbol(chainId: number): string {
  const custom = customCurrency(chainId).symbol;
  return BY_ID.get(chainId)?.nativeSymbol ?? (custom && CURRENCY_SYMBOL_RE.test(custom) ? custom : "ETH");
}

export function getNativeName(chainId: number): string {
  const custom = customCurrency(chainId);
  return BY_ID.get(chainId)?.nativeName ?? (custom.symbol ? custom.currencyName || custom.symbol : "Ether");
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
  1, 10, 56, 137, 5000, 8453, 34443, 42161, 43114, 59144, 534352,
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
