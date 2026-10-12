import { knobs } from "../scenario";

export type AppMode = "local" | "hosted";
export type DeviceType = "mobile" | "desktop";
export interface AppConfig {
  mode: AppMode;
  deviceType: DeviceType;
  isHosted: boolean;
  isLocal: boolean;
  isMobile: boolean;
  isDesktop: boolean;
  isClient: boolean;
  pricingEnabled: boolean;
}

export const getAppConfig = (): AppConfig => ({
  mode: knobs.mode,
  deviceType: knobs.mobile ? "mobile" : "desktop",
  isHosted: knobs.mode === "hosted",
  isLocal: knobs.mode === "local",
  isMobile: knobs.mobile,
  isDesktop: !knobs.mobile,
  isClient: true,
  pricingEnabled: knobs.pricing,
});
