"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useWalletStore } from "@/store/wallet-store";
import { Nfc, Loader2, CheckCircle, XCircle, Smartphone, X } from "lucide-react";
import { QRDisplay } from "./qr-display";
import { ModeToggle } from "./mode-toggle";
import { ErrorModal } from "./error-modal";
import { useGatewayPairing } from "@/hooks/use-gateway-pairing";

const BRIDGE_WS_URL = "ws://127.0.0.1:32868/ws";

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

    setIsConnecting(true);
    isConnectingRef.current = true;
    try {
      const { getBurnerAddress } = await import("@/lib/burner");
      const { address, publicKey, keySlot } = await getBurnerAddress();
      setWallet(address, publicKey, keySlot);
    } catch (err: any) {
      // Only report if the user is still on the mode that started this attempt
      if (useWalletStore.getState().connectionMode === mode) {
        setError(err.message || "Failed to connect Burner card");
        setErrorMode(mode);
      }
    } finally {
      setIsConnecting(false);
      isConnectingRef.current = false;
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Mode Toggle */}
      <ModeToggle onModeChange={handleModeChange} />

      <div className="sw-surface rounded-xl border border-[var(--sw-line)] overflow-hidden">
        <div className="text-center px-8 pt-10 pb-8">
          {/* Icon and Header */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Image
                src="/images/openburnerlogo.svg"
                alt="OpenBurner logo"
                width={40}
                height={40}
                className="w-10 h-10 -mt-1"
              />
              <h1 className="text-3xl font-bold text-[var(--sw-ink)] tracking-tight leading-none">
                Open<span className="sw-accent">Burner</span>
              </h1>
            </div>
            <p className="text-[var(--sw-ink-soft)] text-base leading-relaxed max-w-sm mx-auto">
              {connectionMode === 'bridge'
                ? 'Connect your Burner card using a USB NFC reader'
                : 'Use your smartphone as an NFC reader to connect'
              }
            </p>
          </div>

          {/* Connect Button */}
          <div className="space-y-3">
            <button
              onClick={() => handleConnect()}
              disabled={isConnecting || pairing.stage === "starting"}
              className="sw-btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2"
            >
              {isConnecting || pairing.stage === "starting" ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                  <span>
                    {connectionMode === 'bridge' ? 'Reading card…' : 'Starting gateway…'}
                  </span>
                </>
              ) : (
                <>
                  {connectionMode === 'bridge' ? (
                    <Nfc className="h-5 w-5" strokeWidth={2.5} />
                  ) : (
                    <Smartphone className="h-5 w-5" strokeWidth={2.5} />
                  )}
                  <span>
                    {connectionMode === 'bridge' ? 'Connect with NFC reader' : 'Connect with smartphone'}
                  </span>
                </>
              )}
            </button>

            {/* Cancel Button - only show when connecting */}
            {isConnecting && (
              <button
                onClick={handleCancel}
                className="sw-btn-ghost w-full py-3 text-sm flex items-center justify-center gap-2"
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
                <span>Cancel</span>
              </button>
            )}
          </div>

        </div>

        {/* Requirements List */}
        <div className="px-8 py-6 border-t border-[var(--sw-line)]">
          <div className="sw-uplabel mb-4">Connection requirements</div>

          <div className="sw-list">
            {connectionMode === 'bridge' ? (
              <>
                <div className="flex items-center gap-4 py-3">
                  <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                    {bridgeConnected === null ? (
                      <Loader2 className="w-5 h-5 text-[var(--sw-muted)] animate-spin" strokeWidth={2.5} />
                    ) : bridgeConnected ? (
                      <CheckCircle className="w-5 h-5 text-[var(--sw-up)]" strokeWidth={2.5} />
                    ) : (
                      <XCircle className="w-5 h-5 text-[var(--sw-accent)]" strokeWidth={2.5} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-[var(--sw-ink)]">
                      HaLo Bridge software
                    </p>
                    <p className="text-xs text-[var(--sw-muted)] mt-0.5">
                      {bridgeConnected === null ? 'Checking connection…' :
                       bridgeConnected ? 'Connected and ready' :
                       'Not detected — start HaLo Bridge'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 py-3">
                  <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                    {readerConnected === null ? (
                      <Loader2 className="w-5 h-5 text-[var(--sw-muted)] animate-spin" strokeWidth={2.5} />
                    ) : readerConnected ? (
                      <CheckCircle className="w-5 h-5 text-[var(--sw-up)]" strokeWidth={2.5} />
                    ) : (
                      <XCircle className="w-5 h-5 text-[var(--sw-accent)]" strokeWidth={2.5} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-[var(--sw-ink)]">
                      NFC reader & card
                    </p>
                    <p className="text-xs text-[var(--sw-muted)] mt-0.5">
                      {readerConnected === null ? 'Checking for card…' :
                       readerConnected ? 'Card detected and ready' :
                       'Place your Burner card on the reader'}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-4 py-3">
                  <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-[var(--sw-up)]" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-[var(--sw-ink)]">
                      Internet connection
                    </p>
                    <p className="text-xs text-[var(--sw-muted)] mt-0.5">
                      Required for gateway communication
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 py-3">
                  <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-[var(--sw-accent)]" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-[var(--sw-ink)]">
                      Smartphone with NFC
                    </p>
                    <p className="text-xs text-[var(--sw-muted)] mt-0.5">
                      Your phone will act as the NFC reader
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

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
        onClose={() => {
          setError(null);
          setErrorMode(null);
        }}
        onTryAgain={handleTryAgain}
      />
    </div>
  );
}