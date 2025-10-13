"use client";

import { WalletConnect } from "@/components/wallet-connect";
import { WalletDashboard } from "@/components/wallet-dashboard";
import { useWalletStore } from "@/store/wallet-store";

export default function WalletPage() {
  const { isConnected } = useWalletStore();

  return (
    <main className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-2xl mx-auto pt-8 pb-16">
        {!isConnected ? <WalletConnect /> : <WalletDashboard />}
      </div>
    </main>
  );
}

