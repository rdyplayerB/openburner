"use client";

import { useState, useEffect } from "react";
import { X, Shield, AlertTriangle } from "lucide-react";

interface ConsentModalProps {
  isOpen: boolean;
  website: string;
  onAllow: () => void;
  onDeny: () => void;
  onClose: () => void;
}

export function ConsentModal({ isOpen, website, onAllow, onDeny, onClose }: ConsentModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      // Delay hiding to allow for smooth animation
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div
        className={`relative sw-surface w-full max-w-sm rounded-xl border border-[var(--sw-line)] overflow-hidden transform transition-all duration-300 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--sw-line)]">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-[var(--sw-accent)]" strokeWidth={2} />
            <h2 className="text-lg font-bold text-[var(--sw-ink)]">
              Allow access to HaLo?
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--sw-muted)] hover:text-[var(--sw-ink)]"
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-5 space-y-4">
          <div className="space-y-3">
            <p className="text-sm text-[var(--sw-ink-soft)] leading-relaxed">
              The website at:
            </p>
            <div className="rounded-lg p-3 border border-[var(--sw-line)]">
              <p className="sw-mono text-sm font-semibold text-[var(--sw-ink)] break-all">
                {website}
              </p>
            </div>
            <p className="text-sm text-[var(--sw-ink-soft)] leading-relaxed">
              wants to communicate with HaLo tags.
            </p>
          </div>

          <div className="border border-[var(--sw-line)] rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[var(--sw-accent)] mt-0.5 flex-shrink-0" strokeWidth={2} />
              <div>
                <p className="sw-uplabel mb-1">
                  What this means
                </p>
                <p className="text-sm text-[var(--sw-ink-soft)] leading-relaxed">
                  If you agree, the website can interact with your card reader and sign information with HaLo tags.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 px-5 pb-5">
          <button
            onClick={onDeny}
            className="sw-btn-ghost py-3 px-4 text-sm flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
            Deny
          </button>
          <button
            onClick={onAllow}
            className="sw-btn-primary py-3 px-4 text-sm flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4" strokeWidth={2.5} />
            Allow
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-0">
          <div className="flex items-center justify-center">
            <span className="sw-uplabel">arx</span>
          </div>
        </div>
      </div>
    </div>
  );
}
