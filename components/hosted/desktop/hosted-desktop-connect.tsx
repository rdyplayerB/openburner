"use client";

import { useEffect } from "react";
import { useWalletStore } from "@/store/wallet-store";
import { Loader2, Smartphone } from "lucide-react";
import { QRDisplay } from "@/components/local/qr-display";
import { useGatewayPairing } from "@/hooks/use-gateway-pairing";
import { ConnectLayout } from "@/components/connect/connect-layout";

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
    <>
      <ConnectLayout
        reader="gateway"
        action={
          <>
            <button
              onClick={() => pairing.start()}
              disabled={starting}
              className="sw-btn-primary w-full py-4 text-sm flex items-center justify-center gap-2"
            >
              {starting ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                  <span>Starting…</span>
                </>
              ) : (
                <>
                  <Smartphone className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                  <span>Connect with your phone</span>
                </>
              )}
            </button>
            <p className="text-sm text-[var(--sw-muted)] mt-3 leading-snug">
              Your phone becomes the card reader. You&apos;ll scan a QR code, then tap your card to the phone.
            </p>
          </>
        }
      />

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
    </>
  );
}
