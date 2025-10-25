"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ethers } from "ethers";
import { useWalletStore } from "@/store/wallet-store";
import { useSwapStore } from "@/store/swap-store";
import { useThemeStore } from "@/store/theme-store";
import { TokenList } from "../token-list";
import { SendToken } from "../send-token";
import { SwapToken } from "../swap-token";
import { TokenSelector } from "../token-selector";
import { TransactionWaitingModal } from "../transaction-waiting-modal";
import { TransactionCompletionModal } from "../transaction-completion-modal";
import { Toast } from "../toast";
import { rpcRateLimiter } from "@/lib/rpc-rate-limiter";
import { Copy, LogOut, CheckCircle, ChevronDown, Plus, Network, Send, Download, Repeat2, QrCode, ExternalLink, X, Menu, Moon, Sun, Globe } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { getTokenPrice } from "@/lib/price-oracle";
import { getAppConfig } from "@/lib/config/environment";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { isSwapSupported, getUnsupportedChainMessage } from "@/lib/supported-chains";
import { formatTokenBalance } from "@/lib/format-utils";
import { Tooltip } from "../common/tooltip";
import Image from "next/image";

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
  { chainId: 1, name: "Ethereum", rpcUrl: "https://ethereum.publicnode.com", logo: "https://icons.llamao.fi/icons/chains/rsz_ethereum.jpg" },
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
  const { address, balance, rpcUrl, chainName, chainId, disconnect, setBalance, setChain, publicKey, keySlot } =
    useWalletStore();
  const { resetSwap } = useSwapStore();
  const { isDarkMode, toggleTheme, setTheme } = useThemeStore();
  const { pricingEnabled } = getAppConfig();
  
  // Initialize theme on mount to apply stored theme
  useEffect(() => {
    setTheme(isDarkMode);
  }, [isDarkMode, setTheme]);

  // Load custom RPCs from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('customRPCs');
    if (stored) {
      try {
        const customRPCs = JSON.parse(stored);
        setCustomRPCs(customRPCs);
        console.log('🔧 [Wallet Dashboard] Loaded custom RPCs:', customRPCs);
      } catch (err) {
        console.error('Error loading custom RPCs:', err);
      }
    }
    
    // Initialize wallet store to fix Base RPC URL if needed
    useWalletStore.getState().initialize();
  }, []);
  
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [swapToken, setSwapToken] = useState<Token | null>(null);
  const [copied, setCopied] = useState(false);
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customRpc, setCustomRpc] = useState("");
  const [customChainId, setCustomChainId] = useState("");
  const [customName, setCustomName] = useState("");
  const [customRPCs, setCustomRPCs] = useState<{[chainId: string]: {name: string, rpcUrl: string}}>({});
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveAddressCopied, setReceiveAddressCopied] = useState(false);
  const [nativeTokenPrice, setNativeTokenPrice] = useState<number>(0);
  const customFormRef = useRef<HTMLDivElement>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);
  const [tokenImages, setTokenImages] = useState<{ [symbol: string]: string }>({});
  const [tokenPrices, setTokenPrices] = useState<{ [symbol: string]: number }>({});
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [totalUsdBalance, setTotalUsdBalance] = useState<number>(0);
  const [isBalanceCalculated, setIsBalanceCalculated] = useState<boolean>(false);
  
  // Transaction modal states
  const [showTransactionWaiting, setShowTransactionWaiting] = useState(false);
  const [showTransactionCompletion, setShowTransactionCompletion] = useState(false);
  const [transactionData, setTransactionData] = useState<{
    txHash: string;
    fromToken: string;
    toToken: string;
    fromAmount: string;
    toAmount: string;
  } | null>(null);

  // Calculate total USD balance from all tokens
  const calculateTotalUsdBalance = (tokens: Token[], prices: { [symbol: string]: number }) => {
    let total = 0;
    
    // Add native token balance (ETH, BNB, etc.)
    const nativeSymbol = getNativeTokenSymbol(chainId);
    const nativePrice = prices[nativeSymbol] || nativeTokenPrice;
    if (nativePrice > 0) {
      const nativeValue = parseFloat(balance) * nativePrice;
      total += nativeValue;
      console.log(`💰 [Total Balance] Native ${nativeSymbol}: ${balance} * $${nativePrice} = $${nativeValue.toFixed(2)}`);
    }
    
    // Add all other token balances
    for (const token of tokens) {
      if (token.address !== "native" && parseFloat(token.balance) > 0) {
        const tokenPrice = prices[token.symbol] || 0;
        if (tokenPrice > 0) {
          const tokenValue = parseFloat(token.balance) * tokenPrice;
          total += tokenValue;
          console.log(`💰 [Total Balance] ${token.symbol}: ${token.balance} * $${tokenPrice} = $${tokenValue.toFixed(2)}`);
        }
      }
    }
    
    console.log(`💰 [Total Balance] Final total: $${total.toFixed(2)}`);
    return total;
  };

  // Handle token addition from swap modal
  const handleTokenAdded = (token: Token, imageUrl?: string) => {
    // Add the token to available tokens
    setAvailableTokens(prev => [...prev, token]);
    
    // Add the image if available
    if (imageUrl) {
      setTokenImages(prev => ({
        ...prev,
        [token.symbol]: imageUrl
      }));
    }

    // Store the token address in localStorage for persistence
    const key = `tokens_${chainId}`;
    const current = JSON.parse(localStorage.getItem(key) || '[]');
    console.log(`🔍 [Wallet Dashboard] Current stored tokens for chain ${chainId}:`, current);
    console.log(`🔍 [Wallet Dashboard] localStorage key: ${key}`);
    console.log(`🔍 [Wallet Dashboard] Raw localStorage value before update:`, localStorage.getItem(key));
    
    if (!current.includes(token.address.toLowerCase())) {
      current.push(token.address.toLowerCase());
      localStorage.setItem(key, JSON.stringify(current));
      console.log(`💾 [Wallet Dashboard] Stored custom token ${token.symbol} (${token.address}) in localStorage`);
      console.log(`💾 [Wallet Dashboard] Updated token list:`, current);
      console.log(`💾 [Wallet Dashboard] Raw localStorage value after update:`, localStorage.getItem(key));
      
      // DON'T trigger a full refresh - it causes RPC failures and data loss
      // The token is already added to the UI state above
      console.log(`✅ [Wallet Dashboard] Token added to UI without triggering refresh`);
    } else {
      console.log(`⚠️ [Wallet Dashboard] Token ${token.symbol} already exists in storage`);
    }
    
    // Show success message
    setToastMessage(`Token ${token.symbol} added successfully!`);
    setShowToast(true);
  };

  // Handle token removal from assets
  const handleTokenRemoved = (tokenAddress: string) => {
    console.log(`🗑️ [Wallet Dashboard] Token removed: ${tokenAddress}`);
    
    // Remove the token from available tokens
    setAvailableTokens(prev => prev.filter(token => token.address.toLowerCase() !== tokenAddress.toLowerCase()));
    
    // Remove the token image if it exists
    const tokenToRemove = availableTokens.find(token => token.address.toLowerCase() === tokenAddress.toLowerCase());
    if (tokenToRemove) {
      setTokenImages(prev => {
        const updated = { ...prev };
        delete updated[tokenToRemove.symbol];
        return updated;
      });
    }
    
    console.log(`✅ [Wallet Dashboard] Updated available tokens after removal`);
  };

  // Handle swap token selection - reset swap state and open modal
  const handleSwapToken = (token: Token) => {
    console.log(`🔍 [Wallet Dashboard] Opening swap modal with ${availableTokens.length} available tokens:`, availableTokens.map(t => t.symbol));
    resetSwap(); // Clear previous swap state
    setSwapToken(token);
  };

  // Refresh tokens from localStorage (for when tokens are added via swap)
  const refreshTokens = useCallback(() => {
    // This will trigger the TokenList to reload and call onTokensLoaded
    // We'll use a key change to force re-render
    console.log(`🔄 [Wallet Dashboard] Refreshing tokens with new key`);
    setTokenRefreshKey(prev => prev + 1);
  }, []);

  const [tokenRefreshKey, setTokenRefreshKey] = useState(0);

  // Handle transaction submitted from swap
  const handleTransactionSubmitted = (txHash: string, fromToken: string, toToken: string, fromAmount: string, toAmount: string) => {
    setTransactionData({
      txHash,
      fromToken,
      toToken,
      fromAmount,
      toAmount,
    });
    setShowTransactionWaiting(true);
    
    // Wait for transaction confirmation
    waitForTransactionConfirmation(txHash);
  };

  // Wait for transaction confirmation
  const waitForTransactionConfirmation = async (txHash: string) => {
    console.log(`🔄 [Transaction] Starting confirmation check for ${txHash}`);
    console.log(`🔍 [Transaction] This will wait for on-chain confirmation before showing success`);
    
    // Set a timeout to show completion modal after 60 seconds regardless
    const timeoutId = setTimeout(() => {
      console.log(`⏰ [Transaction] 60-second timeout reached, showing completion modal`);
      setShowTransactionWaiting(false);
      setShowTransactionCompletion(true);
    }, 60000);
    
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Wait for transaction confirmation with a more robust approach
      console.log(`🔍 [Transaction] Waiting for transaction confirmation...`);
      
      // Wait for transaction confirmation with retry mechanism
      await rpcRateLimiter.makeRequest(async () => {
        let tx = null;
        let retries = 0;
        const maxRetries = 10;
        
        // Retry getting the transaction if it's not found immediately
        while (!tx && retries < maxRetries) {
          try {
            tx = await provider.getTransaction(txHash);
            if (!tx) {
              retries++;
              console.log(`⏳ [Transaction] Transaction not found yet, retry ${retries}/${maxRetries}...`);
              // Exponential backoff: 2s, 4s, 6s, 8s, etc.
              await new Promise(resolve => setTimeout(resolve, 2000 * retries));
            }
          } catch (error) {
            retries++;
            console.log(`⏳ [Transaction] Error fetching transaction, retry ${retries}/${maxRetries}...`);
            // Exponential backoff: 2s, 4s, 6s, 8s, etc.
            await new Promise(resolve => setTimeout(resolve, 2000 * retries));
          }
        }
        
        if (!tx) {
          throw new Error(`Transaction not found after ${maxRetries} retries`);
        }
        
        console.log(`✅ [Transaction] Transaction found, waiting for confirmation...`);
        
        // Wait for 2 confirmations to ensure transaction is truly settled
        // This gives block explorers time to update and reduces the chance of showing
        // the success modal before the transaction appears in the explorer
        const receipt = await tx.wait(2); // Wait for 2 confirmations
        
        if (!receipt) {
          throw new Error('Transaction receipt not found');
        }
        
        console.log(`🎉 [Transaction] Transaction confirmed! Block: ${receipt.blockNumber}`);
        
        // Verify the transaction was successful
        if (receipt.status === 0) {
          throw new Error('Transaction failed');
        }
        
        console.log(`✅ [Transaction] Transaction successful with ${receipt.confirmations} confirmations`);
        console.log(`✅ [Transaction] Waiting an additional moment for block explorer to catch up...`);
        
        // Add a small delay to give block explorers time to index the transaction
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        
        return receipt;
      });
      
      // If we get here, confirmation succeeded
      clearTimeout(timeoutId);
      setShowTransactionWaiting(false);
      setShowTransactionCompletion(true);
      
    } catch (error) {
      console.error('❌ [Transaction] Error waiting for transaction confirmation:', error);
      
      // Clear timeout and show completion modal even if there's an error
      clearTimeout(timeoutId);
      setShowTransactionWaiting(false);
      setShowTransactionCompletion(true);
      
      // Handle error with proper type checking
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('Transaction not found')) {
        console.log(`⚠️ [Transaction] Transaction not found - it may still be pending or failed`);
      } else if (errorMessage.includes('Transaction failed')) {
        console.log(`❌ [Transaction] Transaction failed on-chain`);
      } else {
        console.log(`⚠️ [Transaction] Unknown error occurred during confirmation`);
      }
    }
  };

  // Handle return to wallet from completion modal
  const handleReturnToWallet = () => {
    console.log(`🔄 [Wallet Dashboard] Returning to wallet, refreshing assets...`);
    setShowTransactionCompletion(false);
    setTransactionData(null);
    
    // Trigger asset refresh
    refreshTokens();
  };

  // Handle close completion modal
  const handleCloseTransactionCompletion = () => {
    console.log(`🔄 [Wallet Dashboard] Closing transaction completion modal, refreshing assets...`);
    setShowTransactionCompletion(false);
    setTransactionData(null);
    
    // Trigger asset refresh since transaction was completed
    refreshTokens();
  };

  useEffect(() => {
    console.log("\n═══════════════════════════════════════════════════════");
    console.log("📊 [WalletDashboard] COMPONENT MOUNTED/UPDATED");
    console.log("═══════════════════════════════════════════════════════");
    console.log("Current wallet state:");
    console.log(`  Address: ${address}`);
    console.log(`  Public Key: ${publicKey?.substring(0, 40)}...`);
    console.log(`  Key Slot: ${keySlot}`);
    console.log(`  Chain: ${chainName} (${chainId})`);
    console.log(`  RPC URL: ${rpcUrl}`);
    console.log(`  Balance: ${balance}`);
    console.log("═══════════════════════════════════════════════════════\n");
    
    if (address && rpcUrl) {
      loadBalance();
    }
  }, [address, rpcUrl]);

  useEffect(() => {
    // Load price for the native token when chain changes
    loadNativeTokenPrice();
    // Also refresh the token list when chain changes
    refreshTokens();
  }, [chainId, refreshTokens]);

  // Recalculate total USD balance when native token price or balance changes
  useEffect(() => {
    console.log(`💰 [Total Balance] Recalculation triggered:`, {
      pricingEnabled,
      nativeTokenPrice,
      balance,
      availableTokensCount: availableTokens.length,
      tokenPricesCount: Object.keys(tokenPrices).length
    });
    
    if (pricingEnabled && nativeTokenPrice > 0) {
      const totalUsd = calculateTotalUsdBalance(availableTokens, tokenPrices);
      setTotalUsdBalance(totalUsd);
      setIsBalanceCalculated(true);
    } else {
      setIsBalanceCalculated(false);
    }
  }, [nativeTokenPrice, balance, availableTokens, tokenPrices, pricingEnabled]);

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
      if (showHamburgerMenu && !target.closest('.hamburger-menu')) {
        setShowHamburgerMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNetworkDropdown, showHamburgerMenu]);

  async function loadBalance() {
    if (!address || !rpcUrl) return;

    setIsLoadingBalance(true);
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const balanceWei = await rpcRateLimiter.makeRequest(async () => {
        return await provider.getBalance(address);
      });
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
    console.log('handleCopyAddress called');
    navigator.clipboard.writeText(address || "");
    setCopied(true);
    setToastMessage("Address copied!");
    setShowToast(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function formatBalance(balance: string): string {
    // Use the standardized formatTokenBalance function for consistency
    return formatTokenBalance(balance, false);
  }

  function handleChainSelect(chain: Chain) {
    setChain(chain.chainId, chain.rpcUrl, chain.name);
    setShowNetworkDropdown(false);
    setShowCustomForm(false);
  }

  function handleCustomChain() {
    if (!customRpc || !customChainId || !customName) return;

    const chainId = customChainId.toString();
    
    // Save custom RPC to localStorage
    const updatedCustomRPCs = {
      ...customRPCs,
      [chainId]: {
        name: customName,
        rpcUrl: customRpc
      }
    };
    
    setCustomRPCs(updatedCustomRPCs);
    localStorage.setItem('customRPCs', JSON.stringify(updatedCustomRPCs));
    console.log('🔧 [Wallet Dashboard] Saved custom RPC:', { chainId, name: customName, rpcUrl: customRpc });

    setChain(parseInt(customChainId), customRpc, customName);
    setCustomRpc("");
    setCustomChainId("");
    setCustomName("");
    setShowCustomForm(false);
    setShowNetworkDropdown(false);
  }

  function removeCustomRPC(chainId: string) {
    const updatedCustomRPCs = { ...customRPCs };
    delete updatedCustomRPCs[chainId];
    
    setCustomRPCs(updatedCustomRPCs);
    localStorage.setItem('customRPCs', JSON.stringify(updatedCustomRPCs));
    console.log('🔧 [Wallet Dashboard] Removed custom RPC for chain:', chainId);
    
    setToastMessage(`Custom RPC removed for chain ${chainId}`);
    setShowToast(true);
  }

  function getExplorerUrl(chainId: number, address: string): string {
    const baseUrl = BLOCK_EXPLORERS[chainId] || "https://etherscan.io";
    return `${baseUrl}/address/${address}`;
  }

  function handleCopyReceiveAddress() {
    console.log('handleCopyReceiveAddress called');
    navigator.clipboard.writeText(address || "");
    setReceiveAddressCopied(true);
    setToastMessage("Address copied!");
    setShowToast(true);
    setTimeout(() => setReceiveAddressCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      {/* Header with Network Selector and Hamburger Menu */}
      <div className="flex items-center justify-between">
        <div className="relative network-dropdown">
          <button
            onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-card hover:shadow-card-hover hover:border-brand-orange/30 dark:hover:border-brand-orange/40 transition-all"
          >
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100">
              {(() => {
                const chain = POPULAR_CHAINS.find(c => c.chainId === chainId);
                return chain?.logo ? (
                  <img 
                    src={chain.logo} 
                    alt={chainName}
                    className="w-4 h-4 object-cover rounded-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `<span class="text-[9px] font-bold text-slate-700">${chainName[0]}</span>`;
                      }
                    }}
                  />
                ) : (
                  <span className="text-[9px] font-bold text-slate-700">{chainName[0]}</span>
                );
              })()}
            </div>
            <span className="font-semibold text-base text-slate-900 dark:text-slate-100">{chainName}</span>
            <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${showNetworkDropdown ? "rotate-180" : ""}`} />
          </button>
        
        {showNetworkDropdown && (
          <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-xl border border-slate-200 shadow-card-lg z-50 p-2 max-h-96 overflow-y-auto" data-network-dropdown>
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
                          ? "bg-brand-orange text-white shadow-sm"
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

                {/* Custom RPCs Section */}
                {Object.keys(customRPCs).length > 0 && (
                  <>
                    <div className="pt-2 mt-2 border-t border-slate-100">
                      <div className="mb-1 px-3 py-2">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Custom RPCs</p>
                      </div>
                      <div className="space-y-0.5">
                        {Object.entries(customRPCs).map(([customChainId, rpcData]) => (
                          <div
                            key={customChainId}
                            className={`w-full px-3 py-2.5 rounded-lg transition-all text-xs flex items-center gap-3 ${
                              parseInt(customChainId) === chainId
                                ? "bg-brand-orange text-white shadow-sm"
                                : "hover:bg-slate-50 text-slate-900"
                            }`}
                          >
                            <button
                              onClick={() => {
                                setChain(parseInt(customChainId), rpcData.rpcUrl, rpcData.name);
                                setShowNetworkDropdown(false);
                              }}
                              className="flex items-center gap-3 flex-1 text-left"
                            >
                              <div className={`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 overflow-hidden ${
                                parseInt(customChainId) === chainId ? "bg-white/10" : "bg-slate-100"
                              }`}>
                                <span className={`text-xs font-semibold ${parseInt(customChainId) === chainId ? 'text-white' : 'text-slate-700'}`}>
                                  {rpcData.name[0]}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold truncate">{rpcData.name}</div>
                                <div className="text-[10px] opacity-70 truncate">Chain ID: {customChainId}</div>
                              </div>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeCustomRPC(customChainId);
                              }}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-500 hover:text-red-700 transition-colors"
                              title="Remove custom RPC"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="pt-2 mt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setShowCustomForm(!showCustomForm);
                      if (!showCustomForm) {
                        // Scroll to bottom of dropdown to show the form completely
                        setTimeout(() => {
                          const dropdown = document.querySelector('[data-network-dropdown]') as HTMLElement;
                          if (dropdown) {
                            // Scroll to the very bottom to show the Add Network button
                            dropdown.scrollTo({
                              top: dropdown.scrollHeight,
                              behavior: 'smooth'
                            });
                          }
                        }, 150); // Slightly longer delay to ensure form is rendered
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
                        className="w-full px-3 py-2 text-base border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      />
                      <input
                        type="text"
                        value={customRpc}
                        onChange={(e) => setCustomRpc(e.target.value)}
                        placeholder="RPC URL"
                        className="w-full px-3 py-2 text-base border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      />
                      <input
                        type="number"
                        value={customChainId}
                        onChange={(e) => setCustomChainId(e.target.value)}
                        placeholder="Chain ID"
                        className="w-full px-3 py-2 text-base border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      />
                      <button
                        onClick={handleCustomChain}
                        disabled={!customRpc || !customChainId || !customName}
                        className="w-full bg-brand-orange text-white text-base font-semibold py-2 px-3 rounded-lg hover:bg-brand-orange-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      >
                        Add Network
                      </button>
                    </div>
                  )}
            </div>
          </div>
        )}
        </div>

        {/* Hamburger Menu */}
        <div className="relative hamburger-menu">
          <button
            onClick={() => setShowHamburgerMenu(!showHamburgerMenu)}
            className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 shadow-card hover:shadow-card-hover transition-all"
            title="Menu"
          >
            <Menu className="w-5 h-5" strokeWidth={2.5} />
          </button>

          {showHamburgerMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-card-lg z-50 py-2">
              <button
                onClick={() => {
                  toggleTheme();
                  setShowHamburgerMenu(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                {!isDarkMode ? (
                  <Moon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                ) : (
                  <Sun className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                )}
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {!isDarkMode ? 'Dark Mode' : 'Light Mode'}
                </span>
              </button>

              <a
                href="https://openburner.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">OpenBurner.xyz</span>
              </a>

              <div className="border-t border-slate-100 dark:border-slate-700 mt-2 pt-2">
                <button
                  onClick={() => {
                    disconnect();
                    setShowHamburgerMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">Disconnect</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Balance Card */}
      <div className="bg-gradient-to-b from-white to-bg-base dark:from-slate-800 dark:to-slate-800 rounded-2xl border border-black/[0.04] dark:border-slate-700 shadow-card-lg hover:shadow-card-hover transition-shadow p-4">
          {/* Address Bar */}
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="flex items-center justify-center flex-shrink-0 -mt-2">
                <Image 
                  src="/images/openburnerlogo.svg" 
                  alt="OpenBurner" 
                  width={28} 
                  height={28}
                  className="w-7 h-7 -mt-0.5"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-0.5">Wallet Address</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-100 token-opacity truncate">
                    {address ? formatAddress(address) : ""}
                  </p>
                  <button
                    onClick={handleCopyAddress}
                    className="text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors flex-shrink-0"
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
              className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="View on Explorer"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Balance Display */}
          <div className="mb-3">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mb-1.5 uppercase tracking-wide text-xs opacity-60">Total Balance</p>
            <div className="flex items-baseline gap-2.5 mb-1">
              <p className="text-4xl font-bold text-slate-900 dark:text-slate-100 balance-number">
                {isLoadingBalance || (pricingEnabled && !isBalanceCalculated) ? (
                  <span className="text-slate-300 dark:text-slate-600">$0.00</span>
                ) : pricingEnabled && isBalanceCalculated ? (
                  `$${totalUsdBalance.toFixed(2)}`
                ) : (
                  <span className="text-slate-300 dark:text-slate-600">$0.00</span>
                )}
              </p>
              <p className="text-xl font-semibold text-slate-600 dark:text-slate-400 token-opacity">USD</p>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isLoadingBalance ? (
                "Loading assets..."
              ) : pricingEnabled && isBalanceCalculated ? (
                (() => {
                  // Check if there are other tokens with balances
                  const hasOtherTokens = availableTokens.some(token => 
                    token.address !== "native" && parseFloat(token.balance) > 0
                  );
                  const nativeSymbol = getNativeTokenSymbol(chainId);
                  return hasOtherTokens 
                    ? `${formatBalance(balance)} ${nativeSymbol} + other tokens`
                    : `${formatBalance(balance)} ${nativeSymbol}`;
                })()
              ) : (
                <span className="text-slate-400 dark:text-slate-500">
                  {pricingEnabled ? "Calculating..." : (
                    <Tooltip
                      content={
                        <div className="space-y-2">
                          <p className="font-medium">Pricing Disabled</p>
                          <p className="text-xs text-slate-300">
                            To see real-time prices, run OpenBurner locally with your own CoinGecko API key.
                          </p>
                          <a
                            href="https://github.com/rdyplayerB/openburner"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-xs underline inline-flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View setup instructions <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      }
                    >
                      <span className="cursor-help">Pricing disabled</span>
                    </Tooltip>
                  )}
                </span>
              )}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowTokenSelector(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-orange hover:bg-brand-orange-dark text-white transition-all duration-150 font-semibold text-base shadow-md hover:shadow-glow-orange active:scale-95"
            >
              <Send className="w-4 h-4" strokeWidth={2.5} />
              Send
            </button>

            <button
              onClick={() => {
                if (isSwapSupported(chainId)) {
                  resetSwap(); // Clear previous swap state
                  setSwapToken({ address: 'native', symbol: 'ETH', name: 'Ethereum', decimals: 18, balance: balance });
                }
              }}
              disabled={!isSwapSupported(chainId)}
              title={!isSwapSupported(chainId) ? getUnsupportedChainMessage(chainId, chainName) : 'Swap tokens'}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all duration-150 font-semibold text-base shadow-md active:scale-95 ${
                isSwapSupported(chainId) 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg' 
                  : 'bg-gray-400 dark:bg-gray-600 text-gray-200 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              <Repeat2 className="w-4 h-4" strokeWidth={2.5} />
              Swap
            </button>

            <button
              onClick={() => setShowReceiveModal(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 dark:bg-slate-600 hover:bg-slate-700 dark:hover:bg-slate-500 text-white transition-all duration-150 font-semibold text-base shadow-md hover:shadow-lg active:scale-95"
            >
              <Download className="w-4 h-4" strokeWidth={2.5} />
              Receive
            </button>
          </div>
      </div>

      {/* Receive Modal */}
      {showReceiveModal && (
        <div className="modal-overlay bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3" onClick={() => setShowReceiveModal(false)}>
          <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-sm sm:max-w-md w-full shadow-card-lg mx-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">Receive <span className="text-brand-orange">Tokens</span></h2>
              <button
                onClick={() => setShowReceiveModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="mb-4 sm:mb-6">
              <p className="text-xs sm:text-sm text-slate-600 mb-3 sm:mb-4">
                Send only <span className="font-semibold">{chainName}</span> assets to this address. Sending assets from other networks will result in permanent loss.
              </p>
              
              {/* QR Code */}
              <div className="bg-white rounded-xl p-4 sm:p-6 mb-3 sm:mb-4 flex items-center justify-center border-2 border-slate-200">
                <QRCodeSVG 
                  value={address || ""}
                  size={160}
                  level="H"
                  includeMargin={false}
                />
              </div>

              {/* Address Display */}
              <div className="bg-slate-50 rounded-xl p-3 sm:p-4 border border-slate-200">
                <p className="text-xs text-slate-500 font-medium mb-2">Your {chainName} Address</p>
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-xs sm:text-sm font-mono font-semibold text-slate-900 break-all">
                    {address}
                  </p>
                  <button
                    onClick={handleCopyReceiveAddress}
                    className="flex-shrink-0 p-1.5 sm:p-2 hover:bg-slate-200 rounded-lg transition-colors"
                    title={receiveAddressCopied ? "Copied!" : "Copy address"}
                  >
                    {receiveAddressCopied ? (
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowReceiveModal(false)}
              className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-semibold py-2.5 sm:py-3 px-4 rounded-xl transition-colors shadow-md hover:shadow-glow-orange text-sm sm:text-base"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Token List */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-black/[0.04] dark:border-slate-700 shadow-card hover:shadow-card-hover transition-shadow overflow-hidden">
        <TokenList 
          key={tokenRefreshKey}
          onSendToken={setSelectedToken} 
          onSwapToken={handleSwapToken}
          onRefresh={loadBalance}
          onTokensLoaded={(tokens, images, prices) => {
            setAvailableTokens(tokens);
            setTokenImages(images);
            setTokenPrices(prices);
            
            // Calculate total USD balance
            const totalUsd = calculateTotalUsdBalance(tokens, prices);
            setTotalUsdBalance(totalUsd);
          }}
          onTokenRemoved={handleTokenRemoved}
        />
      </div>

      {/* Token Selector Modal */}
      {showTokenSelector && (
        <TokenSelector
          tokens={availableTokens}
          onSelectToken={setSelectedToken}
          onClose={() => setShowTokenSelector(false)}
          tokenImages={tokenImages}
          tokenPrices={tokenPrices}
        />
      )}

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

      {/* Swap Token Modal */}
      {swapToken && (
        <SwapToken
          onClose={() => setSwapToken(null)}
          onSuccess={() => {
            loadBalance();
            setSwapToken(null);
          }}
          onRefreshAssets={refreshTokens}
          onTransactionSubmitted={handleTransactionSubmitted}
          initialFromToken={swapToken}
          availableTokens={availableTokens}
          tokenImages={tokenImages}
          tokenPrices={tokenPrices}
          onTokenAdded={handleTokenAdded}
        />
      )}

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        isVisible={showToast}
        onClose={() => {
          console.log('Toast onClose called');
          setShowToast(false);
        }}
      />

      {/* Transaction Waiting Modal */}
      {transactionData && (
        <TransactionWaitingModal
          isOpen={showTransactionWaiting}
          txHash={transactionData.txHash}
          chainId={chainId}
          fromToken={transactionData.fromToken}
          toToken={transactionData.toToken}
          fromAmount={transactionData.fromAmount}
          toAmount={transactionData.toAmount}
        />
      )}

      {/* Transaction Completion Modal */}
      {transactionData && (
        <TransactionCompletionModal
          isOpen={showTransactionCompletion}
          onClose={handleCloseTransactionCompletion}
          onReturnToWallet={handleReturnToWallet}
          txHash={transactionData.txHash}
          chainId={chainId}
          fromToken={transactionData.fromToken}
          toToken={transactionData.toToken}
          fromAmount={transactionData.fromAmount}
          toAmount={transactionData.toAmount}
        />
      )}

    </div>
  );
}
