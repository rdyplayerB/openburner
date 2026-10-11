"use client";

import { useEffect, useState } from 'react';
import { useEnvironment } from './use-environment';
import { log } from '@/lib/log';

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

  // Always register service worker (for caching), regardless of PWA mode.
  // The build id in the URL versions the SW's caches per deployment.
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const build =
      process.env.NEXT_PUBLIC_BUILD_ID ||
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
      'dev';
    navigator.serviceWorker
      .register(`/sw.js?v=${encodeURIComponent(build)}`)
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        if (!navigator.serviceWorker.controller) {
          registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
          registration.active?.postMessage({ type: 'SKIP_WAITING' });
        }
      })
      .catch((error) => {
        log.warn('[SW] registration failed:', error?.message);
      });
  }, []);

  // PWA install features only for mobile hosted mode
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (!shouldEnablePWA) return;

    // Check if app is already installed
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
      }
    };

    // Handle install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Handle app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
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
    checkInstalled();
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [shouldEnablePWA]);

  const installApp = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      log.warn('[PWA] install prompt failed:', (error as Error)?.message);
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
