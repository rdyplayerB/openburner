export type AppMode = 'local' | 'hosted';
export type DeviceType = 'mobile' | 'desktop';

export interface AppConfig {
  mode: AppMode;
  deviceType: DeviceType;
  isHosted: boolean;
  isLocal: boolean;
  isMobile: boolean;
  isDesktop: boolean;
  isClient: boolean; // Whether we're on client-side (after hydration)
  pricingEnabled: boolean; // Pricing control for hosted vs local
}

export const getAppConfig = (): AppConfig => {
  const mode = (process.env.NEXT_PUBLIC_APP_MODE as AppMode) || 'local';

  // For SSR, we can't detect mobile, so we'll default to desktop
  // The actual mobile detection will happen client-side in the hook
  const isMobile = false; // Will be overridden client-side

  // Pricing is on in local mode, or whenever a CoinGecko key is available
  // (env or a user-entered key in this browser) — lets hosted users opt in.
  let hasUserCoingecko = false;
  if (typeof window !== 'undefined') {
    try {
      hasUserCoingecko = !!JSON.parse(localStorage.getItem('openburner_api_keys') || '{}').coingecko;
    } catch {
      hasUserCoingecko = false;
    }
  }

  // Deployers can turn pricing on for hosted by setting NEXT_PUBLIC_PRICING_ENABLED=true
  // (alongside the server-side COINGECKO_API_KEY). The flag is just a public on/off — the
  // key itself stays server-side and secret.
  const deployerPricing = process.env.NEXT_PUBLIC_PRICING_ENABLED === 'true';

  return {
    mode,
    deviceType: 'desktop', // Default to desktop for SSR
    isHosted: mode === 'hosted',
    isLocal: mode === 'local',
    isMobile,
    isDesktop: true, // Default to desktop for SSR
    isClient: false, // Will be true on client-side
    pricingEnabled: mode === 'local' || hasUserCoingecko || deployerPricing
  };
};
