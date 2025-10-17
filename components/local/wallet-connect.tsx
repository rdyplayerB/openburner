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
                         'Not detected - please start HaLo Bridge'}
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
    </div>
  );
}