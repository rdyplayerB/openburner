"use client";

import { WalletConnect } from "@/components/local/wallet-connect";
import { HostedMobileConnect } from "@/components/hosted/mobile/mobile-connect";
import { HostedDesktopConnect } from "@/components/hosted/desktop/hosted-desktop-connect";
import { WalletDashboard } from "@/components/shared/wallet-dashboard";
import { useWalletStore } from "@/store/wallet-store";
import { useEnvironment } from "@/hooks/use-environment";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { isConnected } = useWalletStore();
  const config = useEnvironment();
  const { isHosted, isMobile, isClient } = config;

  // Show loading state until hydration is complete
  if (!isClient) {
    return (
      <main className="min-h-screen p-4 transition-colors duration-700 bg-connected bg-bg-base dark:bg-slate-900">
        <div className="max-w-2xl mx-auto pt-6 pb-12 relative z-10">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading...</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 transition-colors duration-700 bg-connected bg-bg-base dark:bg-slate-900">
      <div className="max-w-2xl mx-auto pt-6 pb-12 relative z-10">
        {!isConnected ? (
          // Environment-aware rendering - only after hydration
          isHosted && isMobile ? (
            <HostedMobileConnect />
          ) : isHosted && !isMobile ? (
            <HostedDesktopConnect />
          ) : (
            <WalletConnect />
          )
        ) : (
          <WalletDashboard />
        )}
      </div>
      
      {/* Removed OfflineIndicator and OnlineIndicator as requested */}
    </main>
  );
}
