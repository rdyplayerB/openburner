"use client";

import { useState, useEffect } from 'react';
import { usePWA } from '@/hooks/use-pwa';
import { Download, X } from 'lucide-react';

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, isOffline, installApp, shouldEnablePWA } = usePWA();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if PWA features are disabled or app is already installed
  if (!shouldEnablePWA || isInstalled || isDismissed) {
    return null;
  }

  const handleInstall = async () => {
    try {
      // Check if we're on iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      if (isIOS) {
        // On iOS, show instructions for manual installation
        alert('To install OpenBurner on iOS:\n\n1. Tap the Share button (square with arrow up)\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to confirm');
        return;
      }
      
      // For Android and other browsers, use the install prompt
      await installApp();
    } catch (error) {
      console.error('Installation failed:', error);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    // Remember dismissal for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Check if user previously dismissed
  useEffect(() => {
    const dismissed = sessionStorage.getItem('pwa-install-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] rounded-lg flex items-center justify-center">
              <Download className="w-5 h-5 text-white" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Install OpenBurner
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Add to your home screen for quick access
            </p>
          </div>
          
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {isInstallable && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleInstall}
              className="flex-1 bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] text-white text-xs font-medium py-2 px-3 rounded-lg hover:from-[#E55A2B] hover:to-[#FF7A3A] transition-all duration-200"
            >
              Install App
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors duration-200"
            >
              Not now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
