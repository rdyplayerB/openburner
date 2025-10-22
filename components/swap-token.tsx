'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpDown, Settings, AlertTriangle, CheckCircle, X, RefreshCw } from 'lucide-react';
import { useWalletStore } from '../store/wallet-store';
import { useSwapStore, SwapTokenInfo } from '../store/swap-store';
import { getSwapQuote, buildSwapTransaction, validateSwapQuote, formatPriceImpact, formatExchangeRate, getPriceImpactWarning } from '../lib/swap-api';
import { getAllowanceInfo, buildInfiniteApprovalTransaction, buildSpecificApprovalTransaction } from '../lib/token-allowance';
import { signTransactionSmart } from '../lib/smart-signer';
import { getAppConfig } from '../lib/config/environment';
import { TokenSelector } from './token-selector';
import { Toast } from './toast';

interface SwapTokenProps {
  onClose: () => void;
  onSuccess: () => void;
  initialFromToken?: SwapTokenInfo;
  availableTokens?: SwapTokenInfo[];
  tokenImages?: { [symbol: string]: string };
  tokenPrices?: { [symbol: string]: number };
}

export function SwapToken({ onClose, onSuccess, initialFromToken, availableTokens = [], tokenImages = {}, tokenPrices = {} }: SwapTokenProps) {
  const { address, rpcUrl, chainId, keySlot } = useWalletStore();
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
  const [newTokenAddress, setNewTokenAddress] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pin, setPin] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const environment = getAppConfig();

  // Initialize with provided token
  useEffect(() => {
    if (initialFromToken) {
      setFromToken(initialFromToken);
    }
  }, [initialFromToken, setFromToken]);

  // Fetch quote when amounts change
  const fetchQuote = useCallback(async () => {
    if (!fromToken || !toToken || !address || !rpcUrl) return;

    const sellAmount = fromAmount && fromAmount !== '0' ? fromAmount : undefined;
    const buyAmount = toAmount && toAmount !== '0' ? toAmount : undefined;

    if (!sellAmount && !buyAmount) {
      setQuote(null);
      return;
    }

    setQuoteLoading(true);
    setQuoteError(null);

    try {
      const quoteParams = {
        sellToken: fromToken.address,
        buyToken: toToken.address,
        sellAmount,
        buyAmount,
        slippagePercentage: settings.slippagePercentage,
        takerAddress: address,
        chainId,
      };

      const newQuote = await getSwapQuote(quoteParams);
      
      if (validateSwapQuote(newQuote, sellAmount, buyAmount)) {
        setQuote(newQuote);
        
        // Update amounts based on quote
        if (sellAmount && !toAmount) {
          setToAmount(ethers.formatEther(newQuote.buyAmount));
        } else if (buyAmount && !fromAmount) {
          setFromAmount(ethers.formatEther(newQuote.sellAmount));
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
    if (!quote || !fromToken || !address || !rpcUrl) return;

    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const allowanceInfo = await getAllowanceInfo(
        fromToken.address,
        fromToken.symbol,
        quote.allowanceTarget,
        quote.sellAmount,
        address,
        provider
      );

      setAllowanceInfo(allowanceInfo);
      setNeedsApproval(allowanceInfo.needsApproval);
    } catch (error: any) {
      console.error('❌ [Swap] Allowance check failed:', error);
      setNeedsApproval(false);
    }
  }, [quote, fromToken, address, rpcUrl, setAllowanceInfo, setNeedsApproval]);

  // Fetch quote when dependencies change
  useEffect(() => {
    const timeoutId = setTimeout(fetchQuote, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [fetchQuote]);

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
    setShowTokenSelector(null);
  };

  // Handle amount input
  const handleAmountChange = (amount: string, type: 'from' | 'to') => {
    if (type === 'from') {
      setFromAmount(amount);
      setToAmount(''); // Clear to amount when from amount changes
    } else {
      setToAmount(amount);
      setFromAmount(''); // Clear from amount when to amount changes
    }
  };

  // Handle max button
  const handleMaxAmount = () => {
    if (fromToken) {
      setFromAmount(fromToken.balance);
    }
  };

  // Handle swap direction toggle
  const handleSwapTokens = () => {
    swapTokens();
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
        ? await buildInfiniteApprovalTransaction(fromToken.address, quote.allowanceTarget, provider)
        : await buildSpecificApprovalTransaction(fromToken.address, quote.allowanceTarget, quote.sellAmount, provider);

      // Sign transaction
      const signedTx = await signTransactionSmart(approvalTx, keySlot, enteredPin, environment);
      
      // Broadcast transaction
      const txResponse = await provider.broadcastTransaction(signedTx);
      
      setTxHash(txResponse.hash);
      setShowPinInput(false);
      setToastMessage('Approval transaction submitted');
      setShowToast(true);
      
      // Wait for confirmation and refresh allowance
      await txResponse.wait();
      await checkAllowance();
      
    } catch (error: any) {
      console.error('❌ [Swap] Approval failed:', error);
      setPinError(error.message || 'Approval failed');
    } finally {
      setIsApproving(false);
    }
  };

  // Handle swap execution
  const handleSwap = async () => {
    if (!quote || !address || !rpcUrl || !keySlot) return;

    setIsExecuting(true);
    setShowPinInput(true);
  };

  // Handle PIN submission for swap
  const handleSwapPinSubmit = async (enteredPin: string) => {
    if (!quote || !address || !rpcUrl || !keySlot) return;

    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Build swap transaction
      const swapTx = buildSwapTransaction(quote, address);
      
      // Sign transaction
      const signedTx = await signTransactionSmart(swapTx, keySlot, enteredPin, environment);
      
      // Broadcast transaction
      const txResponse = await provider.broadcastTransaction(signedTx);
      
      setTxHash(txResponse.hash);
      setShowPinInput(false);
      setToastMessage('Swap transaction submitted');
      setShowToast(true);
      
      // Wait for confirmation
      await txResponse.wait();
      
      // Reset swap state and close modal
      resetSwap();
      onSuccess();
      
    } catch (error: any) {
      console.error('❌ [Swap] Execution failed:', error);
      setPinError(error.message || 'Swap failed');
    } finally {
      setIsExecuting(false);
    }
  };

  // Get price impact warning
  const priceImpactWarning = quote ? getPriceImpactWarning(quote.priceImpact) : 'none';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-800 rounded-3xl border border-black/[0.04] dark:border-slate-700 shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/60 dark:border-slate-700/60">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Swap Tokens</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>

        {/* Swap Interface */}
        <div className="p-6 space-y-4">
          {/* From Token */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Sell</label>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-600/60">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setShowTokenSelector('from')}
                  className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {fromToken ? (
                    <>
                      <div className="w-6 h-6 bg-slate-200 dark:bg-slate-600 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          {fromToken.symbol.charAt(0)}
                        </span>
                      </div>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {fromToken.symbol}
                      </span>
                      <ArrowUpDown className="w-4 h-4 text-slate-400" />
                    </>
                  ) : (
                    <>
                      <span className="text-slate-500 dark:text-slate-400">Select token</span>
                      <ArrowUpDown className="w-4 h-4 text-slate-400" />
                    </>
                  )}
                </button>
                <button
                  onClick={handleMaxAmount}
                  className="px-3 py-1 text-xs font-medium text-brand-orange bg-brand-orange/10 rounded-lg hover:bg-brand-orange/20 transition-colors"
                >
                  Max
                </button>
              </div>
              <div className="flex items-center justify-between">
                <input
                  type="number"
                  value={fromAmount}
                  onChange={(e) => handleAmountChange(e.target.value, 'from')}
                  placeholder="0.0"
                  className="text-2xl font-bold bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 w-full outline-none"
                />
                <div className="text-right">
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {fromToken ? `Balance: ${parseFloat(fromToken.balance).toFixed(4)}` : ''}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    $0.00
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Swap Direction Toggle */}
          <div className="flex justify-center">
            <button
              onClick={handleSwapTokens}
              className="p-3 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              <ArrowUpDown className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          </div>

          {/* To Token */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Buy</label>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-600/60">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setShowTokenSelector('to')}
                  className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {toToken ? (
                    <>
                      <div className="w-6 h-6 bg-slate-200 dark:bg-slate-600 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          {toToken.symbol.charAt(0)}
                        </span>
                      </div>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {toToken.symbol}
                      </span>
                      <ArrowUpDown className="w-4 h-4 text-slate-400" />
                    </>
                  ) : (
                    <>
                      <span className="text-slate-500 dark:text-slate-400">Select token</span>
                      <ArrowUpDown className="w-4 h-4 text-slate-400" />
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowTokenSelector('to')}
                  className="px-3 py-1 text-xs font-medium text-brand-orange bg-brand-orange/10 rounded-lg hover:bg-brand-orange/20 transition-colors"
                >
                  + Add Token
                </button>
              </div>
              <div className="flex items-center justify-between">
                <input
                  type="number"
                  value={toAmount}
                  onChange={(e) => handleAmountChange(e.target.value, 'to')}
                  placeholder="0.0"
                  className="text-2xl font-bold bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 w-full outline-none"
                />
                <div className="text-right">
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {toToken ? `Balance: ${parseFloat(toToken.balance).toFixed(4)}` : ''}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    $0.00
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quote Information */}
          {quote && (
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Exchange Rate</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {formatExchangeRate(quote)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Price Impact</span>
                <span className={`font-medium ${
                  priceImpactWarning === 'high' ? 'text-red-500' :
                  priceImpactWarning === 'medium' ? 'text-yellow-500' :
                  'text-slate-900 dark:text-slate-100'
                }`}>
                  {formatPriceImpact(quote.priceImpact)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Minimum Received</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {ethers.formatEther(quote.buyAmount)} {toToken?.symbol}
                </span>
              </div>
            </div>
          )}

          {/* Error Display */}
          {quoteError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">{quoteError}</span>
              </div>
            </div>
          )}

          {/* Approval Required */}
          {needsApproval && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Approval Required</span>
              </div>
              <p className="text-sm text-yellow-600 dark:text-yellow-300 mb-3">
                You need to approve {fromToken?.symbol} before swapping
              </p>
              <button
                onClick={handleApproval}
                disabled={isApproving}
                className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors"
              >
                {isApproving ? 'Approving...' : 'Approve'}
              </button>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={needsApproval ? handleApproval : handleSwap}
            disabled={!fromToken || !toToken || !fromAmount || !quote || isLoadingQuote}
            className="w-full bg-brand-orange hover:bg-brand-orange-dark disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors disabled:cursor-not-allowed"
          >
            {isLoadingQuote ? (
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Fetching quote...</span>
              </div>
            ) : needsApproval ? (
              'Approve Token'
            ) : !fromToken || !toToken ? (
              'Select Tokens'
            ) : !fromAmount ? (
              'Enter Amount'
            ) : !quote ? (
              'Review Swap'
            ) : (
              'Swap Tokens'
            )}
          </button>
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
              onAddToken={() => setShowAddToken(true)}
            />
          )}
        </AnimatePresence>

        {/* PIN Input Modal */}
        <AnimatePresence>
          {showPinInput && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm"
              >
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
                  Enter PIN
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                  {needsApproval ? 'Approve token for swapping' : 'Confirm swap transaction'}
                </p>
                <input
                  type="password"
                  value={pin || ''}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter your PIN"
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-orange"
                  maxLength={6}
                />
                {pinError && (
                  <p className="text-red-500 text-sm mt-2">{pinError}</p>
                )}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowPinInput(false)}
                    className="flex-1 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold py-2.5 px-4 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (needsApproval) {
                        handleApprovalPinSubmit(pin || '');
                      } else {
                        handleSwapPinSubmit(pin || '');
                      }
                    }}
                    disabled={!pin || pin.length < 4}
                    className="flex-1 bg-brand-orange hover:bg-brand-orange-dark disabled:bg-slate-300 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors disabled:cursor-not-allowed"
                  >
                    Confirm
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Add Token Modal */}
        <AnimatePresence>
          {showAddToken && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm"
              >
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
                  Add Custom Token
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Enter the token contract address to add it to your wallet
                </p>
                <input
                  type="text"
                  value={newTokenAddress}
                  onChange={(e) => setNewTokenAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-orange mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddToken(false)}
                    className="flex-1 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold py-2.5 px-4 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Add token validation and addition logic
                      setShowAddToken(false);
                      setNewTokenAddress('');
                    }}
                    disabled={!newTokenAddress}
                    className="flex-1 bg-brand-orange hover:bg-brand-orange-dark disabled:bg-slate-300 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors disabled:cursor-not-allowed"
                  >
                    Add Token
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
                className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm"
              >
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
                  Swap Settings
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Slippage Tolerance
                    </label>
                    <input
                      type="number"
                      value={settings.slippagePercentage}
                      onChange={(e) => updateSettings({ slippagePercentage: parseFloat(e.target.value) || 0.5 })}
                      min="0.1"
                      max="50"
                      step="0.1"
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-orange"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Your transaction will revert if the price changes unfavorably by more than this percentage.
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Auto-approve tokens
                    </label>
                    <input
                      type="checkbox"
                      checked={settings.autoApprove}
                      onChange={(e) => updateSettings({ autoApprove: e.target.checked })}
                      className="w-4 h-4 text-brand-orange bg-slate-100 border-slate-300 rounded focus:ring-brand-orange"
                    />
                  </div>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="w-full mt-6 bg-brand-orange hover:bg-brand-orange-dark text-white font-semibold py-2.5 px-4 rounded-xl transition-colors"
                >
                  Save Settings
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
