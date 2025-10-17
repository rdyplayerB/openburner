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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-card-lg">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
          
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Connection Error
          </h3>
          
          <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm leading-relaxed">
            {error}
          </p>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onTryAgain}
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
