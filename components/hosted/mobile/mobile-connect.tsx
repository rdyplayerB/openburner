"use client";

import { useState } from "react";
import Image from "next/image";
import { connectWithMobileNFC } from "@/lib/mobile/nfc";
import { useWalletStore } from "@/store/wallet-store";
import { Nfc, Loader2, X } from "lucide-react";
import { MobileErrorModal } from "./mobile-error-modal";

export function HostedMobileConnect() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setWallet } = useWalletStore();

  const handleConnect = async () => {
    console.log("\n═══════════════════════════════════════════════════════");
    console.log("📱 [Hosted Mobile] CONNECT BUTTON CLICKED");
    console.log("═══════════════════════════════════════════════════════");
    console.log("⏰ [Hosted Mobile] Timestamp:", new Date().toISOString());
    
    setIsConnecting(true);
    setError(null);

    try {
      const { address, publicKey, keySlot } = await connectWithMobileNFC();
      
      console.log("\n═══════════════════════════════════════════════════════");
      console.log(`✅ [Hosted Mobile] Connection successful!`);
      console.log("═══════════════════════════════════════════════════════");
      console.log(`   Address: ${address}`);
      console.log(`   Public Key: ${publicKey.substring(0, 40)}...`);
      console.log(`   Key Slot: ${keySlot}`);
      
      setWallet(address, publicKey, keySlot);
      
      console.log("\n═══════════════════════════════════════════════════════");
      console.log("🎉 [Hosted Mobile] WALLET CONNECTED SUCCESSFULLY!");
      console.log("═══════════════════════════════════════════════════════\n");
    } catch (err: any) {
      console.log("\n═══════════════════════════════════════════════════════");
      console.error("❌ [Hosted Mobile] CONNECTION FAILED!");
      console.log("═══════════════════════════════════════════════════════");
      console.error("Error:", err);
      
      setError(err.message || "Failed to connect with your Burner card");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCancel = () => {
    console.log("🛑 [Hosted Mobile] Connection cancelled by user");
    setIsConnecting(false);
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-sm w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Image 
              src="/images/openburnerlogo.svg" 
              alt="OpenBurner logo" 
              width={64} 
              height={64} 
              className="w-16 h-16 drop-shadow-sm"
            />
            <h1 className="text-4xl font-bold text-black dark:text-white tracking-tight leading-none">
              Open<span className="text-[#FF6B35]">Burner</span>
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-lg font-medium leading-relaxed">
            Tap your Burner card to your device
          </p>
        </div>

        {/* Connect Button */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-black/[0.04] dark:border-slate-700/60 shadow-card-lg overflow-hidden">
          <div className="p-8">
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] hover:from-[#E55A2B] hover:to-[#FF7A3A] text-white font-semibold py-6 px-8 rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4 shadow-lg hover:shadow-xl hover:shadow-orange-500/25 text-xl active:scale-[0.98] transform hover:scale-[1.02] disabled:hover:scale-100"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="animate-spin h-8 w-8" strokeWidth={2.5} />
                  <span>Reading Card...</span>
                </>
              ) : (
                <>
                  <Nfc className="h-8 w-8" strokeWidth={2.5} />
                  <span>Tap Your Burner</span>
                </>
              )}
            </button>
            
            {/* Cancel Button - only show when connecting */}
            {isConnecting && (
              <button
                onClick={handleCancel}
                className="w-full mt-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                <X className="h-5 w-5" strokeWidth={2.5} />
                <span>Cancel</span>
              </button>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-slate-50/80 dark:bg-slate-800/80 px-8 py-6 border-t border-slate-200/60 dark:border-slate-700/60">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 text-center">
                How to Connect
              </h3>
              
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <p>1. Place your Burner card on the back of your phone</p>
                <p>2. Hold it steady until you feel a vibration</p>
                <p>3. Your wallet will connect automatically</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Modal */}
        <MobileErrorModal 
          error={error}
          onClose={() => setError(null)}
          onRetry={handleConnect}
        />
      </div>
    </div>
  );
}
