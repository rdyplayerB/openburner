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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 transition-colors duration-200">
      <div className="max-w-sm w-full space-y-4">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Image 
              src="/images/openburnerlogo.svg" 
              alt="OpenBurner logo" 
              width={48} 
              height={48} 
              className="w-12 h-12 drop-shadow-sm"
            />
            <h1 className="text-3xl font-bold text-black dark:text-white tracking-tight leading-none transition-colors duration-200">
              Open<span className="text-[#FF6B35]">Burner</span>
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-base font-medium leading-relaxed transition-colors duration-200">
            Tap your Burner card to your device
          </p>
        </div>

        {/* Connect Button */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-black/[0.04] dark:border-slate-700/60 shadow-card-lg overflow-hidden transition-colors duration-200">
          <div className="p-6">
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] hover:from-[#E55A2B] hover:to-[#FF7A3A] text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:shadow-orange-500/25 text-lg active:scale-[0.98] transform hover:scale-[1.02] disabled:hover:scale-100"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="animate-spin h-6 w-6" strokeWidth={2.5} />
                  <span>Reading Card...</span>
                </>
              ) : (
                <>
                  <Nfc className="h-6 w-6" strokeWidth={2.5} />
                  <span>Tap Your Burner</span>
                </>
              )}
            </button>
            
            {/* Cancel Button - only show when connecting */}
            {isConnecting && (
              <button
                onClick={handleCancel}
                className="w-full mt-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
                <span>Cancel</span>
              </button>
            )}
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
