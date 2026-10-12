"use client";

import { useRef, useState } from "react";
import { connectWithMobileNFC } from "@/lib/mobile/nfc";
import { useWalletStore } from "@/store/wallet-store";
import { Nfc, Loader2, X, Download } from "lucide-react";
import { MobileErrorModal } from "./mobile-error-modal";
import { usePWA } from "@/hooks/use-pwa";
import { Modal } from "@/components/common/modal";
import { ConnectLayout } from "@/components/connect/connect-layout";

export function HostedMobileConnect() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showInstallCard, setShowInstallCard] = useState(true);
  const setWallet = useWalletStore((s) => s.setWallet);
  const { isInstalled, isInstallable, installApp, shouldEnablePWA } = usePWA();
  // Bumped on cancel so a tap that finishes later is ignored.
  const attemptRef = useRef(0);

  const handleConnect = async () => {
    const attempt = ++attemptRef.current;
    setIsConnecting(true);
    setError(null);
    try {
      const { address, publicKey, keySlot } = await connectWithMobileNFC();
      if (attempt !== attemptRef.current) return;
      setWallet(address, publicKey, keySlot);
    } catch (err: any) {
      if (attempt !== attemptRef.current) return;
      // Dismissing the system NFC sheet isn't an error worth a dialog.
      if (err?.code !== "NFC_CANCELLED") {
        setError(err?.message || "Couldn't read your Burner card.");
      }
    } finally {
      if (attempt === attemptRef.current) setIsConnecting(false);
    }
  };

  const handleCancel = () => {
    attemptRef.current++;
    setIsConnecting(false);
    setError(null);
  };

  const handleInstall = () => {
    // Android offers a real install prompt; iOS needs the Share-menu steps.
    if (isInstallable) installApp();
    else setShowInstructions(true);
  };

  const installSuggestion =
    shouldEnablePWA && !isInstalled && showInstallCard ? (
      <div className="sw-surface rounded-xl border border-[var(--sw-line)] flex items-center">
        <button onClick={handleInstall} className="flex-1 flex items-center gap-3 p-4 text-left rounded-xl">
          <span className="w-10 h-10 sw-mark rounded-lg flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <Download className="w-5 h-5" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-semibold text-sm text-[var(--sw-ink)]">Install OpenBurner</span>
            <span className="block text-xs text-[var(--sw-muted)] mt-0.5">One tap from your home screen</span>
          </span>
        </button>
        <button
          onClick={() => setShowInstallCard(false)}
          className="sw-icon-btn p-2.5 mr-2 flex-shrink-0"
          aria-label="Dismiss install suggestion"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    ) : null;

  return (
    <>
      <ConnectLayout
        subline={
          isConnecting
            ? "Hold your card flat against the top of your phone until it buzzes."
            : "Tap your Burner card to your phone."
        }
        action={
          <>
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="sw-btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                  <span>Waiting for your card…</span>
                </>
              ) : (
                <>
                  <Nfc className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                  <span>Tap your Burner</span>
                </>
              )}
            </button>
            {isConnecting && (
              <button
                onClick={handleCancel}
                className="sw-btn-ghost w-full mt-3 py-3 text-sm flex items-center justify-center gap-2"
              >
                <X className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                <span>Cancel</span>
              </button>
            )}
          </>
        }
        extra={isConnecting ? null : installSuggestion}
      />

      <MobileErrorModal error={error} onClose={() => setError(null)} onRetry={handleConnect} />

      {showInstructions && (
        <Modal onClose={() => setShowInstructions(false)} labelledBy="install-title">
          <div className="px-5 pt-6 pb-5">
            <h2 id="install-title" className="text-xl font-bold tracking-tight text-[var(--sw-ink)]">
              Add to Home Screen
            </h2>
            <p className="text-sm text-[var(--sw-ink-soft)] mt-1.5 leading-relaxed">
              OpenBurner opens full screen, like an app.
            </p>
            <ol className="mt-5 space-y-3">
              {[
                "Tap Share (the square with an arrow) or the ⋯ menu.",
                "Choose “Add to Home Screen” or “Install app”.",
                "Tap Add.",
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-[var(--sw-ink)]">
                  <span className="w-6 h-6 rounded-full bg-[var(--sw-fill-strong)] text-xs font-bold sw-num flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{text}</span>
                </li>
              ))}
            </ol>
            <button onClick={() => setShowInstructions(false)} className="sw-btn-primary w-full py-3.5 mt-6 text-sm">
              Got it
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
