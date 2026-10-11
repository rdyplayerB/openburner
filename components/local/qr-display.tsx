"use client";

import { useState } from "react";
import { Smartphone, Copy, Check, X, Loader2, Nfc, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";
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
  { key: "scan", title: "Scan with your phone", hint: "Open the camera app and point it at the QR code." },
  { key: "tap", title: "Tap your Burner card", hint: "Hold the card flat against the back of the phone until it reads." },
  { key: "done", title: "Connected", hint: "Your wallet will open here." },
];

function stepState(stage: PairingStage, key: "scan" | "tap" | "done"): "todo" | "active" | "done" {
  const order = { scan: 0, tap: 1, done: 2 } as const;
  const current = stage === "done" ? 2 : stage === "phone-connected" ? 1 : 0;
  if (order[key] < current) return "done";
  if (order[key] === current) return stage === "done" ? "done" : "active";
  return "todo";
}

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

  const statusText =
    stage === "starting"
      ? "Starting a secure gateway session…"
      : stage === "waiting-phone"
        ? "Waiting for your phone…"
        : stage === "phone-connected"
          ? "Phone connected — tap your Burner card to it"
          : stage === "done"
            ? "Card read — connecting…"
            : null;

  return (
    <Modal
      onClose={onClose}
      labelledBy="qr-title"
      closeOnBackdrop={false}
      className="sw-surface rounded-xl border border-[var(--sw-line)] max-w-lg w-full max-h-[90dvh] flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[var(--sw-line)]">
        <div className="flex items-center gap-2.5">
          <Smartphone className="w-5 h-5 text-[var(--sw-accent)]" strokeWidth={2.5} aria-hidden="true" />
          <h2 id="qr-title" className="text-lg font-bold text-[var(--sw-ink)]">
            Connect with your phone
          </h2>
        </div>
        <button onClick={onClose} className="text-[var(--sw-muted)] hover:text-[var(--sw-ink)] transition-colors" aria-label="Cancel and close">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5">
        {/* QR Code */}
        <div className="flex justify-center mb-4">
          <div className="relative inline-block p-5 bg-white rounded-lg border border-[var(--sw-line)]">
            {qrCodeDataURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrCodeDataURL}
                alt="Gateway pairing QR code"
                className={`w-60 h-60 sm:w-64 sm:h-64 max-w-full transition-opacity ${
                  stage === "phone-connected" || stage === "done" || stage === "error" ? "opacity-20" : ""
                }`}
              />
            ) : (
              <div className="w-60 h-60 sm:w-64 sm:h-64 flex items-center justify-center" aria-hidden="true">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--sw-muted)]" />
              </div>
            )}
            {(stage === "phone-connected" || stage === "done") && (
              <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                {stage === "done" ? (
                  <CheckCircle className="w-14 h-14 text-[var(--sw-up)]" />
                ) : (
                  <Nfc className="w-14 h-14 text-[var(--sw-accent)] animate-pulse" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Live status */}
        <div aria-live="polite" className="min-h-[1.5rem] mb-4 text-center">
          {stage === "error" && error ? (
            <div role="alert" className="text-left flex items-start gap-2.5 p-3 rounded-lg border border-[var(--sw-down)]/40 bg-[color-mix(in_srgb,var(--sw-down)_8%,transparent)]">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--sw-down)]" aria-hidden="true" />
              <p className="text-sm text-[var(--sw-ink)]">{error}</p>
            </div>
          ) : statusText ? (
            <p className="text-sm text-[var(--sw-ink-soft)] inline-flex items-center gap-2">
              {stage !== "done" && <Loader2 className="w-4 h-4 animate-spin text-[var(--sw-accent)]" aria-hidden="true" />}
              {statusText}
            </p>
          ) : null}
        </div>

        {/* Actions */}
        {stage === "error" ? (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {onRetry && (
              <button onClick={onRetry} className="sw-btn-primary py-3 text-sm flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                Try again
              </button>
            )}
            {onRegenerate && (
              <button onClick={onRegenerate} className="sw-btn-ghost py-3 text-sm">
                New QR code
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={handleCopyURL}
              disabled={!execURL}
              className="sw-btn-ghost flex items-center justify-center gap-2 py-3 text-sm"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
                  <span>Copy link</span>
                </>
              )}
            </button>
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                disabled={stage === "starting" || stage === "done"}
                className="sw-btn-ghost flex items-center justify-center gap-2 py-3 text-sm"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                <span>New QR</span>
              </button>
            )}
          </div>
        )}

        {/* Progress steps */}
        <ol className="space-y-3">
          {STEPS.map((step, i) => {
            const st = stepState(stage, step.key);
            return (
              <li key={step.key} className="flex items-start gap-3" aria-current={st === "active" ? "step" : undefined}>
                <span
                  className={`flex-shrink-0 w-5 h-5 rounded-md text-[11px] font-bold sw-num flex items-center justify-center ${
                    st === "done"
                      ? "bg-[var(--sw-up)] text-white"
                      : st === "active"
                        ? "bg-[var(--sw-accent)] text-white"
                        : "bg-[var(--sw-line-soft)] text-[var(--sw-muted)]"
                  }`}
                >
                  {st === "done" ? <Check className="w-3 h-3" strokeWidth={3} aria-hidden="true" /> : i + 1}
                </span>
                <span className="text-sm">
                  <span className={`font-medium ${st === "todo" ? "text-[var(--sw-muted)]" : "text-[var(--sw-ink)]"}`}>{step.title}</span>
                  <span className="block text-xs text-[var(--sw-muted)] mt-0.5">{step.hint}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </Modal>
  );
}
