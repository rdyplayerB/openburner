import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ConnectionMode = 'bridge' | 'gateway';

// Helper function to get default connection mode based on environment
const getDefaultConnectionMode = (): ConnectionMode => {
  // Check if we're in a hosted environment
  const isHosted = process.env.NEXT_PUBLIC_APP_MODE === 'hosted';
  return isHosted ? 'gateway' : 'bridge';
};

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
  setWallet: (address: string, publicKey: string, keySlot?: number) => void;
  setChain: (chainId: number, rpcUrl: string, chainName: string) => void;
  setBalance: (balance: string) => void;
  setConnectionMode: (mode: ConnectionMode) => void;
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
      connectionMode: getDefaultConnectionMode(),
      setWallet: (address, publicKey, keySlot) => {
        console.log("🔐 [Wallet Store] setWallet called:");
        console.log(`  Address: ${address}`);
        console.log(`  Public Key: ${publicKey}`);
        console.log(`  Key Slot: ${keySlot || 1}`);
        set({ address, publicKey, keySlot: keySlot || 1, isConnected: true });
        console.log("✅ [Wallet Store] Wallet state updated and persisted to localStorage");
      },
      setChain: (chainId, rpcUrl, chainName) => {
        console.log(`🌐 [Wallet Store] Switching to chain: ${chainName} (ID: ${chainId})`);
        console.log(`  RPC URL: ${rpcUrl}`);
        set({ chainId, rpcUrl, chainName, balance: "0" });
      },
      setBalance: (balance) => {
        console.log(`💰 [Wallet Store] Setting balance: ${balance}`);
        set({ balance });
      },
      setConnectionMode: (mode) => {
        console.log(`🔄 [Wallet Store] Setting connection mode: ${mode}`);
        set({ connectionMode: mode });
      },
      disconnect: () => {
        console.log("🔌 [Wallet Store] DISCONNECT called");
        console.log("  Current state before disconnect:");
        const currentState = useWalletStore.getState();
        console.log(`    Address: ${currentState.address}`);
        console.log(`    Public Key: ${currentState.publicKey}`);
        console.log(`    Key Slot: ${currentState.keySlot}`);
        console.log(`    Chain: ${currentState.chainName} (${currentState.chainId})`);
        console.log(`    Balance: ${currentState.balance}`);
        
        set({
          address: null,
          publicKey: null,
          keySlot: null,
          isConnected: false,
          balance: "0",
        });
        
        console.log("✅ [Wallet Store] Wallet disconnected and cleared from state");
        console.log("📦 [Wallet Store] localStorage should now contain null values for wallet data");
        
        // Verify localStorage was updated
        setTimeout(() => {
          const stored = localStorage.getItem("openburner-storage");
          console.log("🔍 [Wallet Store] Verifying localStorage after disconnect:");
          console.log(stored);
        }, 100);
      },
    }),
    {
      name: "openburner-storage",
    }
  )
);

