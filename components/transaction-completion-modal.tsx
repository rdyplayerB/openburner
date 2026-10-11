"use client";

import { CheckCircle2, XCircle, Clock, ExternalLink, Wallet, X } from "lucide-react";
import { Modal } from "./common/modal";
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

interface TransactionCompletionModalProps {
  isOpen: boolean;
  status: TransactionStatus;
  tx: TransactionSummary;
  chainName?: string;
  onClose: () => void;
}

function shortHash(h: string) {
  return `${h.slice(0, 10)}…${h.slice(-8)}`;
}

/** Shared detail rows for the waiting and completion modals. */
export function TransactionDetails({ tx, chainName }: { tx: TransactionSummary; chainName: string }) {
  return (
    <div className="sw-list mb-6">
      {tx.kind === "swap" ? (
        <>
          <Row label="From" value={`${tx.fromAmount} ${tx.fromToken}`} mono />
          <Row label="To" value={`${tx.toAmount ?? "—"} ${tx.toToken ?? ""}`} mono />
        </>
      ) : (
        <>
          <Row label="Amount" value={`${tx.fromAmount} ${tx.fromToken}`} mono />
          {tx.recipient && <Row label="Recipient" value={`${tx.recipient.slice(0, 8)}…${tx.recipient.slice(-6)}`} mono />}
        </>
      )}
      <Row label="Network" value={chainName} />
      <Row label="Transaction" value={shortHash(tx.txHash)} mono />
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 text-sm">
      <span className="text-[var(--sw-muted)]">{label}</span>
      <span className={`text-[var(--sw-ink)] font-medium text-right break-all ${mono ? "sw-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}

export function TransactionCompletionModal({ isOpen, status, tx, chainName, onClose }: TransactionCompletionModalProps) {
  if (!isOpen) return null;

  const network = getChainDisplayName(tx.chainId, chainName);
  const explorerUrl = getExplorerTxUrl(tx.chainId, tx.txHash);
  const noun = tx.kind === "swap" ? "Swap" : "Transfer";

  const view = {
    success: {
      Icon: CheckCircle2,
      color: "text-[var(--sw-up)]",
      title: `${noun} complete`,
      body:
        tx.kind === "swap"
          ? "Confirmed on-chain. Your balances have been refreshed."
          : "Confirmed on-chain. The recipient has the funds.",
    },
    failed: {
      Icon: XCircle,
      color: "text-[var(--sw-down)]",
      title: "Transaction failed",
      body:
        tx.kind === "swap"
          ? "The swap was reverted on-chain, so no tokens were exchanged. A network fee may still have been charged."
          : "The transfer was reverted on-chain, so nothing was sent. A network fee may still have been charged.",
    },
    pending: {
      Icon: Clock,
      color: "text-[var(--sw-accent)]",
      title: "Still pending",
      body:
        "Not confirmed yet. It may still go through — check the explorer before trying again, so you don't pay twice.",
    },
  }[status];

  return (
    <Modal onClose={onClose} labelledBy="tx-result-title" className="sw-surface w-full max-w-sm rounded-xl border border-[var(--sw-line)] overflow-hidden relative">
      <div className="px-5 py-5" role={status === "failed" ? "alert" : "status"}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--sw-muted)] hover:text-[var(--sw-ink)]"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex justify-center mb-4">
          <view.Icon className={`w-12 h-12 ${view.color}`} strokeWidth={1.75} aria-hidden="true" />
        </div>

        <h2
          id="tx-result-title"
          className={`text-lg font-bold text-center mb-1 ${status === "failed" ? "text-[var(--sw-down)]" : "text-[var(--sw-ink)]"}`}
        >
          {view.title}
        </h2>
        <p className="text-sm text-[var(--sw-ink-soft)] text-center mb-5 leading-relaxed">{view.body}</p>

        <TransactionDetails tx={tx} chainName={network} />

        <div className="space-y-3">
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${status === "pending" ? "sw-btn-primary" : "sw-btn-ghost"} w-full py-3 px-4 text-sm flex items-center justify-center gap-2`}
            >
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
              <span>View on explorer</span>
            </a>
          )}
          <button
            onClick={onClose}
            className={`${status === "pending" ? "sw-btn-ghost" : "sw-btn-primary"} w-full py-3 px-4 text-sm flex items-center justify-center gap-2`}
          >
            <Wallet className="w-4 h-4" aria-hidden="true" />
            <span>Return to wallet</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
