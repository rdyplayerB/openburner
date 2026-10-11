"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWalletStore } from "@/store/wallet-store";
import { PinInput } from "./pin-input";
import { Clock, X, ArrowLeft, Loader2 } from "lucide-react";
import { useEnvironment } from "@/hooks/use-environment";
import { formatTokenBalance } from "@/lib/format-utils";
import { Modal } from "./common/modal";
import { getProvider } from "@/lib/provider";
import { parseAmount, formatAmountForInput, getNativeGasReserve, truncateToDecimals } from "@/lib/amount";
import { friendlyTxError, isRetryablePinError } from "@/lib/tx-errors";
import { getChainDisplayName, getNativeSymbol } from "@/lib/supported-chains";
import type { TransactionSummary } from "./transaction-completion-modal";

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
}

const erc20 = new ethers.Interface(["function transfer(address to, uint256 amount) returns (bool)"]);

interface Review {
  amount: string;
  amountWei: bigint;
  gasLimit: bigint;
  /** Worst-case fee in native wei (gasLimit × max fee). */
  feeWei: bigint;
}

export function SendToken({
  token,
  onClose,
  onSubmitted,
}: {
  token: Token;
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

  const isNative = token.address === "native";
  const nativeSymbol = getNativeSymbol(chainId);

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isMaxLoading, setIsMaxLoading] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<string | null>(null);
  const [lastUsedAddress, setLastUsedAddress] = useState<string | null>(null);

  useEffect(() => {
    try {
      setLastUsedAddress(localStorage.getItem("lastRecipientAddress"));
    } catch {
      /* storage unavailable */
    }
  }, []);

  function saveLastUsedAddress(addr: string) {
    try {
      localStorage.setItem("lastRecipientAddress", addr);
      setLastUsedAddress(addr);
    } catch {
      /* storage unavailable */
    }
  }

  function clearLastUsedAddress() {
    try {
      localStorage.removeItem("lastRecipientAddress");
    } catch {
      /* storage unavailable */
    }
    setLastUsedAddress(null);
  }

  const balanceWei = parseAmount(token.balance, token.decimals) ?? 0n;

  /** Native "Max" keeps back enough for the network fee. */
  async function handleMax() {
    setError(null);
    if (!isNative) {
      setAmount(token.balance);
      return;
    }
    if (!rpcUrl) return;
    setIsMaxLoading(true);
    try {
      const reserve = await getNativeGasReserve(getProvider(chainId, rpcUrl), chainId, 21000n);
      const max = balanceWei - reserve;
      if (max <= 0n) {
        setError(`Your ${nativeSymbol} balance is too low to cover the network fee.`);
        setAmount("");
      } else {
        setAmount(formatAmountForInput(max, 18));
      }
    } finally {
      setIsMaxLoading(false);
    }
  }

  function buildCall(amountWei: bigint): { to: string; value: bigint; data: string } {
    return isNative
      ? { to: recipient.trim(), value: amountWei, data: "0x" }
      : { to: token.address, value: 0n, data: erc20.encodeFunctionData("transfer", [recipient.trim(), amountWei]) };
  }

  /** Validate locally, then estimate gas + fee and show the review step. */
  async function handleReview() {
    if (!address || !rpcUrl) return;
    setError(null);
    const to = recipient.trim();
    if (!ethers.isAddress(to)) {
      setError("Enter a valid recipient address (0x…).");
      return;
    }
    const amountWei = parseAmount(amount, token.decimals);
    if (amountWei === null || amountWei <= 0n) {
      setError("Enter an amount greater than 0.");
      return;
    }
    if (amountWei > balanceWei) {
      setError(`That's more than your balance of ${formatTokenBalance(token.balance)} ${token.symbol}.`);
      return;
    }

    setIsPreparing(true);
    try {
      const provider = getProvider(chainId, rpcUrl);
      const call = buildCall(amountWei);
      const [estimate, feeData, nativeBal] = await Promise.all([
        provider.estimateGas({ ...call, from: address }).catch((err) => {
          // A plain native transfer to an EOA always costs 21000 on L1-style chains.
          if (isNative && err?.code !== "INSUFFICIENT_FUNDS") return 21000n;
          throw err;
        }),
        provider.getFeeData(),
        isNative ? Promise.resolve(balanceWei) : provider.getBalance(address),
      ]);
      const gasLimit = isNative && estimate === 21000n ? 21000n : (estimate * 120n) / 100n;
      const price = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n;
      const feeWei = gasLimit * price;

      const needed = isNative ? amountWei + feeWei : feeWei;
      if (nativeBal < needed) {
        setError(
          isNative
            ? `Not enough ${nativeSymbol} for this amount plus the network fee (~${formatTokenBalance(ethers.formatEther(feeWei))} ${nativeSymbol}). Try a smaller amount or use Max.`
            : `You need about ${formatTokenBalance(ethers.formatEther(feeWei))} ${nativeSymbol} to pay the network fee.`
        );
        return;
      }

      setReview({ amount: truncateToDecimals(amount, token.decimals), amountWei, gasLimit, feeWei });
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
    const to = recipient.trim();
    try {
      const provider = getProvider(chainId, rpcUrl);
      setCurrentOperation("Preparing transaction");
      const [nonce, feeData] = await Promise.all([
        provider.getTransactionCount(address, "pending"),
        provider.getFeeData(),
      ]);
      const call = buildCall(review.amountWei);
      // Base: legacy pricing (matches the rest of the app).
      const transaction: ethers.TransactionRequest =
        chainId === 8453
          ? { ...call, nonce, chainId, type: 0, gasPrice: feeData.gasPrice, gasLimit: review.gasLimit }
          : {
              ...call,
              nonce,
              chainId,
              type: 2,
              maxFeePerGas: feeData.maxFeePerGas,
              maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
              gasLimit: review.gasLimit,
            };

      setCurrentOperation("Signing with your Burner");
      const { signTransactionSmart } = await import("@/lib/smart-signer");
      const signedTx = await signTransactionSmart(transaction, keySlot || 1, enteredPin, environment);

      setCurrentOperation("Broadcasting transaction");
      const txResponse = await provider.broadcastTransaction(signedTx);
      saveLastUsedAddress(to);
      setShowPinInput(false);
      onSubmitted({
        kind: "send",
        txHash: txResponse.hash,
        chainId,
        fromToken: token.symbol,
        fromAmount: review.amount,
        recipient: to,
      });
    } catch (err: any) {
      if (isRetryablePinError(err)) {
        // Keep the PIN dialog open for another try.
        setPinError(friendlyTxError(err, nativeSymbol));
      } else {
        setShowPinInput(false);
        setError(friendlyTxError(err, nativeSymbol));
      }
    } finally {
      setIsSigning(false);
      setCurrentOperation(null);
    }
  }

  const network = getChainDisplayName(chainId, chainName);

  return (
    <Modal onClose={() => !isSigning && onClose()} labelledBy="send-title" closeOnBackdrop={!isSigning}>
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--sw-line)]">
        <div className="flex items-center gap-2">
          {review && (
            <button
              onClick={() => setReview(null)}
              disabled={isSigning}
              className="text-[var(--sw-muted)] hover:text-[var(--sw-ink)] -ml-1"
              aria-label="Back to edit"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h2 id="send-title" className="text-lg font-bold text-[var(--sw-ink)]">
            {review ? "Review" : "Send"} <span className="text-[var(--sw-accent)]">{token.symbol}</span>
          </h2>
        </div>
        <button
          onClick={onClose}
          disabled={isSigning}
          className="text-[var(--sw-muted)] hover:text-[var(--sw-ink)]"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {review ? (
        <div className="px-5 py-5">
          <div className="sw-list mb-5">
            <div className="py-3">
              <p className="sw-uplabel mb-1">Recipient</p>
              <p className="sw-mono text-xs text-[var(--sw-ink)] break-all">{recipient.trim()}</p>
            </div>
            <div className="py-3 flex items-center justify-between gap-3">
              <p className="sw-uplabel">Amount</p>
              <p className="sw-mono text-sm text-[var(--sw-ink)] text-right break-all">
                {review.amount} {token.symbol}
              </p>
            </div>
            <div className="py-3 flex items-center justify-between gap-3">
              <p className="sw-uplabel">Network</p>
              <p className="text-sm text-[var(--sw-ink)]">{network}</p>
            </div>
            <div className="py-3 flex items-center justify-between gap-3">
              <p className="sw-uplabel">Network fee (max)</p>
              <p className="sw-mono text-sm text-[var(--sw-ink)]">
                ≈ {formatTokenBalance(ethers.formatEther(review.feeWei))} {nativeSymbol}
              </p>
            </div>
          </div>

          {error && (
            <div role="alert" className="mb-4 p-3 rounded-lg border border-[var(--sw-line)]">
              <p className="text-xs text-[var(--sw-down)]">{error}</p>
            </div>
          )}

          <button
            onClick={() => {
              setError(null);
              setPinError(null);
              setShowPinInput(true);
            }}
            disabled={isSigning}
            className="sw-btn-primary w-full py-3.5 text-sm"
          >
            Confirm &amp; sign
          </button>
          <p className="text-xs text-[var(--sw-muted)] text-center mt-3">
            You&apos;ll enter your PIN and tap your Burner to sign.
          </p>
        </div>
      ) : (
        <div className="px-5 py-5">
          <div className="mb-5 p-3 rounded-lg border border-[var(--sw-line)]">
            <p className="sw-uplabel mb-1">Available balance</p>
            <p className="sw-mono text-base text-[var(--sw-ink)]">
              {formatTokenBalance(token.balance)} {token.symbol}
            </p>
          </div>

          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleReview();
            }}
          >
            <div>
              <label htmlFor="send-recipient" className="sw-uplabel block mb-1.5">
                Recipient
              </label>
              <input
                id="send-recipient"
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x..."
                autoComplete="off"
                spellCheck={false}
                className="sw-input sw-mono w-full border border-[var(--sw-line)] rounded-lg px-3 py-2.5 text-sm"
              />
              {lastUsedAddress && lastUsedAddress !== recipient && (
                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setRecipient(lastUsedAddress)}
                    className="flex items-center gap-1.5 text-xs text-[var(--sw-muted)] hover:text-[var(--sw-ink)] transition-colors"
                  >
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    <span className="hidden sm:inline sw-mono">
                      Last used: {lastUsedAddress.slice(0, 6)}...{lastUsedAddress.slice(-4)}
                    </span>
                    <span className="sm:hidden sw-mono">
                      Last: {lastUsedAddress.slice(0, 4)}...{lastUsedAddress.slice(-2)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={clearLastUsedAddress}
                    className="p-1 text-[var(--sw-muted)] hover:text-[var(--sw-down)] rounded transition-colors"
                    title="Clear saved address"
                    aria-label="Clear saved address"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="send-amount" className="sw-uplabel block">
                  Amount
                </label>
                <button
                  type="button"
                  onClick={handleMax}
                  disabled={isMaxLoading}
                  className="sw-uplabel text-[var(--sw-accent)] hover:text-[var(--sw-accent-press)]"
                  aria-label={isNative ? "Use maximum amount, keeping enough for the network fee" : "Use maximum amount"}
                >
                  {isMaxLoading ? "…" : "Max"}
                </button>
              </div>
              <input
                id="send-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(",", "."))}
                placeholder="0.0"
                autoComplete="off"
                className="sw-input sw-mono w-full border border-[var(--sw-line)] rounded-lg px-3 py-2.5 text-sm"
              />
              {isNative && (
                <p className="text-[11px] text-[var(--sw-muted)] mt-1.5">
                  Max keeps a little {nativeSymbol} back for the network fee.
                </p>
              )}
            </div>

            {error && (
              <div role="alert" className="p-3 rounded-lg border border-[var(--sw-line)]">
                <p className="text-xs text-[var(--sw-down)]">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!recipient || !amount || isPreparing}
              className="sw-btn-primary w-full py-3.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPreparing ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" aria-hidden="true" />
                  Checking…
                </>
              ) : (
                "Review"
              )}
            </button>
          </form>
        </div>
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
        loadingMessage={currentOperation || "Processing..."}
      />
    </Modal>
  );
}
