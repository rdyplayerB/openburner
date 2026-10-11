"use client";

import { AlertCircle, X } from "lucide-react";
import { Modal } from "@/components/common/modal";

interface ErrorModalProps {
  error: string | null;
  onClose: () => void;
  onTryAgain?: () => void;
}

export function ErrorModal({ error, onClose, onTryAgain }: ErrorModalProps) {
  if (!error) return null;

  return (
    <Modal onClose={onClose} labelledBy="local-error-title">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--sw-line)]">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[var(--sw-down)]" strokeWidth={2.5} />
            <h2 id="local-error-title" className="text-lg font-bold text-[var(--sw-ink)]">
              Connection failed
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--sw-muted)] hover:text-[var(--sw-ink)]"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-5">
          {/* Error Message */}
          <p role="alert" className="text-sm text-[var(--sw-ink-soft)] leading-relaxed mb-6">
            {error}
          </p>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onClose}
              className="sw-btn-ghost py-3 px-4 text-sm"
            >
              Dismiss
            </button>
            <button
              onClick={onTryAgain || onClose}
              className="sw-btn-primary py-3 px-4 text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
    </Modal>
  );
}
