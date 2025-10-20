"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { getBurnerAddress } from "@/lib/burner";
import { getBurnerAddressViaGateway, startGatewayPairing } from "@/lib/burner-gateway";
import { getHaloBridgeService, getBurnerAddressViaBridge, cleanupHaloBridge } from "@/lib/halo-bridge";
import { useWalletStore } from "@/store/wallet-store";
import { Nfc, Loader2, CheckCircle, XCircle, Smartphone, X } from "lucide-react";
import { QRDisplay } from "@/components/local/qr-display";
import { ModeToggle } from "@/components/local/mode-toggle";
import { ErrorModal } from "@/components/common/error-modal";
import { ConsentModal } from "@/components/common/consent-modal";

export function HostedDesktopConnect() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorMode, setErrorMode] = useState<'bridge' | 'gateway' | null>(null);
  const [bridgeConnected, setBridgeConnected] = useState<boolean | null>(null);
  const [readerConnected, setReaderConnected] = useState<boolean | null>(null);
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
  }, [connectionMode]);

  useEffect(() => {
    // Only check bridge status in bridge mode
    if (connectionMode === 'bridge') {
      checkHaloBridgeStatus();
      // Only check status when NOT connecting to avoid conflicts
      const interval = setInterval(() => {
        if (!isConnectingRef.current) {
          checkHaloBridgeStatus();
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [connectionMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupHaloBridge();
    };
  }, []);

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

  async function checkHaloBridgeStatus() {
    try {
      const bridge = getHaloBridgeService();
      const isConnected = bridge.isConnected();
      
      if (isConnected) {
        console.log("✅ HaloBridge connected");
        setBridgeConnected(true);
        setReaderConnected(true); // Assume reader is available if bridge is connected
      } else {
        console.log("❌ HaloBridge not connected");
        setBridgeConnected(false);
        setReaderConnected(false);
      }
    } catch (err) {
      console.log("❌ HaloBridge status check failed:", err);
      setBridgeConnected(false);
      setReaderConnected(false);
    }
  }

  function handleCancel() {
    console.log("🛑 [Hosted Desktop] Connection cancelled by user");
    setIsConnecting(false);
    isConnectingRef.current = false;
    setError(null);
    setErrorMode(null);
  }

  function handleTryAgain() {
    console.log("🔄 [Hosted Desktop] Try again clicked, switching to error mode:", errorMode);
    if (errorMode) {
      setError(null);
      setErrorMode(null);
      
      if (errorMode === 'bridge') {
        console.log("🔄 [Hosted Desktop] Switching to bridge mode for retry");
        setConnectionMode('bridge');
        setTimeout(() => {
          handleConnect();
        }, 150);
      } else if (errorMode === 'gateway') {
        console.log("🔄 [Hosted Desktop] Switching to gateway mode for retry");
        setConnectionMode('gateway');
        setTimeout(() => {
          handleConnect();
        }, 150);
      }
    }
  }

  function handleModeChange() {
    setError(null);
    setErrorMode(null);
    setIsConnecting(false);
    isConnectingRef.current = false;
    setShowConsentModal(false);
    setConsentURL(null);
    console.log('🔄 [Hosted Desktop] Mode changed - clearing error state');
  }

  async function handleConsentAllow() {
    console.log("✅ [Hosted Desktop] User granted consent");
    setShowConsentModal(false);
    setConsentURL(null);
    
    // Retry the bridge connection after consent
    try {
      console.log("🔄 [Hosted Desktop] Retrying bridge connection after consent...");
      const bridge = getHaloBridgeService();
      await bridge.retryAfterConsent();
      
      // Now get the burner address
      const { address, publicKey, keySlot } = await getBurnerAddressViaBridge();
      
      console.log("\n═══════════════════════════════════════════════════════");
      console.log(`✅ [Hosted Desktop] HaloBridge connection completed after consent`);
      console.log("═══════════════════════════════════════════════════════");
      console.log(`   Address: ${address}`);
      console.log(`   Public Key: ${publicKey.substring(0, 40)}...`);
      console.log(`   Key Slot: ${keySlot}`);
      
      setWallet(address, publicKey, keySlot);
      
      console.log("\n═══════════════════════════════════════════════════════");
      console.log("🎉 [Hosted Desktop] BRIDGE CONNECTION SUCCESSFUL!");
      console.log("═══════════════════════════════════════════════════════\n");
    } catch (error) {
      console.error("❌ [Hosted Desktop] Bridge connection failed after consent:", error);
      setError(error instanceof Error ? error.message : "Bridge connection failed after consent");
    }
  }

  function handleConsentDeny() {
    console.log("❌ [Hosted Desktop] User denied consent");
    setShowConsentModal(false);
    setConsentURL(null);
    setIsConnecting(false);
    isConnectingRef.current = false;
    setError("Consent denied. Please try again and allow access to HaLo.");
    setErrorMode('bridge');
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
    console.log(`🔧 [Hosted Desktop] Mode: ${connectionMode}`);
    
    const connectionStartMode = connectionMode;
    
    setIsConnecting(true);
    isConnectingRef.current = true;
    setError(null);

    try {
      if (connectionMode === 'bridge') {
        await handleBridgeConnect();
      } else {
        await handleGatewayConnect();
      }
    } catch (err: any) {
      console.log("\n═══════════════════════════════════════════════════════");
      console.error("❌ [Hosted Desktop] CONNECTION FAILED!");
      console.log("═══════════════════════════════════════════════════════");
      console.error("Error:", err);
      
      if (connectionStartMode === connectionMode) {
        console.log("✅ [Hosted Desktop] Mode unchanged, setting error");
        setError(err.message || "Failed to connect Burner card");
        setErrorMode(connectionStartMode);
      } else {
        console.log("⚠️ [Hosted Desktop] Mode changed, ignoring error");
      }
    } finally {
      setIsConnecting(false);
      isConnectingRef.current = false;
      console.log("🏁 [Hosted Desktop] Connection attempt finished\n");
    }
  }

  async function handleBridgeConnect() {
    console.log("📞 [Hosted Desktop] Starting HaloBridge connection...");
    const connectStart = Date.now();
    
    try {
      const { address, publicKey, keySlot } = await getBurnerAddressViaBridge();
      const connectDuration = Date.now() - connectStart;
      
      console.log("\n═══════════════════════════════════════════════════════");
      console.log(`✅ [Hosted Desktop] HaloBridge connection completed in ${connectDuration}ms`);
      console.log("═══════════════════════════════════════════════════════");
      console.log(`   Address: ${address}`);
      console.log(`   Public Key: ${publicKey.substring(0, 40)}...`);
      console.log(`   Key Slot: ${keySlot}`);
      
      setWallet(address, publicKey, keySlot);
      
      console.log("\n═══════════════════════════════════════════════════════");
      console.log("🎉 [Hosted Desktop] BRIDGE CONNECTION SUCCESSFUL!");
      console.log("═══════════════════════════════════════════════════════\n");
    } catch (error: any) {
      console.error("❌ [Hosted Desktop] HaloBridge connection failed:", error);
      console.log("🔍 [Hosted Desktop] Debug: Error message:", error.message);
      console.log("🔍 [Hosted Desktop] Debug: Error type:", error.constructor.name);
      console.log("🔍 [Hosted Desktop] Debug: Current showConsentModal state:", showConsentModal);
      
      // Check for consent error - either by message or by error type
      if (error.message === "CONSENT_REQUIRED" || 
          error.message === "No user consent for this origin." ||
          error.constructor.name === "NFCBridgeConsentError" ||
          error.name === "NFCBridgeConsentError") {
        console.log("🔐 [Hosted Desktop] Consent required - showing consent modal");
        const bridge = getHaloBridgeService();
        const consentURL = bridge.getConsentURL();
        console.log("🔍 [Hosted Desktop] Debug: Consent URL:", consentURL);
        if (consentURL) {
          setConsentURL(consentURL);
          setShowConsentModal(true);
          console.log("🔍 [Hosted Desktop] Debug: Consent modal should now be visible");
          return; // Don't throw error, wait for user consent
        } else {
          console.log("❌ [Hosted Desktop] Debug: No consent URL available");
        }
      }
      
      if (error.message === "BRIDGE_NOT_AVAILABLE") {
        console.log("🔌 [Hosted Desktop] Bridge not available");
        throw new Error("HaLo Bridge service not found. Please ensure the HaLo Bridge software is installed and running on your computer. Alternatively, you can use Gateway mode with your smartphone as an NFC reader.");
      }
      
      throw error;
    }
  }

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
      {/* Mode Toggle */}
      <div className="animate-in slide-in-from-top-4 duration-700">
        <ModeToggle onModeChange={handleModeChange} />
      </div>
      
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
              {connectionMode === 'bridge' 
                ? 'Connect your Burner card using a USB NFC reader (requires HaLo Bridge software)'
                : 'Use your smartphone as an NFC reader to connect'
              }
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
                    {connectionMode === 'bridge' ? 'Reading card...' : 'Starting gateway...'}
                  </span>
                </>
              ) : (
                <>
                  {connectionMode === 'bridge' ? (
                    <Nfc className="h-6 w-6" strokeWidth={2.5} />
                  ) : (
                    <Smartphone className="h-6 w-6" strokeWidth={2.5} />
                  )}
                  <span>
                    {connectionMode === 'bridge' ? 'Connect with NFC Reader' : 'Connect with Smartphone'}
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
            
            {/* Debug Test Button */}
            <button
              onClick={() => {
                console.log("🔍 [Debug] Manually triggering consent modal");
                setShowConsentModal(true);
                setConsentURL("http://127.0.0.1:32868/consent?website=" + window.location.origin);
              }}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 mt-2"
            >
              Test Consent Modal (Debug)
            </button>
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
              {connectionMode === 'bridge' ? (
                <>
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-white/60 dark:bg-slate-700/60 border border-slate-200/60 dark:border-slate-600/60 transition-colors duration-300">
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                      {bridgeConnected === null ? (
                        <Loader2 className="w-5 h-5 text-slate-400 dark:text-slate-500 animate-spin" strokeWidth={2.5} />
                      ) : bridgeConnected ? (
                        <CheckCircle className="w-6 h-6 text-emerald-500" strokeWidth={2.5} />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-500" strokeWidth={2.5} />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium text-sm transition-colors duration-300 ${bridgeConnected ? "text-slate-800 dark:text-slate-200" : "text-slate-600 dark:text-slate-400"}`}>
                        HaLo Bridge Software
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5 transition-colors duration-300">
                        {bridgeConnected === null ? 'Checking connection...' : 
                         bridgeConnected ? 'Connected and ready' : 
                         'Not running - install HaLo Bridge software or use Gateway mode'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-white/60 dark:bg-slate-700/60 border border-slate-200/60 dark:border-slate-600/60 transition-colors duration-300">
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                      {readerConnected === null ? (
                        <Loader2 className="w-5 h-5 text-slate-400 dark:text-slate-500 animate-spin" strokeWidth={2.5} />
                      ) : readerConnected ? (
                        <CheckCircle className="w-6 h-6 text-emerald-500" strokeWidth={2.5} />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-500" strokeWidth={2.5} />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium text-sm transition-colors duration-300 ${readerConnected ? "text-slate-800 dark:text-slate-200" : "text-slate-600 dark:text-slate-400"}`}>
                        NFC Reader & Card
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5 transition-colors duration-300">
                        {readerConnected === null ? 'Checking for card...' : 
                         readerConnected ? 'Card detected and ready' : 
                         'Place your Burner card on the reader'}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
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
