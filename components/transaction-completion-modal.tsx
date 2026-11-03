"use client";

import { Check, X, Clock, ExternalLink, ArrowUpRight, Repeat2 } from "lucide-react";
import { Modal } from "./common/modal";
import { ChainLogo } from "./common/token-icon";
import { shortAddress } from "./common/address-text";
import { getChainDisplayName, getExplorerTxUrl } from "@/lib/supported-chains";

export type TransactionStatus = "success" | "failed" | "pending";
export type TransactionKind = "send" | "swap";

export interface TransactionSummary {
  kind: TransactionKind;
  txHash: string;
  chainId: number;
  fromToken: string;
  fromAmount: string;
  /** Swap: token received. Send: unused. */
  toToken?: string;
  toAmount?: string;
  /** Send: recipient address. */
  recipient?: string;
}

interface TransactionStatusModalProps {
  /** "waiting" while the network confirms; then the outcome. */
  status: "waiting" | TransactionStatus;
  tx: TransactionSummary;
  chainName?: string;
  onClose: () => void;
}

/**
 * One sheet from "sent" to "confirmed" (or failed / still pending), so the
 * moment after the card tap reads as a single continuous step.
 */
export function TransactionStatusModal({ status, tx, chainName, onClose }: TransactionStatusModalProps) {
  const network = getChainDisplayName(tx.chainId, chainName);
  const explorerUrl = getExplorerTxUrl(tx.chainId, tx.txHash);
  const isSwap = tx.kind === "swap";
  const waiting = status === "waiting";

  const headline = isSwap
    ? `${tx.fromAmount} ${tx.fromToken} → ${tx.toAmount ?? "…"} ${tx.toToken ?? ""}`
    : `${tx.fromAmount} ${tx.fromToken}`;

  const view = {
    waiting: {
      title: isSwap ? "Swapping…" : "Sending…",
      body: `Waiting for ${network} to confirm. You can close this — it keeps going.`,
    },
    success: {
      title: isSwap ? "Swap complete" : "Sent",
      body: isSwap ? "Confirmed. Your balances are updated." : "Confirmed. The recipient has the funds.",
    },
    failed: {
      title: "Transaction failed",
      body: isSwap
        ? "The swap was reverted, so no tokens were exchanged. A network fee may still have been charged."
        : "The transfer was reverted, so nothing was sent. A network fee may still have been charged.",
    },
    pending: {
      title: "Still pending",
      body: "Not confirmed yet. It may still go through — check the explorer before trying again, so you don't pay twice.",
    },
  }[status];

  const steps = [
    { label: "Signed by your Burner", state: "done" as const },
    { label: `Sent to ${network}`, state: "done" as const },
    {
      label: status === "failed" ? "Reverted" : status === "pending" ? "Not confirmed yet" : "Confirmed",
      state: waiting ? ("active" as const) : status === "success" ? ("done" as const) : status === "failed" ? ("failed" as const) : ("waiting" as const),
    },
  ];

  return (
    <Modal
      onClose={onClose}
      labelledBy="tx-status-title"
      closeOnBackdrop={!waiting}
      className="sw-surface w-full max-w-sm rounded-xl border border-(--sw-line) overflow-hidden relative"
    >
      <div className="px-5 pt-6 pb-5" role={status === "failed" ? "alert" : "status"} aria-live="polite">
        <button onClick={onClose} className="sw-icon-btn p-2 absolute top-3 right-3" aria-label={waiting ? "Hide" : "Close"}>
          <X className="w-5 h-5" />
        </button>

        <div className="flex justify-center mb-4">
          <StatusBadge status={status} kind={tx.kind} />
        </div>

        <h2
          id="tx-status-title"
          className={`text-xl font-bold text-center tracking-tight ${status === "failed" ? "text-(--sw-down)" : "text-(--sw-ink)"}`}
        >
          {view.title}
        </h2>
        <p className="text-center text-2xl sw-num font-semibold text-(--sw-ink) mt-2 wrap-break-word">{headline}</p>
        <p className="text-sm text-(--sw-ink-soft) text-center mt-2 mb-5 leading-relaxed">{view.body}</p>

        <ol className="rounded-xl bg-(--sw-fill) px-4 py-2 mb-4" aria-label="Progress">
          {steps.map((s) => (
            <li key={s.label} className="flex items-center gap-3 py-2">
              <StepIcon state={s.state} />
              <span className={`text-sm ${s.state === "failed" ? "text-(--sw-down) font-semibold" : "text-(--sw-ink)"}`}>{s.label}</span>
            </li>
          ))}
        </ol>

        <dl className="text-sm mb-5 space-y-1.5">
          {!isSwap && tx.recipient && (
            <div className="flex justify-between gap-3">
              <dt className="text-(--sw-muted)">To</dt>
              <dd className="sw-mono text-(--sw-ink)">{shortAddress(tx.recipient, 8, 6)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt className="text-(--sw-muted)">Network</dt>
            <dd className="flex items-center gap-1.5 text-(--sw-ink)">
              <ChainLogo chainId={tx.chainId} name={network} className="w-4 h-4" />
              {network}
            </dd>
          </div>
        </dl>

        <div className="space-y-2">
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${status === "pending" ? "sw-btn-primary" : "sw-btn-ghost"} w-full py-3 text-sm flex items-center justify-center gap-2`}
            >
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
              View on explorer
            </a>
          )}
          <button onClick={onClose} className={`${status === "pending" ? "sw-btn-ghost" : "sw-btn-primary"} w-full py-3 text-sm`}>
            {waiting ? "Hide" : "Done"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function StatusBadge({ status, kind }: { status: "waiting" | TransactionStatus; kind: TransactionKind }) {
  const Icon = kind === "swap" ? Repeat2 : ArrowUpRight;
  if (status === "waiting") {
    return (
      <span className="relative w-16 h-16 flex items-center justify-center" aria-hidden="true">
        <span className="absolute inset-0 rounded-full border-[3px] border-(--sw-line) border-t-(--sw-accent) animate-spin" />
        <Icon className="w-6 h-6 text-(--sw-ink)" />
      </span>
    );
  }
  const tone =
    status === "success"
      ? "bg-(--sw-up-bg) text-(--sw-up)"
      : status === "failed"
        ? "bg-(--sw-down-bg) text-(--sw-down)"
        : "bg-(--sw-warn-bg) text-(--sw-warn)";
  return (
    <span className={`ob-pop-in w-16 h-16 rounded-full flex items-center justify-center ${tone}`} aria-hidden="true">
      {status === "success" ? (
        <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path className="ob-draw" d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      ) : status === "failed" ? (
        <X className="w-8 h-8" strokeWidth={2.75} />
      ) : (
        <Clock className="w-8 h-8" strokeWidth={2.25} />
      )}
    </span>
  );
}

function StepIcon({ state }: { state: "done" | "active" | "failed" | "waiting" }) {
  if (state === "done") {
    return (
      <span className="w-5 h-5 rounded-full bg-(--sw-up) text-white flex items-center justify-center shrink-0" aria-hidden="true">
        <Check className="w-3 h-3" strokeWidth={3} />
      </span>
    );
  }
  if (state === "failed") {
    return (
      <span className="w-5 h-5 rounded-full bg-(--sw-down) text-white flex items-center justify-center shrink-0" aria-hidden="true">
        <X className="w-3 h-3" strokeWidth={3} />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="w-5 h-5 flex items-center justify-center shrink-0" aria-hidden="true">
        <span className="w-4 h-4 rounded-full border-2 border-(--sw-line) border-t-(--sw-accent) animate-spin" />
      </span>
    );
  }
  return (
    <span className="w-5 h-5 flex items-center justify-center shrink-0 text-(--sw-warn)" aria-hidden="true">
      <Clock className="w-4 h-4" />
    </span>
  );
}
