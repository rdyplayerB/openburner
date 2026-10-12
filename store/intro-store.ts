import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Someone who has used OpenBurner before skips the intro after an update. */
function usedBefore(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem("openburner-storage") !== null;
  } catch {
    return false;
  }
}

interface IntroStore {
  /** The welcome slides have been seen (or skipped). */
  seen: boolean;
  setSeen: (seen: boolean) => void;
}

export const useIntroStore = create<IntroStore>()(
  persist(
    (set) => ({
      seen: usedBefore(),
      setSeen: (seen) => set({ seen }),
    }),
    { name: "openburner-intro" }
  )
);
