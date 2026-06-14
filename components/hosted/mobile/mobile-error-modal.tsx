"use client";

import { Nfc, Smartphone, Wifi, X, RefreshCw } from "lucide-react";

interface MobileErrorModalProps {
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
}

export function MobileErrorModal({ error, onClose, onRetry }: MobileErrorModalProps) {
  if (!error) return null;

  const getErrorIcon = () => {
    if (error.includes('NFC') || error.includes('card')) return <Nfc className="w-10 h-10 text-[var(--sw-down)]" />;
    if (error.includes('network') || error.includes('connection')) return <Wifi className="w-10 h-10 text-[var(--sw-down)]" />;
    if (error.includes('permission') || error.includes('access')) return <Smartphone className="w-10 h-10 text-[var(--sw-down)]" />;
    return <X className="w-10 h-10 text-[var(--sw-down)]" />;
  };

  const getErrorTitle = () => {
    if (error.includes('NFC')) return 'NFC Not Available';
    if (error.includes('card')) return 'Card Not Detected';
    if (error.includes('network') || error.includes('connection')) return 'Connection Error';
    if (error.includes('permission') || error.includes('access')) return 'Permission Denied';
    return 'Connection Error';
  };

  const getErrorDescription = () => {
    if (error.includes('NFC')) return 'Your device doesn\'t support NFC or it\'s disabled. Please enable NFC in your device settings.';
    if (error.includes('card')) return 'Make sure your Burner card is properly placed on the back of your phone and try again.';
    if (error.includes('network') || error.includes('connection')) return 'Please check your internet connection and try again.';
    if (error.includes('permission') || error.includes('access')) return 'Please allow NFC access when prompted and try again.';
    return 'Something went wrong. Please try again.';
  };

  const getErrorSuggestions = () => {
    if (error.includes('NFC')) {
      return [
        'Enable NFC in your device settings',
        'Make sure your device supports NFC',
        'Try using a different browser'
      ];
    }
    if (error.includes('card')) {
      return [
        'Ensure the card is properly positioned',
        'Try moving the card around the back of your phone',
        'Make sure the card is not damaged'
      ];
    }
    if (error.includes('network') || error.includes('connection')) {
      return [
        'Check your Wi-Fi or mobile data connection',
        'Try refreshing the page',
        'Check if you\'re in an area with good signal'
      ];
    }
    return [
      'Try again in a moment',
      'Make sure your device is working properly',
      'Contact support if the problem persists'
    ];
  };

  return (
    <div className="modal-overlay bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3">
      <div className="sw-surface w-full max-w-sm rounded-xl border border-[var(--sw-line)] overflow-hidden">
        <div className="px-5 py-5 text-center">
          <div className="flex justify-center mb-4">
            {getErrorIcon()}
          </div>

          <h3 className="text-lg font-bold text-[var(--sw-ink)] mb-2">
            {getErrorTitle()}
          </h3>

          <p className="text-sm text-[var(--sw-ink-soft)] mb-6 leading-relaxed">
            {getErrorDescription()}
          </p>

          {/* Suggestions */}
          <div className="text-left mb-6">
            <h4 className="sw-uplabel mb-3">
              Try these steps
            </h4>
            <ul className="space-y-2">
              {getErrorSuggestions().map((suggestion, index) => (
                <li key={index} className="text-xs text-[var(--sw-ink-soft)] flex items-start gap-2">
                  <span className="text-[var(--sw-muted)] mt-1">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onRetry}
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
