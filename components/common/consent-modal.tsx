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
        className={`relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={2} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Allow access to HaLo?
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              The website at:
            </p>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
              <p className="font-mono text-sm font-semibold text-slate-900 dark:text-white break-all">
                {website}
              </p>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              wants to communicate with HaLo tags.
            </p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" strokeWidth={2} />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                  What this means:
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed">
                  If you agree, the website will be able to interact with your card reader and sign information with HaLo tags.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={onDeny}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
            Deny access
          </button>
          <button
            onClick={onAllow}
            className="flex-1 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-semibold py-3 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4" strokeWidth={2.5} />
            Allow access
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-0">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full"></div>
              <span className="text-xs font-medium">arx</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
