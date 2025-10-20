"use client";

import { useMemo, useState, useEffect } from 'react';
import { getAppConfig, AppConfig } from '@/lib/config/environment';

export function useEnvironment(): AppConfig {
  const [clientConfig, setClientConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    // Detect mobile on client-side only
    const mobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    const baseConfig = getAppConfig();
    const config: AppConfig = {
      ...baseConfig,
      isMobile: mobile,
      isDesktop: !mobile,
      deviceType: mobile ? 'mobile' : 'desktop',
      isClient: true
    };
    
    setClientConfig(config);
  }, []);

  // Return client config if available, otherwise return server config
  return clientConfig || getAppConfig();
}
