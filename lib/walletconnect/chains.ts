/**
 * Chain registry + WalletConnect namespace helpers.
 *
 * The "serve-set" = built-in supported chains (each with an RPC) plus any custom RPCs the
 * user has saved. We only ever approve WalletConnect sessions for chains in this set, so a
 * signing request can never arrive for a chain we have no RPC for.
 */
import { CHAINS } from "../supported-chains";

export interface ChainInfo {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorer: string;
  currency: string;
}

// Built-in chains come from the shared registry in lib/supported-chains.ts.
export const BUILTIN_CHAINS: Record<number, ChainInfo> = Object.fromEntries(
  CHAINS.map((c) => [
    c.chainId,
    { chainId: c.chainId, name: c.name, rpcUrl: c.rpcUrl, explorer: c.explorer, currency: c.nativeSymbol },
  ])
);

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

/** Signing methods require a PIN + Burner tap; switch/add only need confirmation. */
export function requiresSigning(method: string): boolean {
  return [
    "eth_sendTransaction",
    "eth_signTransaction",
    "personal_sign",
    "eth_sign",
    "eth_signTypedData",
    "eth_signTypedData_v3",
    "eth_signTypedData_v4",
  ].includes(method);
}

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
