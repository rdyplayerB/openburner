"use client";

import { useEffect, useState, useRef } from "react";
import { useWalletStore } from "@/store/wallet-store";
import { TokenList } from "./token-list";
import { SendToken } from "./send-token";
import { ethers } from "ethers";
import { Copy, LogOut, CheckCircle, ChevronDown, Plus, Network, Send, Download, Repeat2, QrCode, ExternalLink, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { getTokenPrice } from "@/lib/price-oracle";

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
}


interface Chain {
  chainId: number;
  name: string;
  rpcUrl: string;
  logo: string;
}

const POPULAR_CHAINS: Chain[] = [
  { chainId: 1, name: "Ethereum", rpcUrl: "https://eth.llamarpc.com", logo: "https://icons.llamao.fi/icons/chains/rsz_ethereum.jpg" },
  { chainId: 8453, name: "Base", rpcUrl: "https://mainnet.base.org", logo: "https://icons.llamao.fi/icons/chains/rsz_base.jpg" },
  { chainId: 56, name: "BNB Chain", rpcUrl: "https://bsc-dataseed1.binance.org", logo: "https://icons.llamao.fi/icons/chains/rsz_binance.jpg" },
  { chainId: 42161, name: "Arbitrum One", rpcUrl: "https://arb1.arbitrum.io/rpc", logo: "https://icons.llamao.fi/icons/chains/rsz_arbitrum.jpg" },
  { chainId: 43114, name: "Avalanche", rpcUrl: "https://api.avax.network/ext/bc/C/rpc", logo: "https://icons.llamao.fi/icons/chains/rsz_avalanche.jpg" },
  { chainId: 81457, name: "Blast", rpcUrl: "https://rpc.blast.io", logo: "https://icons.llamao.fi/icons/chains/rsz_blast.jpg" },
  { chainId: 59144, name: "Linea Mainnet", rpcUrl: "https://rpc.linea.build", logo: "https://icons.llamao.fi/icons/chains/rsz_linea.jpg" },
  { chainId: 5000, name: "Mantle", rpcUrl: "https://rpc.mantle.xyz", logo: "https://icons.llamao.fi/icons/chains/rsz_mantle.jpg" },
  { chainId: 34443, name: "Mode Mainnet", rpcUrl: "https://mainnet.mode.network", logo: "https://icons.llamao.fi/icons/chains/rsz_mode.jpg" },
  { chainId: 10, name: "OP Mainnet", rpcUrl: "https://mainnet.optimism.io", logo: "https://icons.llamao.fi/icons/chains/rsz_optimism.jpg" },
  { chainId: 137, name: "Polygon", rpcUrl: "https://polygon-rpc.com", logo: "https://icons.llamao.fi/icons/chains/rsz_polygon.jpg" },
  { chainId: 534352, name: "Scroll", rpcUrl: "https://rpc.scroll.io", logo: "https://icons.llamao.fi/icons/chains/rsz_scroll.jpg" },
  { chainId: 1301, name: "Unichain", rpcUrl: "https://sepolia.unichain.org", logo: "https://icons.llamao.fi/icons/chains/rsz_unichain.jpg" },
];

function getNativeTokenSymbol(chainId: number): string {
  switch (chainId) {
    case 56: // BNB Chain
      return "BNB";
    case 137: // Polygon
      return "MATIC";
    case 43114: // Avalanche
      return "AVAX";
    case 5000: // Mantle
      return "MNT";
    default:
      return "ETH";
  }
}

// Block explorer URLs for each chain
const BLOCK_EXPLORERS: Record<number, string> = {
  1: "https://etherscan.io",
  8453: "https://basescan.org",
  56: "https://bscscan.com",
  42161: "https://arbiscan.io",
  43114: "https://snowtrace.io",
  81457: "https://blastscan.io",
  59144: "https://lineascan.build",
  5000: "https://explorer.mantle.xyz",
  34443: "https://explorer.mode.network",
  10: "https://optimistic.etherscan.io",
  137: "https://polygonscan.com",
  534352: "https://scrollscan.com",
  1301: "https://unichain-sepolia.blockscout.com",
};

