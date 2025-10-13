"use client";

import { useState } from "react";
import { useWalletStore } from "@/store/wallet-store";
import { ChevronDown, Plus } from "lucide-react";

interface Chain {
  chainId: number;
  name: string;
  rpcUrl: string;
}

const POPULAR_CHAINS: Chain[] = [
  { chainId: 1, name: "Ethereum", rpcUrl: "https://eth.llamarpc.com" },
  { chainId: 8453, name: "Base", rpcUrl: "https://mainnet.base.org" },
  { chainId: 56, name: "BNB Chain", rpcUrl: "https://bsc-dataseed1.binance.org" },
  { chainId: 42161, name: "Arbitrum One", rpcUrl: "https://arb1.arbitrum.io/rpc" },
  { chainId: 43114, name: "Avalanche", rpcUrl: "https://api.avax.network/ext/bc/C/rpc" },
  { chainId: 81457, name: "Blast", rpcUrl: "https://rpc.blast.io" },
  { chainId: 59144, name: "Linea Mainnet", rpcUrl: "https://rpc.linea.build" },
  { chainId: 5000, name: "Mantle", rpcUrl: "https://rpc.mantle.xyz" },
  { chainId: 34443, name: "Mode Mainnet", rpcUrl: "https://mainnet.mode.network" },
  { chainId: 10, name: "OP Mainnet", rpcUrl: "https://mainnet.optimism.io" },
  { chainId: 137, name: "Polygon", rpcUrl: "https://polygon-rpc.com" },
  { chainId: 534352, name: "Scroll", rpcUrl: "https://rpc.scroll.io" },
  { chainId: 1301, name: "Unichain", rpcUrl: "https://sepolia.unichain.org" },
];

export function ChainSelector() {
  const { chainId, chainName, rpcUrl, setChain } = useWalletStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [customRpc, setCustomRpc] = useState("");
  const [customChainId, setCustomChainId] = useState("");
  const [customName, setCustomName] = useState("");
  const [showCustomForm, setShowCustomForm] = useState(false);

  function handleChainSelect(chain: Chain) {
    setChain(chain.chainId, chain.rpcUrl, chain.name);
    setIsExpanded(false);
    setShowCustomForm(false);
  }

  function handleCustomChain() {
    if (!customRpc || !customChainId || !customName) return;

    setChain(parseInt(customChainId), customRpc, customName);
    setCustomRpc("");
    setCustomChainId("");
    setCustomName("");
    setShowCustomForm(false);
    setIsExpanded(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Network</h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
        >
          {isExpanded ? "Close" : "Change"}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-3">
          <div className="space-y-2">
            {POPULAR_CHAINS.map((chain) => (
              <button
                key={chain.chainId}
                onClick={() => handleChainSelect(chain)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors text-sm ${
                  chainId === chain.chainId
                    ? "bg-slate-900 text-white"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-900"
                }`}
              >
                <div className="font-medium">{chain.name}</div>
                <div className="text-xs opacity-60 font-mono mt-0.5">
                  Chain ID: {chain.chainId}
                </div>
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100">
            <button
              onClick={() => setShowCustomForm(!showCustomForm)}
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              {showCustomForm ? "Cancel" : "Add Custom RPC"}
            </button>

            {showCustomForm && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    Network Name
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g., My Custom Network"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    RPC URL
                  </label>
                  <input
                    type="text"
                    value={customRpc}
                    onChange={(e) => setCustomRpc(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    Chain ID
                  </label>
                  <input
                    type="number"
                    value={customChainId}
                    onChange={(e) => setCustomChainId(e.target.value)}
                    placeholder="1"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <button
                  onClick={handleCustomChain}
                  disabled={!customRpc || !customChainId || !customName}
                  className="w-full bg-slate-900 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Network
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
