"use client";

import { useState } from "react";
import { useWalletStore, ConnectionMode } from "@/store/wallet-store";
import { cleanupGateway } from "@/lib/burner-gateway";
import { Wifi, Smartphone, Usb, SmartphoneIcon } from "lucide-react";

interface ModeToggleProps {
  onModeChange?: () => void;
}

export function ModeToggle({ onModeChange }: ModeToggleProps) {
  const { connectionMode, setConnectionMode } = useWalletStore();
  const [isChanging, setIsChanging] = useState(false);

  const handleModeChange = async (newMode: ConnectionMode) => {
    if (newMode === connectionMode) return;
    
    setIsChanging(true);
    
    // Clean up existing connections when switching modes
    if (connectionMode === 'gateway') {
      cleanupGateway();
    }
    
    // Add a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 150));
    
    setConnectionMode(newMode);
    setIsChanging(false);
    
    // Notify parent component about mode change
    onModeChange?.();
  };

  return (
    <div>
      <div className="sw-uplabel mb-3">Connection mode</div>

      <div className="flex gap-6 border-b border-[var(--sw-line)]">
        <button
          onClick={() => handleModeChange('bridge')}
          disabled={isChanging}
          className={`sw-tab text-sm pb-3 flex items-center gap-2 ${
            connectionMode === 'bridge' ? 'sw-tab-active' : ''
          } ${isChanging ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Usb className="w-4 h-4" />
          <span>Bridge</span>
        </button>

        <button
          onClick={() => handleModeChange('gateway')}
          disabled={isChanging}
          className={`sw-tab text-sm pb-3 flex items-center gap-2 ${
            connectionMode === 'gateway' ? 'sw-tab-active' : ''
          } ${isChanging ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Gateway</span>
        </button>
      </div>

      <p className="mt-3 text-sm text-[var(--sw-muted)]">
        {connectionMode === 'bridge'
          ? 'USB NFC reader with HaLo Bridge software'
          : 'Smartphone as NFC reader via HaLo Gateway'
        }
      </p>
    </div>
  );
}
