import { create } from "zustand";
import { persist } from "zustand/middleware";

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
      rpcUrl: "https://eth.llamarpc.com",
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
        // Force update RPC URLs to official ones for all networks
        const officialRPCs: Record<number, string> = {
          1: "https://ethereum.publicnode.com",
          8453: "https://mainnet.base.org",
          56: "https://bsc-dataseed1.binance.org",
          42161: "https://arb1.arbitrum.io/rpc",
          43114: "https://api.avax.network/ext/bc/C/rpc",
          81457: "https://rpc.blast.io",
          59144: "https://rpc.linea.build",
          5000: "https://rpc.mantle.xyz",
          34443: "https://mainnet.mode.network",
          10: "https://mainnet.optimism.io",
          137: "https://polygon-rpc.com",
          534352: "https://rpc.scroll.io",
          130: "https://mainnet.unichain.org",
        };

        if (officialRPCs[chainId] && rpcUrl !== officialRPCs[chainId]) {
          const newRpcUrl = officialRPCs[chainId];
          rpcUrl = newRpcUrl;
        }
        
        set({ chainId, rpcUrl, chainName, balance: "0" });
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
      // Initialize and fix RPC URLs to official ones for all networks
      initialize: () => {
        const state = get();

        // Sessions saved before v1.4.0 could lack a key slot (signing silently used
        // slot 1). Ask those users to reconnect instead of guessing.
        if (state.address && !state.keySlot) {
          set({ address: null, publicKey: null, keySlot: null, isConnected: false, balance: "0" });
        }
        const officialRPCs: Record<number, string> = {
          1: "https://ethereum.publicnode.com",
          8453: "https://mainnet.base.org",
          56: "https://bsc-dataseed1.binance.org",
          42161: "https://arb1.arbitrum.io/rpc",
          43114: "https://api.avax.network/ext/bc/C/rpc",
          81457: "https://rpc.blast.io",
          59144: "https://rpc.linea.build",
          5000: "https://rpc.mantle.xyz",
          34443: "https://mainnet.mode.network",
          10: "https://mainnet.optimism.io",
          137: "https://polygon-rpc.com",
          534352: "https://rpc.scroll.io",
          130: "https://mainnet.unichain.org",
        };

        if (officialRPCs[state.chainId] && state.rpcUrl !== officialRPCs[state.chainId]) {
          const newRpcUrl = officialRPCs[state.chainId];
          set({ rpcUrl: newRpcUrl });
        }
      },
    }),
    {
      name: "openburner-storage",
    }
  )
);

