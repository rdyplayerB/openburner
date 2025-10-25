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
  setWallet: (address: string, publicKey: string, keySlot?: number) => void;
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
          1301: "https://sepolia.unichain.org",
        };

        if (officialRPCs[chainId] && rpcUrl !== officialRPCs[chainId]) {
          const newRpcUrl = officialRPCs[chainId];
          console.log(`🔄 [Wallet Store] Updating ${chainId} RPC from ${rpcUrl} to ${newRpcUrl}`);
          rpcUrl = newRpcUrl;
        }
        
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
      clearCache: () => {
        console.log("🗑️ [Wallet Store] Clearing localStorage cache");
        localStorage.removeItem("openburner-storage");
        console.log("✅ [Wallet Store] Cache cleared - page will refresh with new settings");
        // Force page reload to pick up new settings
        window.location.reload();
      },
      // Initialize and fix RPC URLs to official ones for all networks
      initialize: () => {
        const state = get();
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
          1301: "https://sepolia.unichain.org",
        };

        if (officialRPCs[state.chainId] && state.rpcUrl !== officialRPCs[state.chainId]) {
          console.log(`🔄 [Wallet Store] Auto-fixing ${state.chainId} RPC URL on initialization`);
          const newRpcUrl = officialRPCs[state.chainId];
          set({ rpcUrl: newRpcUrl });
          console.log(`✅ [Wallet Store] Updated ${state.chainId} RPC from ${state.rpcUrl} to ${newRpcUrl}`);
        }
      },
    }),
    {
      name: "openburner-storage",
    }
  )
);

