'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useShallow } from 'zustand/react/shallow';
import { ArrowUpDown, Settings, AlertTriangle, X, RefreshCw } from 'lucide-react';
import { useWalletStore } from '../store/wallet-store';
import { useSwapStore, SwapTokenInfo } from '../store/swap-store';
import { getSwapQuote, buildSwapTransaction, validateSwapQuote, formatPriceImpact, formatExchangeRate, getPriceImpactWarning, type SwapQuote } from '../lib/swap-api';
import { getAllowanceInfo, buildInfiniteApprovalTransaction, buildSpecificApprovalTransaction } from '../lib/token-allowance';
import { getAppConfig } from '../lib/config/environment';
import { TokenSelector } from './token-selector';
import { PinInput } from './pin-input';
import { Modal } from './common/modal';
import { getTokenImage } from '../lib/token-icons';
import { formatSwapBalance } from '../lib/format-utils';
import { getProvider } from '../lib/provider';
import { truncateToDecimals, parseAmount, formatAmountForInput, getNativeGasReserve } from '../lib/amount';
import { friendlyTxError, isRetryablePinError } from '../lib/tx-errors';
import { getNativeSymbol } from '../lib/supported-chains';
import { showToast } from '../store/toast-store';
import type { TransactionSummary } from './transaction-completion-modal';

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
];

// Typical upper bound for a 0x swap; used only to size the native "Max" reserve.
const SWAP_GAS_FOR_RESERVE = 350000n;

interface SwapTokenProps {
  onClose: () => void;
  onSuccess: () => void;
  onRefreshAssets?: () => void;
  onTransactionSubmitted?: (tx: TransactionSummary) => void;
  initialFromToken?: SwapTokenInfo;
  availableTokens?: SwapTokenInfo[];
  tokenImages?: { [symbol: string]: string };
  tokenPrices?: { [symbol: string]: number };
  onTokenAdded?: (token: SwapTokenInfo, imageUrl?: string) => void;
}

function toBaseUnits(amount: string, token: SwapTokenInfo): string {
  const decimals = token.address === 'native' ? 18 : token.decimals;
  return ethers.parseUnits(truncateToDecimals(amount, decimals), decimals).toString();
}

function UsdValue({ amount, symbol, prices }: { amount: string; symbol?: string; prices: { [s: string]: number } }) {
  const { pricingEnabled } = getAppConfig();
  const price = symbol ? prices[symbol] : undefined;
  const value = parseFloat(amount);
  if (!pricingEnabled || !price || !isFinite(value) || value <= 0) return null;
  return <div className="sw-mono text-sm text-[var(--sw-muted)]">${(value * price).toFixed(2)}</div>;
}

