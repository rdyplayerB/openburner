"use client";

import { X, RefreshCw, AlertTriangle } from "lucide-react";

interface ErrorModalProps {
  error: string | null;
  onClose: () => void;
  onTryAgain: () => void;
}

export function ErrorModal({ error, onClose, onTryAgain }: ErrorModalProps) {
  if (!error) return null;

  return (
    <div className="modal-overlay bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3">
      <div className="sw-surface w-full max-w-sm rounded-xl border border-[var(--sw-line)] overflow-hidden">
        <div className="px-5 py-5 text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="w-10 h-10 text-[var(--sw-down)]" />
          </div>

          <h3 className="text-lg font-bold text-[var(--sw-ink)] mb-2">
            Connection error
          </h3>

          <p className="text-sm text-[var(--sw-ink-soft)] mb-6 leading-relaxed">
            {error}
          </p>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onTryAgain}
              className="sw-btn-primary flex-1 py-3 px-4 text-sm flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>

            <button
              onClick={onClose}
              className="sw-btn-ghost px-4 py-3 text-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
