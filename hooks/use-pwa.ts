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

  // Always register service worker (for caching), regardless of PWA mode
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Register service worker for caching functionality
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[SW] Service worker registered:', registration);
          
          // Wait for the service worker to be ready and check if it's controlling the page
          return navigator.serviceWorker.ready;
        })
        .then((registration) => {
          console.log('[SW] Service worker ready:', registration);
          
          // Check if the page is controlled by the service worker
          if (navigator.serviceWorker.controller) {
            console.log('[SW] ✅ Page is controlled by service worker');
          } else {
            console.log('[SW] ⚠️ Page is NOT controlled by service worker - reload required');
            // Send a message to the service worker to skip waiting and take control
            if (registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            if (registration.active) {
              registration.active.postMessage({ type: 'SKIP_WAITING' });
            }
          }
        })
        .catch((error) => {
          console.error('[SW] Service worker registration failed:', error);
        });
      
      // Listen for the service worker taking control
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] 🎉 Service worker now controlling the page!');
      });
    }
  }, []);

  // PWA install features only for mobile hosted mode
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    console.log('🔍 [PWA Hook] useEffect running, shouldEnablePWA:', shouldEnablePWA);
    if (!shouldEnablePWA) {
      console.log('❌ [PWA Hook] PWA install features not enabled');
      return;
    }

    // Check if app is already installed
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
      }
    };

    // Handle install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('🎉 [PWA] beforeinstallprompt event fired!', e);
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
  };

  return {
    isInstallable,
    isInstalled,
    isOffline,
    installApp,
    shouldEnablePWA,
  };
}
