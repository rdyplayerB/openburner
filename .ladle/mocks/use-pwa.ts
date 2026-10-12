import { knobs } from "../scenario";

export function usePWA() {
  return {
    isInstallable: false,
    isInstalled: false,
    isOffline: false,
    installApp: async () => false,
    shouldEnablePWA: knobs.mode === "hosted" && knobs.mobile,
  };
}
