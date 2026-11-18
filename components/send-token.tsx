"use client";

import { useState, useEffect, useMemo, useRef, type RefObject } from "react";
import { ethers } from "ethers";
import { feeFields } from "@/lib/card/tx";
import { useWalletStore } from "@/store/wallet-store";
import { PinInput } from "./pin-input";
import { X, ArrowLeft, Loader2, ChevronDown, ArrowUpDown, ClipboardPaste } from "lucide-react";
import { useEnvironment } from "@/hooks/use-environment";
import { formatTokenBalance, formatUsd } from "@/lib/format-utils";
import { Modal } from "./common/modal";
import { TokenIcon, ChainLogo } from "./common/token-icon";
import { Identicon } from "./common/identicon";
import { AddressText, shortAddress } from "./common/address-text";
import { TokenSelector } from "./token-selector";
import { getProvider } from "@/lib/provider";
import { parseAmount, formatAmountForInput, getNativeGasReserve, truncateToDecimals } from "@/lib/amount";
import { friendlyTxError, isRetryablePinError } from "@/lib/tx-errors";
import { broadcastSigned, BroadcastUncertainError, UNCERTAIN_SEND_MESSAGE } from "@/lib/broadcast";
import { recordActivity } from "@/store/activity-store";
import { getChainDisplayName, getNativeSymbol } from "@/lib/supported-chains";
import { looksLikeEns, resolveEns } from "@/lib/ens";
import type { ProgressStep } from "./signing/signing-progress";
import type { TransactionSummary } from "./transaction-completion-modal";

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  usdPrice?: number;
}

type PriceMap = { [symbol: string]: number };
type ImageMap = { [symbolUpper: string]: string };

const erc20 = new ethers.Interface(["function transfer(address to, uint256 amount) returns (bool)"]);

interface Review {
  to: string;
  ens: string | null;
  amount: string;
  amountWei: bigint;
  gasLimit: bigint;
  /** Worst-case fee in native wei (gasLimit × max fee). */
  feeWei: bigint;
}

/** Keep a typed amount to digits and one dot. Returns null for anything else. */
function cleanAmount(raw: string): string | null {
  const v = raw.replace(",", ".").replace(/\s/g, "");
  return /^\d*\.?\d*$/.test(v) ? v : null;
}

/** Token amount (decimal string) for a USD amount at `price`, cut to the token's precision. */
function tokenFromUsd(usd: string, price: number, decimals: number): string {
  const n = parseFloat(usd);
  if (!isFinite(n) || n <= 0 || !price) return "";
  // Two guard digits, then truncate: never round up past what the USD covers.
  const places = Math.min(decimals, 12);
  const raw = (n / price).toFixed(places + 2);
  const cut = truncateToDecimals(raw, places);
  return cut.includes(".") ? cut.replace(/0+$/, "").replace(/\.$/, "") : cut;
}

// ─── Recent recipients (shared with the NFT send sheet) ─────────────────────

export interface RecentRecipient {
  address: string;
  ens?: string;
}

const RECENTS_KEY = "recentRecipients";
const LEGACY_LAST_KEY = "lastRecipientAddress";
const MAX_RECENTS = 5;

