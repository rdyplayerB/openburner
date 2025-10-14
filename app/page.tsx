"use client";

import { WalletConnect } from "@/components/wallet-connect";
import { WalletDashboard } from "@/components/wallet-dashboard";
import { ThemeToggle } from "@/components/theme-toggle";
import { useWalletStore } from "@/store/wallet-store";

export default function Home() {
  const { isConnected } = useWalletStore();

  return (
    <main className={`min-h-screen p-4 transition-colors duration-700 ${isConnected ? 'bg-connected bg-bg-base dark:bg-slate-900' : 'bg-bg-base dark:bg-slate-900'}`}>
      {/* Theme Toggle - Fixed Position */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="max-w-2xl mx-auto pt-8 pb-16 relative z-10">
        {!isConnected ? <WalletConnect /> : <WalletDashboard />}
      </div>
    </main>
  );
}
