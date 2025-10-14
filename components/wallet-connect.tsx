"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { getBurnerAddress } from "@/lib/burner";
import { useWalletStore } from "@/store/wallet-store";
import { Nfc, Loader2, AlertCircle, CheckCircle, XCircle } from "lucide-react";

const BRIDGE_WS_URL = "ws://127.0.0.1:32868/ws";

export function WalletConnect() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bridgeConnected, setBridgeConnected] = useState<boolean | null>(null);
  const [readerConnected, setReaderConnected] = useState<boolean | null>(null);
  const { setWallet } = useWalletStore();

  useEffect(() => {
    checkBridgeAndReader();
    const interval = setInterval(checkBridgeAndReader, 3000);
    return () => clearInterval(interval);
  }, []);

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

  async function handleConnect() {
    setIsConnecting(true);
    setError(null);

    try {
      const { address, publicKey, keySlot } = await getBurnerAddress();
      setWallet(address, publicKey, keySlot);
    } catch (err: any) {
      setError(err.message || "Failed to connect Burner card");
    } finally {
      setIsConnecting(false);
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xl max-w-md mx-auto overflow-hidden">
      <div className="text-center px-10 pt-12 pb-10">
        {/* Icon and Header */}
        <div className="mb-10">
          <div className="flex items-center justify-center gap-3 mb-7">
            <Image 
              src="/images/openburnerlogo.svg" 
              alt="OpenBurner logo" 
              width={64} 
              height={64} 
              className="w-16 h-16"
            />
            <h1 className="text-[2.75rem] font-bold text-black mb-0 tracking-tight leading-none mt-1">
              OpenBurner
            </h1>
          </div>
          <p className="text-slate-500 text-[1.0625rem] font-medium">
            Run HaLo Bridge, then place Burner on NFC reader to connect
          </p>
        </div>

        {/* Connect Button */}
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full bg-gradient-to-r from-slate-900 to-slate-800 text-white font-semibold py-[1.125rem] px-6 rounded-[0.875rem] hover:from-slate-800 hover:to-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl text-[1.0625rem] active:scale-[0.98]"
        >
          {isConnecting ? (
            <>
              <Loader2 className="animate-spin h-5 w-5" strokeWidth={2.5} />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <Nfc className="h-5 w-5" strokeWidth={2.5} />
              <span>Connect</span>
            </>
          )}
        </button>

        {/* Error State */}
        {error && (
          <div className="mt-5 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-[1.125rem] h-[1.125rem] text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-[0.9375rem] text-left font-medium leading-relaxed">{error}</p>
          </div>
        )}
      </div>

      {/* Requirements List */}
      <div className="bg-gradient-to-b from-slate-50/80 to-slate-50 px-10 py-7 border-t border-slate-200/60">
        <ul className="text-[0.9375rem] space-y-3.5">
          <li className="flex items-center gap-3.5">
            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              {bridgeConnected === null ? (
                <Loader2 className="w-[1.125rem] h-[1.125rem] text-slate-400 animate-spin" strokeWidth={2.5} />
              ) : bridgeConnected ? (
                <CheckCircle className="w-5 h-5 text-emerald-600" strokeWidth={2.5} />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" strokeWidth={2.5} />
              )}
            </div>
            <span className={`font-medium ${bridgeConnected ? "text-slate-700" : "text-slate-500"}`}>
              HaLo Bridge running
            </span>
          </li>
          <li className="flex items-center gap-3.5">
            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              {readerConnected === null ? (
                <Loader2 className="w-[1.125rem] h-[1.125rem] text-slate-400 animate-spin" strokeWidth={2.5} />
              ) : readerConnected ? (
                <CheckCircle className="w-5 h-5 text-emerald-600" strokeWidth={2.5} />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" strokeWidth={2.5} />
              )}
            </div>
            <span className={`font-medium ${readerConnected ? "text-slate-700" : "text-slate-500"}`}>
              NFC reader & chip detected
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

