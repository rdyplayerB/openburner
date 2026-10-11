"use client";

import { useState } from "react";
import { Copy, Check, X, Loader2, Nfc, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { Modal } from "@/components/common/modal";
import type { PairingStage } from "@/hooks/use-gateway-pairing";

interface QRDisplayProps {
  qrCodeDataURL: string | null;
  execURL: string | null;
  stage: PairingStage;
  error?: string | null;
  onClose: () => void;
  /** Retry the card read (same session) or re-pair. */
  onRetry?: () => void;
  /** Throw away this QR/session and generate a new one. */
  onRegenerate?: () => void;
}

const STEPS: { key: "scan" | "tap" | "done"; title: string; hint: string }[] = [
  { key: "scan", title: "Scan with your phone", hint: "Point your phone's camera at the code and open the link." },
  { key: "tap", title: "Tap your Burner to the phone", hint: "Keep the HaLo Gateway page open. Hold the card flat until it reads." },
  { key: "done", title: "Your wallet opens here", hint: "Keep the phone nearby. You'll tap again to sign." },
];

function stepState(stage: PairingStage, key: "scan" | "tap" | "done"): "todo" | "active" | "done" {
  const order = { scan: 0, tap: 1, done: 2 } as const;
  const current = stage === "done" ? 2 : stage === "phone-connected" ? 1 : 0;
  if (order[key] < current) return "done";
  if (order[key] === current) return stage === "done" ? "done" : "active";
  return "todo";
}

const STATUS: Partial<Record<PairingStage, string>> = {
  starting: "Starting a secure session…",
  "waiting-phone": "Waiting for your phone…",
  "phone-connected": "Phone connected. Tap your card to it.",
  done: "Card read. Opening your wallet…",
};

export function QRDisplay({ qrCodeDataURL, execURL, stage, error, onClose, onRetry, onRegenerate }: QRDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyURL = async () => {
    if (!execURL) return;
    try {
      await navigator.clipboard.writeText(execURL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the QR still works */
    }
  };

  const dimmed = stage === "phone-connected" || stage === "done" || stage === "error";
  const statusText = STATUS[stage] ?? null;

  return (
    <Modal
      onClose={onClose}
      labelledBy="qr-title"
      closeOnBackdrop={false}
      className="sw-surface rounded-2xl border border-[var(--sw-line)] w-full max-w-sm sm:max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden"
    >
      <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-2">
        <div>
          <h2 id="qr-title" className="text-xl font-bold tracking-tight text-[var(--sw-ink)]">
            Connect with your phone
          </h2>
          <p className="text-sm text-[var(--sw-ink-soft)] mt-1">Your phone reads the card. Your wallet opens on this screen.</p>
        </div>
        <button onClick={onClose} className="sw-icon-btn p-2 -mr-2 -mt-1" aria-label="Cancel and close">
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-6 pt-4 pb-6 sm:grid sm:grid-cols-[auto_1fr] sm:gap-8 sm:items-start">
        {/* QR code */}
        <div className="flex flex-col items-center">
          <div className="relative rounded-2xl bg-white p-4 shadow-[0_0_0_1px_var(--sw-line)]">
            {qrCodeDataURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrCodeDataURL}
                alt="Gateway pairing QR code"
                className={`w-56 h-56 max-w-full transition-opacity duration-300 ${dimmed ? "opacity-10" : ""}`}
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center" aria-hidden="true">
                <Loader2 className="w-7 h-7 animate-spin text-neutral-400" />
              </div>
            )}
            {(stage === "phone-connected" || stage === "done") && (
              <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                {stage === "done" ? (
                  <CheckCircle2 className="w-14 h-14 text-[var(--sw-up)] ob-pop-in" strokeWidth={1.75} />
                ) : (
                  <span className="w-16 h-16 rounded-full bg-[var(--sw-accent)] text-white flex items-center justify-center ob-pop-in">
                    <Nfc className="w-8 h-8 animate-pulse" />
                  </span>
                )}
              </div>
            )}
          </div>

          {stage !== "error" && (
            <div className="flex items-center gap-5 mt-3">
              <button
                onClick={handleCopyURL}
                disabled={!execURL}
                className="sw-link text-sm inline-flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
                {copied ? "Copied" : "Copy link"}
              </button>
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  disabled={stage === "starting" || stage === "done"}
                  className="sw-link text-sm inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                  New code
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 sm:mt-0">
          {/* Live status */}
          <div aria-live="polite" className="mb-5">
            {stage === "error" && error ? (
              <div role="alert">
                <div className="sw-callout sw-callout-danger flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-px flex-shrink-0 text-[var(--sw-down)]" aria-hidden="true" />
                  <span>{error}</span>
                </div>
                <div className="mt-3 flex flex-col gap-1">
                  {onRetry && (
                    <button onClick={onRetry} className="sw-btn-primary w-full py-3.5 text-sm">
                      Try again
                    </button>
                  )}
                  {onRegenerate && (
                    <button
                      onClick={onRegenerate}
                      className="w-full py-3 text-sm font-semibold text-[var(--sw-ink-soft)] hover:text-[var(--sw-ink)] transition-colors"
                    >
                      Start over with a new code
                    </button>
                  )}
                </div>
              </div>
            ) : statusText ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--sw-fill)] px-3 py-1.5 text-xs font-semibold text-[var(--sw-ink)]">
                {stage === "done" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--sw-up)]" aria-hidden="true" />
                ) : (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--sw-accent)]" aria-hidden="true" />
                )}
                {statusText}
              </span>
            ) : null}
          </div>

          {/* Steps */}
          <ol className="space-y-4" aria-label="Steps">
            {STEPS.map((step, i) => {
              const st = stepState(stage, step.key);
              return (
                <li key={step.key} className="flex items-start gap-3" aria-current={st === "active" ? "step" : undefined}>
                  <span
                    className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold sw-num flex items-center justify-center transition-colors ${
                      st === "done"
                        ? "bg-[var(--sw-up)] text-white"
                        : st === "active"
                          ? "bg-[var(--sw-ink)] text-[var(--sw-paper)]"
                          : "bg-[var(--sw-fill-strong)] text-[var(--sw-muted)]"
                    }`}
                  >
                    {st === "done" ? <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden="true" /> : i + 1}
                  </span>
                  <span className="text-sm pt-0.5">
                    <span className={`font-semibold ${st === "todo" ? "text-[var(--sw-muted)]" : "text-[var(--sw-ink)]"}`}>
                      {step.title}
                    </span>
                    <span className="block text-xs text-[var(--sw-muted)] mt-0.5 leading-snug">{step.hint}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </Modal>
  );
}
