"use client";

import { useEffect } from "react";
import { useWalletStore } from "@/store/wallet-store";
import { Loader2, Smartphone } from "lucide-react";
import { QRDisplay } from "@/components/local/qr-display";
import { useGatewayPairing } from "@/hooks/use-gateway-pairing";
import { ConnectLayout, CheckRow } from "@/components/connect/connect-layout";

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
        subline="Use your phone to read your Burner card."
        checksTitle="How it works"
        checks={
          <>
            <CheckRow state={1} title="Scan a QR code with your phone" detail="Any iPhone or Android phone with NFC." />
            <CheckRow state={2} title="Tap your card to the phone" detail="Hold it flat against the back until it buzzes." />
          </>
        }
        action={
          <button
            onClick={() => pairing.start()}
            disabled={starting}
            className="sw-btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2"
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