export function SwapToken({ onClose, onSuccess, onTransactionSubmitted, availableTokens = [], tokenImages = {}, tokenPrices = {}, onTokenAdded }: SwapTokenProps) {
  const address = useWalletStore((s) => s.address);
  const rpcUrl = useWalletStore((s) => s.rpcUrl);
  const chainId = useWalletStore((s) => s.chainId);
  const chainName = useWalletStore((s) => s.chainName);
  const keySlot = useWalletStore((s) => s.keySlot);

  const { fromToken, toToken, fromAmount, toAmount, quote, isLoadingQuote, quoteError, allowanceInfo, needsApproval, settings } =
    useSwapStore(
      useShallow((s) => ({
        fromToken: s.fromToken,
        toToken: s.toToken,
        fromAmount: s.fromAmount,
        toAmount: s.toAmount,
        quote: s.quote,
        isLoadingQuote: s.isLoadingQuote,
        quoteError: s.quoteError,
        allowanceInfo: s.allowanceInfo,
        needsApproval: s.needsApproval,
        settings: s.settings,
      }))
    );
  const { setFromToken, setToToken, setFromAmount, setToAmount, setQuote, setQuoteLoading, setQuoteError, setAllowanceInfo, setNeedsApproval, updateSettings, swapTokens } =
    useSwapStore(
      useShallow((s) => ({
        setFromToken: s.setFromToken,
        setToToken: s.setToToken,
        setFromAmount: s.setFromAmount,
        setToAmount: s.setToAmount,
        setQuote: s.setQuote,
        setQuoteLoading: s.setQuoteLoading,
        setQuoteError: s.setQuoteError,
        setAllowanceInfo: s.setAllowanceInfo,
        setNeedsApproval: s.setNeedsApproval,
        updateSettings: s.updateSettings,
        swapTokens: s.swapTokens,
      }))
    );

  const [showTokenSelector, setShowTokenSelector] = useState<'from' | 'to' | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddToken, setShowAddToken] = useState(false);
  const [addTokenContext, setAddTokenContext] = useState<'from' | 'to' | null>(null);
  const [newTokenAddress, setNewTokenAddress] = useState('');
  const [isAddingToken, setIsAddingToken] = useState(false);
  const [addTokenError, setAddTokenError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isMaxLoading, setIsMaxLoading] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<string | null>(null);
  const [pinMode, setPinMode] = useState<'approve' | 'swap' | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  const environment = getAppConfig();
  const nativeSymbol = getNativeSymbol(chainId);
  const busy = isExecuting || isApproving;

  const quoteParams = useCallback(() => {
    if (!fromToken || !toToken || !address) return null;
    const sellAmount = fromAmount && fromAmount !== '0' ? toBaseUnits(fromAmount, fromToken) : undefined;
    const buyAmount = !sellAmount && toAmount && toAmount !== '0' ? toBaseUnits(toAmount, toToken) : undefined;
    if (!sellAmount && !buyAmount) return null;
    return {
      sellToken: fromToken.address,
      buyToken: toToken.address,
      sellAmount,
      buyAmount,
      slippagePercentage: settings.slippagePercentage,
      takerAddress: address,
      chainId,
    };
  }, [fromToken, toToken, fromAmount, toAmount, address, chainId, settings.slippagePercentage]);

  // One 0x call per quote: /quote already reports liquidity, so the separate /price
  // pre-check is skipped.
  const fetchQuote = useCallback(async () => {
    if (!fromToken || !toToken || !address || !rpcUrl) return;

    if (fromToken.address === toToken.address) {
      setQuoteError('Cannot swap the same token');
      return;
    }

    if (fromAmount) {
      const decimals = fromToken.address === 'native' ? 18 : fromToken.decimals;
      const requested = parseAmount(fromAmount, decimals);
      const balance = parseAmount(fromToken.balance, decimals) ?? 0n;
      if (requested === null || requested <= 0n) {
        setQuoteError('Enter an amount greater than 0.');
        return;
      }
      if (requested > balance) {
        setQuoteError(`Insufficient ${fromToken.symbol} balance. You have ${formatSwapBalance(fromToken.balance)}.`);
        return;
      }
    }

    let params;
    try {
      params = quoteParams();
    } catch {
      setQuoteError('Enter a valid amount.');
      return;
    }
    if (!params) {
      setQuote(null);
      return;
    }

    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const newQuote = await getSwapQuote(params);
      if (newQuote.liquidityAvailable === false) {
        throw new Error('Insufficient liquidity for this swap');
      }
      if (!validateSwapQuote(newQuote, params.sellAmount, params.buyAmount)) {
        setQuoteError('Invalid quote received');
        return;
      }
      setQuote(newQuote);
      if (params.sellAmount) {
        setToAmount(ethers.formatUnits(newQuote.buyAmount, toToken.address === 'native' ? 18 : toToken.decimals));
      } else {
        setFromAmount(ethers.formatUnits(newQuote.sellAmount, fromToken.address === 'native' ? 18 : fromToken.decimals));
      }
    } catch (error: any) {
      setQuoteError(error?.message || 'Failed to fetch quote');
    } finally {
      setQuoteLoading(false);
    }
  }, [fromToken, toToken, fromAmount, address, rpcUrl, quoteParams, setQuote, setQuoteLoading, setQuoteError, setToAmount, setFromAmount]);

  // Check allowance whenever a new quote arrives (ERC-20 sells only).
  const checkAllowance = useCallback(async () => {
    if (!quote || !fromToken || !address || !rpcUrl) return;
    if (fromToken.address === 'native') {
      setAllowanceInfo(null);
      setNeedsApproval(false);
      return;
    }
    try {
      const info = await getAllowanceInfo(
        fromToken.address,
        fromToken.symbol,
        quote.allowanceTarget,
        quote.sellAmount,
        address,
        getProvider(chainId, rpcUrl)
      );
      setAllowanceInfo(info);
      // With auto-approve on, approval happens inside the swap signing flow.
      setNeedsApproval(info.needsApproval && !settings.autoApprove);
    } catch {
      setNeedsApproval(false);
    }
  }, [quote, fromToken, address, rpcUrl, chainId, settings.autoApprove, setAllowanceInfo, setNeedsApproval]);

  useEffect(() => {
    checkAllowance();
  }, [checkAllowance]);

  const clearQuote = () => {
    setQuote(null);
    setNeedsApproval(false);
    setAllowanceInfo(null);
  };

  const handleTokenSelect = (token: SwapTokenInfo) => {
    if (showTokenSelector === 'from') setFromToken(token);
    else if (showTokenSelector === 'to') setToToken(token);
    clearQuote();
    setToAmount('');
    setShowTokenSelector(null);
  };

  const handleAmountChange = (amount: string, type: 'from' | 'to') => {
    if (type === 'from') setFromAmount(amount);
    else setToAmount(amount);
    if (quote) clearQuote();
  };

  // Native "Max" leaves enough for the swap's network fee.
  const handleMaxAmount = async () => {
    if (!fromToken) return;
    if (quote) clearQuote();
    if (fromToken.address !== 'native') {
      setFromAmount(fromToken.balance);
      return;
    }
    if (!rpcUrl) return;
    setIsMaxLoading(true);
    try {
      const balance = parseAmount(fromToken.balance, 18) ?? 0n;
      const reserve = await getNativeGasReserve(getProvider(chainId, rpcUrl), chainId, SWAP_GAS_FOR_RESERVE);
      const max = balance - reserve;
      if (max <= 0n) {
        setFromAmount('');
        setQuoteError(`Your ${nativeSymbol} balance is too low to cover the network fee.`);
      } else {
        setFromAmount(formatAmountForInput(max, 18));
      }
    } finally {
      setIsMaxLoading(false);
    }
  };

  const handleAddToken = async () => {
    if (!newTokenAddress || !address || !rpcUrl) return;
    if (!ethers.isAddress(newTokenAddress.trim())) {
      setAddTokenError('Invalid token address format');
      return;
    }

    setAddTokenError(null);
    setIsAddingToken(true);
    try {
      const tokenAddr = newTokenAddress.trim();
      const contract = new ethers.Contract(tokenAddr, ERC20_ABI, getProvider(chainId, rpcUrl));
      const [balance, symbol, name, decimals] = await Promise.all([
        contract.balanceOf(address),
        contract.symbol(),
        contract.name(),
        contract.decimals(),
      ]);

      const newToken: SwapTokenInfo = {
        address: tokenAddr,
        symbol,
        name,
        decimals: Number(decimals),
        balance: ethers.formatUnits(balance, decimals),
      };

      let imageUrl: string | null = null;
      try {
        imageUrl = await getTokenImage(symbol, tokenAddr, chainId);
      } catch {
        /* icon is optional */
      }
      onTokenAdded?.(newToken, imageUrl || undefined);

      if (addTokenContext === 'from') setFromToken(newToken);
      else if (addTokenContext === 'to') setToToken(newToken);
      clearQuote();
      setToAmount('');

      setShowAddToken(false);
      setNewTokenAddress('');
      setAddTokenContext(null);
    } catch (err: any) {
      setAddTokenError(
        err?.code === 'CALL_EXCEPTION' || err?.code === 'BAD_DATA'
          ? 'Invalid contract address or contract not found on this network'
          : friendlyTxError(err, nativeSymbol)
      );
    } finally {
      setIsAddingToken(false);
    }
  };

  const openPin = (mode: 'approve' | 'swap') => {
    if (!quote || !address || !rpcUrl || !keySlot || busy) return;
    setPinError(null);
    setPinMode(mode);
  };

  const closePin = () => {
    if (busy) return;
    setPinMode(null);
    setPinError(null);
  };

  /** Shown inside the PIN dialog; wrong PIN / no card keep it open for a retry. */
  const handlePinFailure = (error: any) => {
    const message = friendlyTxError(error, nativeSymbol);
    if (isRetryablePinError(error)) {
      setPinError(message);
    } else {
      setPinMode(null);
      setPinError(null);
      setQuoteError(message);
    }
  };

  const signAndBroadcast = async (tx: ethers.TransactionRequest, pin: string) => {
    const provider = getProvider(chainId, rpcUrl);
    const { signTransactionSmart } = await import('../lib/smart-signer');
    const signed = await signTransactionSmart(tx, keySlot!, pin, environment);
    return provider.broadcastTransaction(signed);
  };

  // Manual approval (auto-approve off).
  const handleApprovalPinSubmit = async (enteredPin: string) => {
    if (!quote || !fromToken || !address || !rpcUrl || !keySlot || isApproving) return;
    setIsApproving(true);
    setPinError(null);
    try {
      const provider = getProvider(chainId, rpcUrl);
      setCurrentOperation('Signing approval');
      const approvalTx = await buildSpecificApprovalTransaction(fromToken.address, quote.allowanceTarget, quote.sellAmount, address, provider);
      const txResponse = await signAndBroadcast(approvalTx, enteredPin);
      setPinMode(null);
      setCurrentOperation(null);
      showToast('Approval submitted — waiting for confirmation', 'info');
      const receipt = await txResponse.wait();
      if (receipt?.status === 0) {
        setQuoteError('The approval transaction failed on-chain. Please try again.');
      } else {
        showToast(`${fromToken.symbol} approved`, 'success');
        await checkAllowance();
      }
    } catch (error: any) {
      handlePinFailure(error);
    } finally {
      setIsApproving(false);
      setCurrentOperation(null);
    }
  };

  const handleSwapPinSubmit = async (enteredPin: string) => {
    if (!quote || !address || !rpcUrl || !keySlot || !fromToken || !toToken) return;
    if (isExecuting) return; // double-submit guard

    setIsExecuting(true);
    setPinError(null);
    try {
      const provider = getProvider(chainId, rpcUrl);
      let currentQuote: SwapQuote = quote;

      if (settings.autoApprove && allowanceInfo?.needsApproval) {
        setCurrentOperation('Approving token allowance');
        const approvalTx = await buildInfiniteApprovalTransaction(fromToken.address, quote.allowanceTarget, address, provider);
        const approvalResponse = await signAndBroadcast(approvalTx, enteredPin);
        setCurrentOperation('Waiting for approval to confirm');
        const approvalReceipt = await approvalResponse.wait();
        if (approvalReceipt?.status === 0) throw new Error('The approval transaction failed on-chain.');

        // Re-quote so the swap uses a fresh nonce/route after the approval.
        setCurrentOperation('Refreshing quote');
        const params = quoteParams();
        if (params) {
          currentQuote = await getSwapQuote(params);
          setQuote(currentQuote);
        }
      }

      setCurrentOperation('Signing swap transaction');
      const swapTx = await buildSwapTransaction(currentQuote, address, provider, chainId);
      setCurrentOperation('Broadcasting swap transaction');
      const txResponse = await signAndBroadcast(swapTx, enteredPin);

      setPinMode(null);
      setCurrentOperation(null);

      const toDecimals = toToken.address === 'native' ? 18 : toToken.decimals;
      onTransactionSubmitted?.({
        kind: 'swap',
        txHash: txResponse.hash,
        chainId,
        fromToken: fromToken.symbol,
        toToken: toToken.symbol,
        fromAmount: fromAmount || ethers.formatUnits(currentQuote.sellAmount, fromToken.address === 'native' ? 18 : fromToken.decimals),
        toAmount: formatSwapBalance(ethers.formatUnits(currentQuote.buyAmount, toDecimals)),
      });
      onSuccess();
    } catch (error: any) {
      handlePinFailure(error);
    } finally {
      setIsExecuting(false);
      setCurrentOperation(null);
    }
  };

  const priceImpactWarning = quote && quote.priceImpact ? getPriceImpactWarning(quote.priceImpact) : 'none';
  const toDecimals = toToken ? (toToken.address === 'native' ? 18 : toToken.decimals) : 18;
  const fromDecimals = fromToken ? (fromToken.address === 'native' ? 18 : fromToken.decimals) : 18;

  // Integrator fee is charged in the sell token; show its share of the sell amount.
  let feeLabel: string | null = null;
  if (quote?.fees?.integratorFee?.amount && quote.sellAmount) {
    try {
      const feeAmount = BigInt(quote.fees.integratorFee.amount);
      const sell = BigInt(quote.sellAmount);
      const pct = sell > 0n ? Number((feeAmount * 1000000n) / sell) / 10000 : null;
      feeLabel = `${formatSwapBalance(ethers.formatUnits(feeAmount, fromDecimals))} ${fromToken?.symbol ?? ''}${pct !== null ? ` (${pct.toFixed(2)}%)` : ''}`;
    } catch {
      feeLabel = null;
    }
  }

  const minReceived = quote?.minBuyAmount
    ? formatSwapBalance(ethers.formatUnits(quote.minBuyAmount, toDecimals))
    : null;

  return (
    <Modal
      onClose={() => !busy && onClose()}
      labelledBy="swap-title"
      closeOnBackdrop={!busy}
      className="sw-surface w-full max-w-md max-h-[90dvh] rounded-xl border border-[var(--sw-line)] overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--sw-line)] flex-shrink-0">
        <h2 id="swap-title" className="sw-uplabel">Swap {chainName}</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings(true)}
            className="p-1 text-[var(--sw-muted)] hover:text-[var(--sw-ink)] transition-colors"
            aria-label="Swap settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            disabled={busy}
            className="p-1 text-[var(--sw-muted)] hover:text-[var(--sw-ink)] transition-colors"
            aria-label="Close swap"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrollable body keeps the action button reachable with the keyboard open */}
      <div className="px-5 py-5 space-y-3 overflow-y-auto overscroll-contain min-h-0 flex-auto">
        {/* From Token */}
        <div className="space-y-1.5">
          <label htmlFor="swap-from-amount" className="sw-uplabel">You pay</label>
          <div className="rounded-xl p-3 border border-[var(--sw-line)]">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowTokenSelector('from')}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-[var(--sw-line)] text-[var(--sw-ink)] hover:bg-[color-mix(in_srgb,var(--sw-ink)_6%,transparent)] transition-colors min-w-0 flex-shrink-0"
                aria-label={fromToken ? `Change token to pay, currently ${fromToken.symbol}` : 'Select token to pay'}
              >
                {fromToken ? (
                  <>
                    <div className="w-5 h-5 sw-mark rounded flex items-center justify-center" aria-hidden="true">
                      <span className="text-xs font-bold">{fromToken.symbol.charAt(0)}</span>
                    </div>
                    <span className="font-medium">{fromToken.symbol}</span>
                  </>
                ) : (
                  <span className="text-[var(--sw-muted)]">Select token</span>
                )}
                <ArrowUpDown className="w-4 h-4 text-[var(--sw-muted)]" aria-hidden="true" />
              </button>
              <div className="flex-1 flex items-center justify-between min-w-0">
                <input
                  id="swap-from-amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={fromAmount}
                  onChange={(e) => handleAmountChange(e.target.value.replace(',', '.'), 'from')}
                  placeholder="0.0"
                  className="sw-mono text-xl font-bold bg-transparent text-[var(--sw-ink)] placeholder-[var(--sw-muted)] w-full outline-none min-w-0"
                />
                <div className="text-right ml-2">
                  <UsdValue amount={fromAmount} symbol={fromToken?.symbol} prices={tokenPrices} />
                </div>
              </div>
              <button
                onClick={handleMaxAmount}
                disabled={!fromToken || isMaxLoading}
                className="sw-uplabel px-2 py-1 text-[var(--sw-accent)] hover:text-[var(--sw-accent-press)] transition-colors flex-shrink-0"
                aria-label={fromToken?.address === 'native' ? 'Use maximum amount, keeping enough for the network fee' : 'Use maximum amount'}
              >
                {isMaxLoading ? '…' : 'Max'}
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
            onClick={() => swapTokens()}
            className="p-2 rounded-lg border border-[var(--sw-line)] bg-[var(--sw-surface)] text-[var(--sw-ink)] hover:bg-[color-mix(in_srgb,var(--sw-ink)_6%,transparent)] transition-colors"
            aria-label="Switch pay and receive tokens"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>

        {/* To Token */}
        <div className="space-y-1.5">
          <label htmlFor="swap-to-amount" className="sw-uplabel">You receive</label>
          <div className="rounded-xl p-3 border border-[var(--sw-line)]">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowTokenSelector('to')}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-[var(--sw-line)] text-[var(--sw-ink)] hover:bg-[color-mix(in_srgb,var(--sw-ink)_6%,transparent)] transition-colors min-w-0 flex-shrink-0"
                aria-label={toToken ? `Change token to receive, currently ${toToken.symbol}` : 'Select token to receive'}
              >
                {toToken ? (
                  <>
                    <div className="w-5 h-5 sw-mark rounded flex items-center justify-center" aria-hidden="true">
                      <span className="text-xs font-bold">{toToken.symbol.charAt(0)}</span>
                    </div>
                    <span className="font-medium">{toToken.symbol}</span>
                  </>
                ) : (
                  <span className="text-[var(--sw-muted)]">Select token</span>
                )}
                <ArrowUpDown className="w-4 h-4 text-[var(--sw-muted)]" aria-hidden="true" />
              </button>
              <div className="flex-1 flex items-center justify-between min-w-0">
                <input
                  id="swap-to-amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={toAmount ? (quote ? formatSwapBalance(toAmount) : toAmount) : ''}
                  onChange={(e) => handleAmountChange(e.target.value.replace(',', '.'), 'to')}
                  placeholder="0.0"
                  className="sw-mono text-xl font-bold bg-transparent text-[var(--sw-ink)] placeholder-[var(--sw-muted)] w-full outline-none min-w-0"
                />
                <div className="text-right ml-2">
                  <UsdValue amount={toAmount} symbol={toToken?.symbol} prices={tokenPrices} />
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
                {formatExchangeRate(quote, fromToken?.symbol, toToken?.symbol, fromDecimals, toDecimals)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 text-sm border-t border-[var(--sw-line-soft)]">
              <span className="text-[var(--sw-muted)]">Price impact</span>
              <span
                className={`sw-mono ${
                  priceImpactWarning === 'high'
                    ? 'text-[var(--sw-down)]'
                    : priceImpactWarning === 'medium'
                      ? 'text-[var(--sw-accent)]'
                      : 'text-[var(--sw-ink)]'
                }`}
              >
                {formatPriceImpact(quote.priceImpact)}
              </span>
            </div>
            {minReceived && (
              <div className="flex items-center justify-between py-2 text-sm border-t border-[var(--sw-line-soft)]">
                <span className="text-[var(--sw-muted)]">Minimum received</span>
                <span className="sw-mono text-[var(--sw-ink)]">
                  {minReceived} {toToken?.symbol}
                </span>
              </div>
            )}
            {feeLabel && (
              <div className="flex items-center justify-between py-2 text-sm border-t border-[var(--sw-line-soft)]">
                <span className="text-[var(--sw-muted)]">Platform fee</span>
                <span className="sw-mono text-[var(--sw-ink)]">{feeLabel}</span>
              </div>
            )}
          </div>
        )}

        {quoteError && (
          <div role="alert" className="flex items-center gap-2 text-[var(--sw-down)]">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span className="text-sm font-medium">{quoteError}</span>
          </div>
        )}

        {needsApproval && (
          <div className="flex items-center gap-2 text-[var(--sw-accent)] mb-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span className="text-sm font-medium">Approve {fromToken?.symbol} before swapping</span>
          </div>
        )}

        {fromToken && toToken && (fromAmount || toAmount) && (
          <button
            onClick={isLoadingQuote ? undefined : quote ? () => openPin(needsApproval ? 'approve' : 'swap') : fetchQuote}
            disabled={isLoadingQuote || busy}
            className={quote ? 'sw-btn-primary w-full py-3 text-sm' : 'sw-btn-ghost w-full py-3 text-sm'}
          >
            {isLoadingQuote ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Getting quote…</span>
              </span>
            ) : isApproving ? (
              'Approving…'
            ) : quote ? (
              needsApproval ? 'Approve token' : 'Swap'
            ) : (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                <span>Get quote</span>
              </span>
            )}
          </button>
        )}
      </div>

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

      <PinInput
        onSubmit={(enteredPin) => {
          if (pinMode === 'approve') handleApprovalPinSubmit(enteredPin);
          else handleSwapPinSubmit(enteredPin);
        }}
        onCancel={closePin}
        isVisible={pinMode !== null}
        error={pinError}
        isLoading={busy}
        loadingMessage={currentOperation || 'Processing...'}
      />

      {showAddToken && (
        <Modal
          onClose={() => {
            setShowAddToken(false);
            setAddTokenError(null);
          }}
          labelledBy="swap-add-token-title"
          className="sw-surface rounded-xl border border-[var(--sw-line)] p-6 w-full max-w-sm"
        >
          <h3 id="swap-add-token-title" className="text-lg font-bold text-[var(--sw-ink)] mb-2">
            Add custom token
          </h3>
          <label htmlFor="swap-add-token-address" className="block text-sm text-[var(--sw-ink-soft)] mb-4">
            Enter the token contract address.
          </label>
          <input
            id="swap-add-token-address"
            type="text"
            value={newTokenAddress}
            onChange={(e) => setNewTokenAddress(e.target.value)}
            placeholder="0x…"
            autoComplete="off"
            spellCheck={false}
            className="sw-input sw-mono w-full border border-[var(--sw-line)] rounded-lg px-3 py-2.5 text-sm mb-4"
          />
          {addTokenError && (
            <p role="alert" className="text-[var(--sw-down)] text-sm mb-4 px-1 font-medium">
              {addTokenError}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowAddToken(false);
                setNewTokenAddress('');
                setAddTokenError(null);
                if (addTokenContext) setShowTokenSelector(addTokenContext);
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
        </Modal>
      )}

      {showSettings && (
        <Modal
          onClose={() => setShowSettings(false)}
          labelledBy="swap-settings-title"
          className="sw-surface rounded-xl border border-[var(--sw-line)] p-6 w-full max-w-sm"
        >
          <h3 id="swap-settings-title" className="text-lg font-bold text-[var(--sw-ink)] mb-4">
            Swap settings
          </h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="swap-slippage" className="sw-uplabel block mb-2">
                Slippage tolerance (%)
              </label>
              <input
                id="swap-slippage"
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
              <label htmlFor="swap-auto-approve" className="sw-uplabel">
                Auto-approve tokens
              </label>
              <input
                id="swap-auto-approve"
                type="checkbox"
                checked={settings.autoApprove}
                onChange={(e) => updateSettings({ autoApprove: e.target.checked })}
                className="w-4 h-4 accent-[var(--sw-accent)]"
              />
            </div>
          </div>
          <button onClick={() => setShowSettings(false)} className="sw-btn-primary w-full mt-6 py-3 text-sm">
            Save
          </button>
        </Modal>
      )}
    </Modal>
  );
}
