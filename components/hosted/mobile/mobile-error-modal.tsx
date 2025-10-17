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
    if (error.includes('NFC') || error.includes('card')) return <Nfc className="w-12 h-12 text-red-500" />;
    if (error.includes('network') || error.includes('connection')) return <Wifi className="w-12 h-12 text-red-500" />;
    if (error.includes('permission') || error.includes('access')) return <Smartphone className="w-12 h-12 text-red-500" />;
    return <X className="w-12 h-12 text-red-500" />;
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-card-lg">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            {getErrorIcon()}
          </div>
          
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {getErrorTitle()}
          </h3>
          
          <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm leading-relaxed">
            {getErrorDescription()}
          </p>

          {/* Suggestions */}
          <div className="text-left mb-6">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Try these steps:
            </h4>
            <ul className="space-y-2">
              {getErrorSuggestions().map((suggestion, index) => (
                <li key={index} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                  <span className="text-slate-400 dark:text-slate-500 mt-1">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onRetry}
              className="flex-1 bg-[#FF6B35] hover:bg-[#E55A2B] text-white py-3 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            
            <button
              onClick={onClose}
              className="px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
