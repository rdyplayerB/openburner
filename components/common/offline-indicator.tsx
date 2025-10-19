"use client";

import { usePWA } from '@/hooks/use-pwa';
import { WifiOff, Wifi } from 'lucide-react';

export function OfflineIndicator() {
  const { isOffline, shouldEnablePWA } = usePWA();

  // Only show for mobile hosted mode
  if (!shouldEnablePWA) {
    return null;
  }

  if (!isOffline) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 shadow-lg">
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              You're offline
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Some features may not work without internet connection
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OnlineIndicator() {
  const { isOffline, shouldEnablePWA } = usePWA();

  // Only show for mobile hosted mode
  if (!shouldEnablePWA) {
    return null;
  }

  if (isOffline) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 shadow-lg">
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              Back online
            </p>
            <p className="text-xs text-green-700 dark:text-green-300">
              All features are now available
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
