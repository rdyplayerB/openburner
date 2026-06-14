'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { rpcRateLimiter } from "@/lib/rpc-rate-limiter";
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpDown, Settings, AlertTriangle, CheckCircle, X, RefreshCw } from 'lucide-react';
import { useWalletStore } from '../store/wallet-store';
import { useSwapStore, SwapTokenInfo } from '../store/swap-store';
import { getSwapPrice, getSwapQuote, buildSwapTransaction, validateSwapQuote, submitSwapTransaction, formatPriceImpact, formatExchangeRate, getPriceImpactWarning } from '../lib/swap-api';
import { getAllowanceInfo, buildInfiniteApprovalTransaction, buildSpecificApprovalTransaction } from '../lib/token-allowance';
import { signTransactionSmart } from '../lib/smart-signer';
import { getAppConfig } from '../lib/config/environment';
import { TokenSelector } from './token-selector';
import { Toast } from './toast';
import { PinInput } from './pin-input';
import { getTokenImage } from '../lib/token-icons';
import { formatSwapBalance } from '../lib/format-utils';

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
];

interface SwapTokenProps {
  onClose: () => void;
  onSuccess: () => void;
  onRefreshAssets?: () => void;
  onTransactionSubmitted?: (txHash: string, fromToken: string, toToken: string, fromAmount: string, toAmount: string) => void;
  initialFromToken?: SwapTokenInfo;
  availableTokens?: SwapTokenInfo[];
  tokenImages?: { [symbol: string]: string };
  tokenPrices?: { [symbol: string]: number };
  onTokenAdded?: (token: SwapTokenInfo, imageUrl?: string) => void;
}

