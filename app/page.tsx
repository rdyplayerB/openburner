"use client";

import dynamic from "next/dynamic";
import { useWalletStore } from "@/store/wallet-store";
import { useEnvironment } from "@/hooks/use-environment";
import { usePWA } from "@/hooks/use-pwa";
import { ToastHost } from "@/components/toast";
import { Loader2 } from "lucide-react";

function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex items-center gap-3 text-[var(--sw-muted)]" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--sw-accent)]" aria-hidden="true" />
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  );
}

// Each screen (and its card/NFC/gateway stack) is its own chunk; only the one
// for the current mode/device is downloaded.
const WalletConnect = dynamic(
  () => import("@/components/local/wallet-connect").then((m) => m.WalletConnect),
  { ssr: false, loading: Loading }
);
const HostedMobileConnect = dynamic(
  () => import("@/components/hosted/mobile/mobile-connect").then((m) => m.HostedMobileConnect),
  { ssr: false, loading: Loading }
);
const HostedDesktopConnect = dynamic(
  () => import("@/components/hosted/desktop/hosted-desktop-connect").then((m) => m.HostedDesktopConnect),
  { ssr: false, loading: Loading }
);
const WalletDashboard = dynamic(
  () => import("@/components/shared/wallet-dashboard").then((m) => m.WalletDashboard),
  { ssr: false, loading: Loading }
);

export default function Home() {
  const isConnected = useWalletStore((s) => s.isConnected);
  const { isHosted, isMobile, isClient } = useEnvironment();

  // Register service worker for caching (works in all modes)
  usePWA();

  // Show loading state until hydration is complete
  if (!isClient) {
    return (
      <main className="sw-screen min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--sw-muted)]" role="status">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--sw-accent)]" aria-hidden="true" />
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
        <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="max-w-2xl mx-auto pt-4 pb-8">
            <WalletDashboard />
          </div>
        </div>
      )}
      <ToastHost />
    </main>
  );
}
