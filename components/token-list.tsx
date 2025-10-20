"use client";

import { useEffect, useState, useRef } from "react";
import { useWalletStore } from "@/store/wallet-store";
import { ethers } from "ethers";
import { Plus, Send, RefreshCw, X } from "lucide-react";
import { getTokenListForChain } from "@/lib/token-lists";
import { batchGetBalances, batchGetTokenMetadata } from "@/lib/multicall";
import { getTokenPrices, clearPriceCache, getOldestPriceTimestamp } from "@/lib/price-oracle";
import { batchGetTokenImages, getTokenImage, preloadCommonTokenImages } from "@/lib/token-icons";
import { motion } from "framer-motion";

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
      return { symbol: "POL", name: "Polygon" };
    default:
      return { symbol: "ETH", name: "Ethereum" };
  }
}

export function TokenList({ 
  onSendToken, 
  onRefresh,
  onTokensLoaded
}: { 
  onSendToken: (token: Token) => void;
  onRefresh?: () => void;
  onTokensLoaded?: (tokens: Token[], images: { [symbol: string]: string }, prices: { [symbol: string]: number }) => void;
}) {
  const { address, rpcUrl, chainId } = useWalletStore();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newTokenAddress, setNewTokenAddress] = useState("");
  const [showAddToken, setShowAddToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenPrices, setTokenPrices] = useState<{ [symbol: string]: number }>({});
  const [tokenImages, setTokenImages] = useState<{ [symbol: string]: string }>({});
  const [isActuallyRefreshing, setIsActuallyRefreshing] = useState(false);

  function formatTokenBalance(balance: string): string {
    const num = parseFloat(balance);
    if (num === 0) return "0";
    if (num < 0.0001) return num.toFixed(8);
    if (num < 1) return num.toFixed(6);
    if (num < 1000) return num.toFixed(4);
    return num.toFixed(2);
  }
  const loadingRef = useRef(false);
  
  // Preload common token images on first mount (runs once)
  useEffect(() => {
    preloadCommonTokenImages();
  }, []);


  useEffect(() => {
    // Check cache first (no expiration)
    const cacheKey = `${chainId}_${address}`;
    const cached = tokenCache.get(cacheKey);
    
    if (cached) {
      console.log("📦 Using cached token data");
      setTokens(cached);
      // Load prices and images for cached tokens
      loadPricesForTokens(cached, false).then(prices => {
        loadImagesForTokens(cached).then(images => {
          
          // Report cached data to parent
          if (onTokensLoaded) {
            onTokensLoaded(cached, images, prices);
          }
        });
      });
      return;
    }
    
    // Prevent multiple simultaneous loads
    if (!loadingRef.current) {
      loadTokens();
    }
  }, [address, rpcUrl, chainId]);

  async function loadPricesForTokens(tokenList: Token[], forceRefresh: boolean = false) {
    try {
      const symbols = tokenList.map(t => t.symbol);
      console.log("💰 Fetching prices for tokens:", symbols, forceRefresh ? "(forced refresh)" : "(cached)");
      
      // If not forcing refresh, check if we have fresh cached data
      if (!forceRefresh) {
        const timestamp = getOldestPriceTimestamp(symbols);
        if (timestamp) {
          const now = Date.now();
          const isFresh = (now - timestamp) < (30 * 60 * 1000); // 30 minutes
          if (isFresh) {
            console.log("📦 Using fresh cached prices");
            // Use the getTokenPrices function which handles caching internally
            const cachedPrices = await getTokenPrices(symbols);
            setTokenPrices(cachedPrices);
            return cachedPrices;
          }
        }
      }
      
      // Actually fetch from API
      setIsActuallyRefreshing(true);
      const prices = await getTokenPrices(symbols);
      console.log("✅ Prices loaded from API:", prices);
      setTokenPrices(prices);
      
      
      return prices;
    } catch (err) {
      console.error("Error loading prices:", err);
      return {};
    } finally {
      setIsActuallyRefreshing(false);
    }
  }

  async function loadImagesForTokens(tokenList: Token[]) {
    try {
      const tokensToFetch = tokenList.map(t => ({ 
        symbol: t.symbol, 
        address: t.address,
        chainId: chainId 
      }));
      console.log(`🖼️ [Token List] Starting to fetch images for ${tokensToFetch.length} tokens on chain ${chainId}`);
      console.log(`🖼️ [Token List] Tokens to fetch:`, tokensToFetch.map(t => `${t.symbol} (${t.address})`).join(', '));
      
      const images = await batchGetTokenImages(tokensToFetch);
      
      // Convert Map to object for state
      const imagesObj: { [symbol: string]: string } = {};
      images.forEach((url, symbol) => {
        imagesObj[symbol] = url;
        console.log(`📝 [Token List] Storing image for ${symbol}: ${url}`);
      });
      
      console.log(`✅ [Token List] Loaded ${Object.keys(imagesObj).length} out of ${tokensToFetch.length} token images`);
      console.log(`📊 [Token List] Success rate: ${Math.round((Object.keys(imagesObj).length / tokensToFetch.length) * 100)}%`);
      setTokenImages(imagesObj);
      console.log(`💾 [Token List] Token images state updated`);
      return imagesObj;
    } catch (err) {
      console.error("❌ [Token List] Error loading token images:", err);
      return {};
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
      
      // Load prices and images for all tokens
      const [prices, images] = await Promise.all([
        loadPricesForTokens(tokenData, false), // Don't force refresh on initial load
        loadImagesForTokens(tokenData)
      ]);
      
      
      // Report loaded data to parent
      if (onTokensLoaded) {
        onTokensLoaded(tokenData, images, prices);
      }
      
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
      
      // Fetch image for the new token
      getTokenImage(symbol, newTokenAddress, chainId).then(imageUrl => {
        const updatedImages = { ...tokenImages };
        if (imageUrl) {
          updatedImages[symbol.toUpperCase()] = imageUrl;
          setTokenImages(updatedImages);
        }
        // Report updated data to parent
        if (onTokensLoaded) {
          onTokensLoaded(updatedTokens, updatedImages, tokenPrices);
        }
      }).catch(err => {
        console.warn("Could not load image for new token:", err);
        // Report updated data to parent even without image
        if (onTokensLoaded) {
          onTokensLoaded(updatedTokens, tokenImages, tokenPrices);
        }
      });
      
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
    
    // Report updated data to parent
    if (onTokensLoaded) {
      onTokensLoaded(updatedTokens, tokenImages, tokenPrices);
    }
    
    console.log(`🗑️ Token removed from list (no auto-refresh)`);
  }
  
  async function handleManualRefresh() {
    // Clear token list cache and force reload (but keep image cache)
    const cacheKey = `${chainId}_${address}`;
    tokenCache.delete(cacheKey);
    clearPriceCache(); // Clear price cache to get fresh prices
    // Note: We keep the image cache since token logos don't change
    console.log("🔄 Manual refresh: token list and price cache cleared, loading fresh data...");
    
    // Force refresh prices for current tokens
    if (tokens.length > 0) {
      await loadPricesForTokens(tokens, true); // Force refresh
    }
    
    // Reload tokens (balances)
    loadTokens();
    
    // Also refresh main balance
    if (onRefresh) {
      onRefresh();
    }
  }


  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Assets</h2>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <button
              onClick={handleManualRefresh}
              disabled={isLoading}
              className="text-slate-600 dark:text-slate-400 hover:text-brand-orange p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isActuallyRefreshing ? "animate-spin" : ""}`} strokeWidth={2.5} />
            </button>
            <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-50">
              Refresh balances & prices
              <div className="absolute bottom-full right-4 mb-1 border-4 border-transparent border-b-slate-900 dark:border-b-slate-700"></div>
            </div>
          </div>
          <button
            onClick={() => setShowAddToken(!showAddToken)}
            className="text-base text-slate-700 dark:text-slate-300 hover:text-brand-orange font-semibold flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all group"
          >
            {showAddToken ? (
              <>
                <X className="w-4 h-4" strokeWidth={2.5} />
                Cancel
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" strokeWidth={2.5} />
                Add Token
              </>
            )}
          </button>
        </div>
      </div>

      {showAddToken && (
        <div className="mb-4 sm:mb-6 p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <label className="block text-xs text-slate-600 dark:text-slate-400 font-semibold mb-2">
            Token Contract Address
          </label>
          <input
            type="text"
            value={newTokenAddress}
            onChange={(e) => setNewTokenAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-brand-orange focus:border-transparent mb-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />
          {error && (
            <p className="text-xs text-red-600 mb-3 px-1 font-medium">{error}</p>
          )}
          <button
            onClick={handleAddToken}
            disabled={!newTokenAddress || isLoading}
            className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white text-base font-semibold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-glow-orange"
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
          {tokens.map((token, index) => {
            const isNative = token.address === "native";
            const isCustomToken = !isNative && getStoredTokenAddresses().includes(token.address.toLowerCase());
            const popularTokens = getTokenListForChain(chainId);
            const isPopularToken = popularTokens.some(t => t.address.toLowerCase() === token.address.toLowerCase());
            
            return (
              <motion.div
                key={token.address}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.3, 
                  delay: index * 0.05,
                  ease: "easeOut"
                }}
                onClick={() => onSendToken(token)}
                className="px-3 py-3 sm:px-4 sm:py-4 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-100/40 dark:border-slate-700/40 last:border-b-0 group cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
              >
                <div className="flex items-center justify-between gap-3 flex-1 min-w-0">
                  {/* Left side: Token Icon + Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Token Icon */}
                    <div className="flex-shrink-0">
                      {tokenImages[token.symbol.toUpperCase()] ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-white shadow-sm ring-1 ring-slate-900/5">
                          <img 
                            src={tokenImages[token.symbol.toUpperCase()]}
                            alt={token.symbol}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to letter avatar on image load error
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.className = 'w-10 h-10 rounded-full bg-gradient-to-br from-brand-orange/10 to-brand-orange/5 flex items-center justify-center';
                                parent.innerHTML = `<span class="text-sm font-bold text-brand-orange">${token.symbol[0]}</span>`;
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-orange/10 to-brand-orange/5 flex items-center justify-center">
                          <span className="text-sm font-bold text-brand-orange">{token.symbol[0]}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Token Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-slate-900 dark:text-slate-100 token-opacity">{token.symbol}</p>
                        {isCustomToken && !isPopularToken && (
                          <span className="text-[9px] px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full font-bold uppercase tracking-wider">Custom</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{token.name}</p>
                    </div>
                  </div>
                  
                  {/* Right side: Balance + Send indicator */}
                  <div className="flex items-center gap-2">
                    {/* Balance */}
                    <div className="text-right">
                      <p className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono balance-number">
                        {formatTokenBalance(token.balance)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {tokenPrices[token.symbol] !== undefined ? (
                          `≈ $${(parseFloat(token.balance) * tokenPrices[token.symbol]).toFixed(2)}`
                        ) : (
                          <span className="text-slate-400">Price unavailable</span>
                        )}
                      </p>
                    </div>
                    
                    {/* Send indicator on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="p-2 bg-brand-orange/10 text-brand-orange rounded-lg">
                        <Send className="w-4 h-4" strokeWidth={2.5} />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
