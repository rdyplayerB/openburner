'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ethers } from 'ethers';
import { useShallow } from 'zustand/react/shallow';
import { ArrowDownUp, Settings2, X, ChevronDown, Loader2 } from 'lucide-react';
import { useWalletStore } from '../store/wallet-store';
import { useSwapStore, SwapTokenInfo } from '../store/swap-store';
import { recordActivity, settleActivity } from '../store/activity-store';
import { setCardPhase } from '../store/signing-store';
import { getSwapQuote, buildSwapTransaction, validateSwapQuote, getPriceImpactWarning, type SwapQuote } from '../lib/swap-api';
import { getAllowanceInfo, buildInfiniteApprovalTransaction, buildSpecificApprovalTransaction } from '../lib/token-allowance';
import { getAppConfig } from '../lib/config/environment';
import { TokenSelector } from './token-selector';
import { PinInput } from './pin-input';
import { Modal } from './common/modal';
import { TokenIcon, ChainLogo } from './common/token-icon';
import type { ProgressStep } from './signing/signing-progress';
import { getTokenImage, getCachedTokenImage } from '../lib/token-icons';
import { getTokenListForChain } from '../lib/token-lists';
import { formatSwapBalance } from '../lib/format-utils';
import { getProvider } from '../lib/provider';
import { truncateToDecimals, parseAmount, formatAmountForInput, getNativeGasReserve } from '../lib/amount';
import { friendlyTxError, isRetryablePinError } from '../lib/tx-errors';
import { broadcastSigned, BroadcastUncertainError, UNCERTAIN_SEND_MESSAGE } from '../lib/broadcast';
import { getChainDisplayName, getNativeSymbol } from '../lib/supported-chains';
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
/** Wait this long after the last keystroke before asking for a quote. */
const QUOTE_DEBOUNCE_MS = 600;
/** Quotes older than this are refreshed before signing. */
const QUOTE_TTL_MS = 30_000;
const SLIPPAGE_PRESETS = [0.5, 1, 3];
const STABLES = new Set(['USDC', 'USDT', 'DAI', 'USDC.E', 'USDBC']);

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

type PinFlow = 'swap' | 'auto-approve' | 'approve';

const decimalsOf = (t: SwapTokenInfo) => (t.address === 'native' ? 18 : t.decimals);
const sameToken = (a?: SwapTokenInfo | null, b?: SwapTokenInfo | null) =>
  !!a && !!b && a.address.toLowerCase() === b.address.toLowerCase();