export function readRecentRecipients(): RecentRecipient[] {
  try {
    let list: RecentRecipient[] = JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]");
    if (!Array.isArray(list)) list = [];
    list = list.filter((r) => r && ethers.isAddress(r.address));
    // One-time migration from the single "last used" address.
    const legacy = localStorage.getItem(LEGACY_LAST_KEY);
    if (legacy) {
      if (ethers.isAddress(legacy) && !list.some((r) => r.address.toLowerCase() === legacy.toLowerCase())) {
        list.push({ address: ethers.getAddress(legacy) });
      }
      localStorage.removeItem(LEGACY_LAST_KEY);
      localStorage.setItem(RECENTS_KEY, JSON.stringify(list.slice(0, MAX_RECENTS)));
    }
    return list.slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

export function saveRecentRecipient(entry: RecentRecipient): RecentRecipient[] {
  const list = readRecentRecipients().filter((r) => r.address.toLowerCase() !== entry.address.toLowerCase());
  const next = [{ address: ethers.getAddress(entry.address), ...(entry.ens ? { ens: entry.ens } : {}) }, ...list].slice(0, MAX_RECENTS);
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
  return next;
}

export function clearRecentRecipients() {
  try {
    localStorage.removeItem(RECENTS_KEY);
    localStorage.removeItem(LEGACY_LAST_KEY);
  } catch {
    /* storage unavailable */
  }
}

/**
 * Recipient state: a typed 0x address or an ENS name, resolved (debounced).
 * `address` is the checksummed destination, or null while missing/invalid.
 */
export function useRecipient() {
  const [input, setInput] = useState("");
  const [touched, setTouched] = useState(false);
  const [ens, setEns] = useState<{ name: string; address: string | null } | null>(null);
  const [resolving, setResolving] = useState(false);

  const trimmed = input.trim();
  const isHex = ethers.isAddress(trimmed);
  const isEns = !isHex && looksLikeEns(trimmed);

  useEffect(() => {
    if (!isEns) {
      setEns(null);
      setResolving(false);
      return;
    }
    let cancelled = false;
    setResolving(true);
    const t = setTimeout(async () => {
      const address = await resolveEns(trimmed);
      if (cancelled) return;
      setEns({ name: trimmed, address });
      setResolving(false);
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [trimmed, isEns]);

  // Still waiting on a lookup for exactly what's typed.
  const pending = isEns && (resolving || ens?.name !== trimmed);
  const address = isHex
    ? ethers.getAddress(trimmed)
    : isEns && ens?.name === trimmed && ens.address
      ? ens.address
      : null;
  const ensName = isEns && address ? trimmed : null;

  let problem: string | null = null;
  if (trimmed && !pending && !address) {
    problem = isEns
      ? `No address found for ${trimmed}.`
      : "That isn't a valid address. It should start with 0x and be 42 characters.";
  }

  return { input, setInput, trimmed, address, ensName, resolving: pending, problem, touched, setTouched, isEns };
}

export type RecipientState = ReturnType<typeof useRecipient>;

/** Recipient field: paste, ENS, identicon and recent recipients. */
export function RecipientField({
  id,
  state,
  showProblem,
  recents,
  onClearRecents,
}: {
  id: string;
  state: RecipientState;
  showProblem: boolean;
  recents: RecentRecipient[];
  onClearRecents: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pasteFailed, setPasteFailed] = useState(false);

  async function paste() {
    setPasteFailed(false);
    try {
      const text = await navigator.clipboard?.readText?.();
      if (text) {
        state.setInput(text.trim());
        return;
      }
    } catch {
      /* permission denied or unsupported */
    }
    setPasteFailed(true);
    inputRef.current?.focus();
  }

  const problem = showProblem || state.touched ? state.problem : null;

  return (
    <div>
      <label htmlFor={id} className="sw-label block mb-1.5">
        To
      </label>
      <div className="sw-field flex items-center gap-2.5 px-3 py-2.5">
        {state.address ? (
          <Identicon address={state.address} size={22} />
        ) : (
          <span className="w-[22px] h-[22px] rounded-full bg-(--sw-fill-strong) shrink-0" aria-hidden="true" />
        )}
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={state.input}
          onChange={(e) => {
            setPasteFailed(false);
            state.setInput(e.target.value);
          }}
          onBlur={() => state.setTouched(true)}
          placeholder="Address or ENS name"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={!!problem}
          aria-describedby={`${id}-hint`}
          className="sw-field-input sw-mono text-sm py-0.5"
        />
        {state.input ? (
          <button
            type="button"
            onClick={() => {
              state.setInput("");
              state.setTouched(false);
              inputRef.current?.focus();
            }}
            className="sw-icon-btn p-1 -mr-1"
            aria-label="Clear recipient"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        ) : (
          <button type="button" onClick={paste} className="sw-link text-xs flex items-center gap-1 shrink-0">
            <ClipboardPaste className="w-3.5 h-3.5" aria-hidden="true" />
            Paste
          </button>
        )}
      </div>

      <div id={`${id}-hint`} className="min-h-5 mt-1.5" aria-live="polite">
        {state.resolving ? (
          <p className="text-xs text-(--sw-muted) flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
            Looking up {state.trimmed}…
          </p>
        ) : problem ? (
          <p className="text-xs text-(--sw-down)">{problem}</p>
        ) : state.ensName && state.address ? (
          <p className="text-xs">
            <AddressText address={state.address} className="text-[11px]" />
          </p>
        ) : pasteFailed ? (
          <p className="text-xs text-(--sw-muted)">Couldn&apos;t read the clipboard. Paste into the field instead.</p>
        ) : null}
      </div>

      {!state.input && recents.length > 0 && (
        <div className="mt-1">
          <div className="flex items-center justify-between mb-1">
            <p className="sw-label">Recent</p>
            <button type="button" onClick={onClearRecents} className="text-xs text-(--sw-muted) hover:text-(--sw-ink)">
              Clear
            </button>
          </div>
          <ul>
            {recents.slice(0, 3).map((r) => (
              <li key={r.address}>
                <button
                  type="button"
                  onClick={() => {
                    state.setInput(r.address);
                    state.setTouched(true);
                  }}
                  className="w-full flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-(--sw-fill) transition-colors text-left"
                >
                  <Identicon address={r.address} size={28} />
                  <span className="min-w-0 flex-1">
                    {r.ens && <span className="block text-sm font-semibold text-(--sw-ink) truncate">{r.ens}</span>}
                    <span className={`block sw-mono ${r.ens ? "text-xs text-(--sw-muted)" : "text-sm text-(--sw-ink)"}`}>
                      {shortAddress(r.address)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Who the funds go to, written out in full for checking. */
export function RecipientReview({ address, ens }: { address: string; ens?: string | null }) {
  return (
    <div className="flex items-start gap-3">
      <Identicon address={address} size={36} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        {ens && <p className="text-sm font-semibold text-(--sw-ink) truncate mb-0.5">{ens}</p>}
        <AddressText address={address} className="text-[13px]" />
      </div>
    </div>
  );
}

// ─── Send ───────────────────────────────────────────────────────────────────

export function SendToken({
  token: initialToken,
  tokens,
  tokenImages = {},
  tokenPrices = {},
  onClose,
  onSubmitted,
}: {
  token: Token;
  /** Tokens the user can switch to inside the sheet (only those with a balance are offered). */
  tokens?: Token[];
  tokenImages?: ImageMap;
  tokenPrices?: PriceMap;
  onClose: () => void;
  /** Called once the transaction is broadcast; the dashboard tracks confirmation. */
  onSubmitted: (tx: TransactionSummary) => void;
}) {
  const environment = useEnvironment();
  const address = useWalletStore((s) => s.address);
  const rpcUrl = useWalletStore((s) => s.rpcUrl);
  const chainId = useWalletStore((s) => s.chainId);
  const keySlot = useWalletStore((s) => s.keySlot);
  const chainName = useWalletStore((s) => s.chainName);

  const [token, setToken] = useState<Token>(initialToken);
  const isNative = token.address === "native";
  const nativeSymbol = getNativeSymbol(chainId);
  const network = getChainDisplayName(chainId, chainName);
  const price = tokenPrices[token.symbol];
  const nativePrice = tokenPrices[nativeSymbol];
  const hasPrice = !!price && price > 0;

  const sendable = useMemo(() => (tokens ?? []).filter((t) => parseFloat(t.balance) > 0), [tokens]);
  const canSwitchToken = sendable.length > 1 || (sendable.length === 1 && sendable[0].address !== token.address);

  const recipient = useRecipient();
  const [recents, setRecents] = useState<RecentRecipient[]>([]);
  const [amount, setAmount] = useState("");
  const [usdMode, setUsdMode] = useState(false);
  const [usdInput, setUsdInput] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isMaxLoading, setIsMaxLoading] = useState(false);
  const [showTokenPicker, setShowTokenPicker] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signStep, setSignStep] = useState<"prepare" | "sign" | "send">("prepare");
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecents(readRecentRecipients());
  }, []);

  // Clear a stale fee/network error as soon as the user edits anything.
  useEffect(() => {
    setError(null);
  }, [amount, recipient.trimmed, token.address]);

  const balanceWei = parseAmount(token.balance, token.decimals) ?? 0n;
  const amountWei = parseAmount(amount, token.decimals);
  const overBalance = amountWei !== null && amountWei > balanceWei;
  const amountValid = amountWei !== null && amountWei > 0n && !overBalance;
  const usdValue = hasPrice && amount ? parseFloat(amount) * price : null;

  function setTokenAmount(next: string) {
    setAmount(next);
    if (usdMode && hasPrice) {
      const n = parseFloat(next);
      setUsdInput(isFinite(n) && n > 0 ? (n * price).toFixed(2) : "");
    }
  }

  function handleAmountInput(raw: string) {
    const v = cleanAmount(raw);
    if (v === null) return;
    if (usdMode && hasPrice) {
      setUsdInput(v);
      setAmount(tokenFromUsd(v, price, token.decimals));
    } else {
      setAmount(v);
    }
  }

  function toggleUsd() {
    if (!hasPrice) return;
    if (!usdMode) {
      const n = parseFloat(amount);
      setUsdInput(isFinite(n) && n > 0 ? (n * price).toFixed(2) : "");
    }
    setUsdMode(!usdMode);
  }

  function selectToken(next: Token) {
    setToken(next);
    setAmount("");
    setUsdInput("");
    setUsdMode(false);
    setReview(null);
    setError(null);
    setShowTokenPicker(false);
  }

  /** Native "Max" keeps back enough for the network fee. */
  async function handleMax() {
    setError(null);
    if (!isNative) {
      setTokenAmount(token.balance);
      return;
    }
    if (!rpcUrl) return;
    setIsMaxLoading(true);
    try {
      const reserve = await getNativeGasReserve(getProvider(chainId, rpcUrl), chainId, 21000n);
      const max = balanceWei - reserve;
      if (max <= 0n) {
        setError(`Your ${nativeSymbol} balance is too low to cover the network fee.`);
      } else {
        setTokenAmount(formatAmountForInput(max, 18));
      }
    } finally {
      setIsMaxLoading(false);
    }
  }

  function buildCall(to: string, value: bigint): { to: string; value: bigint; data: string } {
    return isNative
      ? { to, value, data: "0x" }
      : { to: token.address, value: 0n, data: erc20.encodeFunctionData("transfer", [to, value]) };
  }

  /** Validate locally, then estimate gas + fee and show the review step. */
  async function handleReview() {
    setSubmitAttempted(true);
    if (!address || !rpcUrl || isPreparing) return;
    setError(null);
    const to = recipient.address;
    if (!to || !amountValid || amountWei === null) return;

    setIsPreparing(true);
    try {
      const provider = getProvider(chainId, rpcUrl);
      const call = buildCall(to, amountWei);
      const [estimate, feeData, nativeBal] = await Promise.all([
        provider.estimateGas({ ...call, from: address }).catch((err) => {
          // A plain native transfer to an EOA always costs 21000 on L1-style chains.
          // A revert means the recipient contract refuses it: don't send anyway.
          if (isNative && err?.code !== "INSUFFICIENT_FUNDS" && err?.code !== "CALL_EXCEPTION") return 21000n;
          throw err;
        }),
        provider.getFeeData(),
        isNative ? Promise.resolve(balanceWei) : provider.getBalance(address),
      ]);
      const gasLimit = isNative && estimate === 21000n ? 21000n : (estimate * 120n) / 100n;
      const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n;
      const feeWei = gasLimit * gasPrice;

      const needed = isNative ? amountWei + feeWei : feeWei;
      if (nativeBal < needed) {
        setError(
          isNative
            ? `Not enough ${nativeSymbol} for this amount plus the network fee (~${formatTokenBalance(ethers.formatEther(feeWei))} ${nativeSymbol}). Try a smaller amount or use Max.`
            : `You need about ${formatTokenBalance(ethers.formatEther(feeWei))} ${nativeSymbol} to pay the network fee.`
        );
        return;
      }

      setReview({
        to,
        ens: recipient.ensName,
        amount: truncateToDecimals(amount, token.decimals),
        amountWei,
        gasLimit,
        feeWei,
      });
    } catch (err: any) {
      setError(friendlyTxError(err, nativeSymbol));
    } finally {
      setIsPreparing(false);
    }
  }

  async function handlePinSubmit(enteredPin: string) {
    if (!address || !rpcUrl || !review || isSigning) return;

    setPinError(null);
    setIsSigning(true);
    setSignStep("prepare");
    try {
      const provider = getProvider(chainId, rpcUrl);
      const [nonce, feeData] = await Promise.all([
        provider.getTransactionCount(address, "pending"),
        provider.getFeeData(),
      ]);
      const call = buildCall(review.to, review.amountWei);
      const transaction: ethers.TransactionRequest = {
        ...call,
        nonce,
        chainId,
        gasLimit: review.gasLimit,
        ...feeFields(chainId, feeData),
      };

      setSignStep("sign");
      const { signTransactionSmart } = await import("@/lib/smart-signer");
      const signedTx = await signTransactionSmart(transaction, keySlot, enteredPin, environment);

      setSignStep("send");
      const txHash = await broadcastSigned(provider, signedTx);
      setRecents(saveRecentRecipient({ address: review.to, ens: review.ens ?? undefined }));
      setShowPinInput(false);
      onSubmitted({
        kind: "send",
        txHash,
        chainId,
        fromToken: token.symbol,
        fromAmount: review.amount,
        recipient: review.to,
      });
    } catch (err: any) {
      if (err instanceof BroadcastUncertainError) {
        // It may have been sent: keep it in Activity (which settles it) rather than inviting a second send.
        recordActivity({ hash: err.hash, chainId, kind: "send", fromToken: token.symbol, fromAmount: review.amount, recipient: review.to });
        setShowPinInput(false);
        setError(UNCERTAIN_SEND_MESSAGE);
      } else if (isRetryablePinError(err)) {
        // Keep the PIN dialog open for another try.
        setPinError(friendlyTxError(err, nativeSymbol));
      } else {
        setShowPinInput(false);
        setError(friendlyTxError(err, nativeSymbol));
      }
    } finally {
      setIsSigning(false);
    }
  }

  const progressSteps: ProgressStep[] = [
    { key: "prepare", label: "Prepare transaction" },
    { key: "sign", label: "Sign with your Burner", card: true },
    { key: "send", label: `Send to ${network}` },
  ];

  // The one action at the bottom, labelled with whatever is still missing.
  let cta = "Review";
  let ctaReady = false;
  if (!amount || amountWei === null || amountWei <= 0n) cta = "Enter an amount";
  else if (overBalance) cta = `Not enough ${token.symbol}`;
  else if (!recipient.trimmed) cta = "Enter a recipient";
  else if (recipient.resolving) cta = "Checking…";
  else if (!recipient.address) cta = recipient.isEns ? "Name not found" : "Enter a valid address";
  else if (isPreparing) cta = "Checking…";
  else ctaReady = true;

  return (
    <Modal
      onClose={() => !isSigning && onClose()}
      labelledBy="send-title"
      closeOnBackdrop={!isSigning}
      initialFocusRef={amountRef}
      className="sw-surface w-full max-w-sm rounded-xl border border-(--sw-line) overflow-hidden flex flex-col max-h-[90dvh]"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3 shrink-0">
        <div className="flex items-center gap-1 min-w-0">
          {review && (
            <button
              onClick={() => setReview(null)}
              disabled={isSigning}
              className="sw-icon-btn p-2 -ml-1"
              aria-label="Back to edit"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
          <h2 id="send-title" className={`text-lg font-bold text-(--sw-ink) tracking-tight ${review ? "" : "pl-1"}`}>
            {review ? "Review" : "Send"}
          </h2>
        </div>
        <button onClick={onClose} disabled={isSigning} className="sw-icon-btn p-2 -mr-1" aria-label="Close">
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {review ? (
        <ReviewStep
          review={review}
          token={token}
          tokenImage={tokenImages[token.symbol.toUpperCase()]}
          chainId={chainId}
          network={network}
          price={hasPrice ? price : undefined}
          nativePrice={nativePrice}
          nativeSymbol={nativeSymbol}
          isNative={isNative}
          ownAddress={address}
          knownRecipient={recents.some((r) => r.address.toLowerCase() === review.to.toLowerCase())}
          contractAddresses={[...(tokens ?? []), token].filter((t) => t.address !== "native").map((t) => t.address.toLowerCase())}
          error={error}
          isSigning={isSigning}
          onConfirm={() => {
            setError(null);
            setPinError(null);
            setShowPinInput(true);
          }}
        />
      ) : (
        <form
          className="flex flex-col min-h-0 flex-auto"
          onSubmit={(e) => {
            e.preventDefault();
            if (ctaReady) handleReview();
            else setSubmitAttempted(true);
          }}
        >
          <div className="px-5 pb-4 overflow-y-auto overscroll-contain min-h-0 flex-auto">
            {/* Token + amount */}
            <div className="flex items-center justify-between gap-2 mb-3">
              {canSwitchToken ? (
                <button
                  type="button"
                  onClick={() => setShowTokenPicker(true)}
                  className="sw-chip pl-1 pr-2.5 py-1 text-sm"
                  aria-label={`Token: ${token.symbol}. Change token`}
                >
                  <TokenIcon symbol={token.symbol} url={tokenImages[token.symbol.toUpperCase()]} size="sm" chainId={chainId} />
                  {token.symbol}
                  <ChevronDown className="w-4 h-4 text-(--sw-muted)" aria-hidden="true" />
                </button>
              ) : (
                <span className="sw-chip pl-1 pr-3 py-1 text-sm hover:bg-(--sw-fill-strong)!">
                  <TokenIcon symbol={token.symbol} url={tokenImages[token.symbol.toUpperCase()]} size="sm" chainId={chainId} />
                  {token.symbol}
                </span>
              )}
              {hasPrice && (
                <button
                  type="button"
                  onClick={toggleUsd}
                  className="sw-icon-btn px-2 py-1.5 text-xs font-semibold gap-1"
                  aria-label={usdMode ? `Enter amount in ${token.symbol}` : "Enter amount in US dollars"}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" aria-hidden="true" />
                  {usdMode ? token.symbol : "USD"}
                </button>
              )}
            </div>

            <AmountEntry
              inputRef={amountRef}
              value={usdMode && hasPrice ? usdInput : amount}
              onChange={handleAmountInput}
              prefix={usdMode && hasPrice ? "$" : undefined}
              suffix={usdMode && hasPrice ? undefined : token.symbol}
              invalid={overBalance}
              label={usdMode ? "Amount in US dollars" : `Amount in ${token.symbol}`}
            />

            <p className="text-sm text-(--sw-ink-soft) sw-num mt-1 min-h-5">
              {usdMode && hasPrice
                ? amount
                  ? `≈ ${formatTokenBalance(amount)} ${token.symbol}`
                  : ""
                : usdValue !== null && isFinite(usdValue) && usdValue > 0
                  ? `≈ ${formatUsd(usdValue)}`
                  : ""}
            </p>

            <div className="flex items-center gap-1.5 text-xs mt-2 mb-6">
              <span className={overBalance ? "text-(--sw-down)" : "text-(--sw-muted)"}>
                {overBalance ? "More than your balance of " : "Balance "}
                <span className="sw-num">{formatTokenBalance(token.balance)}</span> {token.symbol}
              </span>
              <span className="text-(--sw-muted)" aria-hidden="true">
                ·
              </span>
              <button
                type="button"
                onClick={handleMax}
                disabled={isMaxLoading || balanceWei === 0n}
                className="sw-link text-xs"
                aria-label={isNative ? "Use maximum amount, keeping enough for the network fee" : "Use maximum amount"}
                title={isNative ? `Keeps a little ${nativeSymbol} back for the network fee` : undefined}
              >
                {isMaxLoading ? "…" : "Max"}
              </button>
            </div>

            <RecipientField
              id="send-recipient"
              state={recipient}
              showProblem={submitAttempted}
              recents={recents}
              onClearRecents={() => {
                clearRecentRecipients();
                setRecents([]);
              }}
            />
          </div>

          {/* Action, always in reach */}
          <div className="px-5 pt-3 pb-5 border-t border-(--sw-line-soft) shrink-0">
            {error && (
              <div role="alert" className="sw-callout sw-callout-danger mb-3">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={!ctaReady}
              className="sw-btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2"
            >
              {(isPreparing || recipient.resolving) && <Loader2 className="animate-spin h-4 w-4" aria-hidden="true" />}
              {cta}
            </button>
          </div>
        </form>
      )}

      {showTokenPicker && (
        <TokenSelector
          tokens={sendable}
          onSelectToken={(t) => selectToken(t as Token)}
          onClose={() => setShowTokenPicker(false)}
          tokenImages={tokenImages}
          tokenPrices={tokenPrices}
          title="Send which token?"
        />
      )}

      <PinInput
        isVisible={showPinInput}
        onSubmit={handlePinSubmit}
        onCancel={() => {
          setShowPinInput(false);
          setPinError(null);
        }}
        error={pinError}
        isLoading={isSigning}
        progress={{ steps: progressSteps, current: signStep }}
        title="Confirm with your PIN"
      />
    </Modal>
  );
}

/** Big, self-sizing amount input with the unit beside the number. */
function AmountEntry({
  inputRef,
  value,
  onChange,
  prefix,
  suffix,
  invalid,
  label,
}: {
  inputRef?: RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  invalid?: boolean;
  label: string;
}) {
  const len = (prefix?.length ?? 0) + Math.max(value.length, 1);
  const size = len <= 7 ? "text-5xl" : len <= 11 ? "text-4xl" : len <= 15 ? "text-3xl" : "text-2xl";
  const color = invalid ? "text-(--sw-down)" : "text-(--sw-ink)";

  return (
    <div className={`flex items-baseline gap-2 min-w-0 overflow-hidden ${size} transition-[font-size] duration-150`}>
      {prefix && <span className={`font-bold tracking-tight ${value ? color : "text-(--sw-muted)"}`}>{prefix}</span>}
      {/* The hidden twin sizes the input to its content, so the unit sits right after the number. */}
      <span className="inline-grid min-w-0 max-w-full">
        <span className="invisible whitespace-pre font-bold tracking-[-0.03em] tabular-nums [grid-area:1/1] pr-1" aria-hidden="true">
          {value || "0"}
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          autoComplete="off"
          size={1}
          aria-label={label}
          aria-invalid={invalid}
          className={`sw-amount-input [grid-area:1/1] ${color}`}
        />
      </span>
      {suffix && <span className="text-xl font-semibold text-(--sw-muted) shrink-0">{suffix}</span>}
    </div>
  );
}

function ReviewStep({
  review,
  token,
  tokenImage,
  chainId,
  network,
  price,
  nativePrice,
  nativeSymbol,
  isNative,
  ownAddress,
  knownRecipient,
  contractAddresses,
  error,
  isSigning,
  onConfirm,
}: {
  review: Review;
  token: Token;
  tokenImage?: string;
  chainId: number;
  network: string;
  price?: number;
  nativePrice?: number;
  nativeSymbol: string;
  isNative: boolean;
  ownAddress: string | null;
  knownRecipient: boolean;
  contractAddresses: string[];
  error: string | null;
  isSigning: boolean;
  onConfirm: () => void;
}) {
  const fee = ethers.formatEther(review.feeWei);
  const feeUsd = nativePrice ? parseFloat(fee) * nativePrice : null;
  const amountUsd = price ? parseFloat(review.amount) * price : null;
  const total = isNative ? ethers.formatEther(review.amountWei + review.feeWei) : null;
  const to = review.to.toLowerCase();
  const isSelf = !!ownAddress && to === ownAddress.toLowerCase();
  const isContract = contractAddresses.includes(to);

  return (
    <div className="flex flex-col min-h-0 flex-auto">
      <div className="px-5 pb-4 overflow-y-auto overscroll-contain min-h-0 flex-auto">
        <div className="flex flex-col items-center text-center pt-2 pb-5">
          <TokenIcon symbol={token.symbol} url={tokenImage} size="lg" chainId={chainId} />
          <p
            className={`mt-3 font-bold tracking-tight text-(--sw-ink) break-all tabular-nums ${
              review.amount.length <= 9 ? "text-4xl" : review.amount.length <= 14 ? "text-3xl" : "text-2xl"
            }`}
          >
            {review.amount} <span className="text-xl font-semibold text-(--sw-ink-soft)">{token.symbol}</span>
          </p>
          {amountUsd !== null && isFinite(amountUsd) && (
            <p className="text-sm text-(--sw-ink-soft) sw-num mt-1">≈ {formatUsd(amountUsd)}</p>
          )}
        </div>

        <div className="rounded-xl bg-(--sw-fill) p-3.5 mb-3">
          <p className="sw-label mb-2">To</p>
          <RecipientReview address={review.to} ens={review.ens} />
        </div>

        <div className="space-y-2 mb-3">
          {isContract ? (
            <div className="sw-callout sw-callout-danger" role="alert">
              This is a token contract, not a wallet. Tokens sent here are usually lost for good.
            </div>
          ) : isSelf ? (
            <div className="sw-callout sw-callout-warn">This is your own address. You&apos;ll only pay the network fee.</div>
          ) : !knownRecipient ? (
            <div className="sw-callout sw-callout-warn">First time sending to this address. Check every character.</div>
          ) : null}
        </div>

        <dl className="sw-list text-sm">
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-(--sw-ink-soft)">Network</dt>
            <dd className="flex items-center gap-2 font-medium text-(--sw-ink)">
              <ChainLogo chainId={chainId} name={network} className="w-4 h-4" />
              {network}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-(--sw-ink-soft)">Network fee (max)</dt>
            <dd className="text-right">
              <span className="sw-num text-(--sw-ink)">
                {formatTokenBalance(fee)} {nativeSymbol}
              </span>
              {feeUsd !== null && isFinite(feeUsd) && (
                <span className="block text-xs text-(--sw-muted) sw-num">≈ {formatUsd(feeUsd)}</span>
              )}
            </dd>
          </div>
          {total && (
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="font-semibold text-(--sw-ink)">Total (max)</dt>
              <dd className="sw-num font-semibold text-(--sw-ink)">
                {formatTokenBalance(total)} {nativeSymbol}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="px-5 pt-3 pb-5 border-t border-(--sw-line-soft) shrink-0">
        {error && (
          <div role="alert" className="sw-callout sw-callout-danger mb-3">
            {error}
          </div>
        )}
        <button onClick={onConfirm} disabled={isSigning} className="sw-btn-primary w-full py-3.5 text-sm">
          Confirm and sign
        </button>
        <p className="text-xs text-(--sw-muted) text-center mt-2.5">
          You&apos;ll enter your PIN, then tap your Burner.
        </p>
      </div>
    </div>
  );
}
