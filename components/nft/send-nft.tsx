"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { feeFields } from "@/lib/card/tx";
import { useWalletStore } from "@/store/wallet-store";
import { recordActivity, settleActivity } from "@/store/activity-store";
import { PinInput } from "../pin-input";
import { CheckCircle2, Clock, ExternalLink, X, XCircle, ArrowLeft, Loader2 } from "lucide-react";
import { useEnvironment } from "@/hooks/use-environment";
import { NftMedia } from "./nft-media";
import { encodeNftTransfer, type NftItem } from "@/lib/nft";
import { Modal } from "@/components/common/modal";
import { ChainLogo } from "@/components/common/token-icon";
import { getProvider } from "@/lib/provider";
import { getChainDisplayName, getExplorerTxUrl, getNativeSymbol } from "@/lib/supported-chains";
import { friendlyTxError, isRetryablePinError } from "@/lib/tx-errors";
import { formatTokenBalance } from "@/lib/format-utils";
import {
  RecipientField,
  RecipientReview,
  useRecipient,
  readRecentRecipients,
  saveRecentRecipient,
  clearRecentRecipients,
  type RecentRecipient,
} from "../send-token";
import type { ProgressStep } from "../signing/signing-progress";

interface Review {
  to: string;
  ens: string | null;
  quantity: string;
  data: string;
  gasLimit: bigint;
  feeWei: bigint;
}

type View = "form" | "review" | "confirming" | "done" | "failed" | "pending";

/** How long to wait for a receipt before handing off to the activity list. */
const CONFIRM_TIMEOUT_MS = 180_000;