function usd(value: number): string {
  return value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

function formatRate(rate: number): string {
  if (!isFinite(rate) || rate <= 0) return '—';
  if (rate >= 1000) return rate.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (rate >= 1) return rate.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return rate.toLocaleString(undefined, { maximumSignificantDigits: 4 });
}

export function SwapToken({
  onClose,
  onSuccess,
  onTransactionSubmitted,
  initialFromToken,
  availableTokens = [],
  tokenImages = {},
  tokenPrices = {},
  onTokenAdded,
}: SwapTokenProps) {
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
  const [showDetails, setShowDetails] = useState(false);
  const [showAddToken, setShowAddToken] = useState(false);
  const [addTokenContext, setAddTokenContext] = useState<'from' | 'to' | null>(null);
  const [newTokenAddress, setNewTokenAddress] = useState('');
  const [isAddingToken, setIsAddingToken] = useState(false);
  const [addTokenError, setAddTokenError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isMaxLoading, setIsMaxLoading] = useState(false);
  const [pinMode, setPinMode] = useState<'approve' | 'swap' | null>(null);
  const [pinFlow, setPinFlow] = useState<PinFlow>('swap');
  const [step, setStep] = useState<string>('prepare');
  const [pinError, setPinError] = useState<string | null>(null);
  const [noRoute, setNoRoute] = useState(false);
  const [quoteAt, setQuoteAt] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);
  const [customSlippage, setCustomSlippage] = useState('');
  const [maxError, setMaxError] = useState<string | null>(null);

  const quoteReq = useRef(0);
  const environment = getAppConfig();
  const { pricingEnabled } = environment;
  const nativeSymbol = getNativeSymbol(chainId);
  const network = getChainDisplayName(chainId, chainName);
  const busy = isExecuting || isApproving;

  // The dashboard resets the store and passes the token to start from (native by default).
  useEffect(() => {
    if (!useSwapStore.getState().fromToken && initialFromToken) setFromToken(initialFromToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Latest balance from the dashboard's token list (falls back to the stored token). */
  const balanceOf = useCallback(
    (t: SwapTokenInfo | null): string => {
      if (!t) return '0';
      const live = availableTokens.find((x) => x.address.toLowerCase() === t.address.toLowerCase());
      return live?.balance ?? t.balance;
    },
    [availableTokens]
  );

  // You can receive tokens you don't hold yet: add this network's popular tokens.
  const receiveTokens = useMemo(() => {
    const held = new Set(availableTokens.map((t) => t.address.toLowerCase()));
    const extra = getTokenListForChain(chainId)
      .filter((t) => !held.has(t.address.toLowerCase()))
      .map((t) => ({ ...t, balance: '0' }));
    return [...availableTokens, ...extra];
  }, [availableTokens, chainId]);

  const images = useMemo(() => {
    const map = { ...tokenImages };
    for (const t of receiveTokens) {
      const key = t.symbol.toUpperCase();
      if (map[key]) continue;
      const url = getCachedTokenImage(t.symbol, t.address === 'native' ? undefined : t.address, chainId);
      if (url) map[key] = url;
    }
    return map;
  }, [tokenImages, receiveTokens, chainId]);

  const fromDecimals = fromToken ? decimalsOf(fromToken) : 18;
  const toDecimals = toToken ? decimalsOf(toToken) : 18;
  const fromBalance = balanceOf(fromToken);
  const fromBalanceWei = fromToken ? parseAmount(fromBalance, fromDecimals) ?? 0n : 0n;
  const sellWei = fromToken && fromAmount ? parseAmount(truncateToDecimals(fromAmount, fromDecimals), fromDecimals) : null;
  const amountValid = sellWei !== null && sellWei > 0n;
  const insufficient = amountValid && sellWei! > fromBalanceWei;
  const nativeBalance = parseFloat(availableTokens.find((t) => t.address === 'native')?.balance ?? '');
  const noGas = !!fromToken && fromToken.address !== 'native' && nativeBalance === 0;

  const clearQuote = useCallback(() => {
    quoteReq.current++;
    setQuote(null);
    setQuoteLoading(false);
    setNeedsApproval(false);
    setAllowanceInfo(null);
    setNoRoute(false);
    setQuoteAt(null);
  }, [setQuote, setQuoteLoading, setNeedsApproval, setAllowanceInfo]);

  const fetchQuote = useCallback(async () => {
    if (!fromToken || !toToken || !address || !rpcUrl || !sellWei || sellWei <= 0n) return;
    const id = ++quoteReq.current;
    setQuoteLoading(true);
    setQuoteError(null);
    setNoRoute(false);
    try {
      const sellAmount = sellWei.toString();
      const next = await getSwapQuote({
        sellToken: fromToken.address,
        buyToken: toToken.address,
        sellAmount,
        slippagePercentage: settings.slippagePercentage,
        takerAddress: address,
        chainId,
      });
      if (id !== quoteReq.current) return;
      if (next.liquidityAvailable === false) {
        setNoRoute(true);
        setQuoteError('No route found for this pair. Try a smaller amount or another token.');
        return;
      }
      if (!validateSwapQuote(next, sellAmount)) {
        setQuoteError("Couldn't get a usable quote. Try again.");
        return;
      }
      setQuote(next);
      setToAmount(ethers.formatUnits(next.buyAmount, decimalsOf(toToken)));
      setQuoteAt(Date.now());
    } catch (error: any) {
      if (id !== quoteReq.current) return;
      const message = String(error?.message || '');
      if (/liquidity/i.test(message)) {
        setNoRoute(true);
        setQuoteError('No route found for this pair. Try a smaller amount or another token.');
      } else {
        setQuoteError(message || "Couldn't get a quote. Try again.");
      }
    } finally {
      if (id === quoteReq.current) setQuoteLoading(false);
    }
  }, [fromToken, toToken, address, rpcUrl, sellWei, settings.slippagePercentage, chainId, setQuote, setQuoteLoading, setQuoteError, setToAmount]);

  // Auto-quote: any change to the pair, amount or slippage drops the old quote and
  // asks again once typing settles. Invalid input just waits (the button says why).
  const sellKey = sellWei?.toString() ?? '';
  useEffect(() => {
    if (busy) return;
    clearQuote();
    setToAmount('');
    if (!fromToken || !toToken || !address) return;
    if (sameToken(fromToken, toToken)) return;
    if (!amountValid || insufficient) return;
    const timer = setTimeout(fetchQuote, QUOTE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // fetchQuote is rebuilt with the same inputs listed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromToken?.address, toToken?.address, sellKey, insufficient, settings.slippagePercentage, address, chainId]);

  // Mark the quote stale after QUOTE_TTL_MS; the button then refreshes it.
  useEffect(() => {
    setExpired(false);
    if (!quoteAt) return;
    const timer = setTimeout(() => setExpired(true), Math.max(0, quoteAt + QUOTE_TTL_MS - Date.now()));
    return () => clearTimeout(timer);
  }, [quoteAt]);

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
      // A slower answer for an earlier quote must not overwrite the current one.
      if (useSwapStore.getState().quote !== quote) return;
      setAllowanceInfo(info);
      // With auto-approve on, approval happens inside the swap signing flow.
      setNeedsApproval(info.needsApproval && !settings.autoApprove);
    } catch {
      if (useSwapStore.getState().quote !== quote) return;
      // Unknown allowance: don't let a swap go out that might revert for lack of one.
      setAllowanceInfo(null);
      setNeedsApproval(false);
      setQuote(null);
      setQuoteError(`Couldn't check your ${fromToken.symbol} approval. Try again.`);
    }
  }, [quote, fromToken, address, rpcUrl, chainId, settings.autoApprove, setAllowanceInfo, setNeedsApproval, setQuote, setQuoteError]);

  useEffect(() => {
    checkAllowance();
  }, [checkAllowance]);

  const handleTokenSelect = (token: SwapTokenInfo) => {
    const side = showTokenSelector;
    setShowTokenSelector(null);
    // Re-picking the current token changes nothing (and must not drop the quote).
    if ((side === 'from' && sameToken(token, fromToken)) || (side === 'to' && sameToken(token, toToken))) return;
    // Picking the other side's token flips the pair instead of making it the same on both.
    if ((side === 'from' && sameToken(token, toToken)) || (side === 'to' && sameToken(token, fromToken))) {
      swapTokens();
      return;
    }
    setMaxError(null);
    if (side === 'from') setFromToken(token);
    else if (side === 'to') setToToken(token);
  };

  const handleAmountChange = (raw: string) => {
    const value = raw.replace(',', '.');
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;
    setMaxError(null);
    setFromAmount(value);
  };

  // Native "Max" leaves enough for the swap's network fee.
  const handleMaxAmount = async () => {
    if (!fromToken) return;
    setMaxError(null);
    if (fromToken.address !== 'native') {
      setFromAmount(fromBalance);
      return;
    }
    if (!rpcUrl) return;
    setIsMaxLoading(true);
    try {
      const reserve = await getNativeGasReserve(getProvider(chainId, rpcUrl), chainId, SWAP_GAS_FOR_RESERVE);
      const max = fromBalanceWei - reserve;
      if (max <= 0n) {
        setFromAmount('');
        setMaxError(`Your ${nativeSymbol} balance is too low to cover the network fee.`);
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
      setAddTokenError("That isn't a valid contract address.");
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

      setShowAddToken(false);
      setNewTokenAddress('');
      setAddTokenContext(null);
    } catch (err: any) {
      setAddTokenError(
        err?.code === 'CALL_EXCEPTION' || err?.code === 'BAD_DATA'
          ? "No ERC-20 token at this address on this network."
          : friendlyTxError(err, nativeSymbol)
      );
    } finally {
      setIsAddingToken(false);
    }
  };

  const openPin = (mode: 'approve' | 'swap') => {
    if (!quote || !address || !rpcUrl || !keySlot || busy) return;
    setPinError(null);
    setStep(mode === 'approve' ? 'prepare' : settings.autoApprove && allowanceInfo?.needsApproval ? 'approve' : 'prepare');
    setPinFlow(mode === 'approve' ? 'approve' : settings.autoApprove && allowanceInfo?.needsApproval ? 'auto-approve' : 'swap');
    setPinMode(mode);
  };

  const closePin = () => {
    if (busy) return;
    setPinMode(null);
    setPinError(null);
  };

  /** Shown inside the PIN sheet; wrong PIN / no card keep it open for a retry. */
  const handlePinFailure = (error: any) => {
    const message = error instanceof BroadcastUncertainError ? UNCERTAIN_SEND_MESSAGE : friendlyTxError(error, nativeSymbol);
    if (isRetryablePinError(error)) {
      setPinError(message);
    } else {
      setPinMode(null);
      setPinError(null);
      setQuoteError(message);
    }
  };

  /** Sign with the card (marks the card step), returning the serialized tx. */
  const signWithCard = async (tx: ethers.TransactionRequest, pin: string, cardStep: string) => {
    setCardPhase('idle');
    setStep(cardStep);
    const { signTransactionSmart } = await import('../lib/smart-signer');
    return signTransactionSmart(tx, keySlot!, pin, environment);
  };

  /** Record an approval in Activity and settle its status when the receipt arrives. */
  const trackApproval = (hash: string, symbol: string) => {
    recordActivity({ hash, chainId, kind: 'approve', fromToken: symbol });
  };
  const settleApproval = (hash: string, ok: boolean) => {
    settleActivity(hash, { status: ok ? 'success' : 'failed' });
  };

  // Manual approval (auto-approve off): exact amount.
  const handleApprovalPinSubmit = async (enteredPin: string) => {
    if (!quote || !fromToken || !address || !rpcUrl || !keySlot || isApproving) return;
    setIsApproving(true);
    setPinError(null);
    let hash: string | null = null;
    try {
      const provider = getProvider(chainId, rpcUrl);
      setStep('prepare');
      const approvalTx = await buildSpecificApprovalTransaction(fromToken.address, quote.allowanceTarget, quote.sellAmount, address, provider);
      const signed = await signWithCard(approvalTx, enteredPin, 'approve');
      setStep('send-approval');
      hash = await broadcastSigned(provider, signed).catch((e) => {
        if (e instanceof BroadcastUncertainError) trackApproval(e.hash, fromToken.symbol);
        throw e;
      });
      trackApproval(hash, fromToken.symbol);
      setPinMode(null);
      showToast(`Approving ${fromToken.symbol}…`, 'info');
      const receipt = await provider.waitForTransaction(hash);
      if (receipt?.status === 0) {
        settleApproval(hash, false);
        setQuoteError('The approval failed on-chain. Try again.');
      } else {
        settleApproval(hash, true);
        showToast(`${fromToken.symbol} approved`, 'success');
        await checkAllowance();
      }
    } catch (error: any) {
      if (hash) {
        // Broadcast went out; we just couldn't watch it. Activity re-checks pending items.
        setQuoteError(friendlyTxError(error, nativeSymbol));
      } else {
        handlePinFailure(error);
      }
    } finally {
      setIsApproving(false);
    }
  };

  const handleSwapPinSubmit = async (enteredPin: string) => {
    if (!quote || !address || !rpcUrl || !keySlot || !fromToken || !toToken) return;
    if (isExecuting) return; // double-submit guard

    // The PIN sheet can sit open; past twice the button's limit the quote is
    // refreshed before anything is signed.
    if (!quoteAt || Date.now() - quoteAt > QUOTE_TTL_MS * 2) {
      setPinMode(null);
      setExpired(true);
      return;
    }

    setIsExecuting(true);
    setPinError(null);
    try {
      const provider = getProvider(chainId, rpcUrl);
      let currentQuote: SwapQuote = quote;

      // Read fresh: a retry after a confirmed approval must not approve again.
      const allowance = useSwapStore.getState().allowanceInfo;
      if (settings.autoApprove && allowance?.needsApproval) {
        setStep('approve');
        const approvalTx = await buildInfiniteApprovalTransaction(fromToken.address, quote.allowanceTarget, address, provider);
        const signedApproval = await signWithCard(approvalTx, enteredPin, 'approve');
        const approvalHash = await broadcastSigned(provider, signedApproval).catch((e) => {
          if (e instanceof BroadcastUncertainError) trackApproval(e.hash, fromToken.symbol);
          throw e;
        });
        trackApproval(approvalHash, fromToken.symbol);
        setStep('approve-wait');
        const approvalReceipt = await provider.waitForTransaction(approvalHash);
        settleApproval(approvalHash, approvalReceipt?.status !== 0);
        if (approvalReceipt?.status === 0) throw new Error('The approval failed on-chain.');
        setAllowanceInfo(null);

        // Re-quote so the swap uses a fresh route after the approval.
        setStep('requote');
        if (sellWei && sellWei > 0n) {
          const fresh = await getSwapQuote({
            sellToken: fromToken.address,
            buyToken: toToken.address,
            sellAmount: sellWei.toString(),
            slippagePercentage: settings.slippagePercentage,
            takerAddress: address,
            chainId,
          });
          if (!validateSwapQuote(fresh, sellWei.toString())) throw new Error("Couldn't refresh the quote after approval. Try again.");
          setQuote(fresh);
          setToAmount(ethers.formatUnits(fresh.buyAmount, toDecimals));
          setQuoteAt(Date.now());
          // The user agreed to the old minimum; a worse price needs a fresh look.
          if (quote.minBuyAmount && fresh.minBuyAmount && BigInt(fresh.minBuyAmount) < BigInt(quote.minBuyAmount)) {
            throw new Error('Approved. The price moved while it confirmed — check the new quote, then swap.');
          }
          currentQuote = fresh;
        }
      }

      setStep('prepare');
      const swapTx = await buildSwapTransaction(currentQuote, address, provider, chainId);
      const signed = await signWithCard(swapTx, enteredPin, 'sign');
      setStep('send');
      const swapSummary = {
        fromToken: fromToken.symbol,
        toToken: toToken.symbol,
        fromAmount: fromAmount || ethers.formatUnits(currentQuote.sellAmount, fromDecimals),
        toAmount: formatSwapBalance(ethers.formatUnits(currentQuote.buyAmount, toDecimals)),
      };
      const swapHash = await broadcastSigned(provider, signed).catch((e) => {
        if (e instanceof BroadcastUncertainError) recordActivity({ hash: e.hash, chainId, kind: 'swap', ...swapSummary });
        throw e;
      });

      setPinMode(null);

      onTransactionSubmitted?.({
        kind: 'swap',
        txHash: swapHash,
        chainId,
        ...swapSummary,
      });
      onSuccess();
    } catch (error: any) {
      handlePinFailure(error);
    } finally {
      setIsExecuting(false);
    }
  };

  // ─── Derived display values ─────────────────────────────────────────────
  const fromPrice = fromToken ? tokenPrices[fromToken.symbol] : undefined;
  const toPrice = toToken ? tokenPrices[toToken.symbol] : undefined;
  const fromUsd = pricingEnabled && fromPrice && amountValid ? parseFloat(fromAmount) * fromPrice : null;
  const toUsd = pricingEnabled && toPrice && quote && toAmount ? parseFloat(toAmount) * toPrice : null;

  let rateLabel: string | null = null;
  let feeLabel: string | null = null;
  let networkFeeLabel: string | null = null;
  let minReceived: string | null = null;
  let sources: string | null = null;
  let impact: number | null = null;
  let impactEstimated = false;
  if (quote && fromToken && toToken) {
    try {
      const sell = parseFloat(ethers.formatUnits(quote.sellAmount, fromDecimals));
      const buy = parseFloat(ethers.formatUnits(quote.buyAmount, toDecimals));
      rateLabel = `1 ${fromToken.symbol} = ${formatRate(buy / sell)} ${toToken.symbol}`;
    } catch {
      rateLabel = null;
    }
    // Integrator fee is charged in the sell token; show its share of the sell amount.
    if (quote.fees?.integratorFee?.amount && quote.sellAmount) {
      try {
        const feeAmount = BigInt(quote.fees.integratorFee.amount);
        const sell = BigInt(quote.sellAmount);
        const pct = sell > 0n ? Number((feeAmount * 1000000n) / sell) / 10000 : null;
        feeLabel = `${formatSwapBalance(ethers.formatUnits(feeAmount, fromDecimals))} ${fromToken.symbol}${pct !== null ? ` (${pct.toFixed(2)}%)` : ''}`;
      } catch {
        feeLabel = null;
      }
    }
    if (quote.totalNetworkFee) {
      try {
        const fee = ethers.formatEther(BigInt(quote.totalNetworkFee));
        const nativePrice = tokenPrices[nativeSymbol];
        networkFeeLabel = `≈ ${formatSwapBalance(fee)} ${nativeSymbol}${pricingEnabled && nativePrice ? ` (${usd(parseFloat(fee) * nativePrice)})` : ''}`;
      } catch {
        networkFeeLabel = null;
      }
    }
    if (quote.minBuyAmount) {
      minReceived = `${formatSwapBalance(ethers.formatUnits(quote.minBuyAmount, toDecimals), STABLES.has(toToken.symbol.toUpperCase()))} ${toToken.symbol}`;
    }
    const names = Array.from(new Set((quote.route?.fills ?? []).map((f) => f.source).filter(Boolean)));
    if (names.length) sources = names.map((n) => n.replace(/_/g, ' ')).join(' + ');
    if (quote.priceImpact !== undefined && quote.priceImpact !== null && !isNaN(parseFloat(quote.priceImpact))) {
      impact = parseFloat(quote.priceImpact);
    } else if (fromUsd && toUsd && fromUsd > 0) {
      // No impact from the API: estimate from market prices (includes fees).
      impact = Math.max(0, (1 - toUsd / fromUsd) * 100);
      impactEstimated = true;
    }
  }
  const impactLevel = impact !== null ? getPriceImpactWarning(String(impact)) : 'none';
  const autoApproveNeeded = !!(settings.autoApprove && allowanceInfo?.needsApproval && quote);

  // ─── Primary button: always visible, says what's needed next ────────────
  let cta: { label: React.ReactNode; onClick?: () => void; disabled: boolean };
  if (isApproving) {
    cta = { label: <Busy text={`Approving ${fromToken?.symbol ?? ''}…`} />, disabled: true };
  } else if (isExecuting) {
    cta = { label: <Busy text="Swapping…" />, disabled: true };
  } else if (!fromToken || !toToken) {
    cta = { label: 'Select a token', disabled: true };
  } else if (sameToken(fromToken, toToken)) {
    cta = { label: 'Select a different token', disabled: true };
  } else if (!amountValid) {
    cta = { label: 'Enter an amount', disabled: true };
  } else if (insufficient) {
    cta = { label: `Not enough ${fromToken.symbol}`, disabled: true };
  } else if (noGas) {
    cta = { label: `Need ${nativeSymbol} for network fee`, disabled: true };
  } else if (isLoadingQuote) {
    cta = { label: <Busy text="Getting quote…" />, disabled: true };
  } else if (noRoute) {
    cta = { label: 'No route found', disabled: true };
  } else if (quoteError) {
    cta = { label: 'Try again', onClick: fetchQuote, disabled: false };
  } else if (!quote) {
    // Normally the auto-quote is about to run; if it isn't, let the user ask.
    cta = { label: 'Get quote', onClick: fetchQuote, disabled: false };
  } else if (expired) {
    cta = { label: 'Refresh quote', onClick: fetchQuote, disabled: false };
  } else if (needsApproval) {
    cta = { label: `Approve ${fromToken.symbol}`, onClick: () => openPin('approve'), disabled: false };
  } else {
    cta = { label: 'Swap', onClick: () => openPin('swap'), disabled: false };
  }

  const steps: ProgressStep[] =
    pinFlow === 'approve'
      ? [
          { key: 'prepare', label: 'Prepare approval' },
          { key: 'approve', label: `Approve ${fromToken?.symbol ?? ''}`, card: true },
          { key: 'send-approval', label: `Send approval to ${network}` },
        ]
      : [
          ...(pinFlow === 'auto-approve'
            ? [
                { key: 'approve', label: `Approve ${fromToken?.symbol ?? ''}`, card: true },
                { key: 'approve-wait', label: 'Wait for approval' },
                { key: 'requote', label: 'Refresh quote' },
              ]
            : []),
          { key: 'prepare', label: 'Prepare swap' },
          { key: 'sign', label: 'Sign with your Burner', card: true },
          { key: 'send', label: `Send to ${network}` },
        ];

  const slippageIsPreset = SLIPPAGE_PRESETS.includes(settings.slippagePercentage);

  return (
    <Modal
      onClose={() => !busy && onClose()}
      labelledBy="swap-title"
      closeOnBackdrop={!busy}
      closeOnEscape={!busy}
      className="sw-surface w-full max-w-md max-h-[90dvh] rounded-xl border border-(--sw-line) overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <h2 id="swap-title" className="text-lg font-bold text-(--sw-ink) tracking-tight">
            Swap
          </h2>
          <span className="sw-chip pl-1 pr-2.5 py-1 text-xs min-w-0">
            <ChainLogo chainId={chainId} name={chainName} className="w-4 h-4 shrink-0" />
            <span className="truncate">{network}</span>
          </span>
        </div>
        <div className="flex items-center -mr-2">
          <button
            onClick={() => {
              setCustomSlippage(SLIPPAGE_PRESETS.includes(settings.slippagePercentage) ? '' : String(settings.slippagePercentage));
              setShowSettings(true);
            }}
            disabled={busy}
            className="sw-icon-btn p-2 disabled:opacity-40"
            aria-label="Swap settings"
          >
            <Settings2 className="w-5 h-5" />
          </button>
          <button onClick={onClose} disabled={busy} className="sw-icon-btn p-2 disabled:opacity-40" aria-label="Close swap">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrollable body keeps the action button reachable with the keyboard open */}
      <div className="px-5 pb-2 overflow-y-auto overscroll-contain min-h-0 flex-auto">
        {/* You pay */}
        <div className="rounded-2xl border border-transparent bg-(--sw-fill) p-4 transition-colors focus-within:border-(--sw-accent)">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="swap-from-amount" className="sw-label">
              You pay
            </label>
            {fromToken && (
              <span className="text-xs text-(--sw-muted) sw-num flex items-center gap-2">
                <span>Balance {formatSwapBalance(fromBalance, STABLES.has(fromToken.symbol.toUpperCase()))}</span>
                <button
                  onClick={handleMaxAmount}
                  disabled={isMaxLoading || fromBalanceWei === 0n || busy}
                  className="sw-link text-xs"
                  aria-label={fromToken.address === 'native' ? 'Use maximum amount, keeping enough for the network fee' : 'Use maximum amount'}
                >
                  {isMaxLoading ? '…' : 'Max'}
                </button>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <input
              id="swap-from-amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={fromAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              disabled={busy}
              placeholder="0"
              aria-invalid={insufficient || undefined}
              className={`sw-amount-input text-3xl flex-1 ${insufficient ? 'text-(--sw-down)!' : ''}`}
            />
            <TokenChip
              token={fromToken}
              image={fromToken ? images[fromToken.symbol.toUpperCase()] : undefined}
              onClick={() => setShowTokenSelector('from')}
              disabled={busy}
              label={fromToken ? `Change token to pay, currently ${fromToken.symbol}` : 'Select token to pay'}
            />
          </div>
          <div className="text-xs text-(--sw-muted) sw-num mt-1.5 min-h-4">{fromUsd !== null ? usd(fromUsd) : ''}</div>
        </div>

        {/* Flip */}
        <div className="flex justify-center my-[-14px] relative z-10">
          <button
            onClick={() => swapTokens()}
            disabled={busy}
            className="w-9 h-9 rounded-xl bg-(--sw-surface) ring-4 ring-(--sw-surface) border border-(--sw-line) text-(--sw-ink) flex items-center justify-center hover:bg-(--sw-fill-strong) transition-colors"
            aria-label="Switch pay and receive tokens"
          >
            <ArrowDownUp className="w-4 h-4" />
          </button>
        </div>

        {/* You receive (read-only: quotes are exact-in) */}
        <div className="rounded-2xl bg-(--sw-fill) p-4">
          <div className="flex items-center justify-between gap-2">
            <span id="swap-to-label" className="sw-label">
              You receive
            </span>
            {toToken && (
              <span className="text-xs text-(--sw-muted) sw-num">
                Balance {formatSwapBalance(balanceOf(toToken), STABLES.has(toToken.symbol.toUpperCase()))}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 min-w-0" aria-labelledby="swap-to-label" aria-live="polite">
              {isLoadingQuote ? (
                <span className="sw-skeleton block h-8 w-32" aria-label="Getting quote" />
              ) : (
                <output
                  className={`sw-amount-input text-3xl block truncate ${quote && toAmount ? '' : 'text-(--sw-muted) opacity-60'}`}
                  title={toAmount || undefined}
                >
                  {quote && toAmount ? formatSwapBalance(toAmount, STABLES.has(toToken?.symbol.toUpperCase() ?? '')) : '0'}
                </output>
              )}
            </div>
            <TokenChip
              token={toToken}
              image={toToken ? images[toToken.symbol.toUpperCase()] : undefined}
              onClick={() => setShowTokenSelector('to')}
              disabled={busy}
              label={toToken ? `Change token to receive, currently ${toToken.symbol}` : 'Select token to receive'}
            />
          </div>
          <div className="text-xs text-(--sw-muted) sw-num mt-1.5 min-h-4">{toUsd !== null ? usd(toUsd) : ''}</div>
        </div>

        {/* Summary: rate, expandable details */}
        {quote && rateLabel && (
          <div className="mt-3">
            <div className="flex items-center justify-between gap-2 py-2">
              <button
                onClick={() => setShowDetails((v) => !v)}
                aria-expanded={showDetails}
                aria-controls="swap-details"
                className="flex items-center gap-1.5 text-sm text-(--sw-ink-soft) hover:text-(--sw-ink) sw-num min-w-0"
              >
                <span className="truncate">{rateLabel}</span>
                <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${showDetails ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              {expired && (
                <span className="text-xs text-(--sw-muted) shrink-0">
                  Quote expired ·{' '}
                  <button onClick={fetchQuote} className="sw-link text-xs">
                    Refresh
                  </button>
                </span>
              )}
            </div>
            {showDetails && (
              <dl id="swap-details" className="sw-list text-sm ob-fade-in">
                {impact !== null && (
                  <DetailRow
                    label={impactEstimated ? 'Price impact (est.)' : 'Price impact'}
                    value={`${impact.toFixed(2)}%`}
                    tone={impactLevel === 'high' ? 'down' : impactLevel === 'medium' ? 'warn' : undefined}
                  />
                )}
                {minReceived && <DetailRow label="Minimum received" value={minReceived} />}
                {networkFeeLabel && <DetailRow label="Network fee" value={networkFeeLabel} />}
                {feeLabel && <DetailRow label="OpenBurner fee" value={feeLabel} />}
                <DetailRow label="Max slippage" value={`${settings.slippagePercentage}%`} />
                {sources && <DetailRow label="Route" value={sources} />}
              </dl>
            )}
          </div>
        )}

        <div className="space-y-2 mt-3">
          {maxError && (
            <div role="alert" className="sw-callout sw-callout-danger">
              {maxError}
            </div>
          )}
          {quoteError && (
            <div role="alert" className="sw-callout sw-callout-danger">
              {quoteError}
            </div>
          )}
          {quote && impactLevel === 'high' && (
            <div role="alert" className="sw-callout sw-callout-danger">
              Price impact is {impact!.toFixed(2)}%. You&apos;ll get much less than the market value. Try a smaller amount.
            </div>
          )}
          {quote && impactLevel === 'medium' && (
            <div className="sw-callout sw-callout-warn">
              Price impact is {impact!.toFixed(2)}%. You&apos;ll get noticeably less than the market value.
            </div>
          )}
          {needsApproval && !isApproving && (
            <div className="sw-callout sw-callout-info">
              First swap of {fromToken?.symbol}: approve it once, then swap. Each step is one tap of your Burner.
            </div>
          )}
          {autoApproveNeeded && (
            <div className="sw-callout sw-callout-info">
              This swap includes a one-time approval for {fromToken?.symbol}, so you&apos;ll tap your Burner twice.
            </div>
          )}
        </div>
      </div>

      {/* Primary action: always visible */}
      <div className="px-5 pt-3 pb-5 shrink-0 border-t border-(--sw-line-soft)">
        <button onClick={cta.onClick} disabled={cta.disabled} className="sw-btn-primary w-full py-3.5 text-sm">
          {cta.label}
        </button>
      </div>

      {showTokenSelector && (
        <TokenSelector
          tokens={showTokenSelector === 'to' ? receiveTokens : availableTokens}
          onSelectToken={handleTokenSelect}
          onClose={() => setShowTokenSelector(null)}
          tokenImages={images}
          tokenPrices={tokenPrices}
          title={showTokenSelector === 'from' ? 'You pay with' : 'You receive'}
          selectedAddress={showTokenSelector === 'from' ? fromToken?.address : toToken?.address}
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
        isLoading={busy && pinMode !== null}
        title={pinMode === 'approve' ? `Approve ${fromToken?.symbol ?? ''}` : 'Confirm swap'}
        progress={{ steps, current: step }}
      />

      {showAddToken && (
        <Modal
          onClose={() => {
            setShowAddToken(false);
            setAddTokenError(null);
          }}
          labelledBy="swap-add-token-title"
          className="sw-surface rounded-xl border border-(--sw-line) w-full max-w-sm overflow-hidden"
        >
          <div className="px-5 pt-5 pb-5">
            <h3 id="swap-add-token-title" className="text-lg font-bold text-(--sw-ink) tracking-tight">
              Add a token
            </h3>
            <p className="text-sm text-(--sw-ink-soft) mt-1 mb-4">
              Paste the token&apos;s contract address on {network}.
            </p>
            <label htmlFor="swap-add-token-address" className="sw-label block mb-1.5">
              Contract address
            </label>
            <div className="sw-field px-3 py-2.5">
              <input
                id="swap-add-token-address"
                type="text"
                value={newTokenAddress}
                onChange={(e) => setNewTokenAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddToken();
                }}
                placeholder="0x…"
                autoComplete="off"
                spellCheck={false}
                className="sw-field-input sw-mono text-sm"
              />
            </div>
            {addTokenError && (
              <div role="alert" className="sw-callout sw-callout-danger mt-3">
                {addTokenError}
              </div>
            )}
            <button
              onClick={handleAddToken}
              disabled={!newTokenAddress.trim() || isAddingToken}
              className="sw-btn-primary w-full py-3.5 text-sm mt-5"
            >
              {isAddingToken ? <Busy text="Checking token…" /> : 'Add token'}
            </button>
            <button
              onClick={() => {
                setShowAddToken(false);
                setNewTokenAddress('');
                setAddTokenError(null);
                if (addTokenContext) setShowTokenSelector(addTokenContext);
                setAddTokenContext(null);
              }}
              className="w-full py-3 mt-1 text-sm font-semibold text-(--sw-ink-soft) hover:text-(--sw-ink)"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {showSettings && (
        <Modal
          onClose={() => setShowSettings(false)}
          labelledBy="swap-settings-title"
          className="sw-surface rounded-xl border border-(--sw-line) w-full max-w-sm overflow-hidden"
        >
          <div className="px-5 pt-5 pb-5">
            <h3 id="swap-settings-title" className="text-lg font-bold text-(--sw-ink) tracking-tight mb-4">
              Swap settings
            </h3>

            <fieldset>
              <legend className="sw-label mb-2">Max slippage</legend>
              <div className="flex items-center gap-2 flex-wrap">
                {SLIPPAGE_PRESETS.map((p) => {
                  const active = settings.slippagePercentage === p;
                  return (
                    <button
                      key={p}
                      onClick={() => {
                        updateSettings({ slippagePercentage: p });
                        setCustomSlippage('');
                      }}
                      aria-pressed={active}
                      className={`sw-chip px-3.5 py-2 text-sm ${active ? 'bg-(--sw-ink)! text-(--sw-paper)!' : ''}`}
                    >
                      {p}%
                    </button>
                  );
                })}
                <div
                  className={`sw-field flex items-center px-3 py-1.5 w-24 ${!slippageIsPreset ? 'border-(--sw-ink)!' : ''}`}
                >
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label="Custom slippage percent"
                    value={customSlippage}
                    onChange={(e) => {
                      const v = e.target.value.replace(',', '.');
                      if (v !== '' && !/^\d*\.?\d*$/.test(v)) return;
                      setCustomSlippage(v);
                      const n = parseFloat(v);
                      if (isFinite(n) && n >= 0.1 && n <= 50) updateSettings({ slippagePercentage: n });
                    }}
                    placeholder="Custom"
                    className="sw-field-input text-sm sw-num"
                  />
                  <span className="text-sm text-(--sw-muted)">%</span>
                </div>
              </div>
              <p className="text-xs text-(--sw-muted) mt-2 leading-relaxed">
                The swap cancels if the price moves against you by more than this.
              </p>
              {settings.slippagePercentage > 5 && (
                <div className="sw-callout sw-callout-warn mt-2">High slippage: you may get a much worse price.</div>
              )}
              {customSlippage !== '' && (parseFloat(customSlippage) < 0.1 || parseFloat(customSlippage) > 50) && (
                <p className="text-xs text-(--sw-down) mt-2">Enter a value from 0.1 to 50.</p>
              )}
            </fieldset>

            <div className="flex items-start justify-between gap-4 mt-6 pt-5 border-t border-(--sw-line-soft)">
              <div>
                <p id="swap-auto-approve-label" className="text-sm font-semibold text-(--sw-ink)">
                  Approve automatically
                </p>
                <p className="text-xs text-(--sw-muted) mt-1 leading-relaxed">
                  {settings.autoApprove
                    ? 'Grants an unlimited allowance the first time you swap a token, so later swaps need one tap.'
                    : 'Approves only the exact amount, before each swap that needs it.'}
                </p>
              </div>
              <button
                role="switch"
                aria-checked={settings.autoApprove}
                aria-labelledby="swap-auto-approve-label"
                onClick={() => updateSettings({ autoApprove: !settings.autoApprove })}
                className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${
                  settings.autoApprove ? 'bg-(--sw-ink)' : 'bg-(--sw-fill-strong)'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-(--sw-surface) shadow-xs transition-transform ${
                    settings.autoApprove ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>

            <button onClick={() => setShowSettings(false)} className="sw-btn-primary w-full mt-6 py-3.5 text-sm">
              Done
            </button>
          </div>
        </Modal>
      )}
    </Modal>
  );
}

function Busy({ text }: { text: string }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
      <span>{text}</span>
    </span>
  );
}

function TokenChip({
  token,
  image,
  onClick,
  disabled,
  label,
}: {
  token: SwapTokenInfo | null;
  image?: string;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`sw-chip py-1.5 text-sm shrink-0 disabled:opacity-60 ${token ? 'pl-1.5 pr-2.5' : 'px-3.5'}`}
    >
      {token ? (
        <>
          <TokenIcon symbol={token.symbol} url={image} size="sm" />
          <span className="max-w-24 truncate">{token.symbol}</span>
        </>
      ) : (
        <span>Select token</span>
      )}
      <ChevronDown className="w-4 h-4 text-(--sw-muted)" aria-hidden="true" />
    </button>
  );
}

function DetailRow({ label, value, tone }: { label: string; value: string; tone?: 'warn' | 'down' }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="text-(--sw-muted)">{label}</dt>
      <dd
        className={`sw-num text-right break-all ${
          tone === 'down' ? 'text-(--sw-down) font-semibold' : tone === 'warn' ? 'text-(--sw-warn) font-semibold' : 'text-(--sw-ink)'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
