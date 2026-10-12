"use client";

import { useState } from "react";
import { useWalletStore, ConnectionMode } from "@/store/wallet-store";
import { Smartphone, Usb } from "lucide-react";

interface ModeToggleProps {
  onModeChange?: () => void;
}

const OPTIONS: { mode: ConnectionMode; label: string; Icon: typeof Usb }[] = [
  { mode: "bridge", label: "USB reader", Icon: Usb },
  { mode: "gateway", label: "Phone", Icon: Smartphone },
];

/** Tabs: connect through a USB NFC reader or a phone (HaLo Gateway). */
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
      <p id="connect-mode-label" className="sw-uplabel mb-3">
        Connect with
      </p>
      <div role="radiogroup" aria-labelledby="connect-mode-label" className="flex gap-6 border-b border-[var(--sw-line)]">
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
              className={`sw-tab text-sm pb-3 inline-flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sw-accent)] ${
                active ? "sw-tab-active" : ""
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