export function SendNft({
  nft,
  onClose,
  onSuccess,
}: {
  nft: NftItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const environment = useEnvironment();
  const address = useWalletStore((s) => s.address);
  const rpcUrl = useWalletStore((s) => s.rpcUrl);
  const chainId = useWalletStore((s) => s.chainId);
  const keySlot = useWalletStore((s) => s.keySlot);
  const chainName = useWalletStore((s) => s.chainName);
  const network = getChainDisplayName(chainId, chainName);
  const nativeSymbol = getNativeSymbol(chainId);

  const recipient = useRecipient();
  const [recents, setRecents] = useState<RecentRecipient[]>([]);
  const [quantity, setQuantity] = useState("1");
  const [view, setView] = useState<View>("form");
  const [review, setReview] = useState<Review | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signStep, setSignStep] = useState<"prepare" | "sign" | "send">("prepare");

  const isMultiEdition = nft.tokenType === "ERC1155";
  const ownedQty = nft.balance ? parseInt(nft.balance, 10) : 1;
  const qty = parseInt(quantity, 10);
  const qtyValid = !isMultiEdition || (/^\d+$/.test(quantity) && qty >= 1 && qty <= ownedQty);

  useEffect(() => {
    setRecents(readRecentRecipients());
  }, []);

  useEffect(() => {
    setError(null);
  }, [recipient.trimmed, quantity]);

  /** Encode the transfer and estimate its fee, then show the review step. */
  async function handleReview() {
    setSubmitAttempted(true);
    const to = recipient.address;
    if (!address || !rpcUrl || !to || !qtyValid || isPreparing) return;
    setError(null);
    setIsPreparing(true);
    try {
      const provider = getProvider(chainId, rpcUrl);
      const amount = isMultiEdition ? String(qty) : "1";
      const data = encodeNftTransfer(nft, address, to, amount);
      const [estimate, feeData, nativeBal] = await Promise.all([
        provider.estimateGas({ to: nft.contractAddress, data, value: 0n, from: address }).catch((err) => {
          // A revert here means the transfer would fail on-chain; anything else
          // (flaky RPC) falls back to a safe limit.
          if (err?.code === "CALL_EXCEPTION") throw err;
          return 150000n;
        }),
        provider.getFeeData(),
        provider.getBalance(address),
      ]);
      const gasLimit = (estimate * 120n) / 100n;
      const feeWei = gasLimit * (feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n);
      if (nativeBal < feeWei) {
        setError(`You need about ${formatTokenBalance(ethers.formatEther(feeWei))} ${nativeSymbol} to pay the network fee.`);
        return;
      }
      setReview({ to, ens: recipient.ensName, quantity: amount, data, gasLimit, feeWei });
      setView("review");
    } catch (err: any) {
      setError(friendlyTxError(err, nativeSymbol));
    } finally {
      setIsPreparing(false);
    }
  }

  async function waitForOutcome(hash: string) {
    if (!rpcUrl) return;
    try {
      const receipt = await getProvider(chainId, rpcUrl).waitForTransaction(hash, 1, CONFIRM_TIMEOUT_MS);
      if (receipt && receipt.status === 0) {
        settleActivity(hash, { status: "failed" });
        setView("failed");
      } else if (receipt) {
        settleActivity(hash, { status: "success" });
        setView("done");
      } else {
        setView("pending");
      }
    } catch {
      // Timed out or the RPC dropped: it may still confirm. Activity keeps it as pending.
      setView("pending");
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
      const base = { to: nft.contractAddress, value: 0n, data: review.data, nonce, chainId, gasLimit: review.gasLimit };
      const transaction: ethers.TransactionRequest = { ...base, ...feeFields(chainId, feeData) };

      setSignStep("sign");
      const { signTransactionSmart } = await import("@/lib/smart-signer");
      const signedTx = await signTransactionSmart(transaction, keySlot, enteredPin, environment);

      setSignStep("send");
      const txResponse = await provider.broadcastTransaction(signedTx);
      setTxHash(txResponse.hash);
      setRecents(saveRecentRecipient({ address: review.to, ens: review.ens ?? undefined }));
      recordActivity({
        hash: txResponse.hash,
        chainId,
        kind: "nft",
        label: nft.name,
        recipient: review.to,
        ...(isMultiEdition ? { fromAmount: review.quantity } : {}),
      });
      setShowPinInput(false);
      setView("confirming");
      waitForOutcome(txResponse.hash);
    } catch (err: any) {
      if (isRetryablePinError(err)) {
        setPinError(friendlyTxError(err, nativeSymbol));
      } else {
        setShowPinInput(false);
        setError(friendlyTxError(err, nativeSymbol));
      }
    } finally {
      setIsSigning(false);
    }
  }

  const explorerUrl = txHash ? getExplorerTxUrl(chainId, txHash) : null;

  // ─── After broadcast: confirming / done / failed / still pending ─────────
  if (view === "confirming" || view === "done" || view === "failed" || view === "pending") {
    const copy = {
      confirming: { title: "Sending…", body: `Waiting for ${network} to confirm.` },
      done: { title: "NFT sent", body: `${nft.name} is in the recipient's wallet.` },
      failed: {
        title: "Transfer failed",
        body: "The transfer was reverted on-chain, so the NFT was not sent. A network fee may still have been charged.",
      },
      pending: {
        title: "Still pending",
        body: "Not confirmed yet. It may still go through. Check the explorer or your activity before trying again.",
      },
    }[view];
    const finish = view === "failed" ? onClose : onSuccess;

    return (
      <Modal onClose={finish} labelledBy="nft-status-title" closeOnBackdrop={view !== "confirming"}>
        <div className="px-5 pt-6 pb-5 text-center" role={view === "failed" ? "alert" : "status"} aria-live="polite">
          <div className="relative w-24 h-24 mx-auto mb-4">
            <NftMedia nft={nft} className="w-24 h-24" rounded="rounded-xl" />
            <span className="absolute -right-2 -bottom-2 w-8 h-8 rounded-full bg-(--sw-surface) flex items-center justify-center">
              {view === "confirming" ? (
                <Loader2 className="w-6 h-6 animate-spin text-(--sw-accent)" aria-hidden="true" />
              ) : view === "done" ? (
                <CheckCircle2 className="w-7 h-7 text-(--sw-up)" aria-hidden="true" />
              ) : view === "failed" ? (
                <XCircle className="w-7 h-7 text-(--sw-down)" aria-hidden="true" />
              ) : (
                <Clock className="w-6 h-6 text-(--sw-warn)" aria-hidden="true" />
              )}
            </span>
          </div>
          <h2 id="nft-status-title" className="text-xl font-bold tracking-tight text-(--sw-ink)">
            {copy.title}
          </h2>
          <p className="text-sm text-(--sw-ink-soft) mt-1 mb-5 leading-relaxed max-w-76 mx-auto">{copy.body}</p>

          {review && (
            <div className="rounded-xl bg-(--sw-fill) p-3.5 mb-5 text-left">
              <p className="sw-label mb-2">To</p>
              <RecipientReview address={review.to} ens={review.ens} />
            </div>
          )}

          <div className="space-y-2">
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${view === "pending" ? "sw-btn-primary" : "sw-btn-ghost"} w-full py-3 text-sm flex items-center justify-center gap-2`}
              >
                View on explorer
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
              </a>
            )}
            <button
              onClick={finish}
              className={`${view === "pending" ? "sw-btn-ghost" : "sw-btn-primary"} w-full py-3 text-sm`}
            >
              {view === "confirming" ? "Close — keep waiting" : "Done"}
            </button>
          </div>
          {view === "confirming" && (
            <p className="text-xs text-(--sw-muted) mt-3">You can close this. It&apos;ll show up in your activity.</p>
          )}
        </div>
      </Modal>
    );
  }

  // ─── Form + review ───────────────────────────────────────────────────────
  let cta = "Review";
  let ctaReady = false;
  if (!recipient.trimmed) cta = "Enter a recipient";
  else if (recipient.resolving) cta = "Checking…";
  else if (!recipient.address) cta = recipient.isEns ? "Name not found" : "Enter a valid address";
  else if (!qtyValid) cta = `Enter 1 to ${ownedQty}`;
  else if (isPreparing) cta = "Checking…";
  else ctaReady = true;

  const progressSteps: ProgressStep[] = [
    { key: "prepare", label: "Prepare transfer" },
    { key: "sign", label: "Sign with your Burner", card: true },
    { key: "send", label: `Send to ${network}` },
  ];

  const inReview = view === "review" && review;
  const toLower = review?.to.toLowerCase();
  const isSelf = !!address && toLower === address.toLowerCase();
  const isContract = toLower === nft.contractAddress.toLowerCase();
  const knownRecipient = !!toLower && recents.some((r) => r.address.toLowerCase() === toLower);
  const fee = review ? ethers.formatEther(review.feeWei) : null;

  return (
    <Modal
      onClose={() => !isSigning && onClose()}
      labelledBy="send-nft-title"
      closeOnBackdrop={!isSigning}
      className="sw-surface w-full max-w-sm rounded-xl border border-(--sw-line) overflow-hidden flex flex-col max-h-[90dvh]"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3 shrink-0">
        <div className="flex items-center gap-1 min-w-0">
          {inReview && (
            <button
              onClick={() => setView("form")}
              disabled={isSigning}
              className="sw-icon-btn p-2 -ml-1"
              aria-label="Back to edit"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
          <h2 id="send-nft-title" className={`text-lg font-bold tracking-tight text-(--sw-ink) ${inReview ? "" : "pl-1"}`}>
            {inReview ? "Review" : "Send NFT"}
          </h2>
        </div>
        <button onClick={onClose} disabled={isSigning} className="sw-icon-btn p-2 -mr-1" aria-label="Close">
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {inReview && review ? (
        <div className="flex flex-col min-h-0 flex-auto">
          <div className="px-5 pb-4 overflow-y-auto overscroll-contain min-h-0 flex-auto">
            <div className="flex flex-col items-center text-center pt-1 pb-5">
              <NftMedia nft={nft} className="w-28 h-28" rounded="rounded-xl" />
              <p className="mt-3 text-lg font-bold tracking-tight text-(--sw-ink) max-w-full truncate">
                {isMultiEdition && <span className="tabular-nums">{review.quantity} × </span>}
                {nft.name}
              </p>
              {nft.collectionName && <p className="text-sm text-(--sw-ink-soft) truncate max-w-full">{nft.collectionName}</p>}
            </div>

            <div className="rounded-xl bg-(--sw-fill) p-3.5 mb-3">
              <p className="sw-label mb-2">To</p>
              <RecipientReview address={review.to} ens={review.ens} />
            </div>

            <div className="mb-3">
              {isContract ? (
                <div className="sw-callout sw-callout-danger" role="alert">
                  This is the NFT&apos;s own contract, not a wallet. NFTs sent here are usually lost for good.
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
              {fee && (
                <div className="flex items-center justify-between gap-3 py-3">
                  <dt className="text-(--sw-ink-soft)">Network fee (max)</dt>
                  <dd className="sw-num text-(--sw-ink)">
                    {formatTokenBalance(fee)} {nativeSymbol}
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 py-3">
                <dt className="text-(--sw-ink-soft)">Standard</dt>
                <dd className="sw-mono text-xs text-(--sw-ink)">{nft.tokenType}</dd>
              </div>
            </dl>
          </div>

          <div className="px-5 pt-3 pb-5 border-t border-(--sw-line-soft) shrink-0">
            {error && (
              <div role="alert" className="sw-callout sw-callout-danger mb-3">
                {error}
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
              Confirm and sign
            </button>
            <p className="text-xs text-(--sw-muted) text-center mt-2.5">
              You&apos;ll enter your PIN, then tap your Burner.
            </p>
          </div>
        </div>
      ) : (
        <form
          className="flex flex-col min-h-0 flex-auto"
          onSubmit={(e) => {
            e.preventDefault();
            if (ctaReady) handleReview();
            else setSubmitAttempted(true);
          }}
        >
          <div className="px-5 pb-4 overflow-y-auto overscroll-contain min-h-0 flex-auto space-y-5">
            {/* NFT preview */}
            <div className="flex items-center gap-3 rounded-xl bg-(--sw-fill) p-3">
              <NftMedia nft={nft} className="w-14 h-14 shrink-0" rounded="rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-(--sw-ink) truncate">{nft.name}</p>
                {nft.collectionName && <p className="text-xs text-(--sw-ink-soft) truncate">{nft.collectionName}</p>}
                <p className="text-xs text-(--sw-muted) mt-0.5">
                  <span className="sw-mono">{nft.tokenType}</span>
                  {isMultiEdition ? ` · You own ${ownedQty}` : ""}
                </p>
              </div>
            </div>

            {isMultiEdition && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="send-nft-qty" className="sw-label">
                    Quantity
                  </label>
                  <button type="button" onClick={() => setQuantity(String(ownedQty))} className="sw-link text-xs">
                    Max ({ownedQty})
                  </button>
                </div>
                <div className="sw-field px-3 py-2.5">
                  <input
                    id="send-nft-qty"
                    type="text"
                    inputMode="numeric"
                    value={quantity}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "");
                      setQuantity(v);
                    }}
                    autoComplete="off"
                    aria-invalid={!qtyValid}
                    className="sw-field-input sw-num text-sm"
                  />
                </div>
                {!qtyValid && quantity !== "" && (
                  <p className="text-xs text-(--sw-down) mt-1.5">Enter a number from 1 to {ownedQty}.</p>
                )}
              </div>
            )}

            <RecipientField
              id="send-nft-recipient"
              state={recipient}
              showProblem={submitAttempted}
              recents={recents}
              onClearRecents={() => {
                clearRecentRecipients();
                setRecents([]);
              }}
            />
          </div>

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
