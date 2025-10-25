"use client";

import React, { useEffect, useState, useRef } from "react";
import { ethers } from "ethers";
import { useWalletStore } from "@/store/wallet-store";
import { rpcRateLimiter } from "@/lib/rpc-rate-limiter";
import { Plus, Send, RefreshCw, X, Trash2, Search, SortAsc, DollarSign } from "lucide-react";
import { getTokenListForChain } from "@/lib/token-lists";
import { batchGetBalances, batchGetTokenMetadata } from "@/lib/multicall";
import { getTokenPrices, getTokenPricesWithAddresses, clearPriceCache, getOldestPriceTimestamp, batchFetchTokenDataByContract, fetchTokenDataByContract } from "@/lib/price-oracle";
import { batchGetTokenImages, getTokenImage, preloadCommonTokenImages } from "@/lib/token-icons";
import { formatTokenBalance } from "@/lib/format-utils";
import { getAppConfig } from "@/lib/config/environment";
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
  onSwapToken,
  onRefresh,
  onTokensLoaded,
  onTokenRemoved
}: { 
  onSendToken: (token: Token) => void;
  onSwapToken?: (token: Token) => void;
  onRefresh?: () => void;
  onTokensLoaded?: (tokens: Token[], images: { [symbol: string]: string }, prices: { [symbol: string]: number }) => void;
  onTokenRemoved?: (tokenAddress: string) => void;
}) {
  const { pricingEnabled } = getAppConfig();
  const { address, rpcUrl, chainId } = useWalletStore();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newTokenAddress, setNewTokenAddress] = useState("");
  const [showAddToken, setShowAddToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenPrices, setTokenPrices] = useState<{ [symbol: string]: number }>({});
  const [tokenImages, setTokenImages] = useState<{ [symbol: string]: string }>({});
  const [isActuallyRefreshing, setIsActuallyRefreshing] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'alphabetical' | 'value' | 'none'>('value');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');


  // Check if user has disabled the confirmation dialog
  function shouldShowConfirmation(): boolean {
    return localStorage.getItem('hideRemoveTokenConfirmation') !== 'true';
  }

  // Remove token from wallet
  function handleRemoveToken(tokenAddress: string) {
    try {
      // Save the "don't show again" preference
      if (dontShowAgain) {
        localStorage.setItem('hideRemoveTokenConfirmation', 'true');
      }

      const storedAddresses = getStoredTokenAddresses();
      const updatedAddresses = storedAddresses.filter(addr => addr.toLowerCase() !== tokenAddress.toLowerCase());
      localStorage.setItem(`tokens_${chainId}`, JSON.stringify(updatedAddresses));
      
      // Remove from cache
      const cacheKey = `${chainId}_${address}`;
      const cached = tokenCache.get(cacheKey);
      if (cached) {
        const updatedTokens = cached.filter(token => token.address.toLowerCase() !== tokenAddress.toLowerCase());
        tokenCache.set(cacheKey, updatedTokens);
        setTokens(updatedTokens);
      }
      
      // Also remove persistent metadata
      const persistentKey = `token_metadata_${chainId}_${tokenAddress.toLowerCase()}`;
      localStorage.removeItem(persistentKey);
      
      console.log(`🗑️ [Token] Removed ${tokenAddress} from wallet`);
      
      // Notify parent component about token removal
      if (onTokenRemoved) {
        onTokenRemoved(tokenAddress);
      }
      
      setShowRemoveConfirm(null);
      setDontShowAgain(false);
    } catch (error) {
      console.error('❌ [Token] Failed to remove token:', error);
    }
  }

  // Handle remove token click - check if we should show confirmation
  function handleRemoveTokenClick(tokenAddress: string) {
    if (shouldShowConfirmation()) {
      setShowRemoveConfirm(tokenAddress);
    } else {
      handleRemoveToken(tokenAddress);
    }
  }
  const loadingRef = useRef(false);
  
  // Preload common token images on first mount (runs once)
  useEffect(() => {
    preloadCommonTokenImages();
  }, []);


  useEffect(() => {
    // Always reload from localStorage when the component mounts or key changes
    // This ensures custom tokens added via swap are immediately available
    loadingRef.current = false;
    
    // Reset sort to default on mount/refresh
    setSortBy('value');
    setSortDirection('desc');
    
    // Clear tokens state to ensure fresh load
    setTokens([]);
    
    loadTokens();
  }, [address, rpcUrl, chainId]);

  async function loadPricesForTokens(tokenList: Token[], forceRefresh: boolean = false) {
    try {
      const symbols = tokenList.map(t => t.symbol);
      
      // If not forcing refresh, check if we have fresh cached data
      if (!forceRefresh) {
        const timestamp = getOldestPriceTimestamp(symbols);
        if (timestamp) {
          const now = Date.now();
          const isFresh = (now - timestamp) < (30 * 60 * 1000); // 30 minutes
          if (isFresh) {
            console.log("📦 Using fresh cached prices");
            // Use the enhanced function with contract address support
            const tokenData = tokenList.map(t => ({
              symbol: t.symbol,
              address: t.address,
              chainId: chainId
            }));
            const cachedPrices = await getTokenPricesWithAddresses(tokenData);
            setTokenPrices(cachedPrices);
            return cachedPrices;
          }
        }
      }
      
      // Actually fetch from API using enhanced function with contract support
      setIsActuallyRefreshing(true);
      const tokenData = tokenList.map(t => ({
        symbol: t.symbol,
        address: t.address,
        chainId: chainId
      }));
      const prices = await getTokenPricesWithAddresses(tokenData);
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

  // Clear placeholder tokens from cache to start fresh
  function clearPlaceholderTokens() {
    const cacheKey = `${chainId}_${address}`;
    const cached = tokenCache.get(cacheKey);
    if (cached) {
      const realTokens = cached.filter(token => 
        !token.symbol.startsWith('TOKEN_') && 
        !token.name.includes('Custom Token')
      );
      tokenCache.set(cacheKey, realTokens);
      console.log(`🧹 [Token List] Cleared ${cached.length - realTokens.length} placeholder tokens from cache`);
    }
  }

  async function loadTokens() {
    if (!address || !rpcUrl) {
      return;
    }
    
    // Prevent concurrent loading
    if (loadingRef.current) {
      return;
    }

    // Prevent unnecessary refreshes if tokens are already loaded and RPC is having issues
    // But allow refresh if we're in refresh mode or if this is the initial load
    if (tokens.length > 0 && !isActuallyRefreshing) {
      console.log(`🔄 [Token List] Skipping load - tokens already loaded and not in refresh mode`);
      return;
    }
    
    // If we have tokens but no prices, try to load prices without full refresh
    if (tokens.length > 0 && Object.keys(tokenPrices).length === 0) {
      console.log(`💰 [Token List] Loading prices for existing tokens without full refresh`);
      loadPricesForTokens(tokens, true);
      return;
    }

    loadingRef.current = true;
    setIsLoading(true);
    setError(null);
    
    // Clear placeholder tokens from cache before loading
    clearPlaceholderTokens();
    
    // If we have existing tokens and RPC is having issues, be more conservative
    if (tokens.length > 0) {
      console.log(`🔄 [Token List] Preserving existing tokens during load`);
    }
    
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Test RPC connection with rate limiting
      try {
        await rpcRateLimiter.makeRequest(async () => {
          return await provider.getBlockNumber();
        });
      } catch (rpcErr) {
        console.error("❌ RPC connection failed:", rpcErr);
        setError("Failed to connect to RPC. Please check your network connection.");
        setIsLoading(false);
        return;
      }

      const tokenData: Token[] = [];
      
      // Add native token as the first token (ETH, MATIC, etc.)
      try {
        const nativeBalance = await rpcRateLimiter.makeRequest(async () => {
          return await provider.getBalance(address);
        });
        const formattedBalance = ethers.formatEther(nativeBalance);
        const nativeToken = getNativeTokenInfo(chainId);
        
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
      
      // Collect all token addresses to check
      const allTokenAddresses = popularTokens.map(t => t.address);
      const customTokensToCheck = customTokenAddresses.filter(
        addr => !allTokenAddresses.some(a => a.toLowerCase() === addr.toLowerCase())
      );
      
      // Batch check all balances using Multicall3 (single RPC call!)
      const allAddresses = [...allTokenAddresses, ...customTokensToCheck];
      const balances = await batchGetBalances(provider, allAddresses, address);
      
      // Process popular tokens with their known metadata
      for (const tokenInfo of popularTokens) {
        const balance = balances.get(tokenInfo.address.toLowerCase());
        if (balance && balance > 0n) {
          const formattedBalance = ethers.formatUnits(balance, tokenInfo.decimals);
          
          tokenData.push({
            address: tokenInfo.address,
            symbol: tokenInfo.symbol,
            name: tokenInfo.name,
            decimals: tokenInfo.decimals,
            balance: formattedBalance,
          });
        }
      }
      
      // For custom tokens, use blockchain metadata only (faster, no CORS issues)
      if (customTokensToCheck.length > 0) {
        try {
          const metadata = await batchGetTokenMetadata(provider, customTokensToCheck);
          
          for (const tokenAddr of customTokensToCheck) {
            const balance = balances.get(tokenAddr.toLowerCase());
            const meta = metadata.get(tokenAddr.toLowerCase());
            
            if (meta && meta.success) {
              // Add custom tokens regardless of balance (allow zero balance for buying)
              const formattedBalance = balance ? ethers.formatUnits(balance, meta.decimals) : "0";
              
              // Store the real metadata persistently for future fallback use
              const persistentKey = `token_metadata_${chainId}_${tokenAddr.toLowerCase()}`;
              const metadataToStore = {
                symbol: meta.symbol,
                name: meta.name,
                decimals: meta.decimals,
                timestamp: Date.now()
              };
              localStorage.setItem(persistentKey, JSON.stringify(metadataToStore));
              console.log(`💾 [Token List] Stored persistent metadata for ${meta.symbol} (${tokenAddr})`);
              
              tokenData.push({
                address: tokenAddr,
                symbol: meta.symbol,
                name: meta.name,
                decimals: meta.decimals,
                balance: formattedBalance,
              });
            } else {
              // Fallback: If metadata fetching failed, try to use cached data or create placeholder
              console.warn(`⚠️ [Token List] Metadata fetch failed for ${tokenAddr}, attempting fallback`);
              
              // Try to get cached token data from previous loads, but avoid placeholder tokens
              const cacheKey = `${chainId}_${address}`;
              const cachedTokens = tokenCache.get(cacheKey);
              const cachedToken = cachedTokens?.find(token => 
                token.address.toLowerCase() === tokenAddr.toLowerCase() && 
                !token.symbol.startsWith('TOKEN_') && // Avoid placeholder tokens
                !token.name.includes('Custom Token') // Avoid placeholder names
              );
              
              if (cachedToken) {
                // Use cached data as fallback (only if it's not a placeholder)
                console.log(`🔄 [Token List] Using cached data for ${cachedToken.symbol} (${tokenAddr})`);
                const formattedBalance = balance ? ethers.formatUnits(balance, cachedToken.decimals) : "0";
                
                tokenData.push({
                  address: tokenAddr,
                  symbol: cachedToken.symbol,
                  name: cachedToken.name,
                  decimals: cachedToken.decimals,
                  balance: formattedBalance,
                });
              } else {
                // Try to get real token data from localStorage (persistent storage)
                const persistentKey = `token_metadata_${chainId}_${tokenAddr.toLowerCase()}`;
                const storedMetadata = localStorage.getItem(persistentKey);
                
                if (storedMetadata) {
                  try {
                    const metadata = JSON.parse(storedMetadata);
                    if (metadata.symbol && !metadata.symbol.startsWith('TOKEN_')) {
                      console.log(`💾 [Token List] Using persistent metadata for ${metadata.symbol} (${tokenAddr})`);
                      const formattedBalance = balance ? ethers.formatUnits(balance, metadata.decimals || 18) : "0";
                      
                      tokenData.push({
                        address: tokenAddr,
                        symbol: metadata.symbol,
                        name: metadata.name,
                        decimals: metadata.decimals || 18,
                        balance: formattedBalance,
                      });
                    } else {
                      throw new Error('Invalid stored metadata');
                    }
                  } catch (err) {
                    console.warn(`⚠️ [Token List] Invalid stored metadata for ${tokenAddr}, creating placeholder`);
                    // Fall through to placeholder creation
                  }
                }
                
                // If no valid cached or stored data, create placeholder token
                if (!tokenData.some(token => token.address.toLowerCase() === tokenAddr.toLowerCase())) {
                  console.log(`🆘 [Token List] Creating placeholder token for ${tokenAddr}`);
                  const formattedBalance = balance ? ethers.formatUnits(balance, 18) : "0"; // Default to 18 decimals
                  
                  tokenData.push({
                    address: tokenAddr,
                    symbol: `TOKEN_${tokenAddr.slice(2, 8).toUpperCase()}`,
                    name: `Custom Token ${tokenAddr.slice(0, 6)}...${tokenAddr.slice(-4)}`,
                    decimals: 18,
                    balance: formattedBalance,
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error(`❌ [Token List] Critical error in custom token processing:`, error);
          // If there's a critical error, try to preserve existing tokens from cache
          const cacheKey = `${chainId}_${address}`;
          const cachedTokens = tokenCache.get(cacheKey);
          if (cachedTokens) {
            console.log(`🔄 [Token List] Using cached tokens due to critical error`);
            for (const tokenAddr of customTokensToCheck) {
              const cachedToken = cachedTokens.find(token => 
                token.address.toLowerCase() === tokenAddr.toLowerCase() && 
                !token.symbol.startsWith('TOKEN_') && 
                !token.name.includes('Custom Token')
              );
              
              if (cachedToken) {
                const balance = balances.get(tokenAddr.toLowerCase());
                const formattedBalance = balance ? ethers.formatUnits(balance, cachedToken.decimals) : "0";
                
                tokenData.push({
                  address: tokenAddr,
                  symbol: cachedToken.symbol,
                  name: cachedToken.name,
                  decimals: cachedToken.decimals,
                  balance: formattedBalance,
                });
              }
            }
          }
        }
      }

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
      
      // If we have existing tokens, don't clear them on error
      if (tokens.length > 0) {
        console.log(`🔄 [Token List] Preserving existing tokens despite error`);
        setError('Some tokens may not have loaded properly. Please try refreshing.');
      } else {
        setError(err.message || "Failed to load tokens");
      }
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

      let balance = "0";
      let symbol = "";
      let name = "";
      let decimals = 18;

      // Try to get token metadata with fallback mechanisms
      try {
        console.log(`🔍 [Add Token] Attempting to fetch metadata for ${newTokenAddress}`);
        
        // Try to get balance first (most important)
        balance = await rpcRateLimiter.makeRequest(async () => {
          return await contract.balanceOf(address);
        });
        
        // Try to get metadata with individual calls and fallbacks
        try {
          symbol = await rpcRateLimiter.makeRequest(async () => {
            return await contract.symbol();
          });
        } catch (err) {
          console.warn(`⚠️ [Add Token] Failed to get symbol for ${newTokenAddress}:`, err);
          symbol = `TOKEN_${newTokenAddress.slice(2, 8).toUpperCase()}`;
        }

        try {
          name = await rpcRateLimiter.makeRequest(async () => {
            return await contract.name();
          });
        } catch (err) {
          console.warn(`⚠️ [Add Token] Failed to get name for ${newTokenAddress}:`, err);
          name = `Token ${newTokenAddress.slice(2, 8)}`;
        }

        try {
          decimals = await rpcRateLimiter.makeRequest(async () => {
            return await contract.decimals();
          });
        } catch (err) {
          console.warn(`⚠️ [Add Token] Failed to get decimals for ${newTokenAddress}:`, err);
          decimals = 18; // Default to 18 decimals
        }

        // If we got placeholder values, try to get real metadata from CoinGecko
        if (symbol.startsWith('TOKEN_') || name.startsWith('Token ')) {
          console.log(`🔍 [Add Token] Attempting to get real metadata from CoinGecko for ${newTokenAddress}`);
          try {
            const coinGeckoData = await fetchTokenDataByContract(newTokenAddress, chainId);
            if (coinGeckoData) {
              if (coinGeckoData.symbol && !coinGeckoData.symbol.startsWith('TOKEN_')) {
                symbol = coinGeckoData.symbol;
                console.log(`✅ [Add Token] Got symbol from CoinGecko: ${symbol}`);
              }
              if (coinGeckoData.name && !coinGeckoData.name.startsWith('Token ')) {
                name = coinGeckoData.name;
                console.log(`✅ [Add Token] Got name from CoinGecko: ${name}`);
              }
              if (coinGeckoData.decimals && coinGeckoData.decimals !== 18) {
                decimals = coinGeckoData.decimals;
                console.log(`✅ [Add Token] Got decimals from CoinGecko: ${decimals}`);
              }
            }
          } catch (err) {
            console.warn(`⚠️ [Add Token] CoinGecko fallback failed:`, err);
          }
        }

      } catch (err) {
        console.error(`❌ [Add Token] Failed to get balance for ${newTokenAddress}:`, err);
        throw new Error("Unable to fetch token data. The contract may not be a valid ERC20 token or the RPC is experiencing issues.");
      }

      console.log(`✅ Valid token found: ${symbol} (${name})`);

      // Store the token address in localStorage (allow zero balance for buying tokens)
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
      console.error(`❌ [Add Token] Error adding token:`, err);
      setError(err.message || "Invalid token address");
    } finally {
      setIsLoading(false);
    }
  }

  
  async function handleManualRefresh() {
    // Clear token list cache and force reload (but keep image cache)
    const cacheKey = `${chainId}_${address}`;
    tokenCache.delete(cacheKey);
    clearPriceCache(); // Clear price cache to get fresh prices
    // Note: We keep the image cache since token logos don't change
    console.log("🔄 Manual refresh: token list and price cache cleared, loading fresh data...");
    
    // Set refresh flag to allow loading even if tokens are already loaded
    setIsActuallyRefreshing(true);
    
    // Force refresh prices for current tokens
    if (tokens.length > 0) {
      await loadPricesForTokens(tokens, true); // Force refresh
    }
    
    // Reload tokens (balances)
    await loadTokens();
    
    // Reset refresh flag
    setIsActuallyRefreshing(false);
    
    // Also refresh main balance
    if (onRefresh) {
      onRefresh();
    }
  }


  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100 dark:border-slate-700">
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

      {/* Search and Sort Controls */}
      <div className="flex items-center gap-3 mb-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assets by name, symbol, or address..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400"
          />
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Sort:</span>
          <div className="flex gap-1">
            <button
              onClick={() => {
                if (sortBy === 'alphabetical') {
                  // Toggle direction if already alphabetical
                  setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                } else {
                  // Set to alphabetical with default ascending
                  setSortBy('alphabetical');
                  setSortDirection('asc');
                }
              }}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors ${
                sortBy === 'alphabetical' 
                  ? 'bg-brand-orange text-white' 
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {sortBy === 'alphabetical' && sortDirection === 'desc' ? (
                <SortAsc className="w-3 h-3 rotate-180" />
              ) : (
                <SortAsc className="w-3 h-3" />
              )}
              {sortBy === 'alphabetical' && sortDirection === 'desc' ? 'Z-A' : 'A-Z'}
            </button>
            <button
              onClick={() => {
                if (sortBy === 'value') {
                  // Toggle direction if already value
                  setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
                } else {
                  // Set to value with default descending
                  setSortBy('value');
                  setSortDirection('desc');
                }
              }}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors ${
                sortBy === 'value' 
                  ? 'bg-brand-orange text-white' 
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {sortBy === 'value' && sortDirection === 'asc' ? (
                <SortAsc className="w-3 h-3 rotate-180" />
              ) : (
                <SortAsc className="w-3 h-3" />
              )}
              Value ($)
            </button>
          </div>
        </div>
      </div>

      {/* Legend for custom tokens */}

      {showAddToken && (
        <div className="mb-3 p-3 sm:p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <label className="block text-xs text-slate-600 dark:text-slate-400 font-semibold mb-2">
            Token Contract Address
          </label>
          <input
            type="text"
            value={newTokenAddress}
            onChange={(e) => setNewTokenAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-brand-orange focus:border-transparent mb-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />
          {error && (
            <p className="text-xs text-red-600 mb-3 px-1 font-medium">{error}</p>
          )}
          <button
            onClick={handleAddToken}
            disabled={!newTokenAddress || isLoading}
            className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white text-sm font-semibold py-2.5 px-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-glow-orange"
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
        <div className="space-y-1">
          {tokens
            .filter((token) => {
              // Apply search filter
              if (!searchQuery.trim()) return true;
              
              const query = searchQuery.toLowerCase().trim();
              const matchesSymbol = token.symbol.toLowerCase().includes(query);
              const matchesName = token.name.toLowerCase().includes(query);
              const matchesAddress = token.address.toLowerCase().includes(query);
              
              return matchesSymbol || matchesName || matchesAddress;
            })
            .sort((a, b) => {
              // Always keep native token (ETH, BNB, etc.) at the top
              const aIsNative = a.address === "native";
              const bIsNative = b.address === "native";
              
              if (aIsNative && !bIsNative) return -1;
              if (!aIsNative && bIsNative) return 1;
              
              // If both are native or both are not native, apply normal sorting
              if (sortBy === 'alphabetical') {
                const comparison = a.symbol.localeCompare(b.symbol);
                return sortDirection === 'asc' ? comparison : -comparison;
              } else if (sortBy === 'value') {
                const aValue = parseFloat(a.balance) * (tokenPrices[a.symbol] || 0);
                const bValue = parseFloat(b.balance) * (tokenPrices[b.symbol] || 0);
                
                // If both have value, sort by value (direction based on sortDirection)
                if (aValue > 0 && bValue > 0) {
                  return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
                }
                
                // If both are zero, always sort alphabetically (A-Z) regardless of main sort direction
                if (aValue === 0 && bValue === 0) {
                  return a.symbol.localeCompare(b.symbol);
                }
                
                // If one has value and one doesn't, value comes first
                return bValue - aValue;
              }
              return 0; // No sorting
            })
            .map((token, index) => {
            const isNative = token.address === "native";
            const isCustomToken = !isNative && getStoredTokenAddresses().includes(token.address.toLowerCase());
            const popularTokens = getTokenListForChain(chainId);
            const isPopularToken = popularTokens.some(t => t.address.toLowerCase() === token.address.toLowerCase());
            
            // Check if this is the last native token (to add separator after it)
            const tokensArray = tokens.filter((token) => {
              if (!searchQuery.trim()) return true;
              
              const query = searchQuery.toLowerCase().trim();
              const matchesSymbol = token.symbol.toLowerCase().includes(query);
              const matchesName = token.name.toLowerCase().includes(query);
              const matchesAddress = token.address.toLowerCase().includes(query);
              
              return matchesSymbol || matchesName || matchesAddress;
            }).sort((a, b) => {
              // Always keep native token (ETH, BNB, etc.) at the top
              const aIsNative = a.address === "native";
              const bIsNative = b.address === "native";
              
              if (aIsNative && !bIsNative) return -1;
              if (!aIsNative && bIsNative) return 1;
              
              // If both are native or both are not native, apply normal sorting
              if (sortBy === 'alphabetical') {
                const comparison = a.symbol.localeCompare(b.symbol);
                return sortDirection === 'asc' ? comparison : -comparison;
              } else if (sortBy === 'value') {
                const aValue = parseFloat(a.balance) * (tokenPrices[a.symbol] || 0);
                const bValue = parseFloat(b.balance) * (tokenPrices[b.symbol] || 0);
                
                // If both have value, sort by value (direction based on sortDirection)
                if (aValue > 0 && bValue > 0) {
                  return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
                }
                
                // If both are zero, always sort alphabetically (A-Z) regardless of main sort direction
                if (aValue === 0 && bValue === 0) {
                  return a.symbol.localeCompare(b.symbol);
                }
                
                // If one has value and one doesn't, value comes first
                return bValue - aValue;
              }
              return 0; // No sorting
            });
            
            const nativeTokens = tokensArray.filter(t => t.address === "native");
            const isLastNativeToken = isNative && index === nativeTokens.length - 1;
            const hasNonNativeTokens = tokensArray.some(t => t.address !== "native");
            
            return (
              <React.Fragment key={token.address}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.3, 
                    delay: index * 0.05,
                    ease: "easeOut"
                  }}
                  className="flex items-center justify-between pl-3 pr-0 py-2 sm:pl-4 sm:pr-0 sm:py-2.5 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-100/40 dark:border-slate-700/40 last:border-b-0 group hover:scale-[1.01] active:scale-[0.99]"
                >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Token Icon */}
                  <div className="flex-shrink-0">
                    {tokenImages[token.symbol.toUpperCase()] ? (
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-white shadow-sm ring-1 ring-slate-900/5">
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
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-orange/10 to-brand-orange/5 flex items-center justify-center">
                        <span className="text-sm font-bold text-brand-orange">{token.symbol[0]}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Token Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-bold text-slate-900 dark:text-slate-100 token-opacity">{token.symbol}</p>
                      {/* Reserve space for custom token indicator to maintain consistent alignment */}
                      <div className="flex-shrink-0 flex items-center">
                        {isCustomToken && !isPopularToken && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400">
                            Custom
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate leading-tight">{token.name}</p>
                  </div>
                  
                  {/* Balance - Right aligned */}
                  <div className="text-right flex-shrink-0">
                    {parseFloat(token.balance) > 0 && (
                      <>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono balance-number">
                          {formatTokenBalance(token.balance, token.symbol === 'USDC' || token.symbol === 'USDT')}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">
                          {pricingEnabled ? (
                            tokenPrices[token.symbol] !== undefined ? (
                              `≈ $${(parseFloat(token.balance) * tokenPrices[token.symbol]).toFixed(2)}`
                            ) : (
                              <span className="text-slate-400">Refresh to see price</span>
                            )
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Action buttons on hover */}
                <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  {/* Send button - only show if balance > 0 */}
                  {parseFloat(token.balance) > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSendToken(token);
                      }}
                      className="p-2 bg-brand-orange/10 text-brand-orange rounded-lg hover:bg-brand-orange/20 transition-colors"
                      title="Send"
                    >
                      <Send className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                  )}
                  
                  {/* Remove button for custom tokens - always reserve space for consistent alignment */}
                  {isCustomToken && !isPopularToken ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveTokenClick(token.address);
                      }}
                      className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                      title="Remove from wallet"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                  ) : (
                    <div className="w-8 h-8" />
                  )}
                </div>
              </motion.div>
              
              {/* Separator after native token */}
              {isLastNativeToken && hasNonNativeTokens && (
                <div className="px-3 sm:px-4 py-2">
                  <div className="border-t border-slate-200 dark:border-slate-600"></div>
                </div>
              )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Remove Token Confirmation Modal */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm"
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Remove Token
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Are you sure you want to remove this token?
            </p>
            <div className="flex items-center gap-2 mb-6">
              <input
                type="checkbox"
                id="dontShowAgain"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 text-red-500 bg-slate-100 border-slate-300 rounded focus:ring-red-500 focus:ring-2"
              />
              <label htmlFor="dontShowAgain" className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                Don't show this confirmation again
              </label>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRemoveConfirm(null)}
                className="flex-1 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold py-2.5 px-4 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveToken(showRemoveConfirm)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors"
              >
                Remove
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
