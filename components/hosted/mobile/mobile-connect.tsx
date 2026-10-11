"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { connectWithMobileNFC } from "@/lib/mobile/nfc";
import { useWalletStore } from "@/store/wallet-store";
import { Nfc, Loader2, X, ExternalLink, Download } from "lucide-react";
import { MobileErrorModal } from "./mobile-error-modal";
import { usePWA } from "@/hooks/use-pwa";
import { Modal } from "@/components/common/modal";

export function HostedMobileConnect() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showInstallCard, setShowInstallCard] = useState(true);
  const setWallet = useWalletStore((s) => s.setWallet);
  const { isInstalled, shouldEnablePWA } = usePWA();

  // No auto-show install message - only show when user taps card

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const { address, publicKey, keySlot } = await connectWithMobileNFC();
      setWallet(address, publicKey, keySlot);
    } catch (err: any) {
      setError(err.message || "Failed to connect with your Burner card");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleInstallCardClick = () => {
    setShowInstructions(true);
  };

  const handleCloseInstallCard = () => {
    setShowInstallCard(false);
  };

  const handleCancel = () => {
    setIsConnecting(false);
    setError(null);
  };

  return (
    <div className="flex flex-col" style={{ minHeight: '100dvh' }}>
      {/* Main content - perfectly centered */}
      <div className="flex-1 flex items-center justify-center p-4 relative">
        <div className="max-w-sm w-full space-y-4">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Image
              src="/images/openburnerlogo.svg"
              alt="OpenBurner logo"
              width={36}
              height={36}
              className="w-9 h-9 -mt-1"
            />
            <h1 className="text-3xl font-bold text-[var(--sw-ink)] tracking-tight leading-none">
              Open<span className="sw-accent">Burner</span>
            </h1>
          </div>
          <p className="text-[var(--sw-ink-soft)] text-base leading-relaxed">
            Tap your Burner card to your device
          </p>
        </div>

        {/* Connect Button */}
        <div className="sw-surface rounded-xl border border-[var(--sw-line)] overflow-hidden">
          <div className="p-6">
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="sw-btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" strokeWidth={2.5} />
                  <span>Reading card…</span>
                </>
              ) : (
                <>
                  <Nfc className="h-5 w-5" strokeWidth={2.5} />
                  <span>Tap your Burner</span>
                </>
              )}
            </button>

            {/* Cancel Button - only show when connecting */}
            {isConnecting && (
              <button
                onClick={handleCancel}
                className="sw-btn-ghost w-full mt-3 py-3 text-sm flex items-center justify-center gap-2"
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </div>

        {/* Error Modal */}
        <MobileErrorModal
          error={error}
          onClose={() => setError(null)}
          onRetry={handleConnect}
        />

        {/* Website Link */}
        <div className="text-center mt-6">
          <Link
            href="https://openburner.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[var(--sw-muted)] hover:text-[var(--sw-accent)] text-sm transition-colors duration-200"
          >
            <span>Visit openburner.xyz</span>
            <ExternalLink className="w-3 h-3" strokeWidth={2} />
          </Link>
        </div>

        </div>
      </div>

      {/* Install Card - positioned at bottom, outside main content area */}
      {shouldEnablePWA && !isInstalled && showInstallCard && (
        <div className="w-full px-4 pb-6" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <div className="max-w-sm w-full mx-auto">
            <div className="sw-surface rounded-xl border border-[var(--sw-line)] transition-all duration-200 flex items-center">
              <button
                onClick={handleInstallCardClick}
                className="flex-1 flex items-center gap-3 p-4 text-left active:scale-[0.98] transition-transform rounded-xl"
              >
                <div className="w-10 h-10 sw-mark rounded-lg flex items-center justify-center flex-shrink-0" aria-hidden="true">
                  <Download className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block font-semibold text-[var(--sw-ink)] text-sm">Install OpenBurner</span>
                  <span className="block text-[var(--sw-muted)] text-xs mt-0.5">Add to home screen for quick access</span>
                </div>
              </button>
              <button
                onClick={handleCloseInstallCard}
                className="flex-shrink-0 mr-3 text-[var(--sw-muted)] hover:text-[var(--sw-ink)] rounded-full p-2 transition-colors"
                aria-label="Dismiss install suggestion"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Instructions Popup */}
      {showInstructions && (
        <Modal
          onClose={() => setShowInstructions(false)}
          labelledBy="install-title"
          className="sw-surface rounded-xl border border-[var(--sw-line)] overflow-hidden p-6 max-w-sm w-full"
        >
            <div className="text-center">
              <h2 id="install-title" className="sw-uplabel mb-4">Add to home screen</h2>

              <p className="text-sm text-[var(--sw-ink-soft)] mb-6 leading-relaxed">
                Install OpenBurner for quick access from your home screen.
              </p>

              <div className="text-left mb-6 space-y-2">
                <p className="sw-uplabel mb-1">How to install</p>
                <p className="text-sm text-[var(--sw-ink-soft)]">
                  1. Tap the Share button (square with arrow up) or menu (three dots)
                </p>
                <p className="text-sm text-[var(--sw-ink-soft)]">
                  2. Find &apos;Add to Home Screen&apos; or &apos;Install App&apos;
                </p>
                <p className="text-sm text-[var(--sw-ink-soft)]">
                  3. Follow the prompts to add OpenBurner
                </p>
              </div>

              <button
                onClick={() => setShowInstructions(false)}
                className="sw-btn-primary w-full py-3 text-sm"
              >
                Got it
              </button>
            </div>
        </Modal>
      )}
      
    </div>
  );
}
