import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useWalletStore } from "./wallet-store";

/**
 * Transactions sent from this browser, newest first. Kept on this device only
 * (localStorage) — OpenBurner has no server that knows your history.
 */

export type ActivityKind = "send" | "swap" | "nft" | "dapp" | "approve";
export type ActivityStatus = "pending" | "success" | "failed";

export interface ActivityItem {
  hash: string;
  chainId: number;
  /** Lower-cased wallet address that sent it. */
  owner: string;
  kind: ActivityKind;
  status: ActivityStatus;
  timestamp: number;
  fromToken?: string;
  fromAmount?: string;
  toToken?: string;
  toAmount?: string;
  recipient?: string;
  /** dApp name (WalletConnect) or NFT name. */
  label?: string;
}

const MAX_ITEMS = 200;

interface ActivityState {
  items: ActivityItem[];
  add: (item: Omit<ActivityItem, "timestamp" | "owner"> & { owner: string; timestamp?: number }) => void;
  update: (hash: string, patch: Partial<ActivityItem>) => void;
  clear: (owner: string) => void;
}

export const useActivityStore = create<ActivityState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) =>
        set((state) => {
          const owner = item.owner.toLowerCase();
          const rest = state.items.filter((i) => i.hash.toLowerCase() !== item.hash.toLowerCase());
          return {
            items: [{ ...item, owner, timestamp: item.timestamp ?? Date.now() }, ...rest].slice(0, MAX_ITEMS),
          };
        }),
      update: (hash, patch) =>
        set((state) => ({
          items: state.items.map((i) => (i.hash.toLowerCase() === hash.toLowerCase() ? { ...i, ...patch } : i)),
        })),
      clear: (owner) =>
        set((state) => ({ items: state.items.filter((i) => i.owner !== owner.toLowerCase()) })),
    }),
    {
      name: "openburner-activity",
      version: 1,
      storage: createJSONStorage(() => localStorage),
    }
  )
);

/** Record a transaction for the connected wallet. Safe to call from anywhere. */
export function recordActivity(item: Omit<ActivityItem, "timestamp" | "owner" | "status"> & { status?: ActivityStatus }) {
  const owner = useWalletStore.getState().address;
  if (!owner) return;
  try {
    useActivityStore.getState().add({ status: "pending", ...item, owner });
  } catch {
    // History is a convenience: a full or blocked storage must never turn a
    // broadcast transaction into an error.
  }
}

/** Update an activity item's status; never throws (see recordActivity). */
export function settleActivity(hash: string, patch: Partial<ActivityItem>) {
  try {
    useActivityStore.getState().update(hash, patch);
  } catch {
    /* storage unavailable */
  }
}