export function WalletDashboard() {
  const { address, balance, rpcUrl, chainName, chainId, disconnect, setBalance, setChain } =
    useWalletStore();
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [copied, setCopied] = useState(false);
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customRpc, setCustomRpc] = useState("");
  const [customChainId, setCustomChainId] = useState("");
  const [customName, setCustomName] = useState("");
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveAddressCopied, setReceiveAddressCopied] = useState(false);
  const [nativeTokenPrice, setNativeTokenPrice] = useState<number>(0);
  const customFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (address && rpcUrl) {
      loadBalance();
    }
  }, [address, rpcUrl]);

  useEffect(() => {
    // Load price for the native token when chain changes
    loadNativeTokenPrice();
  }, [chainId]);

  async function loadNativeTokenPrice() {
    try {
      const symbol = getNativeTokenSymbol(chainId);
      console.log(`💰 Fetching price for ${symbol}...`);
      const price = await getTokenPrice(symbol);
      console.log(`✅ ${symbol} price: $${price}`);
      setNativeTokenPrice(price);
    } catch (err) {
      console.error("Error loading native token price:", err);
      setNativeTokenPrice(0);
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (showNetworkDropdown && !target.closest('.network-dropdown')) {
        setShowNetworkDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNetworkDropdown]);

  async function loadBalance() {
    if (!address || !rpcUrl) return;

    setIsLoadingBalance(true);
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const balanceWei = await provider.getBalance(address);
      const balanceEth = ethers.formatEther(balanceWei);
      setBalance(balanceEth);
      
      // Also refresh the price when loading balance
      await loadNativeTokenPrice();
    } catch (error) {
      console.error("Error loading balance:", error);
      setBalance("0");
    } finally {
      setIsLoadingBalance(false);
    }
  }

  function formatAddress(addr: string) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  function handleCopyAddress() {
    navigator.clipboard.writeText(address || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function formatBalance(balance: string): string {
    const num = parseFloat(balance);
    if (num === 0) return "0";
    if (num < 0.0001) return num.toFixed(8);
    if (num < 1) return num.toFixed(6);
    if (num < 1000) return num.toFixed(4);
    return num.toFixed(2);
  }

  function handleChainSelect(chain: Chain) {
    setChain(chain.chainId, chain.rpcUrl, chain.name);
    setShowNetworkDropdown(false);
    setShowCustomForm(false);
  }

  function handleCustomChain() {
    if (!customRpc || !customChainId || !customName) return;

    setChain(parseInt(customChainId), customRpc, customName);
    setCustomRpc("");
    setCustomChainId("");
    setCustomName("");
    setShowCustomForm(false);
    setShowNetworkDropdown(false);
  }

  function getExplorerUrl(chainId: number, address: string): string {
    const baseUrl = BLOCK_EXPLORERS[chainId] || "https://etherscan.io";
    return `${baseUrl}/address/${address}`;
  }

  function handleCopyReceiveAddress() {
    navigator.clipboard.writeText(address || "");
    setReceiveAddressCopied(true);
    setTimeout(() => setReceiveAddressCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      {/* Header with Network & Disconnect */}
      <div className="flex items-center justify-between">
        <div className="relative network-dropdown">
          <button
            onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
          >
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100">
              {(() => {
                const chain = POPULAR_CHAINS.find(c => c.chainId === chainId);
                return chain?.logo ? (
                  <img 
                    src={chain.logo} 
                    alt={chainName}
                    className="w-5 h-5 object-cover rounded-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `<span class="text-[10px] font-bold text-slate-700">${chainName[0]}</span>`;
                      }
                    }}
                  />
                ) : (
                  <span className="text-[10px] font-bold text-slate-700">{chainName[0]}</span>
                );
              })()}
            </div>
            <span className="font-semibold text-sm text-slate-900">{chainName}</span>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showNetworkDropdown ? "rotate-180" : ""}`} />
          </button>
          
          {showNetworkDropdown && (
            <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-xl border border-slate-200 shadow-2xl z-50 p-2 max-h-96 overflow-y-auto">
                  <div className="mb-1 px-3 py-2">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Networks</p>
                  </div>
                  <div className="space-y-0.5">
                    {POPULAR_CHAINS.map((chain) => (
                      <button
                        key={chain.chainId}
                        onClick={() => handleChainSelect(chain)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-xs flex items-center gap-3 ${
                          chainId === chain.chainId
                            ? "bg-slate-900 text-white shadow-sm"
                            : "hover:bg-slate-50 text-slate-900"
                        }`}
                      >
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 overflow-hidden ${
                          chainId === chain.chainId ? "bg-white/10" : "bg-slate-100"
                        }`}>
                          <img 
                            src={chain.logo} 
                            alt={chain.name}
                            className="w-6 h-6 object-cover rounded-full"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `<span class="text-xs font-semibold ${chainId === chain.chainId ? 'text-white' : 'text-slate-700'}">${chain.name[0]}</span>`;
                              }
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{chain.name}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 mt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setShowCustomForm(!showCustomForm);
                        if (!showCustomForm) {
                          setTimeout(() => {
                            customFormRef.current?.scrollIntoView({ 
                              behavior: 'smooth', 
                              block: 'nearest' 
                            });
                          }, 100);
                        }
                      }}
                      className="w-full text-xs text-slate-500 hover:text-slate-900 flex items-center justify-center gap-1.5 py-2 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {showCustomForm ? "Cancel" : "Custom RPC"}
                    </button>

                    {showCustomForm && (
                      <div ref={customFormRef} className="space-y-2 mt-2 px-1">
                        <input
                          type="text"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          placeholder="Network Name"
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                        />
                        <input
                          type="text"
                          value={customRpc}
                          onChange={(e) => setCustomRpc(e.target.value)}
                          placeholder="RPC URL"
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                        />
                        <input
                          type="number"
                          value={customChainId}
                          onChange={(e) => setCustomChainId(e.target.value)}
                          placeholder="Chain ID"
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                        />
                        <button
                          onClick={handleCustomChain}
                          disabled={!customRpc || !customChainId || !customName}
                          className="w-full bg-slate-900 text-white text-xs font-semibold py-2 px-3 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Add Network
                        </button>
                      </div>
                    )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={disconnect}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:shadow-md transition-all"
          title="Disconnect"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Disconnect</span>
        </button>
      </div>

      {/* Main Balance Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          {/* Address Bar */}
          <div className="flex items-center justify-between mb-6 pb-5 border-b border-slate-200">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 flex-shrink-0">
                <div className="w-6 h-6 rounded-full bg-slate-800" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500 font-medium mb-0.5">Wallet Address</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono font-semibold text-slate-900 truncate">
                    {address ? formatAddress(address) : ""}
                  </p>
                  <button
                    onClick={handleCopyAddress}
                    className="text-slate-400 hover:text-slate-900 transition-colors flex-shrink-0"
                    title={copied ? "Copied!" : "Copy address"}
                  >
                    {copied ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <a
              href={getExplorerUrl(chainId, address || "")}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="View on Explorer"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Balance Display */}
          <div className="mb-6">
            <p className="text-sm text-slate-500 font-medium mb-2">Total Balance</p>
            <div className="flex items-baseline gap-3 mb-1">
              <p className="text-5xl font-bold text-slate-900 tracking-tight">
                {isLoadingBalance ? (
                  <span className="text-slate-300">...</span>
                ) : (
                  formatBalance(balance)
                )}
              </p>
              <p className="text-2xl font-semibold text-slate-600">{getNativeTokenSymbol(chainId)}</p>
            </div>
            <p className="text-sm text-slate-500">
              {isLoadingBalance ? (
                "≈ $... USD"
              ) : nativeTokenPrice > 0 ? (
                `≈ $${(parseFloat(balance) * nativeTokenPrice).toFixed(2)} USD`
              ) : (
                <span className="text-slate-400">Price unavailable</span>
              )}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                // Open send modal with native token
                const nativeSymbol = getNativeTokenSymbol(chainId);
                const nativeToken = {
                  address: "native",
                  symbol: nativeSymbol,
                  name: nativeSymbol === "MATIC" ? "Polygon" : "Ethereum",
                  decimals: 18,
                  balance: balance
                };
                setSelectedToken(nativeToken);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition-all font-medium text-sm"
            >
              <Send className="w-4 h-4" />
              Send
            </button>

            <button
              disabled
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 text-slate-400 cursor-not-allowed font-medium text-sm"
              title="Coming soon"
            >
              <Repeat2 className="w-4 h-4" />
              Swap
            </button>

            <button
              onClick={() => setShowReceiveModal(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition-all font-medium text-sm"
            >
              <Download className="w-4 h-4" />
              Receive
            </button>
          </div>
      </div>

      {/* Receive Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowReceiveModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Receive {getNativeTokenSymbol(chainId)}</h2>
              <button
                onClick={() => setShowReceiveModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-sm text-slate-600 mb-4">
                Send only {chainName} assets to this address. Sending assets from other networks will result in permanent loss.
              </p>
              
              {/* QR Code */}
              <div className="bg-white rounded-xl p-6 mb-4 flex items-center justify-center border-2 border-slate-200">
                <QRCodeSVG 
                  value={address || ""}
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              </div>

              {/* Address Display */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-xs text-slate-500 font-medium mb-2">Your {chainName} Address</p>
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-sm font-mono font-semibold text-slate-900 break-all">
                    {address}
                  </p>
                  <button
                    onClick={handleCopyReceiveAddress}
                    className="flex-shrink-0 p-2 hover:bg-slate-200 rounded-lg transition-colors"
                    title={receiveAddressCopied ? "Copied!" : "Copy address"}
                  >
                    {receiveAddressCopied ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5 text-slate-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowReceiveModal(false)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Token List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <TokenList onSendToken={setSelectedToken} onRefresh={loadBalance} />
      </div>

      {/* Send Token Modal */}
      {selectedToken && (
        <SendToken
          token={selectedToken}
          onClose={() => setSelectedToken(null)}
          onSuccess={() => {
            loadBalance();
            setSelectedToken(null);
          }}
        />
      )}
    </div>
  );
}
