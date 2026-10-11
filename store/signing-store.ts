import { create } from "zustand";

/**
 * Where the card is in a signing request, so the UI can show a live
 * "Tap your Burner" step even when the caller (e.g. a dApp request) can't.
 *
 *  idle   — nothing waiting on the card
 *  tap    — the sign command was sent; waiting for the card
 *  signed — the card signed and the signature matched the connected card
 */
export type CardPhase = "idle" | "tap" | "signed";

interface SigningState {
  phase: CardPhase;
  setPhase: (phase: CardPhase) => void;
}

export const useSigningStore = create<SigningState>((set) => ({
  phase: "idle",
  setPhase: (phase) => set({ phase }),
}));

export function setCardPhase(phase: CardPhase) {
  useSigningStore.getState().setPhase(phase);
}
