"use client";

import { useState } from "react";
import { useWalletStore, ConnectionMode } from "@/store/wallet-store";
import { Smartphone, Usb } from "lucide-react";

interface ModeToggleProps {
  onModeChange?: () => void;
}

const OPTIONS: { mode: ConnectionMode; label: string; Icon: typeof Usb }[] = [
  { mode: "bridge", label: "USB reader", Icon: Usb },
  { mode: "gateway", label: "Phone as reader", Icon: Smartphone },
];

/** Segmented control: connect through a USB NFC reader or a phone (HaLo Gateway). */
export function ModeToggle({ onModeChange }: ModeToggleProps) {
  const connectionMode = useWalletStore((s) => s.connectionMode);
  const setConnectionMode = useWalletStore((s) => s.setConnectionMode);
  const [isChanging, setIsChanging] = useState(false);

  const handleModeChange = async (newMode: ConnectionMode) => {
    if (newMode === connectionMode || isChanging) return;
    setIsChanging(true);

    // Close any open gateway session when leaving phone mode. Loaded on demand
    // so libhalo stays out of this screen's first load.
    if (connectionMode === "gateway") {
      import("@/lib/burner-gateway").then((m) => m.cleanupGateway()).catch(() => {});
    }

    setConnectionMode(newMode);
    setIsChanging(false);
    onModeChange?.();
  };

  return (
    <div>
      <p id="connect-mode-label" className="sw-label mb-2">
        How will you tap your card?
      </p>
      <div
        role="radiogroup"
        aria-labelledby="connect-mode-label"
        className="inline-flex w-full sm:w-auto rounded-full bg-[var(--sw-fill-strong)] p-1"
      >
        {OPTIONS.map(({ mode, label, Icon }) => {
          const active = connectionMode === mode;
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => handleModeChange(mode)}
              disabled={isChanging}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 min-h-[40px] text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sw-accent)] ${
                active
                  ? "bg-[var(--sw-surface)] text-[var(--sw-ink)] shadow-[0_0_0_1px_var(--sw-line)]"
                  : "text-[var(--sw-ink-soft)] hover:text-[var(--sw-ink)]"
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
