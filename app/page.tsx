"use client";

import { WalletConnect } from "@/components/local/wallet-connect";
import { HostedMobileConnect } from "@/components/hosted/mobile/mobile-connect";
import { HostedDesktopConnect } from "@/components/hosted/desktop/hosted-desktop-connect";
import { WalletDashboard } from "@/components/shared/wallet-dashboard";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { useWalletStore } from "@/store/wallet-store";
import { useEnvironment } from "@/hooks/use-environment";

export default function Home() {
  const { isConnected } = useWalletStore();
  const { isHosted, isMobile } = useEnvironment();

  return (
    <main className="min-h-screen p-4 transition-colors duration-700 bg-connected bg-bg-base dark:bg-slate-900">
      {/* Theme Toggle - Fixed Position */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="max-w-2xl mx-auto pt-8 pb-16 relative z-10">
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
    </main>
  );
}
