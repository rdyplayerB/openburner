"use client";

import { useEffect, useRef, useState } from "react";
import { X, ScanLine, ClipboardPaste, Loader2, Globe } from "lucide-react";
import { useWalletConnectStore } from "@/store/walletconnect-store";
import { useEnvironment } from "@/hooks/use-environment";

type Tab = "scan" | "paste";

export function WcConnectModal({
  onClose,
  onOpenSettings,
}: {
  onClose: () => void;
  onOpenSettings?: () => void;
}) {
  const { pair, pairing, error, clearError, configured } = useWalletConnectStore();
  const { isMobile } = useEnvironment();
  const [tab, setTab] = useState<Tab>(isMobile ? "scan" : "paste");
  const [uri, setUri] = useState("");
  const [camError, setCamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  // Camera QR scanning (only while the scan tab is active).
  useEffect(() => {
    if (tab !== "scan") return;
    let cancelled = false;

    (async () => {
      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        const reader = new BrowserQRCodeReader();
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result) => {
            if (cancelled || !result) return;
            const text = result.getText();
            if (text.startsWith("wc:")) {
              controls.stop();
              handlePair(text);
            }
          }
        );
        controlsRef.current = controls;
      } catch (err: any) {
        if (!cancelled) setCamError("Camera unavailable. Paste the URI instead.");
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handlePair(value: string) {
    clearError();
    await pair(value);
    if (!useWalletConnectStore.getState().error) onClose();
  }

  if (!configured) {
    return (
      <Shell onClose={onClose}>
        <div className="py-6 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-lg sw-mark flex items-center justify-center">
            <Globe className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-[var(--sw-ink)] mb-1">WalletConnect not configured</p>
          <p className="text-xs text-[var(--sw-muted)] leading-relaxed mb-4">
            Add a WalletConnect project ID to connect to dApps. Get a free one at{" "}
            <a
              href="https://cloud.reown.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--sw-accent)] underline hover:opacity-80"
            >
              cloud.reown.com
            </a>
            .
          </p>
          {onOpenSettings && (
            <button onClick={onOpenSettings} className="sw-btn-primary w-full py-3 text-sm">
              Add it in Settings
            </button>
          )}
        </div>
      </Shell>
    );
  }

  return (
    <Shell onClose={onClose}>
      <div className="flex gap-6 border-b border-[var(--sw-line)] mb-5">
        <button
          onClick={() => setTab("scan")}
          className={`sw-tab text-sm pb-3 flex items-center gap-2 ${tab === "scan" ? "sw-tab-active" : ""}`}
        >
          <ScanLine className="w-4 h-4" /> Scan
        </button>
        <button
          onClick={() => setTab("paste")}
          className={`sw-tab text-sm pb-3 flex items-center gap-2 ${tab === "paste" ? "sw-tab-active" : ""}`}
        >
          <ClipboardPaste className="w-4 h-4" /> Paste URI
        </button>
      </div>

      {tab === "scan" ? (
        <div>
          <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-black border border-[var(--sw-line)]">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <div className="absolute inset-8 border-2 border-white/70 rounded-lg pointer-events-none" />
          </div>
          <p className="text-xs text-[var(--sw-muted)] text-center mt-3">
            {camError || "Point your camera at the WalletConnect QR code."}
          </p>
        </div>
      ) : (
        <div>
          <label className="sw-uplabel">WalletConnect URI</label>
          <textarea
            value={uri}
            onChange={(e) => setUri(e.target.value)}
            placeholder="wc:…"
            rows={3}
            className="sw-input w-full mt-2 p-3 text-sm sw-mono resize-none border border-[var(--sw-line)] rounded-lg"
          />
          <button
            onClick={() => handlePair(uri)}
            disabled={!uri.startsWith("wc:") || pairing}
            className="sw-btn-primary w-full py-3 mt-3 text-sm flex items-center justify-center gap-2"
          >
            {pairing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Connecting…
              </>
            ) : (
              "Connect"
            )}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-[var(--sw-down)] mt-3 text-center">{error}</p>}
    </Shell>
  );
}

function Shell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="modal-overlay bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 z-[10000]"
      onClick={onClose}
    >
      <div
        className="sw-surface w-full max-w-sm rounded-xl border border-[var(--sw-line)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <span className="sw-uplabel">Connect to dApp</span>
          <button onClick={onClose} className="text-[var(--sw-muted)] hover:text-[var(--sw-ink)]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}
