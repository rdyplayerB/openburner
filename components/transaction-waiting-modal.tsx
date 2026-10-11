"use client";

import { ExternalLink } from "lucide-react";
import { Modal } from "./common/modal";
import { TransactionDetails, type TransactionSummary } from "./transaction-completion-modal";
import { getChainDisplayName, getExplorerTxUrl } from "@/lib/supported-chains";

interface TransactionWaitingModalProps {
  isOpen: boolean;
  tx: TransactionSummary;
  chainName?: string;
  /** Hide the modal and keep waiting in the background. */
  onDismiss: () => void;
}

export function TransactionWaitingModal({ isOpen, tx, chainName, onDismiss }: TransactionWaitingModalProps) {
  if (!isOpen) return null;

  const network = getChainDisplayName(tx.chainId, chainName);
  const explorerUrl = getExplorerTxUrl(tx.chainId, tx.txHash);

  return (
    <Modal onClose={onDismiss} labelledBy="tx-wait-title" closeOnBackdrop={false}>
      <div className="px-5 py-5" role="status" aria-live="polite">
        <div className="flex justify-center mb-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--sw-accent)]" aria-hidden="true" />
        </div>

        <h2 id="tx-wait-title" className="text-lg font-bold text-[var(--sw-ink)] text-center mb-1">
          Transaction submitted
        </h2>
        <p className="text-sm text-[var(--sw-ink-soft)] text-center mb-6">Waiting for confirmation on {network}</p>

        <TransactionDetails tx={tx} chainName={network} />

        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="sw-btn-primary w-full py-3 px-4 text-sm flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
            <span>View on explorer</span>
          </a>
        )}
        <button onClick={onDismiss} className="sw-btn-ghost w-full py-3 px-4 mt-3 text-sm">
          Hide — keep waiting in background
        </button>

        <p className="text-xs text-[var(--sw-muted)] text-center mt-4">
          This may take a few moments depending on network congestion
        </p>
      </div>
    </Modal>
  );
}
