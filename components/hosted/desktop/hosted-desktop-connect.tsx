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
    <div className="max-w-lg mx-auto space-y-6">
      {/* Mode Toggle - Hidden in hosted environment (only gateway supported) */}

      <div className="sw-surface rounded-xl border border-[var(--sw-line)] overflow-hidden">
        <div className="text-center px-8 pt-10 pb-8">
          {/* Icon and Header */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Image
                src="/images/openburnerlogo.svg"
                alt="OpenBurner logo"
                width={40}
                height={40}
                className="w-10 h-10 -mt-1"
              />
              <h1 className="text-3xl font-bold text-[var(--sw-ink)] tracking-tight leading-none">
                Open<span className="sw-accent">Burner</span>
              </h1>
            </div>
            <p className="text-[var(--sw-ink-soft)] text-base leading-relaxed max-w-sm mx-auto">
              Use your smartphone as an NFC reader to connect
            </p>
          </div>

          {/* Connect Button */}
          <div className="space-y-3">
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="sw-btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" strokeWidth={2.5} />
                  <span>
                    Starting gateway…
                  </span>
                </>
              ) : (
                <>
                  <Smartphone className="h-5 w-5" strokeWidth={2.5} />
                  <span>
                    Connect with smartphone
                  </span>
                </>
              )}
            </button>

            {/* Cancel Button - only show when connecting */}
            {isConnecting && (
              <button
                onClick={handleCancel}
                className="sw-btn-ghost w-full py-3 text-sm flex items-center justify-center gap-2"
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
                <span>Cancel</span>
              </button>
            )}

          </div>

        </div>

        {/* Requirements List */}
        <div className="px-8 py-6 border-t border-[var(--sw-line)]">
          <div className="sw-uplabel mb-4">Connection requirements</div>

          <div className="sw-list">
            {/* Gateway mode only - bridge mode not supported in hosted environment */}
            <div className="flex items-center gap-4 py-3">
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[var(--sw-up)]" strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm text-[var(--sw-ink)]">
                  Internet connection
                </p>
                <p className="text-xs text-[var(--sw-muted)] mt-0.5">
                  Required for gateway communication
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 py-3">
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-[var(--sw-accent)]" strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm text-[var(--sw-ink)]">
                  Smartphone with NFC
                </p>
                <p className="text-xs text-[var(--sw-muted)] mt-0.5">
                  Your phone will act as the NFC reader
                </p>
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
          className="inline-flex items-center gap-2 text-[var(--sw-muted)] hover:text-[var(--sw-accent)] text-sm transition-colors duration-200"
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
