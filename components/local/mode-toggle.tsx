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
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-black/[0.04] dark:border-slate-700/60 shadow-card-sm p-6 mb-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Connection Mode
        </h3>
        
        <div className="flex bg-slate-100 dark:bg-slate-700 rounded-xl p-1">
          <button
            onClick={() => handleModeChange('bridge')}
            disabled={isChanging}
            className={`flex-1 flex items-center justify-center gap-3 py-4 px-4 rounded-lg font-semibold transition-all duration-200 ${
              connectionMode === 'bridge'
                ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-lg'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-600/50'
            } ${isChanging ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Usb className="w-5 h-5" strokeWidth={2.5} />
            <span>Bridge</span>
          </button>
          
          <button
            onClick={() => handleModeChange('gateway')}
            disabled={isChanging}
            className={`flex-1 flex items-center justify-center gap-3 py-4 px-4 rounded-lg font-semibold transition-all duration-200 ${
              connectionMode === 'gateway'
                ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-lg'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-600/50'
            } ${isChanging ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Smartphone className="w-5 h-5" strokeWidth={2.5} />
            <span>Gateway</span>
          </button>
        </div>
        
        <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          {connectionMode === 'bridge' 
            ? 'Use USB NFC reader with HaLo Bridge software'
            : 'Use smartphone as NFC reader via HaLo Gateway'
          }
        </div>
      </div>
    </div>
  );
}
