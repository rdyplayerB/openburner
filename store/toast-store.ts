import { create } from "zustand";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastState {
  toasts: ToastItem[];
  show: (message: string, type?: ToastType, duration?: number) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

/** App-wide toasts (rendered by <ToastHost/>), usable from stores and components. */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message, type = "success", duration) =>
    set((s) => ({
      // Keep at most 3 visible; newest last.
      toasts: [
        ...s.toasts.slice(-2),
        { id: nextId++, message, type, duration: duration ?? (type === "error" ? 6000 : 2500) },
      ],
    })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Non-hook helper for stores / async code. */
export function showToast(message: string, type: ToastType = "success", duration?: number) {
  useToastStore.getState().show(message, type, duration);
}
