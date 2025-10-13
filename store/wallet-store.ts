import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WalletState {
  address: string | null;
  publicKey: string | null;
  keySlot: number | null;
  chainId: number;
  rpcUrl: string;
  chainName: string;
  isConnected: boolean;
  balance: string;
  setWallet: (address: string, publicKey: string, keySlot?: number) => void;
  setChain: (chainId: number, rpcUrl: string, chainName: string) => void;
  setBalance: (balance: string) => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      address: null,
      publicKey: null,
      keySlot: null,
      chainId: 1,
      rpcUrl: "https://eth.llamarpc.com",
      chainName: "Ethereum",
      isConnected: false,
      balance: "0",
      setWallet: (address, publicKey, keySlot) =>
        set({ address, publicKey, keySlot: keySlot || 1, isConnected: true }),
      setChain: (chainId, rpcUrl, chainName) => {
        console.log(`Switching to chain: ${chainName} (ID: ${chainId})`);
        set({ chainId, rpcUrl, chainName, balance: "0" });
      },
      setBalance: (balance) => set({ balance }),
      disconnect: () =>
        set({
          address: null,
          publicKey: null,
          keySlot: null,
          isConnected: false,
          balance: "0",
        }),
    }),
    {
      name: "openburner-storage",
    }
  )
);

