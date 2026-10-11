"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useWalletStore } from "@/store/wallet-store";
import { Loader2, CheckCircle, Smartphone, ExternalLink } from "lucide-react";
import { QRDisplay } from "@/components/local/qr-display";
import { useGatewayPairing } from "@/hooks/use-gateway-pairing";

export function HostedDesktopConnect() {
  const setWallet = useWalletStore((s) => s.setWallet);
  const connectionMode = useWalletStore((s) => s.connectionMode);
  const setConnectionMode = useWalletStore((s) => s.setConnectionMode);

  const pairing = useGatewayPairing(({ address, publicKey, keySlot }) => {
    setWallet(address, publicKey, keySlot);
  });
  const showQR = pairing.stage !== "idle";
  const starting = pairing.stage === "starting";

  // Hosted desktop is gateway-only (the local bridge is blocked by mixed-content rules).
  useEffect(() => {
    if (connectionMode === "bridge") setConnectionMode("gateway");
  }, [connectionMode, setConnectionMode]);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="sw-surface rounded-xl border border-[var(--sw-line)] overflow-hidden">
        <div className="text-center px-8 pt-10 pb-8">
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Image
                src="/images/openburnerlogo.svg"
                alt=""
                width={40}
                height={40}
                className="w-10 h-10 -mt-1"
              />
              <h1 className="text-3xl font-bold text-[var(--sw-ink)] tracking-tight leading-none">
                Open<span className="sw-accent">Burner</span>
              </h1>
            </div>
            <p className="text-[var(--sw-ink-soft)] text-base leading-relaxed max-w-sm mx-auto">
              Use your smartphone as an NFC reader to connect
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => pairing.start()}
              disabled={starting}
              className="sw-btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2"
            >
              {starting ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                  <span>Starting gateway…</span>
                </>
              ) : (
                <>
                  <Smartphone className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                  <span>Connect with smartphone</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Requirements List */}
        <div className="px-8 py-6 border-t border-[var(--sw-line)]">
          <div className="sw-uplabel mb-4">Connection requirements</div>

          <div className="sw-list">
            <div className="flex items-center gap-4 py-3">
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[var(--sw-up)]" strokeWidth={2.5} aria-hidden="true" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm text-[var(--sw-ink)]">Internet connection</p>
                <p className="text-xs text-[var(--sw-muted)] mt-0.5">Required for gateway communication</p>
              </div>
            </div>

            <div className="flex items-center gap-4 py-3">
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-[var(--sw-accent)]" strokeWidth={2.5} aria-hidden="true" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm text-[var(--sw-ink)]">Smartphone with NFC</p>
                <p className="text-xs text-[var(--sw-muted)] mt-0.5">Your phone will act as the NFC reader</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center mt-6">
        <Link
          href="https://openburner.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-[var(--sw-muted)] hover:text-[var(--sw-accent)] text-sm transition-colors duration-200"
        >
          <span>Visit openburner.xyz</span>
          <ExternalLink className="w-3 h-3" strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>

      {/* Gateway pairing with live progress, errors and QR regeneration */}
      {showQR && (
        <QRDisplay
          qrCodeDataURL={pairing.qr?.qrCodeDataURL ?? null}
          execURL={pairing.qr?.execURL ?? null}
          stage={pairing.stage}
          error={pairing.error}
          onClose={pairing.cancel}
          onRetry={pairing.retry}
          onRegenerate={pairing.regenerate}
        />
      )}
    </div>
  );
}
