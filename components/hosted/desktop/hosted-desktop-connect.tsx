"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { getBurnerAddressViaGateway, startGatewayPairing } from "@/lib/burner-gateway";
import { useWalletStore } from "@/store/wallet-store";
import { Nfc, Loader2, CheckCircle, XCircle, Smartphone, X, ExternalLink } from "lucide-react";
import { QRDisplay } from "@/components/local/qr-display";
import { ErrorModal } from "@/components/common/error-modal";
import { ConsentModal } from "@/components/common/consent-modal";

export function HostedDesktopConnect() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorMode, setErrorMode] = useState<'gateway' | null>(null);
  // readerConnected removed - not needed for gateway-only mode
  const [showQR, setShowQR] = useState(false);
  const [qrData, setQrData] = useState<{ qrCodeDataURL: string; execURL: string } | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentURL, setConsentURL] = useState<string | null>(null);
  const { setWallet, connectionMode, setConnectionMode } = useWalletStore();
  
  // Use ref to track connecting state for interval callback
  const isConnectingRef = useRef(false);

  // Clear errors when connection mode changes
  useEffect(() => {
    setError(null);
    setErrorMode(null);
    console.log('🔄 [Hosted Desktop] Connection mode changed to:', connectionMode, '- clearing error state');
    
    // Force gateway mode for hosted environments (bridge doesn't work due to mixed content policy)
    if (connectionMode === 'bridge') {
      console.log('🔄 [Hosted Desktop] Bridge mode not supported in hosted environment, switching to gateway');
      setConnectionMode('gateway');
    }
  }, [connectionMode, setConnectionMode]);

  // Bridge mode not supported in hosted environment

  // Cleanup on unmount - not needed for gateway-only mode

  // Poll for gateway connection when QR is shown
  useEffect(() => {
    if (showQR && qrData) {
      let isConnecting = false;
      let connectionAttempted = false;
      
      const pollInterval = setInterval(async () => {
        if (isConnecting || connectionAttempted) return;
        
        try {
          isConnecting = true;
          console.log("🔄 [Gateway] Checking if smartphone is connected...");
          
          const { address, publicKey, keySlot } = await getBurnerAddressViaGateway();
          
          console.log("\n═══════════════════════════════════════════════════════");
          console.log(`✅ [Hosted Desktop] Gateway connection completed!`);
          console.log("═══════════════════════════════════════════════════════");
          console.log(`   Address: ${address}`);
          console.log(`   Public Key: ${publicKey.substring(0, 40)}...`);
          console.log(`   Key Slot: ${keySlot}`);
          
          setWallet(address, publicKey, keySlot);
          
          setShowQR(false);
          setQrData(null);
          setIsConnecting(false);
          isConnectingRef.current = false;
          
          console.log("\n═══════════════════════════════════════════════════════");
          console.log("🎉 [Hosted Desktop] GATEWAY CONNECTION SUCCESSFUL!");
          console.log("═══════════════════════════════════════════════════════\n");
          
          connectionAttempted = true;
        } catch (err: any) {
          console.log("⏳ [Gateway] Still waiting for smartphone connection...");
        } finally {
          isConnecting = false;
        }
      }, 3000);

      return () => clearInterval(pollInterval);
    }
  }, [showQR, qrData]);

  // Bridge functions removed - not supported in hosted environment

  function handleCancel() {
    console.log("🛑 [Hosted Desktop] Connection cancelled by user");
    setIsConnecting(false);
    isConnectingRef.current = false;
    setError(null);
    setErrorMode(null);
  }

  function handleTryAgain() {
    console.log("🔄 [Hosted Desktop] Try again clicked, retrying gateway connection");
    setError(null);
    setErrorMode(null);
    setConnectionMode('gateway');
    setTimeout(() => {
      handleConnect();
    }, 150);
  }

  // Mode change not supported - only gateway mode available

  async function handleConsentAllow() {
    console.log("✅ [Hosted Desktop] User granted consent");
    
    // Open the consent URL in a new tab for the user to complete the actual consent
    if (consentURL) {
      console.log("🔗 [Hosted Desktop] Opening consent URL:", consentURL);
      window.open(consentURL, '_blank', 'noopener,noreferrer');
      
      // Show instructions to the user
      setError("Please complete the consent process in the new tab that opened, then click 'Try Again' below.");
      setShowConsentModal(false);
      setConsentURL(null);
      setIsConnecting(false);
      isConnectingRef.current = false;
      return;
    }
    
    // Fallback: try to retry immediately if no consent URL
    setShowConsentModal(false);
    setConsentURL(null);
    
    // Bridge retry removed - not supported in hosted environment
    console.log("⚠️ [Hosted Desktop] Bridge retry not supported in hosted environment");
    setError("Bridge mode not supported in hosted environment. Please use gateway mode.");
  }

  function handleConsentDeny() {
    console.log("❌ [Hosted Desktop] User denied consent");
    setShowConsentModal(false);
    setConsentURL(null);
    setIsConnecting(false);
    isConnectingRef.current = false;
    setError("Consent denied. Please try again and allow access to HaLo.");
    setErrorMode('gateway');
  }

  function handleConsentClose() {
    console.log("🛑 [Hosted Desktop] Consent modal closed");
    setShowConsentModal(false);
    setConsentURL(null);
    setIsConnecting(false);
    isConnectingRef.current = false;
  }

  async function handleConnect() {
    console.log("\n═══════════════════════════════════════════════════════");
    console.log("🚀 [Hosted Desktop] CONNECT BUTTON CLICKED");
    console.log("═══════════════════════════════════════════════════════");
    console.log("⏰ [Hosted Desktop] Timestamp:", new Date().toISOString());
    console.log(`🔧 [Hosted Desktop] Mode: ${connectionMode} (gateway only in hosted)`);
    
    setIsConnecting(true);
    isConnectingRef.current = true;
    setError(null);

    try {
      // Only gateway mode supported in hosted environment
      await handleGatewayConnect();
    } catch (err: any) {
      console.log("\n═══════════════════════════════════════════════════════");
      console.error("❌ [Hosted Desktop] CONNECTION FAILED!");
      console.log("═══════════════════════════════════════════════════════");
      console.error("Error:", err);
      
      setError(err.message || "Failed to connect Burner card");
      setErrorMode('gateway');
    } finally {
      setIsConnecting(false);
      isConnectingRef.current = false;
      console.log("🏁 [Hosted Desktop] Connection attempt finished\n");
    }
  }

  // Bridge connection removed - not supported in hosted environment

  async function handleGatewayConnect() {
    console.log("📞 [Hosted Desktop] Starting gateway pairing...");
    const pairStart = Date.now();
    const pairInfo = await startGatewayPairing();
    const pairDuration = Date.now() - pairStart;
    
    console.log("\n═══════════════════════════════════════════════════════");
    console.log(`✅ [Hosted Desktop] Gateway pairing started in ${pairDuration}ms`);
    console.log("═══════════════════════════════════════════════════════");
    console.log(`   Exec URL: ${pairInfo.execURL}`);
    
    setQrData({
      qrCodeDataURL: pairInfo.qrCodeDataURL,
      execURL: pairInfo.execURL
    });
    setShowQR(true);
    
    console.log("📱 [Hosted Desktop] QR code displayed, waiting for smartphone connection...");
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-in fade-in-50 duration-500">
      {/* Mode Toggle - Hidden in hosted environment (only gateway supported) */}
      {/* <div className="animate-in slide-in-from-top-4 duration-700">
        <ModeToggle onModeChange={handleModeChange} />
      </div> */}
      
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-black/[0.04] dark:border-slate-700/60 shadow-card-lg overflow-hidden transition-colors duration-300">
        <div className="text-center px-8 pt-10 pb-8">
          {/* Icon and Header */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-4 mb-6">
              <Image 
                src="/images/openburnerlogo.svg" 
                alt="OpenBurner logo" 
                width={56} 
                height={56} 
                className="w-14 h-14 drop-shadow-sm"
              />
              <h1 className="text-3xl font-bold text-black dark:text-white tracking-tight leading-none transition-colors duration-300">
                Open<span className="text-[#FF6B35]">Burner</span>
              </h1>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-base font-medium leading-relaxed max-w-sm mx-auto transition-colors duration-300">
              Use your smartphone as an NFC reader to connect
            </p>
          </div>

          {/* Connect Button */}
          <div className="space-y-3">
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] hover:from-[#E55A2B] hover:to-[#FF7A3A] text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:shadow-orange-500/25 text-lg active:scale-[0.98] transform hover:scale-[1.02] disabled:hover:scale-100"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="animate-spin h-6 w-6" strokeWidth={2.5} />
                  <span>
                    Starting gateway...
                  </span>
                </>
              ) : (
                <>
                  <Smartphone className="h-6 w-6" strokeWidth={2.5} />
                  <span>
                    Connect with Smartphone
                  </span>
                </>
              )}
            </button>
            
            {/* Cancel Button - only show when connecting */}
            {isConnecting && (
              <button
                onClick={handleCancel}
                className="w-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
                <span>Cancel</span>
              </button>
            )}
            
          </div>

        </div>

        {/* Requirements List */}
        <div className="bg-slate-50/80 dark:bg-slate-800/80 px-8 py-6 border-t border-slate-200/60 dark:border-slate-700/60 transition-colors duration-300">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 mb-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors duration-300">
                Connection Requirements
              </h3>
            </div>
            
            <div className="space-y-3">
              {/* Gateway mode only - bridge mode not supported in hosted environment */}
              <div className="flex items-center gap-4 p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-800/60 transition-colors duration-300">
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-500" strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-slate-800 dark:text-slate-200 transition-colors duration-300">
                    Internet Connection
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 transition-colors duration-300">
                    Required for gateway communication
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-3 rounded-xl bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/60 transition-colors duration-300">
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-amber-600" strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-slate-800 dark:text-slate-200 transition-colors duration-300">
                    Smartphone with NFC
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 transition-colors duration-300">
                    Your phone will act as the NFC reader
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
      
      {/* QR Code Display */}
      {showQR && qrData && (
        <QRDisplay
          qrCodeDataURL={qrData.qrCodeDataURL}
          execURL={qrData.execURL}
          onClose={() => {
            setShowQR(false);
            setQrData(null);
            setIsConnecting(false);
            isConnectingRef.current = false;
          }}
        />
      )}

      {/* Error Modal */}
      <ErrorModal
        error={error}
        onClose={() => {
          setError(null);
          setErrorMode(null);
        }}
        onTryAgain={handleTryAgain}
      />

      {/* Consent Modal */}
      <ConsentModal
        isOpen={showConsentModal}
        website={typeof window !== 'undefined' ? window.location.origin : 'https://app.openburner.xyz'}
        onAllow={handleConsentAllow}
        onDeny={handleConsentDeny}
        onClose={handleConsentClose}
      />
    </div>
  );
}
