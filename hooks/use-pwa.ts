"use client";

import { useEffect, useState } from 'react';
import { useEnvironment } from './use-environment';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWA() {
  const { isHosted, isMobile } = useEnvironment();
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // Only enable PWA features for mobile hosted mode
  const shouldEnablePWA = isHosted && isMobile;

  useEffect(() => {
    if (!shouldEnablePWA) return;

    // Check if app is already installed
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return true;
      }
      return false;
    };

    // Check if PWA is installable (fallback method)
    const checkInstallable = () => {
      // Check if we're in a mobile browser that supports PWA installation
      const userAgent = navigator.userAgent;
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isChrome = /Chrome/.test(userAgent) && !/Edge/.test(userAgent);
      const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
      const isFirefox = /Firefox/.test(userAgent);
      const isEdge = /Edge/.test(userAgent);
      
      // Show install message for mobile browsers that support PWA
      if (isMobile && (isChrome || isSafari || isFirefox || isEdge)) {
        setIsInstallable(true);
        return true;
      }
      return false;
    };

    // Handle install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
      console.log('[PWA] beforeinstallprompt event fired');
    };

    // Handle app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log('[PWA] App installed');
    };

    // Handle online/offline status
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    // Register event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial checks
    const isAlreadyInstalled = checkInstalled();
    if (!isAlreadyInstalled) {
      // Use fallback method if beforeinstallprompt hasn't fired
      setTimeout(() => {
        checkInstallable();
      }, 1000);
    }
    setIsOffline(!navigator.onLine);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service worker registered:', registration);
        })
        .catch((error) => {
          console.error('[PWA] Service worker registration failed:', error);
        });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [shouldEnablePWA]);

  const installApp = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          console.log('[PWA] User accepted the install prompt');
        } else {
          console.log('[PWA] User dismissed the install prompt');
        }
        
        setDeferredPrompt(null);
        setIsInstallable(false);
      } catch (error) {
        console.error('[PWA] Error during installation:', error);
      }
    } else {
      // No deferred prompt available, user will need to follow manual instructions
      console.log('[PWA] No install prompt available, showing manual instructions');
    }
  };

  return {
    isInstallable,
    isInstalled,
    isOffline,
    installApp,
    shouldEnablePWA,
  };
}
