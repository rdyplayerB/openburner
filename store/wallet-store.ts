import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CHAINS, FORMER_PRESETS, RETIRED_CHAIN_IDS, getChainConfig, getPrimaryRpcUrl } from "@/lib/supported-chains";

export type ConnectionMode = 'bridge' | 'gateway';

interface WalletState {
  address: string | null;
  publicKey: string | null;
  keySlot: number | null;
  chainId: number;
  rpcUrl: string;
  chainName: string;
  isConnected: boolean;
  balance: string;
  connectionMode: ConnectionMode;
  setWallet: (address: string, publicKey: string, keySlot: number) => void;
  setChain: (chainId: number, rpcUrl: string, chainName: string) => void;
  setBalance: (balance: string) => void;
  setConnectionMode: (mode: ConnectionMode) => void;
  disconnect: () => void;
  clearCache: () => void;
  initialize: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      address: null,
      publicKey: null,
      keySlot: null,
      chainId: 1,
      rpcUrl: CHAINS[0].rpcUrl,
      chainName: "Ethereum",
      isConnected: false,
      balance: "0",
      connectionMode: 'bridge' as ConnectionMode,
      setWallet: (address, publicKey, keySlot) => {
        // The slot is required: signing with a guessed slot would use a different key.
        if (!keySlot) throw new Error("Card key slot missing");
        set({ address, publicKey, keySlot, isConnected: true });
      },
      setChain: (chainId, rpcUrl, chainName) => {
        // Built-in networks use your own RPC if you set one, else their tested public RPCs.
        set({ chainId, rpcUrl: getPrimaryRpcUrl(chainId) ?? rpcUrl, chainName, balance: "0" });
      },
      setBalance: (balance) => {
        set({ balance });
      },
      setConnectionMode: (mode) => {
        set({ connectionMode: mode });
      },
      disconnect: () => {
        set({
          address: null,
          publicKey: null,
          keySlot: null,
          isConnected: false,
          balance: "0",
        });
      },
      clearCache: () => {
        localStorage.removeItem("openburner-storage");
        // Force page reload to pick up new settings
        window.location.reload();
      },
      // Fix up saved state on load
      initialize: () => {
        const state = get();

        // Sessions saved before v1.4.0 could lack a key slot (signing silently used
        // slot 1). Ask those users to reconnect instead of guessing.
        if (state.address && !state.keySlot) {
          set({ address: null, publicKey: null, keySlot: null, isConnected: false, balance: "0" });
        }
        // Move saved sessions on a preset network to its current RPC (e.g. after
        // an RPC is retired).
        const primary = getPrimaryRpcUrl(state.chainId);
        if (primary && state.rpcUrl !== primary) {
          set({ rpcUrl: primary });
        }
        // Sessions saved on a former preset that still runs keep it as a custom network.
        const former = FORMER_PRESETS[state.chainId];
        if (former) {
          try {
            const saved = JSON.parse(localStorage.getItem("customRPCs") || "{}");
            if (!saved[String(state.chainId)]) {
              saved[String(state.chainId)] = { name: former.name, rpcUrl: former.rpcUrl };
              localStorage.setItem("customRPCs", JSON.stringify(saved));
            }
            set({ rpcUrl: saved[String(state.chainId)].rpcUrl, chainName: saved[String(state.chainId)].name });
          } catch {
            /* storage unavailable: leave the session as it is */
          }
        }
        // Sessions saved on a network that has since shut down move to Ethereum.
        if (RETIRED_CHAIN_IDS.has(state.chainId)) {
          const ethereum = getChainConfig(1)!;
          set({ chainId: 1, rpcUrl: getPrimaryRpcUrl(1)!, chainName: ethereum.name, balance: "0" });
        }
      },
    }),
    {
      name: "openburner-storage",
    }
  )
);

