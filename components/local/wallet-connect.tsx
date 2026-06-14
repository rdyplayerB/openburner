"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { getBurnerAddress } from "@/lib/burner";
import { getBurnerAddressViaGateway, startGatewayPairing } from "@/lib/burner-gateway";
import { useWalletStore } from "@/store/wallet-store";
import { Nfc, Loader2, CheckCircle, XCircle, Smartphone, X } from "lucide-react";
import { QRDisplay } from "./qr-display";
import { ModeToggle } from "./mode-toggle";
import { ErrorModal } from "./error-modal";

const BRIDGE_WS_URL = "ws://127.0.0.1:32868/ws";

export function WalletConnect() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorMode, setErrorMode] = useState<'bridge' | 'gateway' | null>(null);
  const [bridgeConnected, setBridgeConnected] = useState<boolean | null>(null);
  const [readerConnected, setReaderConnected] = useState<boolean | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [qrData, setQrData] = useState<{ qrCodeDataURL: string; execURL: string } | null>(null);
  const { setWallet, connectionMode, setConnectionMode } = useWalletStore();
  
  
  // Use ref to track connecting state for interval callback
  const isConnectingRef = useRef(false);

  // Clear errors when connection mode changes
  useEffect(() => {
    setError(null);
    setErrorMode(null);
    console.log('🔄 [WalletConnect] Connection mode changed to:', connectionMode, '- clearing error state');
  }, [connectionMode]);

  useEffect(() => {
    // Only check bridge status in bridge mode
    if (connectionMode === 'bridge') {
      checkBridgeAndReader();
      // Only check status when NOT connecting to avoid WebSocket conflicts
      const interval = setInterval(() => {
        if (!isConnectingRef.current) {
          checkBridgeAndReader();
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [connectionMode]);

  // Poll for gateway connection when QR is shown
  useEffect(() => {
    if (showQR && qrData) {
      let isConnecting = false;
      let connectionAttempted = false;
      
      const pollInterval = setInterval(async () => {
        if (isConnecting || connectionAttempted) return; // Prevent multiple simultaneous connection attempts
        
        try {
          isConnecting = true;
          console.log("🔄 [Gateway] Checking if smartphone is connected...");
          
          // Try to get the wallet info - this will only succeed when smartphone is connected
          const { address, publicKey, keySlot } = await getBurnerAddressViaGateway();
          
          console.log("\n═══════════════════════════════════════════════════════");
          console.log(`✅ [WalletConnect] Gateway connection completed!`);
          console.log("═══════════════════════════════════════════════════════");
          console.log(`   Address: ${address}`);
          console.log(`   Public Key: ${publicKey.substring(0, 40)}...`);
          console.log(`   Key Slot: ${keySlot}`);
          
          console.log("\n💾 [WalletConnect] Calling setWallet() to update store...");
          setWallet(address, publicKey, keySlot);
          
          // Close QR display
          setShowQR(false);
          setQrData(null);
          setIsConnecting(false);
          isConnectingRef.current = false;
          
          console.log("\n═══════════════════════════════════════════════════════");
          console.log("🎉 [WalletConnect] GATEWAY CONNECTION SUCCESSFUL!");
          console.log("═══════════════════════════════════════════════════════\n");
          
          connectionAttempted = true; // Mark as attempted to stop polling
        } catch (err: any) {
          // Connection not ready yet, continue polling
          console.log("⏳ [Gateway] Still waiting for smartphone connection...");
        } finally {
          isConnecting = false;
        }
      }, 3000); // Increased interval to 3 seconds to reduce frequency

      return () => clearInterval(pollInterval);
    }
  }, [showQR, qrData]);

  async function checkBridgeAndReader() {
    let ws: WebSocket | null = null;
    let resolved = false;
    let bridgeOk = false;
    
    try {
      ws = new WebSocket(BRIDGE_WS_URL);

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (bridgeOk) {
            setBridgeConnected(true);
            setReaderConnected(false);
          } else {
            setBridgeConnected(false);
            setReaderConnected(false);
          }
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        }
      }, 2000);

      ws.onopen = () => {
        bridgeOk = true;
        console.log("✅ Bridge connected");
        setBridgeConnected(true);
        // Don't resolve yet - wait for handle_added event or timeout
      };

      ws.onmessage = (event: MessageEvent) => {
        const msg = JSON.parse(event.data);
        console.log("Bridge message:", msg);
        
        if (msg.event === "handle_added" || msg.event === "handle_present") {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            console.log("✅ Reader with chip detected");
            setReaderConnected(true);
            ws?.close();
          }
        }
      };

      ws.onerror = (e) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          console.log("❌ Bridge connection error");
          setBridgeConnected(false);
          setReaderConnected(false);
        }
      };

      ws.onclose = () => {
        // Don't resolve here - let timeout handle it
      };
    } catch (err) {
      if (!resolved) {
        resolved = true;
        setBridgeConnected(false);
        setReaderConnected(false);
      }
    }
  }

  function handleCancel() {
    console.log("🛑 [WalletConnect] Connection cancelled by user");
    setIsConnecting(false);
    isConnectingRef.current = false;
    setError(null);
    setErrorMode(null);
  }

  function handleTryAgain() {
    console.log("🔄 [WalletConnect] Try again clicked, switching to error mode:", errorMode);
    if (errorMode) {
      // Clear error first
      setError(null);
      setErrorMode(null);
      
      // Switch to the mode that had the error
      if (errorMode === 'bridge') {
        console.log("🔄 [WalletConnect] Switching to bridge mode for retry");
        setConnectionMode('bridge');
        // Retry after mode switch
        setTimeout(() => {
          handleConnect();
        }, 150);
      } else if (errorMode === 'gateway') {
        console.log("🔄 [WalletConnect] Switching to gateway mode for retry");
        setConnectionMode('gateway');
        // Retry after mode switch
        setTimeout(() => {
          handleConnect();
        }, 150);
      }
    }
  }

  function handleModeChange() {
    // Clear any errors when switching modes
    setError(null);
    setErrorMode(null);
    setIsConnecting(false);
    isConnectingRef.current = false;
    console.log('🔄 [WalletConnect] Mode changed - clearing error state');
  }

  async function handleConnect() {
    console.log("\n═══════════════════════════════════════════════════════");
    console.log("🚀 [WalletConnect] CONNECT BUTTON CLICKED");
    console.log("═══════════════════════════════════════════════════════");
    console.log("⏰ [WalletConnect] Timestamp:", new Date().toISOString());
    console.log(`🔧 [WalletConnect] Mode: ${connectionMode}`);
    
    // Store the mode when connection starts
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
      console.error("❌ [WalletConnect] CONNECTION FAILED!");
      console.log("═══════════════════════════════════════════════════════");
      console.error("Error:", err);
      
      // Only set error if we're still in the same mode that initiated the connection
      console.log(`🔍 [WalletConnect] Connection started in: ${connectionStartMode}, Current mode: ${connectionMode}`);
      if (connectionStartMode === connectionMode) {
        console.log("✅ [WalletConnect] Mode unchanged, setting error");
        setError(err.message || "Failed to connect Burner card");
        setErrorMode(connectionStartMode);
      } else {
        console.log("⚠️ [WalletConnect] Mode changed, ignoring error");
      }
    } finally {
      setIsConnecting(false);
      isConnectingRef.current = false;
      console.log("🏁 [WalletConnect] Connection attempt finished\n");
    }
  }

  async function handleBridgeConnect() {
    console.log("📞 [WalletConnect] Calling getBurnerAddress()...");
    const connectStart = Date.now();
    const { address, publicKey, keySlot } = await getBurnerAddress();
    const connectDuration = Date.now() - connectStart;
    
    console.log("\n═══════════════════════════════════════════════════════");
    console.log(`✅ [WalletConnect] getBurnerAddress() returned in ${connectDuration}ms`);
    console.log("═══════════════════════════════════════════════════════");
    console.log(`   Address: ${address}`);
    console.log(`   Public Key: ${publicKey.substring(0, 40)}...`);
    console.log(`   Key Slot: ${keySlot}`);
    
    console.log("\n💾 [WalletConnect] Calling setWallet() to update store...");
    setWallet(address, publicKey, keySlot);
    
    console.log("\n═══════════════════════════════════════════════════════");
    console.log("🎉 [WalletConnect] BRIDGE CONNECTION SUCCESSFUL!");
    console.log("═══════════════════════════════════════════════════════\n");
  }

  async function handleGatewayConnect() {
    console.log("📞 [WalletConnect] Starting gateway pairing...");
    const pairStart = Date.now();
    const pairInfo = await startGatewayPairing();
    const pairDuration = Date.now() - pairStart;
    
    console.log("\n═══════════════════════════════════════════════════════");
    console.log(`✅ [WalletConnect] Gateway pairing started in ${pairDuration}ms`);
    console.log("═══════════════════════════════════════════════════════");
    console.log(`   Exec URL: ${pairInfo.execURL}`);
    
    // Show QR code
    setQrData({
      qrCodeDataURL: pairInfo.qrCodeDataURL,
      execURL: pairInfo.execURL
    });
    setShowQR(true);
    
    console.log("📱 [WalletConnect] QR code displayed, waiting for smartphone connection...");
  }


  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Mode Toggle */}
      <ModeToggle onModeChange={handleModeChange} />

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
              {connectionMode === 'bridge'
                ? 'Connect your Burner card using a USB NFC reader'
                : 'Use your smartphone as an NFC reader to connect'
              }
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
                    {connectionMode === 'bridge' ? 'Reading card…' : 'Starting gateway…'}
                  </span>
                </>
              ) : (
                <>
                  {connectionMode === 'bridge' ? (
                    <Nfc className="h-5 w-5" strokeWidth={2.5} />
                  ) : (
                    <Smartphone className="h-5 w-5" strokeWidth={2.5} />
                  )}
                  <span>
                    {connectionMode === 'bridge' ? 'Connect with NFC reader' : 'Connect with smartphone'}
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
            {connectionMode === 'bridge' ? (
              <>
                <div className="flex items-center gap-4 py-3">
                  <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                    {bridgeConnected === null ? (
                      <Loader2 className="w-5 h-5 text-[var(--sw-muted)] animate-spin" strokeWidth={2.5} />
                    ) : bridgeConnected ? (
                      <CheckCircle className="w-5 h-5 text-[var(--sw-up)]" strokeWidth={2.5} />
                    ) : (
                      <XCircle className="w-5 h-5 text-[var(--sw-accent)]" strokeWidth={2.5} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-[var(--sw-ink)]">
                      HaLo Bridge software
                    </p>
                    <p className="text-xs text-[var(--sw-muted)] mt-0.5">
                      {bridgeConnected === null ? 'Checking connection…' :
                       bridgeConnected ? 'Connected and ready' :
                       'Not detected — start HaLo Bridge'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 py-3">
                  <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                    {readerConnected === null ? (
                      <Loader2 className="w-5 h-5 text-[var(--sw-muted)] animate-spin" strokeWidth={2.5} />
                    ) : readerConnected ? (
                      <CheckCircle className="w-5 h-5 text-[var(--sw-up)]" strokeWidth={2.5} />
                    ) : (
                      <XCircle className="w-5 h-5 text-[var(--sw-accent)]" strokeWidth={2.5} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-[var(--sw-ink)]">
                      NFC reader & card
                    </p>
                    <p className="text-xs text-[var(--sw-muted)] mt-0.5">
                      {readerConnected === null ? 'Checking for card…' :
                       readerConnected ? 'Card detected and ready' :
                       'Place your Burner card on the reader'}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
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
    </div>
  );
}