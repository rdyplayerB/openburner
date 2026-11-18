import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CHAINS, RETIRED_CHAIN_IDS, getChainConfig } from "@/lib/supported-chains";

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
        // Preset networks always use their tested public RPCs (lib/supported-chains.ts).
        const preset = getChainConfig(chainId);
        set({ chainId, rpcUrl: preset?.rpcUrl ?? rpcUrl, chainName, balance: "0" });
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
        const preset = getChainConfig(state.chainId);
        if (preset && state.rpcUrl !== preset.rpcUrl) {
          set({ rpcUrl: preset.rpcUrl });
        }
        // Sessions saved on a network that has since shut down move to Ethereum.
        if (RETIRED_CHAIN_IDS.has(state.chainId)) {
          const ethereum = getChainConfig(1)!;
          set({ chainId: 1, rpcUrl: ethereum.rpcUrl, chainName: ethereum.name, balance: "0" });
        }
      },
    }),
    {
      name: "openburner-storage",
    }
  )
);

