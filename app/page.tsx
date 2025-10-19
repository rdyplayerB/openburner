"use client";

import { WalletConnect } from "@/components/local/wallet-connect";
import { HostedMobileConnect } from "@/components/hosted/mobile/mobile-connect";
import { HostedDesktopConnect } from "@/components/hosted/desktop/hosted-desktop-connect";
import { WalletDashboard } from "@/components/shared/wallet-dashboard";
import { PWAInstallPrompt } from "@/components/common/pwa-install-prompt";
import { OfflineIndicator, OnlineIndicator } from "@/components/common/offline-indicator";
import { useWalletStore } from "@/store/wallet-store";
import { useEnvironment } from "@/hooks/use-environment";

export default function Home() {
  const { isConnected } = useWalletStore();
  const { isHosted, isMobile } = useEnvironment();

  return (
    <main className="min-h-screen p-4 transition-colors duration-700 bg-connected bg-bg-base dark:bg-slate-900">
      <div className="max-w-2xl mx-auto pt-6 pb-12 relative z-10">
        {!isConnected ? (
          // Environment-aware rendering
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
      
      {/* PWA Components - only for mobile hosted mode */}
      <PWAInstallPrompt />
      <OfflineIndicator />
      <OnlineIndicator />
    </main>
  );
}
