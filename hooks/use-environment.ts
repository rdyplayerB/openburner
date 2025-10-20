"use client";

import { useMemo, useState, useEffect } from 'react';
import { getAppConfig, AppConfig } from '@/lib/config/environment';

export function useEnvironment(): AppConfig {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Mark as hydrated and detect mobile
    setIsHydrated(true);
    const mobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(mobile);
  }, []);

  return useMemo(() => {
    const baseConfig = getAppConfig();
    
    // During SSR and before hydration, always return desktop config to prevent flash
    if (!isHydrated) {
      return {
        ...baseConfig,
        isMobile: false,
        isDesktop: true,
        deviceType: 'desktop',
        isClient: false
      };
    }
    
    // After hydration, return actual mobile detection
    return {
      ...baseConfig,
      isMobile,
      isDesktop: !isMobile,
      deviceType: isMobile ? 'mobile' : 'desktop',
      isClient: true
    };
  }, [isHydrated, isMobile]);
}