export function SwapToken({ onClose, onSuccess, onRefreshAssets, onTransactionSubmitted, initialFromToken, availableTokens = [], tokenImages = {}, tokenPrices = {}, onTokenAdded }: SwapTokenProps) {
  const { address, rpcUrl, chainId, chainName, keySlot } = useWalletStore();
  const {
    fromToken,
    toToken,
    fromAmount,
    toAmount,
    quote,
    isLoadingQuote,
    quoteError,
    allowanceInfo,
    needsApproval,
    settings,
    setFromToken,
    setToToken,
    setFromAmount,
    setToAmount,
    setQuote,
    setQuoteLoading,
    setQuoteError,
    setAllowanceInfo,
    setNeedsApproval,
    updateSettings,
    swapTokens,
    resetSwap,
  } = useSwapStore();

  const [showTokenSelector, setShowTokenSelector] = useState<'from' | 'to' | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddToken, setShowAddToken] = useState(false);
  const [addTokenContext, setAddTokenContext] = useState<'from' | 'to' | null>(null);
  const [newTokenAddress, setNewTokenAddress] = useState('');
  const [isAddingToken, setIsAddingToken] = useState(false);
  const [addTokenError, setAddTokenError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Debug logging for needsApproval state changes
  useEffect(() => {
    console.log('🔍 [needsApproval] State changed to:', needsApproval);
  }, [needsApproval]);

  // Debug logging for quote state changes
  useEffect(() => {
    console.log('🔍 [quote] State changed to:', quote ? 'present' : 'null');
    if (quote) {
      console.log('🔍 [quote] Quote details:', {
        sellAmount: quote.sellAmount,
        buyAmount: quote.buyAmount,
        allowanceTarget: quote.allowanceTarget,
        liquidityAvailable: quote.liquidityAvailable
      });
    }
  }, [quote]);

  // Debug logging for button state
  useEffect(() => {
    const debugState = {
      fromToken: !!fromToken,
      toToken: !!toToken,
      fromAmount: !!fromAmount,
      quote: !!quote,
      isLoadingQuote,
      isApproving,
      needsApproval,
      disabled: !fromToken || !toToken || !fromAmount || !quote || isLoadingQuote || isApproving
    };
    console.log('🔍 [Swap Button Debug] State:', JSON.stringify(debugState, null, 2));
    console.log('🔍 [Swap Button Debug] Raw values:', {
      fromToken: fromToken ? `${fromToken.symbol} (${fromToken.address})` : 'null',
      toToken: toToken ? `${toToken.symbol} (${toToken.address})` : 'null',
      fromAmount: fromAmount,
      quote: quote ? 'present' : 'null',
      isLoadingQuote,
      isApproving,
      needsApproval
    });
    console.log('🔍 [Swap Button Debug] Button should be:', needsApproval ? 'ENABLED (Approve Token)' : 'DISABLED (Swap Tokens)');
  }, [fromToken, toToken, fromAmount, quote, isLoadingQuote, isApproving, needsApproval]);

  const environment = getAppConfig();

  // Initialize with provided token (disabled - no pre-selection)
  // useEffect(() => {
  //   if (initialFromToken) {
  //     setFromToken(initialFromToken);
  //   }
  // }, [initialFromToken, setFromToken]);

  // Fetch quote when amounts change
  const fetchQuote = useCallback(async () => {
    if (!fromToken || !toToken || !address || !rpcUrl) return;

    // Prevent swapping the same token
    if (fromToken.address === toToken.address) {
      setQuoteError('Cannot swap the same token');
      setQuote(null);
      return;
    }

    const sellAmount = fromAmount && fromAmount !== '0' ? fromAmount : undefined;
    const buyAmount = toAmount && toAmount !== '0' ? toAmount : undefined;

    if (!sellAmount && !buyAmount) {
      setQuote(null);
      return;
    }

    // Check if user has sufficient balance for sell amount
    if (sellAmount) {
      const userBalance = parseFloat(fromToken.balance);
      const requestedAmount = parseFloat(sellAmount);
      
      if (userBalance < requestedAmount) {
        setQuoteError(`Insufficient ${fromToken.symbol} balance. You have ${fromToken.balance} but need ${sellAmount}.`);
        setQuote(null);
        return;
      }
    }

    setQuoteLoading(true);
    setQuoteError(null);

    try {
      // Convert decimal amounts to wei for the API
      let sellAmountWei: string | undefined;
      let buyAmountWei: string | undefined;

      if (sellAmount) {
        // For native tokens (ETH), use 18 decimals
        if (fromToken.address === 'native') {
          sellAmountWei = ethers.parseEther(sellAmount).toString();
        } else {
          // For ERC20 tokens, use their specific decimals
          sellAmountWei = ethers.parseUnits(sellAmount, fromToken.decimals).toString();
        }
      }

      if (buyAmount) {
        // For native tokens (ETH), use 18 decimals
        if (toToken.address === 'native') {
          buyAmountWei = ethers.parseEther(buyAmount).toString();
        } else {
          // For ERC20 tokens, use their specific decimals
          buyAmountWei = ethers.parseUnits(buyAmount, toToken.decimals).toString();
        }
      }

      const quoteParams = {
        sellToken: fromToken.address,
        buyToken: toToken.address,
        sellAmount: sellAmountWei,
        buyAmount: buyAmountWei,
        slippagePercentage: settings.slippagePercentage,
        takerAddress: address,
        chainId,
      };

      // Step 1: Check price and liquidity
      console.log('🔄 [Swap] Step 1: Checking price and liquidity...');
      const priceData = await getSwapPrice(quoteParams);
      
      if (!priceData.liquidityAvailable) {
        throw new Error('Insufficient liquidity for this swap');
      }

      // Check if allowance is needed
      if (priceData.issues?.allowance) {
        console.log('⚠️ [Swap] Allowance needed for:', priceData.issues.allowance.spender);
        // TODO: Handle allowance approval here
      }

      // Step 2: Get quote for transaction
      console.log('🔄 [Swap] Step 2: Getting quote for transaction...');
      const newQuote = await getSwapQuote(quoteParams);
      
      if (validateSwapQuote(newQuote, sellAmountWei, buyAmountWei)) {
        setQuote(newQuote);
        
        // Update amounts based on quote
        if (sellAmount) {
          // User entered sell amount, update buy amount
          if (toToken.address === 'native') {
            setToAmount(ethers.formatEther(newQuote.buyAmount));
          } else {
            setToAmount(ethers.formatUnits(newQuote.buyAmount, toToken.decimals));
          }
        } else if (buyAmount) {
          // User entered buy amount, update sell amount
          if (fromToken.address === 'native') {
            setFromAmount(ethers.formatEther(newQuote.sellAmount));
          } else {
            setFromAmount(ethers.formatUnits(newQuote.sellAmount, fromToken.decimals));
          }
        }
      } else {
        setQuoteError('Invalid quote received');
      }
    } catch (error: any) {
      console.error('❌ [Swap] Quote fetch failed:', error);
      setQuoteError(error.message || 'Failed to fetch quote');
    } finally {
      setQuoteLoading(false);
    }
  }, [fromToken, toToken, fromAmount, toAmount, address, rpcUrl, chainId, settings.slippagePercentage, setQuote, setQuoteLoading, setQuoteError, setToAmount, setFromAmount]);

  // Check allowance when quote changes
  const checkAllowance = useCallback(async () => {
    console.log('🔍 [Allowance Check] Function called with:', {
      quote: !!quote,
      fromToken: fromToken ? `${fromToken.symbol} (${fromToken.address})` : 'null',
      address: address,
      rpcUrl: !!rpcUrl
    });

    if (!quote || !fromToken || !address || !rpcUrl) {
      console.log('🔍 [Allowance Check] Skipping - missing dependencies:', {
        quote: !!quote,
        fromToken: !!fromToken,
        address: !!address,
        rpcUrl: !!rpcUrl
      });
      return;
    }

    try {
      console.log('🔍 [Allowance Check] Starting check...');
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const allowanceInfo = await getAllowanceInfo(
        fromToken.address,
        fromToken.symbol,
        quote.allowanceTarget,
        quote.sellAmount,
        address,
        provider
      );

      console.log('🔍 [Allowance Check] Result:', JSON.stringify(allowanceInfo, null, 2));
      setAllowanceInfo(allowanceInfo);
      
      // Respect auto-approve setting: if enabled, automatically handle approval
      let finalNeedsApproval = allowanceInfo.needsApproval;
      if (settings.autoApprove && allowanceInfo.needsApproval) {
        console.log('🔍 [Auto-Approve] Approval needed, will handle automatically');
        finalNeedsApproval = false; // Don't show approval button, handle automatically
      }
      
      setNeedsApproval(finalNeedsApproval);
      console.log('🔍 [Allowance Check] Set needsApproval to:', finalNeedsApproval, '(autoApprove:', settings.autoApprove, ')');
    } catch (error: any) {
      console.error('❌ [Swap] Allowance check failed:', error);
      setNeedsApproval(false);
    }
  }, [quote, fromToken, address, rpcUrl, settings.autoApprove, setAllowanceInfo, setNeedsApproval]);

  // Manual quote fetching - no automatic calls

  // Check allowance when quote changes
  useEffect(() => {
    checkAllowance();
  }, [checkAllowance]);

  // Handle token selection
  const handleTokenSelect = (token: SwapTokenInfo) => {
    if (showTokenSelector === 'from') {
      setFromToken(token);
    } else if (showTokenSelector === 'to') {
      setToToken(token);
    }
    // Clear quote when tokens change - user needs to manually fetch new quote
    setQuote(null);
    setToAmount('');
    setNeedsApproval(false);
    setAllowanceInfo(null);
    setShowTokenSelector(null);
  };

  // Handle amount input
  const handleAmountChange = (amount: string, type: 'from' | 'to') => {
    if (type === 'from') {
      setFromAmount(amount);
    } else {
      setToAmount(amount);
    }
    // Clear quote when amount changes - user needs to manually fetch new quote
    if (quote) {
      setQuote(null);
      setNeedsApproval(false);
      setAllowanceInfo(null);
    }
  };

  // Handle max button
  const handleMaxAmount = () => {
    if (fromToken) {
      setFromAmount(fromToken.balance);
      // Clear quote when amount changes - user needs to manually fetch new quote
      if (quote) {
        setQuote(null);
        setNeedsApproval(false);
        setAllowanceInfo(null);
      }
    }
  };

  // Handle swap direction toggle
  const handleSwapTokens = () => {
    swapTokens();
  };


  // Handle custom token addition
  const handleAddToken = async () => {
    if (!newTokenAddress || !address || !rpcUrl) return;

    setAddTokenError(null);
    setIsAddingToken(true);

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

      // Create the new token object (allow zero balance for buying tokens)
      const formattedBalance = ethers.formatUnits(balance, decimals);
      const newToken: SwapTokenInfo = {
        address: newTokenAddress,
        symbol,
        name,
        decimals: Number(decimals),
        balance: formattedBalance,
      };

      // Fetch image for the new token
      let imageUrl: string | null | undefined;
      try {
        imageUrl = await getTokenImage(symbol, newTokenAddress, chainId);
        if (imageUrl) {
          console.log(`🖼️ Token image loaded for ${symbol}: ${imageUrl}`);
        }
      } catch (err) {
        console.warn("Could not load image for new token:", err);
      }

      // Notify parent component about the new token
      if (onTokenAdded) {
        onTokenAdded(newToken, imageUrl || undefined);
      }

      // Automatically select the newly added token in the appropriate dropdown
      if (addTokenContext === 'from') {
        setFromToken(newToken);
        // Clear quote and related state when changing from token
        setQuote(null);
        setToAmount('');
        setNeedsApproval(false);
        setAllowanceInfo(null);
      } else if (addTokenContext === 'to') {
        setToToken(newToken);
        // Clear quote and related state when changing to token
        setQuote(null);
        setToAmount('');
        setNeedsApproval(false);
        setAllowanceInfo(null);
      }

      // Show success message
      setToastMessage(`Token ${symbol} added successfully!`);
      setShowToast(true);

      // Close the modal and clear the form
      setShowAddToken(false);
      setNewTokenAddress('');
      setAddTokenContext(null);

    } catch (err: any) {
      console.error('❌ Failed to add token:', err);
      
      // Provide more specific error messages
      let errorMessage = "Failed to add token";
      
      if (err.code === 'CALL_EXCEPTION') {
        errorMessage = "Invalid contract address or contract not found on this network";
      } else if (err.code === 'INVALID_ARGUMENT') {
        errorMessage = "Invalid token address format";
      } else if (err.message?.includes('network')) {
        errorMessage = "Network error. Please check your connection and try again";
      } else if (err.message?.includes('timeout')) {
        errorMessage = "Request timed out. Please try again";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setAddTokenError(errorMessage);
    } finally {
      setIsAddingToken(false);
    }
  };

  // Handle approval
  const handleApproval = async () => {
    if (!quote || !fromToken || !address || !rpcUrl || !keySlot) return;

    setIsApproving(true);
    setShowPinInput(true);
  };

  // Handle PIN submission for approval
  const handleApprovalPinSubmit = async (enteredPin: string) => {
    if (!quote || !fromToken || !address || !rpcUrl || !keySlot) return;

    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Build approval transaction
      const approvalTx = settings.autoApprove
        ? await buildInfiniteApprovalTransaction(fromToken.address, quote.allowanceTarget, address, provider)
        : await buildSpecificApprovalTransaction(fromToken.address, quote.allowanceTarget, quote.sellAmount, provider);

      // Sign transaction
      const signedTx = await signTransactionSmart(approvalTx, keySlot, enteredPin, environment);
      
      // Broadcast transaction with rate limiting
      const txResponse = await rpcRateLimiter.makeRequest(async () => {
        return await provider.broadcastTransaction(signedTx);
      });
      
      setTxHash(txResponse.hash);
      setShowPinInput(false);
      setToastMessage('Approval transaction submitted');
      setShowToast(true);
      
      // Wait for confirmation and refresh allowance
      await txResponse.wait();
      await checkAllowance();
      
    } catch (error: any) {
      console.error('❌ [Swap] Approval failed:', error);
      
      // Provide better error messages for common issues
      let errorMessage = error.message || 'Approval failed';
      
      if (error.message?.includes('No Burner card detected')) {
        errorMessage = 'No Burner card detected. Please place your Burner card on the reader and try again.';
      } else if (error.message?.includes('Incorrect PIN') || error.message?.includes('WRONG_PWD') || error.message?.includes('password')) {
        errorMessage = 'Incorrect PIN. Please try again.';
        // Clear PIN input on error so user can re-enter
        setShowPinInput(false);
        setTimeout(() => setShowPinInput(true), 100);
      } else if (error.message?.includes('transaction type not supported')) {
        errorMessage = 'Transaction type not supported. Please try again.';
      } else if (error.message?.includes('Another signing operation is in progress')) {
        errorMessage = 'Please wait for the current operation to complete before trying again.';
      }
      
      setPinError(errorMessage);
    } finally {
      setIsApproving(false);
    }
  };

  // Handle swap execution
  const handleSwap = async () => {
    if (!quote || !address || !rpcUrl || !keySlot) return;

    setShowPinInput(true);
  };

  // Handle PIN submission for swap
  const handleSwapPinSubmit = async (enteredPin: string) => {
    if (!quote || !address || !rpcUrl || !keySlot) return;

    // Prevent duplicate calls
    if (isExecuting) {
      console.log('⚠️ [Swap] Already executing, ignoring duplicate call');
      return;
    }

    console.log('🚀 [Swap] Starting PIN submission process...');
    setIsExecuting(true);

    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      let currentQuote = quote;
      
      // Handle auto-approval if needed
      if (settings.autoApprove && allowanceInfo?.needsApproval) {
        console.log('🔍 [Auto-Approve] Performing automatic approval...');
        setCurrentOperation('Approving token allowance');
        
        // Build approval transaction
        const approvalTx = settings.autoApprove
          ? await buildInfiniteApprovalTransaction(fromToken!.address, quote.allowanceTarget, address, provider)
          : await buildSpecificApprovalTransaction(fromToken!.address, quote.allowanceTarget, quote.sellAmount, provider);
        
        // Sign and broadcast approval transaction with rate limiting
        const signedApprovalTx = await signTransactionSmart(approvalTx, keySlot, enteredPin, environment);
        const approvalResponse = await rpcRateLimiter.makeRequest(async () => {
          return await provider.broadcastTransaction(signedApprovalTx);
        });
        
        console.log('🔍 [Auto-Approve] Approval transaction submitted:', approvalResponse.hash);
        
        // Wait for approval confirmation
        await approvalResponse.wait();
        console.log('🔍 [Auto-Approve] Approval confirmed, proceeding with swap...');
        
        // Small delay to ensure the signing operation is fully completed
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Rebuild swap transaction with fresh nonce after approval
        console.log('🔄 [Auto-Approve] Rebuilding swap transaction with fresh nonce...');
        
        // Convert amounts to wei for the API (same logic as in fetchQuote)
        let sellAmountWei: string | undefined;
        let buyAmountWei: string | undefined;

        if (fromAmount) {
          // For native tokens (ETH), use 18 decimals
          if (fromToken!.address === 'native') {
            sellAmountWei = ethers.parseEther(fromAmount).toString();
          } else {
            // For ERC20 tokens, use their specific decimals
            sellAmountWei = ethers.parseUnits(fromAmount, fromToken!.decimals).toString();
          }
        }

        if (toAmount) {
          // For native tokens (ETH), use 18 decimals
          if (toToken!.address === 'native') {
            buyAmountWei = ethers.parseEther(toAmount).toString();
          } else {
            // For ERC20 tokens, use their specific decimals
            buyAmountWei = ethers.parseUnits(toAmount, toToken!.decimals).toString();
          }
        }

        const freshQuoteParams = {
          sellToken: fromToken!.address,
          buyToken: toToken!.address,
          sellAmount: sellAmountWei,
          buyAmount: buyAmountWei,
          slippagePercentage: settings.slippagePercentage,
          takerAddress: address,
          chainId,
        };

        const freshQuote = await getSwapQuote(freshQuoteParams);
        setQuote(freshQuote);
        currentQuote = freshQuote;
      }
      
      // Build swap transaction with chainId for proper transaction type
      setCurrentOperation('Signing swap transaction');
      const swapTx = await buildSwapTransaction(currentQuote, address, provider, chainId);
      
      // Sign swap transaction
      const signedSwapTx = await signTransactionSmart(swapTx, keySlot, enteredPin, environment);
      
      // Broadcast swap transaction with rate limiting
      setCurrentOperation('Broadcasting swap transaction');
      const txResponse = await rpcRateLimiter.makeRequest(async () => {
        return await provider.broadcastTransaction(signedSwapTx);
      });
      
      // Close the swap modal and notify parent about transaction
      setShowPinInput(false);
      setCurrentOperation(null);
      
      // Notify parent component about the transaction
      if (onTransactionSubmitted) {
        onTransactionSubmitted(
          txResponse.hash,
          fromToken!.symbol,
          toToken!.symbol,
          fromAmount!,
          toAmount!
        );
      }
      
      // Close the swap modal
      onSuccess();
      
    } catch (error: any) {
      console.error('❌ [Swap] Execution failed:', error);
      
      // Provide better error messages for common issues
      let errorMessage = error.message || 'Swap failed';
      const operationContext = currentOperation ? ` (${currentOperation})` : '';
      
      // Prioritize card detection error over signing conflict
      if (error.message?.includes('No Burner card detected')) {
        errorMessage = `No Burner card detected${operationContext}. Please place your Burner card on the reader and try again.`;
      } else if (error.message?.includes('Incorrect PIN') || error.message?.includes('WRONG_PWD') || error.message?.includes('password')) {
        errorMessage = `Incorrect PIN${operationContext}. Please try again.`;
        // Clear PIN input on error so user can re-enter
        setShowPinInput(false);
        setTimeout(() => setShowPinInput(true), 100);
      } else if (error.message?.includes('transaction type not supported')) {
        errorMessage = `Transaction type not supported${operationContext}. Please try again.`;
      } else if (error.message?.includes('Another signing operation is in progress')) {
        errorMessage = `Please wait for the current operation to complete before trying again${operationContext}.`;
      } else {
        errorMessage = `${errorMessage}${operationContext}`;
      }
      
      setPinError(errorMessage);
    } finally {
      setIsExecuting(false);
      setCurrentOperation(null);
    }
  };

  // Get price impact warning
  const priceImpactWarning = quote && quote.priceImpact ? getPriceImpactWarning(quote.priceImpact) : 'none';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="sw-surface w-full max-w-md max-h-[90vh] rounded-xl border border-[var(--sw-line)] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--sw-line)]">
          <span className="sw-uplabel">Swap {chainName}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-[var(--sw-muted)] hover:text-[var(--sw-ink)] transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="text-[var(--sw-muted)] hover:text-[var(--sw-ink)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Swap Interface */}
        <div className="px-5 py-5 space-y-3">
          {/* From Token */}
          <div className="space-y-1.5">
            <label className="sw-uplabel">You pay</label>
            <div className="rounded-xl p-3 border border-[var(--sw-line)]">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowTokenSelector('from')}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-[var(--sw-line)] text-[var(--sw-ink)] hover:bg-[color-mix(in_srgb,var(--sw-ink)_6%,transparent)] transition-colors min-w-0 flex-shrink-0"
                >
                  {fromToken ? (
                    <>
                      <div className="w-5 h-5 sw-mark rounded flex items-center justify-center">
                        <span className="text-xs font-bold">
                          {fromToken.symbol.charAt(0)}
                        </span>
                      </div>
                      <span className="font-medium">
                        {fromToken.symbol}
                      </span>
                      <ArrowUpDown className="w-4 h-4 text-[var(--sw-muted)]" />
                    </>
                  ) : (
                    <>
                      <span className="text-[var(--sw-muted)]">Select token</span>
                      <ArrowUpDown className="w-4 h-4 text-[var(--sw-muted)]" />
                    </>
                  )}
                </button>
                <div className="flex-1 flex items-center justify-between">
                  <input
                    type="number"
                    value={fromAmount}
                    onChange={(e) => handleAmountChange(e.target.value, 'from')}
                    placeholder="0.0"
                    className="sw-mono text-xl font-bold bg-transparent text-[var(--sw-ink)] placeholder-[var(--sw-muted)] w-full outline-none"
                  />
                  <div className="text-right ml-2">
                    <div className="sw-mono text-sm text-[var(--sw-muted)]">
                      $0.00
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleMaxAmount}
                  className="sw-uplabel px-2 py-1 text-[var(--sw-accent)] hover:text-[var(--sw-accent-press)] transition-colors flex-shrink-0"
                >
                  Max
                </button>
              </div>
              <div className="mt-2 sw-mono text-xs text-[var(--sw-muted)]">
                {fromToken ? `Balance ${formatSwapBalance(fromToken.balance)}` : ''}
              </div>
            </div>
          </div>

          {/* Swap Direction Toggle */}
          <div className="flex justify-center -my-1">
            <button
              onClick={handleSwapTokens}
              className="p-2 rounded-lg border border-[var(--sw-line)] bg-[var(--sw-surface)] text-[var(--sw-ink)] hover:bg-[color-mix(in_srgb,var(--sw-ink)_6%,transparent)] transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>

          {/* To Token */}
          <div className="space-y-1.5">
            <label className="sw-uplabel">You receive</label>
            <div className="rounded-xl p-3 border border-[var(--sw-line)]">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowTokenSelector('to')}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-[var(--sw-line)] text-[var(--sw-ink)] hover:bg-[color-mix(in_srgb,var(--sw-ink)_6%,transparent)] transition-colors min-w-0 flex-shrink-0"
                >
                  {toToken ? (
                    <>
                      <div className="w-5 h-5 sw-mark rounded flex items-center justify-center">
                        <span className="text-xs font-bold">
                          {toToken.symbol.charAt(0)}
                        </span>
                      </div>
                      <span className="font-medium">
                        {toToken.symbol}
                      </span>
                      <ArrowUpDown className="w-4 h-4 text-[var(--sw-muted)]" />
                    </>
                  ) : (
                    <>
                      <span className="text-[var(--sw-muted)]">Select token</span>
                      <ArrowUpDown className="w-4 h-4 text-[var(--sw-muted)]" />
                    </>
                  )}
                </button>
                <div className="flex-1 flex items-center justify-between">
                  <input
                    type="number"
                    value={toAmount ? formatSwapBalance(toAmount) : ''}
                    onChange={(e) => handleAmountChange(e.target.value, 'to')}
                    placeholder="0.0"
                    className="sw-mono text-xl font-bold bg-transparent text-[var(--sw-ink)] placeholder-[var(--sw-muted)] w-full outline-none"
                  />
                  <div className="text-right ml-2">
                    <div className="sw-mono text-sm text-[var(--sw-muted)]">
                      $0.00
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-2 sw-mono text-xs text-[var(--sw-muted)]">
                {toToken ? `Balance ${formatSwapBalance(toToken.balance)}` : ''}
              </div>
            </div>
          </div>

          {/* Quote Information */}
          {quote && (
            <div className="pt-1">
              <div className="flex items-center justify-between py-2 text-sm border-t border-[var(--sw-line-soft)]">
                <span className="text-[var(--sw-muted)]">Rate</span>
                <span className="sw-mono text-[var(--sw-ink)]">
                  {formatExchangeRate(quote, fromToken?.symbol, toToken?.symbol, fromToken?.decimals, toToken?.decimals)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 text-sm border-t border-[var(--sw-line-soft)]">
                <span className="text-[var(--sw-muted)]">Price impact</span>
                <span className={`sw-mono ${
                  priceImpactWarning === 'high' ? 'text-[var(--sw-down)]' :
                  priceImpactWarning === 'medium' ? 'text-[var(--sw-accent)]' :
                  'text-[var(--sw-ink)]'
                }`}>
                  {formatPriceImpact(quote.priceImpact)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 text-sm border-t border-[var(--sw-line-soft)]">
                <span className="text-[var(--sw-muted)]">Minimum received</span>
                <span className="sw-mono text-[var(--sw-ink)]">
                  {formatSwapBalance(ethers.formatEther(quote.buyAmount))} {toToken?.symbol}
                </span>
              </div>
              {/* Affiliate Fee Display */}
              {quote.fees?.integratorFee && (
                <div className="flex items-center justify-between py-2 text-sm border-t border-[var(--sw-line-soft)]">
                  <span className="text-[var(--sw-muted)]">Platform fee</span>
                  <span className="sw-mono text-[var(--sw-ink)]">
                    {formatSwapBalance(ethers.formatUnits(quote.fees.integratorFee.amount, fromToken?.decimals || 18))} {fromToken?.symbol} (0.88%)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {quoteError && (
            <div className="flex items-center gap-2 text-[var(--sw-down)]">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">{quoteError}</span>
            </div>
          )}

          {/* Approval Required Message */}
          {needsApproval && (
            <div className="flex items-center gap-2 text-[var(--sw-accent)] mb-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">
                Approve {fromToken?.symbol} before swapping
              </span>
            </div>
          )}

          {/* Main Action Button */}
          {fromToken && toToken && fromAmount && (
            <>
              {console.log('🔍 [Button Render] Button rendering with:', {
                fromToken: !!fromToken,
                toToken: !!toToken,
                fromAmount: !!fromAmount,
                quote: !!quote,
                isLoadingQuote,
                isApproving,
                needsApproval,
                isDisabled: !fromToken || !toToken || !fromAmount || isLoadingQuote || isApproving,
                buttonText: isLoadingQuote ? 'Getting Quote...' : quote ? (needsApproval ? 'Approve Token' : 'Swap Tokens') : 'Get Quote'
              })}
              <button
                onClick={isLoadingQuote ? undefined : (quote ? (needsApproval ? handleApproval : handleSwap) : fetchQuote)}
                disabled={!fromToken || !toToken || !fromAmount || isLoadingQuote || isApproving}
                className={quote ? 'sw-btn-primary w-full py-3 text-sm' : 'sw-btn-ghost w-full py-3 text-sm'}
                title={`Debug: fromToken=${!!fromToken}, toToken=${!!toToken}, fromAmount=${!!fromAmount}, quote=${!!quote}, isLoadingQuote=${isLoadingQuote}, isApproving=${isApproving}, needsApproval=${needsApproval}`}
              >
                {isLoadingQuote ? (
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Getting quote…</span>
                  </div>
                ) : quote ? (
                  needsApproval ? 'Approve token' : 'Swap'
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    <span>Get quote</span>
                  </div>
                )}
              </button>
            </>
          )}
        </div>

        {/* Token Selector Modal */}
        <AnimatePresence>
          {showTokenSelector && (
            <TokenSelector
              tokens={availableTokens}
              onSelectToken={handleTokenSelect}
              onClose={() => setShowTokenSelector(null)}
              tokenImages={tokenImages}
              tokenPrices={tokenPrices}
              title={showTokenSelector === 'from' ? 'Select Token to Sell' : 'Select Token to Buy'}
              onAddToken={() => {
                setAddTokenContext(showTokenSelector);
                setShowTokenSelector(null);
                setShowAddToken(true);
              }}
            />
          )}
        </AnimatePresence>

        {/* PIN Input Modal */}
        <PinInput
          onSubmit={(enteredPin) => {
            if (needsApproval) {
              handleApprovalPinSubmit(enteredPin);
            } else {
              handleSwapPinSubmit(enteredPin);
            }
          }}
          onCancel={() => setShowPinInput(false)}
          isVisible={showPinInput}
          error={pinError}
          isLoading={isExecuting}
          loadingMessage={currentOperation || "Processing..."}
        />

        {/* Add Token Modal */}
        <AnimatePresence>
          {showAddToken && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="sw-surface rounded-xl border border-[var(--sw-line)] p-6 w-full max-w-sm"
              >
                <h3 className="text-lg font-bold text-[var(--sw-ink)] mb-2">
                  Add custom token
                </h3>
                <p className="text-sm text-[var(--sw-ink-soft)] mb-4">
                  Enter the token contract address.
                </p>
                <input
                  type="text"
                  value={newTokenAddress}
                  onChange={(e) => setNewTokenAddress(e.target.value)}
                  placeholder="0x…"
                  className="sw-input sw-mono w-full border border-[var(--sw-line)] rounded-lg px-3 py-2.5 text-sm mb-4"
                />
                {addTokenError && (
                  <p className="text-[var(--sw-down)] text-sm mb-4 px-1 font-medium">{addTokenError}</p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowAddToken(false);
                      setNewTokenAddress('');
                      setAddTokenError(null);
                      // Reopen the token selector if we came from there
                      if (addTokenContext) {
                        setShowTokenSelector(addTokenContext);
                      }
                      setAddTokenContext(null);
                    }}
                    className="sw-btn-ghost flex-1 py-3 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddToken}
                    disabled={!newTokenAddress || isAddingToken}
                    className="sw-btn-primary flex-1 py-3 text-sm"
                  >
                    {isAddingToken ? 'Adding…' : 'Add token'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Settings Modal */}
        <AnimatePresence>
          {showSettings && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="sw-surface rounded-xl border border-[var(--sw-line)] p-6 w-full max-w-sm"
              >
                <h3 className="text-lg font-bold text-[var(--sw-ink)] mb-4">
                  Swap settings
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="sw-uplabel block mb-2">
                      Slippage tolerance
                    </label>
                    <input
                      type="number"
                      value={settings.slippagePercentage}
                      onChange={(e) => updateSettings({ slippagePercentage: parseFloat(e.target.value) || 0.5 })}
                      min="0.1"
                      max="50"
                      step="0.1"
                      className="sw-input sw-mono w-full border border-[var(--sw-line)] rounded-lg px-3 py-2.5 text-sm"
                    />
                    <p className="text-xs text-[var(--sw-muted)] mt-1">
                      The swap reverts if the price moves against you by more than this.
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="sw-uplabel">
                      Auto-approve tokens
                    </label>
                    <input
                      type="checkbox"
                      checked={settings.autoApprove}
                      onChange={(e) => updateSettings({ autoApprove: e.target.checked })}
                      className="w-4 h-4 accent-[var(--sw-accent)]"
                    />
                  </div>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="sw-btn-primary w-full mt-6 py-3 text-sm"
                >
                  Save
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Toast */}
        <Toast
          message={toastMessage}
          isVisible={showToast}
          onClose={() => setShowToast(false)}
        />

      </motion.div>
    </div>
  );
}
