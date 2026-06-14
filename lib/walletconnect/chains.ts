/**
 * Chain registry + WalletConnect namespace helpers.
 *
 * The "serve-set" = built-in supported chains (each with an RPC) plus any custom RPCs the
 * user has saved. We only ever approve WalletConnect sessions for chains in this set, so a
 * signing request can never arrive for a chain we have no RPC for.
 */

export interface ChainInfo {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorer: string;
  currency: string;
}

// Built-in chains (RPCs kept in sync with store/wallet-store.ts).
export const BUILTIN_CHAINS: Record<number, ChainInfo> = {
  1: { chainId: 1, name: "Ethereum", rpcUrl: "https://ethereum.publicnode.com", explorer: "https://etherscan.io", currency: "ETH" },
  10: { chainId: 10, name: "OP Mainnet", rpcUrl: "https://mainnet.optimism.io", explorer: "https://optimistic.etherscan.io", currency: "ETH" },
  56: { chainId: 56, name: "BNB Chain", rpcUrl: "https://bsc-dataseed1.binance.org", explorer: "https://bscscan.com", currency: "BNB" },
  137: { chainId: 137, name: "Polygon", rpcUrl: "https://polygon-rpc.com", explorer: "https://polygonscan.com", currency: "POL" },
  5000: { chainId: 5000, name: "Mantle", rpcUrl: "https://rpc.mantle.xyz", explorer: "https://explorer.mantle.xyz", currency: "MNT" },
  8453: { chainId: 8453, name: "Base", rpcUrl: "https://mainnet.base.org", explorer: "https://basescan.org", currency: "ETH" },
  34443: { chainId: 34443, name: "Mode", rpcUrl: "https://mainnet.mode.network", explorer: "https://explorer.mode.network", currency: "ETH" },
  42161: { chainId: 42161, name: "Arbitrum One", rpcUrl: "https://arb1.arbitrum.io/rpc", explorer: "https://arbiscan.io", currency: "ETH" },
  43114: { chainId: 43114, name: "Avalanche", rpcUrl: "https://api.avax.network/ext/bc/C/rpc", explorer: "https://snowtrace.io", currency: "AVAX" },
  59144: { chainId: 59144, name: "Linea", rpcUrl: "https://rpc.linea.build", explorer: "https://lineascan.build", currency: "ETH" },
  81457: { chainId: 81457, name: "Blast", rpcUrl: "https://rpc.blast.io", explorer: "https://blastscan.io", currency: "ETH" },
  534352: { chainId: 534352, name: "Scroll", rpcUrl: "https://rpc.scroll.io", explorer: "https://scrollscan.com", currency: "ETH" },
};

export const WC_METHODS = [
  "eth_sendTransaction",
  "eth_signTransaction",
  "personal_sign",
  "eth_signTypedData",
  "eth_signTypedData_v3",
  "eth_signTypedData_v4",
  "wallet_switchEthereumChain",
  "wallet_addEthereumChain",
];

export const WC_EVENTS = ["chainChanged", "accountsChanged"];

/** Read user-saved custom RPCs from localStorage ({ chainId: { name, rpcUrl } }). */
export function getCustomRPCs(): Record<string, { name: string; rpcUrl: string }> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("customRPCs") || "{}");
  } catch {
    return {};
  }
}

/** The full serve-set: built-in chains merged with saved custom RPCs. */
export function getServeChains(): ChainInfo[] {
  const out: Record<number, ChainInfo> = { ...BUILTIN_CHAINS };
  const custom = getCustomRPCs();
  for (const [id, info] of Object.entries(custom)) {
    const chainId = parseInt(id, 10);
    if (!Number.isFinite(chainId)) continue;
    if (!out[chainId]) {
      out[chainId] = {
        chainId,
        name: info.name,
        rpcUrl: info.rpcUrl,
        explorer: "",
        currency: "ETH",
      };
    }
  }
  return Object.values(out);
}

/** Resolve the RPC URL for a chain (built-in or custom), or null if we can't serve it. */
export function getRpcForChain(chainId: number): string | null {
  if (BUILTIN_CHAINS[chainId]) return BUILTIN_CHAINS[chainId].rpcUrl;
  const custom = getCustomRPCs();
  return custom[String(chainId)]?.rpcUrl ?? null;
}

export function getChainInfo(chainId: number): ChainInfo | null {
  if (BUILTIN_CHAINS[chainId]) return BUILTIN_CHAINS[chainId];
  const custom = getCustomRPCs();
  const c = custom[String(chainId)];
  return c ? { chainId, name: c.name, rpcUrl: c.rpcUrl, explorer: "", currency: "ETH" } : null;
}

export function getChainName(chainId: number): string {
  return getChainInfo(chainId)?.name ?? `Chain ${chainId}`;
}

/** Build the `supportedNamespaces` object for WalletConnect's buildApprovedNamespaces. */
export function buildSupportedNamespaces(address: string) {
  const serve = getServeChains();
  const chains = serve.map((c) => `eip155:${c.chainId}`);
  const accounts = serve.map((c) => `eip155:${c.chainId}:${address}`);
  return {
    eip155: {
      chains,
      methods: WC_METHODS,
      events: WC_EVENTS,
      accounts,
    },
  };
}

/** Parse the numeric chainId out of a CAIP-2 string like "eip155:1". */
export function parseCaipChainId(caip: string): number {
  const parts = caip.split(":");
  return parseInt(parts[parts.length - 1], 10);
}
