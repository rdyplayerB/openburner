"use client";

import { useEffect, useState, useRef } from "react";
import { useWalletStore } from "@/store/wallet-store";
import { ethers } from "ethers";
import { Plus, Send, X, RefreshCw } from "lucide-react";
import { getTokenListForChain } from "@/lib/token-lists";
import { batchGetBalances, batchGetTokenMetadata } from "@/lib/multicall";
import { getTokenPrices, clearPriceCache } from "@/lib/price-oracle";

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  usdPrice?: number;
}

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
];

// Cache token data indefinitely until manual refresh
const tokenCache = new Map<string, Token[]>();

function getNativeTokenInfo(chainId: number): { symbol: string; name: string } {
  switch (chainId) {
    case 1: // Ethereum
    case 8453: // Base
    case 42161: // Arbitrum
    case 10: // Optimism
    case 81457: // Blast
    case 534352: // Scroll
    case 59144: // Linea
    case 324: // zkSync Era
      return { symbol: "ETH", name: "Ethereum" };
    case 137: // Polygon
      return { symbol: "MATIC", name: "Polygon" };
    default:
      return { symbol: "ETH", name: "Ethereum" };
  }
}

export function TokenList({ 
  onSendToken, 
  onRefresh 
}: { 
  onSendToken: (token: Token) => void;
  onRefresh?: () => void;
}) {
  const { address, rpcUrl, chainId } = useWalletStore();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newTokenAddress, setNewTokenAddress] = useState("");
  const [showAddToken, setShowAddToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenPrices, setTokenPrices] = useState<{ [symbol: string]: number }>({});

  function formatTokenBalance(balance: string): string {
    const num = parseFloat(balance);
    if (num === 0) return "0";
    if (num < 0.0001) return num.toFixed(8);
    if (num < 1) return num.toFixed(6);
    if (num < 1000) return num.toFixed(4);
    return num.toFixed(2);
  }
  const loadingRef = useRef(false);

  useEffect(() => {
    // Check cache first (no expiration)
    const cacheKey = `${chainId}_${address}`;
    const cached = tokenCache.get(cacheKey);
    
    if (cached) {
      console.log("📦 Using cached token data");
      setTokens(cached);
      // Load prices for cached tokens
      loadPricesForTokens(cached);
      return;
    }
    
    // Prevent multiple simultaneous loads
    if (!loadingRef.current) {
      loadTokens();
    }
  }, [address, rpcUrl, chainId]);

  async function loadPricesForTokens(tokenList: Token[]) {
    try {
      const symbols = tokenList.map(t => t.symbol);
      console.log("💰 Fetching prices for tokens:", symbols);
      const prices = await getTokenPrices(symbols);
      console.log("✅ Prices loaded:", prices);
      setTokenPrices(prices);
    } catch (err) {
      console.error("Error loading prices:", err);
    }
  }

  async function loadTokens() {
    if (!address || !rpcUrl) {
      console.log("Cannot load tokens: address or RPC URL missing");
      return;
    }
    
    // Prevent concurrent loading
    if (loadingRef.current) {
      console.log("Already loading tokens, skipping...");
      return;
    }

    loadingRef.current = true;
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`🔍 Auto-detecting tokens for chain ${chainId}...`);
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Test RPC connection
      try {
        const blockNumber = await provider.getBlockNumber();
        console.log(`✅ RPC connected. Current block: ${blockNumber}`);
      } catch (rpcErr) {
        console.error("❌ RPC connection failed:", rpcErr);
        setError("Failed to connect to RPC. Please check your network connection.");
        setIsLoading(false);
        return;
      }

      const tokenData: Token[] = [];
      
      // Add native token as the first token (ETH, MATIC, etc.)
      try {
        const nativeBalance = await provider.getBalance(address);
        const formattedBalance = ethers.formatEther(nativeBalance);
        const nativeToken = getNativeTokenInfo(chainId);
        console.log(`✅ Native ${nativeToken.symbol} balance: ${formattedBalance}`);
        
        tokenData.push({
          address: "native",
          symbol: nativeToken.symbol,
          name: nativeToken.name,
          decimals: 18,
          balance: formattedBalance,
        });
      } catch (err: any) {
        console.error("Error loading native token balance:", err);
      }

      // Get popular tokens for this chain
      const popularTokens = getTokenListForChain(chainId);
      
      // Get custom tokens from localStorage
      const customTokenAddresses = getStoredTokenAddresses();
      console.log(`🚀 Using Multicall to batch-check ${popularTokens.length} popular tokens + ${customTokenAddresses.length} custom tokens...`);
      
      // Collect all token addresses to check
      const allTokenAddresses = popularTokens.map(t => t.address);
      const customTokensToCheck = customTokenAddresses.filter(
        addr => !allTokenAddresses.some(a => a.toLowerCase() === addr.toLowerCase())
      );
      
      // Batch check all balances using Multicall3 (single RPC call!)
      const allAddresses = [...allTokenAddresses, ...customTokensToCheck];
      const balances = await batchGetBalances(provider, allAddresses, address);
      console.log(`✅ Batch balance check complete. Found balances for ${balances.size} tokens`);
      
      // Process popular tokens with their known metadata
      for (const tokenInfo of popularTokens) {
        const balance = balances.get(tokenInfo.address.toLowerCase());
        if (balance && balance > 0n) {
          const formattedBalance = ethers.formatUnits(balance, tokenInfo.decimals);
          console.log(`✅ ${tokenInfo.symbol}: ${formattedBalance}`);
          
          tokenData.push({
            address: tokenInfo.address,
            symbol: tokenInfo.symbol,
            name: tokenInfo.name,
            decimals: tokenInfo.decimals,
            balance: formattedBalance,
          });
        }
      }
      
      // For custom tokens, we need to fetch metadata
      if (customTokensToCheck.length > 0) {
        console.log(`🔍 Fetching metadata for ${customTokensToCheck.length} custom tokens...`);
        const metadata = await batchGetTokenMetadata(provider, customTokensToCheck);
        
        for (const tokenAddr of customTokensToCheck) {
          const balance = balances.get(tokenAddr.toLowerCase());
          const meta = metadata.get(tokenAddr.toLowerCase());
          
          if (meta && meta.success) {
            // Only add custom tokens with non-zero balance
            if (balance && balance > 0n) {
              const formattedBalance = ethers.formatUnits(balance, meta.decimals);
              console.log(`✅ Custom token ${meta.symbol}: ${formattedBalance}`);
              
              tokenData.push({
                address: tokenAddr,
                symbol: meta.symbol,
                name: meta.name,
                decimals: meta.decimals,
                balance: formattedBalance,
              });
            } else {
              // Remove custom token with zero balance from storage
              console.log(`🗑️ Removing ${meta.symbol} (zero balance) from custom tokens`);
              removeTokenAddress(tokenAddr);
            }
          } else {
            console.log(`⚠️ Could not fetch metadata for custom token ${tokenAddr}`);
          }
        }
      }

      console.log(`✅ Total tokens loaded: ${tokenData.length}`);
      setTokens(tokenData);
      
      // Update cache (no expiration)
      const cacheKey = `${chainId}_${address}`;
      tokenCache.set(cacheKey, tokenData);
      
      // Load prices for all tokens
      await loadPricesForTokens(tokenData);
      
      setError(null);
    } catch (err: any) {
      console.error("Error loading tokens:", err);
      setError(err.message || "Failed to load tokens");
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }

  function getStoredTokenAddresses(): string[] {
    const key = `tokens_${chainId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  }

  function storeTokenAddress(tokenAddr: string) {
    const key = `tokens_${chainId}`;
    const current = getStoredTokenAddresses();
    if (!current.includes(tokenAddr.toLowerCase())) {
      current.push(tokenAddr.toLowerCase());
      localStorage.setItem(key, JSON.stringify(current));
    }
  }

  function removeTokenAddress(tokenAddr: string) {
    const key = `tokens_${chainId}`;
    const current = getStoredTokenAddresses();
    const updated = current.filter(addr => addr !== tokenAddr.toLowerCase());
    localStorage.setItem(key, JSON.stringify(updated));
  }

  async function handleAddToken() {
    if (!newTokenAddress || !address || !rpcUrl) return;

    setError(null);
    setIsLoading(true);

    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const contract = new ethers.Contract(newTokenAddress, ERC20_ABI, provider);

      // Validate it's a valid ERC20 token and get balance
      const [balance, symbol, name, decimals] = await Promise.all([
        contract.balanceOf(address),
        contract.symbol(),
        contract.name(),
        contract.decimals(),
      ]);

      console.log(`✅ Valid token found: ${symbol} (${name})`);

      // Check if balance is zero
      if (balance === 0n) {
        setError(`Token ${symbol} has zero balance. Only tokens with balance can be added.`);
        return;
      }

      // Store the token address in localStorage
      storeTokenAddress(newTokenAddress);
      
      // Add the token to the current list directly (no reload)
      const formattedBalance = ethers.formatUnits(balance, decimals);
      const newToken: Token = {
        address: newTokenAddress,
        symbol,
        name,
        decimals: Number(decimals),
        balance: formattedBalance,
      };
      
      const updatedTokens = [...tokens, newToken];
      setTokens(updatedTokens);
      
      // Update cache with the new token included
      const cacheKey = `${chainId}_${address}`;
      tokenCache.set(cacheKey, updatedTokens);
      
      // Clear form
      setNewTokenAddress("");
      setShowAddToken(false);
      
      console.log(`💾 Token ${symbol} added to list (balance: ${formattedBalance})`);
    } catch (err: any) {
      setError(err.message || "Invalid token address");
    } finally {
      setIsLoading(false);
    }
  }

  function handleRemoveToken(tokenAddr: string) {
    removeTokenAddress(tokenAddr);
    
    // Remove from current list (no reload)
    const updatedTokens = tokens.filter(t => t.address.toLowerCase() !== tokenAddr.toLowerCase());
    setTokens(updatedTokens);
    
    // Update cache
    const cacheKey = `${chainId}_${address}`;
    tokenCache.set(cacheKey, updatedTokens);
    
    console.log(`🗑️ Token removed from list (no auto-refresh)`);
  }
  
  function handleManualRefresh() {
    // Clear cache and force reload
    const cacheKey = `${chainId}_${address}`;
    tokenCache.delete(cacheKey);
    clearPriceCache(); // Clear price cache too
    console.log("🔄 Manual refresh: cache cleared, loading fresh data...");
    loadTokens();
    
    // Also refresh main balance
    if (onRefresh) {
      onRefresh();
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-900">Assets</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="text-slate-600 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-100 transition-all disabled:opacity-50"
            title="Refresh all balances"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowAddToken(!showAddToken)}
            className="text-sm text-slate-700 hover:text-slate-900 font-semibold flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-slate-100 transition-all"
          >
            {showAddToken ? (
              <>
                <X className="w-4 h-4" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add Token
              </>
            )}
          </button>
        </div>
      </div>

      {showAddToken && (
        <div className="mb-6 p-5 bg-slate-50 rounded-xl border border-slate-200">
          <label className="block text-xs text-slate-600 font-semibold mb-2">
            Token Contract Address
          </label>
          <input
            type="text"
            value={newTokenAddress}
            onChange={(e) => setNewTokenAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent mb-3 bg-white"
          />
          {error && (
            <p className="text-xs text-red-600 mb-3 px-1 font-medium">{error}</p>
          )}
          <button
            onClick={handleAddToken}
            disabled={!newTokenAddress || isLoading}
            className="w-full bg-slate-900 text-white text-sm font-semibold py-3 px-4 rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Adding..." : "Add Token"}
          </button>
        </div>
      )}

      {isLoading && tokens.length === 0 ? (
        <div className="text-center py-16">
          <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm font-medium">Loading assets...</p>
        </div>
      ) : tokens.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
            <Plus className="w-8 h-8 text-slate-600" />
          </div>
          <p className="text-slate-700 text-sm font-semibold mb-1">No assets found</p>
          <p className="text-slate-400 text-xs">Popular tokens are auto-detected</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tokens.map((token) => {
            const isNative = token.address === "native";
            const isCustomToken = !isNative && getStoredTokenAddresses().includes(token.address.toLowerCase());
            const popularTokens = getTokenListForChain(chainId);
            const isPopularToken = popularTokens.some(t => t.address.toLowerCase() === token.address.toLowerCase());
            
            return (
              <div
                key={token.address}
                className="flex items-center justify-between p-4 rounded-xl transition-all hover:bg-slate-50 border border-transparent hover:border-slate-200 group cursor-pointer"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Token Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-slate-700">{token.symbol[0]}</span>
                    </div>
                  </div>
                  
                  {/* Token Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-slate-900">{token.symbol}</p>
                      {isCustomToken && !isPopularToken && (
                        <span className="text-[9px] px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full font-bold uppercase tracking-wider">Custom</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{token.name}</p>
                  </div>
                  
                  {/* Balance */}
                  <div className="text-right">
                    <p className="text-base font-bold text-slate-900 font-mono">
                      {formatTokenBalance(token.balance)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {tokenPrices[token.symbol] !== undefined ? (
                        `≈ $${(parseFloat(token.balance) * tokenPrices[token.symbol]).toFixed(2)}`
                      ) : (
                        <span className="text-slate-400">Price unavailable</span>
                      )}
                    </p>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSendToken(token);
                    }}
                    className="p-2.5 text-slate-600 hover:text-white hover:bg-slate-900 rounded-lg transition-all"
                    title={`Send ${token.symbol}`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  {isCustomToken && !isPopularToken && !isNative && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveToken(token.address);
                      }}
                      className="p-2.5 text-slate-400 hover:text-white hover:bg-red-500 rounded-lg transition-all"
                      title="Remove custom token"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
