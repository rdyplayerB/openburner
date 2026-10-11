"use client";

import { useEffect, useRef, useState } from "react";
import { X, ScanLine, ClipboardPaste, Loader2, Globe, AlertTriangle } from "lucide-react";
import { useWalletConnectStore } from "@/store/walletconnect-store";
import { useEnvironment } from "@/hooks/use-environment";
import { Modal } from "@/components/common/modal";

type Tab = "scan" | "paste";

export function WcConnectModal({
  onClose,
  onOpenSettings,
}: {
  onClose: () => void;
  onOpenSettings?: () => void;
}) {
  const pair = useWalletConnectStore((s) => s.pair);
  const pairing = useWalletConnectStore((s) => s.pairing);
  const error = useWalletConnectStore((s) => s.error);
  const clearError = useWalletConnectStore((s) => s.clearError);
  const configured = useWalletConnectStore((s) => s.configured);
  const init = useWalletConnectStore((s) => s.init);

  // Opening this modal is the signal to load the WalletConnect SDK.
  useEffect(() => {
    if (configured) init();
  }, [configured, init]);
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
      } catch {
        if (!cancelled) setCamError("Camera unavailable on this device.");
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
    await pair(value.trim());
    if (!useWalletConnectStore.getState().error) onClose();
  }

  async function pasteFromClipboard() {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) setUri(text);
    } catch {
      /* clipboard blocked: the person can paste into the box instead */
    }
  }

  const trimmed = uri.trim();
  const validUri = trimmed.startsWith("wc:");

  if (!configured) {
    return (
      <Shell onClose={onClose}>
        <div className="pt-2 pb-1 text-center">
          <span className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[var(--sw-fill-strong)] text-[var(--sw-ink-soft)] flex items-center justify-center">
            <Globe className="w-6 h-6" aria-hidden="true" />
          </span>
          <p className="text-base font-semibold text-[var(--sw-ink)] mb-1">WalletConnect isn&apos;t set up</p>
          <p className="text-sm text-[var(--sw-ink-soft)] leading-relaxed mb-5">
            Add a WalletConnect project ID to connect to dApps. Get a free one at{" "}
            <a href="https://cloud.reown.com" target="_blank" rel="noopener noreferrer" className="sw-link underline">
              cloud.reown.com
            </a>
            .
          </p>
          {onOpenSettings && (
            <button onClick={onOpenSettings} className="sw-btn-primary w-full py-3.5 text-sm">
              Add it in Settings
            </button>
          )}
        </div>
      </Shell>
    );
  }

  return (
    <Shell onClose={onClose}>
      <div className="flex gap-6 border-b border-[var(--sw-line)] mb-5" role="tablist" aria-label="Connection method">
        <button
          role="tab"
          aria-selected={tab === "scan"}
          onClick={() => setTab("scan")}
          className={`sw-tab text-sm pb-3 flex items-center gap-2 ${tab === "scan" ? "sw-tab-active" : ""}`}
        >
          <ScanLine className="w-4 h-4" aria-hidden="true" /> Scan QR
        </button>
        <button
          role="tab"
          aria-selected={tab === "paste"}
          onClick={() => setTab("paste")}
          className={`sw-tab text-sm pb-3 flex items-center gap-2 ${tab === "paste" ? "sw-tab-active" : ""}`}
        >
          <ClipboardPaste className="w-4 h-4" aria-hidden="true" /> Paste link
        </button>
      </div>

      {tab === "scan" ? (
        <div>
          <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            {/* Viewfinder corners */}
            <div className="absolute inset-10 pointer-events-none" aria-hidden="true">
              <span className="absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] border-white rounded-tl-lg" />
              <span className="absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] border-white rounded-tr-lg" />
              <span className="absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] border-white rounded-bl-lg" />
              <span className="absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] border-white rounded-br-lg" />
            </div>
          </div>
          <p className="text-sm text-[var(--sw-ink-soft)] text-center mt-3">
            {camError || "Point your camera at the dApp's WalletConnect QR code."}
          </p>
          {camError && (
            <button onClick={() => setTab("paste")} className="sw-btn-ghost w-full py-3.5 mt-4 text-sm">
              Paste a link instead
            </button>
          )}
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (validUri && !pairing) handlePair(trimmed);
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="wc-uri" className="sw-label">
              WalletConnect link
            </label>
            <button type="button" onClick={pasteFromClipboard} className="sw-link text-xs">
              Paste
            </button>
          </div>
          <div className="sw-field px-3 py-2.5">
            <textarea
              id="wc-uri"
              value={uri}
              onChange={(e) => setUri(e.target.value)}
              placeholder="wc:…"
              rows={3}
              autoComplete="off"
              spellCheck={false}
              className="sw-field-input text-sm sw-mono resize-none block"
            />
          </div>
          <p className="text-xs text-[var(--sw-muted)] mt-2">
            In the dApp, choose WalletConnect and copy the link under the QR code.
          </p>
          <button
            type="submit"
            disabled={!validUri || pairing}
            className="sw-btn-primary w-full py-3.5 mt-4 text-sm flex items-center justify-center gap-2"
          >
            {pairing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Connecting…
              </>
            ) : !trimmed ? (
              "Paste a link"
            ) : !validUri ? (
              "Links start with wc:"
            ) : (
              "Connect"
            )}
          </button>
        </form>
      )}

      {error && (
        <div role="alert" className="sw-callout sw-callout-danger flex items-start gap-2 mt-4">
          <AlertTriangle className="w-4 h-4 mt-px flex-shrink-0 text-[var(--sw-down)]" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <Modal onClose={onClose} labelledBy="wc-connect-title">
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
        <div>
          <h2 id="wc-connect-title" className="text-lg font-bold tracking-tight text-[var(--sw-ink)]">
            Connect to a dApp
          </h2>
          <p className="text-sm text-[var(--sw-ink-soft)] mt-0.5">Use WalletConnect to sign in with your Burner.</p>
        </div>
        <button onClick={onClose} className="sw-icon-btn p-1.5 -mr-1.5 flex-shrink-0" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="px-5 pb-5">{children}</div>
    </Modal>
  );
}
