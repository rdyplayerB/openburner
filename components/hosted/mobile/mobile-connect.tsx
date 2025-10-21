"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { connectWithMobileNFC } from "@/lib/mobile/nfc";
import { useWalletStore } from "@/store/wallet-store";
import { Nfc, Loader2, X, ExternalLink, Download } from "lucide-react";
import { MobileErrorModal } from "./mobile-error-modal";
import { usePWA } from "@/hooks/use-pwa";

export function HostedMobileConnect() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showInstallCard, setShowInstallCard] = useState(true);
  const { setWallet } = useWalletStore();
  const { isInstallable, isInstalled, installApp, shouldEnablePWA } = usePWA();

  // Debug PWA state (only on client side to avoid hydration issues)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🔍 [PWA Debug] State:', {
        shouldEnablePWA,
        isInstallable,
        isInstalled,
        isHosted: process.env.NEXT_PUBLIC_APP_MODE === 'hosted',
        userAgent: navigator.userAgent
      });
    }
  }, [shouldEnablePWA, isInstallable, isInstalled]);

  // No auto-show install message - only show when user taps card

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

  const handleInstallCardClick = () => {
    setShowInstructions(true);
  };

  const handleCloseInstallCard = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowInstallCard(false);
  };

  const handleCancel = () => {
    console.log("🛑 [Hosted Mobile] Connection cancelled by user");
    setIsConnecting(false);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 transition-colors duration-200" style={{ minHeight: '100dvh' }}>
      {/* Main content - perfectly centered */}
      <div className="flex-1 flex items-center justify-center p-4 relative">
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
      </div>

      {/* Install Card - positioned at bottom, outside main content area */}
      {shouldEnablePWA && !isInstalled && showInstallCard && (
        <div className="w-full px-4 pb-6" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <div className="max-w-sm w-full mx-auto">
            <div 
              onClick={handleInstallCardClick}
              className="bg-white dark:bg-slate-800 rounded-xl border border-black/[0.04] dark:border-slate-700/60 shadow-card hover:shadow-card-hover transition-all duration-200 p-4 cursor-pointer active:scale-[0.98] transform"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FF6B35] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Download className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                    Install OpenBurner
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                    Add to home screen for quick access
                  </p>
                </div>
                <div 
                  className="flex-shrink-0 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full p-1 transition-colors"
                  onClick={handleCloseInstallCard}
                >
                  <X className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Instructions Popup */}
      {showInstructions && (
        <div className="fixed inset-0 bg-gray-900/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 max-w-sm w-full">
            <div className="text-white text-center">
              <h3 className="text-lg mb-4">
                Add to Home Screen
              </h3>
              
              <p className="text-sm mb-6">
                Install OpenBurner for quick access from your home screen
              </p>

              <div className="text-left mb-6">
                <p className="text-sm mb-3">
                  How to install:
                </p>
                <p className="text-sm mb-2">
                  1. Look for the Share button (square with arrow up) or menu (three dots)
                </p>
                <p className="text-sm mb-2">
                  2. Find 'Add to Home Screen' or 'Install App' option
                </p>
                <p className="text-sm mb-4">
                  3. Follow the prompts to add OpenBurner to your home screen
                </p>
              </div>
              
              <button
                onClick={() => setShowInstructions(false)}
                className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-6 text-sm"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
