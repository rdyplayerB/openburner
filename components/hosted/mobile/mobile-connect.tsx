"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { connectWithMobileNFC } from "@/lib/mobile/nfc";
import { useWalletStore } from "@/store/wallet-store";
import { Nfc, Loader2, X, ExternalLink } from "lucide-react";
import { MobileErrorModal } from "./mobile-error-modal";

export function HostedMobileConnect() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setWallet } = useWalletStore();

  // Hide install prompt if previously dismissed
  useEffect(() => {
    const dismissed = sessionStorage.getItem('pwa-install-dismissed');
    if (dismissed === 'true') {
      const element = document.getElementById('install-prompt');
      if (element) element.style.display = 'none';
    }
  }, []);

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 transition-colors duration-200" style={{ minHeight: '100dvh' }}>
      <div className="max-w-sm w-full space-y-4 -mt-8">
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

        {/* Website Link */}
        <div className="text-center mt-6">
          <Link 
            href="https://openburner.xyz" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 text-sm transition-colors duration-200"
          >
            <span>Visit openburner.xyz</span>
            <ExternalLink className="w-3 h-3" strokeWidth={2} />
          </Link>
        </div>
      </div>
      
      {/* Install Prompt - only on mobile connection screen */}
      <div id="install-prompt" className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Install OpenBurner
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Add to home screen
              </p>
            </div>
            
            <button
              onClick={() => {
                const element = document.getElementById('install-prompt');
                if (element) element.style.display = 'none';
                sessionStorage.setItem('pwa-install-dismissed', 'true');
              }}
              className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
