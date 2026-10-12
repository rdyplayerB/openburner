/**
 * Story knobs. Every mock in .ladle/mocks reads these at call time, so a story
 * picks the situation (hosted or local, prices on or off, wrong PIN, failed
 * transaction…) by calling setKnobs() before it renders.
 */
export interface Knobs {
  /** local = self-hosted with prices; hosted = openburner.xyz. */
  mode: "local" | "hosted";
  /** Phone browser (hosted mode uses the phone's own NFC). */
  mobile: boolean;
  pricing: boolean;
  balances: "ok" | "loading" | "error" | "empty";
  /** USB bridge status on the welcome screen. */
  bridge: "down" | "ready";
  /** What the card does when asked to sign. */
  card: "ok" | "wrong-pin" | "no-card" | "never";
  /** How a broadcast transaction ends up. */
  tx: "success" | "failed" | "pending";
  /** Selling an ERC-20 needs an allowance first. */
  needsApproval: boolean;
  nfts: boolean;
  walletConnect: boolean;
  /** Show an ENS name for the connected wallet. */
  ens: boolean;
  /** Swap price impact in percent. */
  priceImpact: number;
  /** Phone-gateway link while connected (executor-away shows the reconnect banner). */
  phoneLink: "connected" | "executor-away";
  /** Delay for anything that would hit the network, ms. */
  latency: number;
}

export const DEFAULT_KNOBS: Knobs = {
  mode: "local",
  mobile: false,
  pricing: true,
  balances: "ok",
  bridge: "down",
  card: "ok",
  tx: "success",
  needsApproval: false,
  nfts: true,
  walletConnect: true,
  ens: false,
  priceImpact: 0.08,
  phoneLink: "connected",
  latency: 450,
};

export const knobs: Knobs = { ...DEFAULT_KNOBS };

export function setKnobs(next: Partial<Knobs> = {}) {
  Object.assign(knobs, DEFAULT_KNOBS, next);
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const net = () => sleep(knobs.latency);
/** Never resolves (for loading states). */
export const forever = () => new Promise<never>(() => {});
