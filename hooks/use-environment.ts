"use client";

import { useMemo, useState, useEffect } from 'react';
import { getAppConfig, AppConfig } from '@/lib/config/environment';

export function useEnvironment(): AppConfig {
  const [isClient, setIsClient] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Detect mobile on client-side only
    const mobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(mobile);
  }, []);

  return useMemo(() => {
    const baseConfig = getAppConfig();
    
    // Only override mobile detection on client-side
    if (isClient) {
      return {
        ...baseConfig,
        isMobile,
        isDesktop: !isMobile,
        deviceType: isMobile ? 'mobile' : 'desktop',
        isClient: true
      };
    }
    
    return baseConfig;
  }, [isClient, isMobile]);
}
