"use client";

import { useState } from "react";
import { Smartphone, Copy, Check, X } from "lucide-react";

interface QRDisplayProps {
  qrCodeDataURL: string;
  execURL: string;
  onClose?: () => void;
}

export function QRDisplay({ qrCodeDataURL, execURL, onClose }: QRDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyURL = async () => {
    try {
      await navigator.clipboard.writeText(execURL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };


  return (
    <div 
      className="fixed bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" 
      style={{ 
        top: '-50px',
        left: '-50px', 
        right: '-50px', 
        bottom: '-50px',
        width: 'calc(100vw + 100px)',
        height: 'calc(100vh + 100px)',
        minHeight: 'calc(100vh + 100px)'
      }}
    >
      <div className="sw-surface rounded-xl border border-[var(--sw-line)] max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[var(--sw-line)]">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-[var(--sw-accent)]" strokeWidth={2.5} />
            <h2 className="text-lg font-bold text-[var(--sw-ink)]">Scan with phone</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-[var(--sw-muted)] hover:text-[var(--sw-ink)] transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="text-sm text-[var(--sw-ink-soft)] leading-relaxed text-center mb-5">
            Scan with your phone&apos;s camera to connect via the gateway.
          </p>

          {/* QR Code */}
          <div className="flex justify-center mb-5">
            <div className="inline-block p-5 bg-white rounded-lg border border-[var(--sw-line)]">
              <img
                src={qrCodeDataURL}
                alt="Gateway QR code"
                className="w-60 h-60 sm:w-64 sm:h-64 max-w-full"
              />
            </div>
          </div>

          {/* Copy URL */}
          <button
            onClick={handleCopyURL}
            className="sw-btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm mb-6"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" strokeWidth={2.5} />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" strokeWidth={2.5} />
                <span>Copy URL</span>
              </>
            )}
          </button>

          {/* Instructions */}
          <ol className="text-sm text-[var(--sw-ink-soft)] space-y-2.5">
            {[
              "Open your phone's camera app",
              "Point it at the QR code above",
              "The gateway opens automatically on your phone",
              "Place your Burner card on the phone's NFC area",
              "Wait for the connection to complete",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-md bg-[var(--sw-accent)] text-white text-[11px] font-bold sw-num flex items-center justify-center">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
