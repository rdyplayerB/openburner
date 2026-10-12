"use client";

import { useState, useEffect, useRef } from "react";
import { useWalletStore } from "@/store/wallet-store";
import { Nfc, Loader2, Smartphone, ArrowUpRight, X } from "lucide-react";
import { QRDisplay } from "./qr-display";
import { ModeToggle } from "./mode-toggle";
import { ErrorModal } from "./error-modal";
import { useGatewayPairing } from "@/hooks/use-gateway-pairing";
import { ConnectLayout, CheckRow } from "@/components/connect/connect-layout";

const BRIDGE_WS_URL = "ws://127.0.0.1:32868/ws";
const BRIDGE_DOWNLOAD_URL = "https://github.com/arx-research/libhalo/releases";

export function WalletConnect() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorMode, setErrorMode] = useState<'bridge' | 'gateway' | null>(null);
  const [bridgeConnected, setBridgeConnected] = useState<boolean | null>(null);
  const [readerConnected, setReaderConnected] = useState<boolean | null>(null);
  const setWallet = useWalletStore((s) => s.setWallet);
  const connectionMode = useWalletStore((s) => s.connectionMode);
  const setConnectionMode = useWalletStore((s) => s.setConnectionMode);

  const pairing = useGatewayPairing(({ address, publicKey, keySlot }) => {
    setWallet(address, publicKey, keySlot);
  });
  const showQR = pairing.stage !== "idle";

  // Use ref to track connecting state for interval callback
  const isConnectingRef = useRef(false);
  // Bumped on cancel so a card read that finishes later is ignored.
  const attemptRef = useRef(0);

  // Clear errors when connection mode changes
  useEffect(() => {
    setError(null);
    setErrorMode(null);
  }, [connectionMode]);

  useEffect(() => {
    // Only check bridge status in bridge mode
    if (connectionMode === 'bridge') {
      checkBridgeAndReader();
      // Only check status when NOT connecting to avoid WebSocket conflicts
      const interval = setInterval(() => {
        if (!isConnectingRef.current) {
          checkBridgeAndReader();
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [connectionMode]);

  async function checkBridgeAndReader() {
    let ws: WebSocket | null = null;
    let resolved = false;
    let bridgeOk = false;

    try {
      ws = new WebSocket(BRIDGE_WS_URL);

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          setBridgeConnected(bridgeOk);
          setReaderConnected(false);
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        }
      }, 2000);

      ws.onopen = () => {
        bridgeOk = true;
        setBridgeConnected(true);
        // Don't resolve yet - wait for handle_added event or timeout
      };

      ws.onmessage = (event: MessageEvent) => {
        let msg: any;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }
        if (msg.event === "handle_added" || msg.event === "handle_present") {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            setReaderConnected(true);
            ws?.close();
          }
        }
      };

      ws.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          setBridgeConnected(false);
          setReaderConnected(false);
        }
      };
    } catch {
      if (!resolved) {
        resolved = true;
        setBridgeConnected(false);
        setReaderConnected(false);
      }
    }
  }

  function handleCancel() {
    attemptRef.current++;
    setIsConnecting(false);
    isConnectingRef.current = false;
    setError(null);
    setErrorMode(null);
  }

  function handleTryAgain() {
    if (!errorMode) return;
    const mode = errorMode;
    setError(null);
    setErrorMode(null);
    setConnectionMode(mode);
    // Retry after the mode switch has rendered
    setTimeout(() => {
      handleConnect(mode);
    }, 150);
  }

  function handleModeChange() {
    attemptRef.current++;
    setError(null);
    setErrorMode(null);
    setIsConnecting(false);
    isConnectingRef.current = false;
  }

  async function handleConnect(mode = connectionMode) {
    setError(null);
    if (mode === 'gateway') {
      // Pairing progress and errors are shown in the QR dialog.
      pairing.start();
      return;
    }

    const attempt = ++attemptRef.current;
    setIsConnecting(true);
    isConnectingRef.current = true;
    try {
      const { getBurnerAddress } = await import("@/lib/burner");
      const { address, publicKey, keySlot } = await getBurnerAddress();
      if (attempt !== attemptRef.current) return; // cancelled meanwhile
      setWallet(address, publicKey, keySlot);
    } catch (err: any) {
      // Only report if this attempt is still current and on the same mode
      if (attempt === attemptRef.current && useWalletStore.getState().connectionMode === mode) {
        setError(err.message || "Failed to connect Burner card");
        setErrorMode(mode);
      }
    } finally {
      if (attempt === attemptRef.current) {
        setIsConnecting(false);
        isConnectingRef.current = false;
      }
    }
  }

  const isBridge = connectionMode === "bridge";
  const busy = isConnecting || pairing.stage === "starting";

  const action = (
    <>
      <button
        onClick={() => handleConnect()}
        disabled={busy}
        className="sw-btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2"
      >
        {busy ? (
          <>
            <Loader2 className="animate-spin h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
            <span>{isBridge ? "Reading card…" : "Starting…"}</span>
          </>
        ) : (
          <>
            {isBridge ? (
              <Nfc className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
            ) : (
              <Smartphone className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
            )}
            <span>{isBridge ? "Connect with USB reader" : "Connect with your phone"}</span>
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
  );

  const checks = isBridge ? (
    <>
      <CheckRow
        state={bridgeConnected === null ? "checking" : bridgeConnected ? "ok" : "waiting"}
        title="HaLo Bridge"
        detail={
          bridgeConnected === null ? (
            "Checking…"
          ) : bridgeConnected ? (
            "Running"
          ) : (
            <>
              Not running.{" "}
              <a
                href={BRIDGE_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="sw-link inline-flex items-center gap-0.5"
              >
                Set it up
                <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
              </a>
            </>
          )
        }
      />
      <CheckRow
        state={readerConnected === null ? "checking" : readerConnected ? "ok" : "waiting"}
        title="Reader and card"
        detail={
          readerConnected === null
            ? "Checking…"
            : readerConnected
              ? "Card detected"
              : "Place your Burner card on the reader"
        }
      />
    </>
  ) : (
    <>
      <CheckRow state={1} title="Scan a QR code with your phone" detail="Any iPhone or Android phone with NFC." />
      <CheckRow state={2} title="Tap your card to the phone" detail="Hold it flat against the back until it buzzes." />
    </>
  );

  return (
    <>
      <ConnectLayout
        controls={<ModeToggle onModeChange={handleModeChange} />}
        subline={isBridge ? "Connect your Burner card with a USB NFC reader." : "Use your phone to read your Burner card."}
        action={action}
        checks={checks}
        checksTitle={isBridge ? "Before you connect" : "How it works"}
      />

      {/* QR Code Display (gateway pairing with live progress) */}
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

      {/* Error Modal */}
      <ErrorModal
        error={error}
        mode={errorMode}
        onClose={() => {
          setError(null);
          setErrorMode(null);
        }}
        onTryAgain={handleTryAgain}
      />
    </>
  );
}
