"use client";

import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/common/modal";

interface ErrorModalProps {
  error: string | null;
  /** Which connection was being tried, for a more useful hint. */
  mode?: "bridge" | "gateway" | null;
  onClose: () => void;
  onTryAgain?: () => void;
}

/** Plain-language title and one next step for a failed card connection. */
function explain(error: string, mode?: "bridge" | "gateway" | null): { title: string; hint: string } {
  if (/no burner card|card detected|no card|place your|timeout/i.test(error)) {
    return {
      title: "No card on the reader",
      hint:
        mode === "gateway"
          ? "Hold your card flat against your phone until it reads, then try again."
          : "Place your card flat on the reader and leave it there, then try again.",
    };
  }
  if (/websocket|ECONNREFUSED|bridge|32868/i.test(error)) {
    return {
      title: "HaLo Bridge isn't running",
      hint: "Start HaLo Bridge on this computer, plug in your USB reader, then try again.",
    };
  }
  if (/unreadable key|no wallet key/i.test(error)) {
    return {
      title: "This card couldn't be read as a wallet",
      hint: "Make sure it's a Burner card. If it is, take it off the reader and try again.",
    };
  }
  return { title: "Couldn't connect", hint: "Check your reader and card, then try again." };
}

export function ErrorModal({ error, mode, onClose, onTryAgain }: ErrorModalProps) {
  if (!error) return null;
  const { title, hint } = explain(error, mode);

  return (
    <Modal onClose={onClose} labelledBy="local-error-title">
      <div className="px-5 pt-6 pb-5" role="alert">
        <span className="mx-auto mb-3 w-11 h-11 rounded-full bg-(--sw-down-bg) text-(--sw-down) flex items-center justify-center">
          <AlertTriangle className="w-5 h-5" aria-hidden="true" />
        </span>
        <h2 id="local-error-title" className="text-xl font-bold tracking-tight text-(--sw-ink) text-center">
          {title}
        </h2>
        <p className="text-sm text-(--sw-ink-soft) text-center mt-1.5 leading-relaxed">{hint}</p>

        {error !== title && (
          <p className="sw-callout sw-callout-info mt-4 wrap-break-word">{error}</p>
        )}

        <button onClick={onTryAgain || onClose} className="sw-btn-primary w-full py-3.5 mt-5 text-sm">
          Try again
        </button>
        <button
          onClick={onClose}
          className="w-full py-3 mt-1 text-sm font-semibold text-(--sw-ink-soft) hover:text-(--sw-ink) transition-colors"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
