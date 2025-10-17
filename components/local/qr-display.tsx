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
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-black/[0.04] dark:border-slate-700/60 shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="text-center px-6 pt-6 pb-4">
            {/* Header */}
            <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Smartphone className="w-10 h-10 text-[#FF6B35]" strokeWidth={2.5} />
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Scan with Phone
                </h2>
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
              )}
            </div>
              <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">
                Use your smartphone's camera to scan this QR code and connect to the gateway
              </p>
            </div>

            {/* QR Code */}
            <div className="mb-6">
              <div className="inline-block p-6 bg-white rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700">
                <img 
                  src={qrCodeDataURL} 
                  alt="Gateway QR Code" 
                  className="w-64 h-64 sm:w-72 sm:h-72 max-w-full"
                />
              </div>
            </div>

            {/* URL Actions */}
            <div className="mb-6">
              <button
                onClick={handleCopyURL}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-xl font-medium transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" strokeWidth={2.5} />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" strokeWidth={2.5} />
                    <span>Copy URL</span>
                  </>
                )}
              </button>
            </div>

            {/* Instructions */}
            <div className="text-left">
              <ol className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#FF6B35] text-white text-xs font-bold rounded-full flex items-center justify-center">1</span>
                  <span>Open your smartphone's camera app</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#FF6B35] text-white text-xs font-bold rounded-full flex items-center justify-center">2</span>
                  <span>Point it at the QR code above</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#FF6B35] text-white text-xs font-bold rounded-full flex items-center justify-center">3</span>
                  <span>The gateway will open automatically on your phone</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#FF6B35] text-white text-xs font-bold rounded-full flex items-center justify-center">4</span>
                  <span>Place your Burner card on the phone's NFC area</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#FF6B35] text-white text-xs font-bold rounded-full flex items-center justify-center">5</span>
                  <span>Wait for the connection to complete</span>
                </li>
              </ol>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
