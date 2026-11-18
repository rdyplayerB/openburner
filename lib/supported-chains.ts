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
   * Public RPCs in order: the primary, then a backup from a different operator
   * (tested for CORS, batching, load and freshness, Nov 2026). PublicNode is the
   * primary wherever it held up; the network's own RPC is primary on BNB Chain,
   * Avalanche, Linea, Scroll, Unichain and Monad. Pocket Network is the backup
   * where the official RPC rate-limited under load. The app moves to the backup
   * when the primary stops answering and returns a few minutes later.
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
  { chainId: 1, name: "Ethereum", shortName: "Ethereum", rpcUrl: "https://ethereum-rpc.publicnode.com", rpcUrls: ["https://ethereum-rpc.publicnode.com", "https://eth.api.pocket.network"], logo: "/images/chains/ethereum.png", nativeSymbol: "ETH", nativeName: "Ethereum", explorer: "https://etherscan.io", coingeckoPlatform: "ethereum", nativeCoingeckoId: "ethereum", minGasReserve: "0.0005" },
  { chainId: 8453, name: "Base", shortName: "Base", rpcUrl: "https://base-rpc.publicnode.com", rpcUrls: ["https://base-rpc.publicnode.com", "https://base.api.pocket.network"], logo: "/images/chains/base.svg", square: true, nativeSymbol: "ETH", nativeName: "Ethereum", explorer: "https://basescan.org", coingeckoPlatform: "base", nativeCoingeckoId: "ethereum", minGasReserve: "0.00002" },
  { chainId: 56, name: "BNB Chain", shortName: "BNB Chain", rpcUrl: "https://bsc-dataseed.bnbchain.org", rpcUrls: ["https://bsc-dataseed.bnbchain.org", "https://bsc-rpc.publicnode.com"], logo: "/images/chains/binance.png", nativeSymbol: "BNB", nativeName: "BNB", explorer: "https://bscscan.com", coingeckoPlatform: "binance-smart-chain", nativeCoingeckoId: "binancecoin", minGasReserve: "0.0003" },
  { chainId: 42161, name: "Arbitrum One", shortName: "Arbitrum", rpcUrl: "https://arbitrum-one-rpc.publicnode.com", rpcUrls: ["https://arbitrum-one-rpc.publicnode.com", "https://arb-one.api.pocket.network"], logo: "/images/chains/arbitrum.png", nativeSymbol: "ETH", nativeName: "Ethereum", explorer: "https://arbiscan.io", coingeckoPlatform: "arbitrum-one", nativeCoingeckoId: "ethereum", minGasReserve: "0.00003" },
  { chainId: 43114, name: "Avalanche", shortName: "Avalanche", rpcUrl: "https://api.avax.network/ext/bc/C/rpc", rpcUrls: ["https://api.avax.network/ext/bc/C/rpc", "https://avalanche-c-chain-rpc.publicnode.com"], logo: "/images/chains/avalanche.png", nativeSymbol: "AVAX", nativeName: "Avalanche", explorer: "https://snowtrace.io", coingeckoPlatform: "avalanche", nativeCoingeckoId: "avalanche-2", minGasReserve: "0.005" },
  { chainId: 42220, name: "Celo", shortName: "Celo", rpcUrl: "https://celo-rpc.publicnode.com", rpcUrls: ["https://celo-rpc.publicnode.com", "https://forno.celo.org"], logo: "/images/chains/celo.png", nativeSymbol: "CELO", nativeName: "Celo", explorer: "https://celoscan.io", coingeckoPlatform: "celo", nativeCoingeckoId: "celo", minGasReserve: "0.01" },
  { chainId: 25, name: "Cronos", shortName: "Cronos", rpcUrl: "https://cronos-evm-rpc.publicnode.com", rpcUrls: ["https://cronos-evm-rpc.publicnode.com", "https://evm.cronos.org"], logo: "/images/chains/cronos.png", nativeSymbol: "CRO", nativeName: "Cronos", explorer: "https://explorer.cronos.org", coingeckoPlatform: "cronos", nativeCoingeckoId: "crypto-com-chain", minGasReserve: "0.1" },
  { chainId: 100, name: "Gnosis", shortName: "Gnosis", rpcUrl: "https://gnosis-rpc.publicnode.com", rpcUrls: ["https://gnosis-rpc.publicnode.com", "https://rpc.gnosischain.com"], logo: "/images/chains/gnosis.png", nativeSymbol: "XDAI", nativeName: "xDAI", explorer: "https://gnosisscan.io", coingeckoPlatform: "xdai", nativeCoingeckoId: "xdai", minGasReserve: "0.01" },
  { chainId: 999, name: "HyperEVM", shortName: "HyperEVM", rpcUrl: "https://hyperliquid-rpc.publicnode.com", rpcUrls: ["https://hyperliquid-rpc.publicnode.com", "https://rpc.hyperliquid.xyz/evm"], logo: "/images/chains/hyperevm.png", nativeSymbol: "HYPE", nativeName: "Hyperliquid", explorer: "https://hyperevmscan.io", coingeckoPlatform: "hyperevm", nativeCoingeckoId: "hyperliquid", minGasReserve: "0.001" },
  { chainId: 57073, name: "Ink", shortName: "Ink", rpcUrl: "https://ink-rpc.publicnode.com", rpcUrls: ["https://ink-rpc.publicnode.com", "https://rpc-gel.inkonchain.com"], logo: "/images/chains/ink.png", nativeSymbol: "ETH", nativeName: "Ethereum", explorer: "https://explorer.inkonchain.com", coingeckoPlatform: "ink", nativeCoingeckoId: "ethereum", minGasReserve: "0.00002" },
  { chainId: 59144, name: "Linea Mainnet", shortName: "Linea", rpcUrl: "https://rpc.linea.build", rpcUrls: ["https://rpc.linea.build", "https://linea-rpc.publicnode.com"], logo: "/images/chains/linea.png", nativeSymbol: "ETH", nativeName: "Ethereum", explorer: "https://lineascan.build", coingeckoPlatform: "linea", nativeCoingeckoId: "ethereum", minGasReserve: "0.00003" },
  { chainId: 5000, name: "Mantle", shortName: "Mantle", rpcUrl: "https://mantle-rpc.publicnode.com", rpcUrls: ["https://mantle-rpc.publicnode.com", "https://mantle.api.pocket.network"], logo: "/images/chains/mantle.png", nativeSymbol: "MNT", nativeName: "Mantle", explorer: "https://explorer.mantle.xyz", coingeckoPlatform: "mantle", nativeCoingeckoId: "mantle", minGasReserve: "0.5" },
  { chainId: 143, name: "Monad", shortName: "Monad", rpcUrl: "https://rpc2.monad.xyz", rpcUrls: ["https://rpc2.monad.xyz", "https://monad-mainnet.drpc.org"], logo: "/images/chains/monad.png", nativeSymbol: "MON", nativeName: "Monad", explorer: "https://monadscan.com", coingeckoPlatform: "monad", nativeCoingeckoId: "monad", minGasReserve: "0.1" },
  { chainId: 10, name: "OP Mainnet", shortName: "Optimism", rpcUrl: "https://optimism-rpc.publicnode.com", rpcUrls: ["https://optimism-rpc.publicnode.com", "https://op.api.pocket.network"], logo: "/images/chains/optimism.svg", square: true, nativeSymbol: "ETH", nativeName: "Ethereum", explorer: "https://optimistic.etherscan.io", coingeckoPlatform: "optimistic-ethereum", nativeCoingeckoId: "ethereum", minGasReserve: "0.00002" },
  { chainId: 137, name: "Polygon", shortName: "Polygon", rpcUrl: "https://polygon-bor-rpc.publicnode.com", rpcUrls: ["https://polygon-bor-rpc.publicnode.com", "https://polygon.drpc.org"], logo: "/images/chains/polygon.png", nativeSymbol: "POL", nativeName: "Polygon", explorer: "https://polygonscan.com", coingeckoPlatform: "polygon-pos", nativeCoingeckoId: "polygon-ecosystem-token", minGasReserve: "0.05" },
  { chainId: 4663, name: "Robinhood Chain", shortName: "Robinhood", rpcUrl: "https://robinhood-rpc.publicnode.com", rpcUrls: ["https://robinhood-rpc.publicnode.com", "https://robinhood.api.pocket.network"], logo: "/images/chains/robinhood.svg", nativeSymbol: "ETH", nativeName: "Ethereum", explorer: "https://robinhoodchain.blockscout.com", coingeckoPlatform: "robinhood", nativeCoingeckoId: "ethereum", minGasReserve: "0.00002" },
  { chainId: 534352, name: "Scroll", shortName: "Scroll", rpcUrl: "https://rpc.scroll.io", rpcUrls: ["https://rpc.scroll.io", "https://scroll-rpc.publicnode.com"], logo: "/images/chains/scroll.png", nativeSymbol: "ETH", nativeName: "Ethereum", explorer: "https://scrollscan.com", coingeckoPlatform: "scroll", nativeCoingeckoId: "ethereum", minGasReserve: "0.00003" },
  { chainId: 130, name: "Unichain", shortName: "Unichain", rpcUrl: "https://mainnet.unichain.org", rpcUrls: ["https://mainnet.unichain.org", "https://unichain-rpc.publicnode.com"], logo: "/images/chains/unichain.png", nativeSymbol: "ETH", nativeName: "Ethereum", explorer: "https://uniscan.xyz", coingeckoPlatform: "unichain", nativeCoingeckoId: "ethereum", minGasReserve: "0.00002" },
];

/** Former presets whose networks have shut down (Blast, October 2026). Saved sessions on them move to Ethereum. */
export const RETIRED_CHAIN_IDS = new Set([81457]);

/** Former presets that still run (Mode, removed Nov 2026). Saved sessions on them become a custom network. */
export const FORMER_PRESETS: Record<number, { name: string; rpcUrl: string }> = {
  34443: { name: "Mode", rpcUrl: "https://mainnet.mode.network" },
};

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
  1, 10, 56, 137, 5000, 8453, 42161, 43114, 59144, 534352,
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
