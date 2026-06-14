"use client";

import { WalletConnect } from "@/components/local/wallet-connect";
import { HostedMobileConnect } from "@/components/hosted/mobile/mobile-connect";
import { HostedDesktopConnect } from "@/components/hosted/desktop/hosted-desktop-connect";
import { WalletDashboard } from "@/components/shared/wallet-dashboard";
import { useWalletStore } from "@/store/wallet-store";
import { useEnvironment } from "@/hooks/use-environment";
import { usePWA } from "@/hooks/use-pwa";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { isConnected } = useWalletStore();
  const config = useEnvironment();
  const { isHosted, isMobile, isClient } = config;
  
  // Register service worker for caching (works in all modes)
  usePWA();

  // Show loading state until hydration is complete
  if (!isClient) {
    return (
      <main className="sw-screen min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--sw-muted)]">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--sw-accent)]" />
          <span className="text-sm">Loading…</span>
        </div>
      </main>
    );
  }

  return (
    <main className="sw-screen min-h-screen">
      {!isConnected ? (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            {isHosted && isMobile ? (
              <HostedMobileConnect />
            ) : isHosted && !isMobile ? (
              <HostedDesktopConnect />
            ) : (
              <WalletConnect />
            )}
          </div>
        </div>
      ) : (
        <div className="p-4">
          <div className="max-w-2xl mx-auto pt-4 pb-8">
            <WalletDashboard />
          </div>
        </div>
      )}
    </main>
  );
}
