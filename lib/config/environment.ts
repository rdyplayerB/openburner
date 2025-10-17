export type AppMode = 'local' | 'hosted';
export type DeviceType = 'mobile' | 'desktop';

export interface AppConfig {
  mode: AppMode;
  deviceType: DeviceType;
  isHosted: boolean;
  isLocal: boolean;
  isMobile: boolean;
  isDesktop: boolean;
  pricingEnabled: boolean; // Pricing control for hosted vs local
}

export const getAppConfig = (): AppConfig => {
  const mode = (process.env.NEXT_PUBLIC_APP_MODE as AppMode) || 'local';
  const isMobile = typeof window !== 'undefined' && 
    /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  return {
    mode,
    deviceType: isMobile ? 'mobile' : 'desktop',
    isHosted: mode === 'hosted',
    isLocal: mode === 'local',
    isMobile,
    isDesktop: !isMobile,
    pricingEnabled: mode === 'local' // Only enable pricing for local development
  };
};
