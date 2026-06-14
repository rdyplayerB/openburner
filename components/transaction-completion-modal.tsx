import React from 'react';

interface TransactionCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReturnToWallet: () => void;
  txHash: string;
  chainId: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
}

export function TransactionCompletionModal({
  isOpen,
  onClose,
  onReturnToWallet,
  txHash,
  chainId,
  fromToken,
  toToken,
  fromAmount,
  toAmount,
}: TransactionCompletionModalProps) {
  if (!isOpen) return null;

  // Get chain scanner URL based on chainId
  const getChainScannerUrl = (chainId: number, txHash: string): string => {
    switch (chainId) {
      case 1: // Ethereum Mainnet
        return `https://etherscan.io/tx/${txHash}`;
      case 8453: // Base
        return `https://basescan.org/tx/${txHash}`;
      case 137: // Polygon
        return `https://polygonscan.com/tx/${txHash}`;
      case 56: // BSC
        return `https://bscscan.com/tx/${txHash}`;
      case 42161: // Arbitrum
        return `https://arbiscan.io/tx/${txHash}`;
      case 10: // Optimism
        return `https://optimistic.etherscan.io/tx/${txHash}`;
      case 250: // Fantom
        return `https://ftmscan.com/tx/${txHash}`;
      case 43114: // Avalanche
        return `https://snowtrace.io/tx/${txHash}`;
      default:
        return `https://etherscan.io/tx/${txHash}`; // Default to Etherscan
    }
  };

  const getChainName = (chainId: number): string => {
    switch (chainId) {
      case 1: return 'Ethereum';
      case 8453: return 'Base';
      case 137: return 'Polygon';
      case 56: return 'BSC';
      case 42161: return 'Arbitrum';
      case 10: return 'Optimism';
      case 250: return 'Fantom';
      case 43114: return 'Avalanche';
      default: return 'Ethereum';
    }
  };

  const scannerUrl = getChainScannerUrl(chainId, txHash);
  const chainName = getChainName(chainId);

  return (
    <div className="modal-overlay bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 z-50">
      <div className="sw-surface w-full max-w-sm rounded-xl border border-[var(--sw-line)] overflow-hidden relative">
        <div className="px-5 py-5">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[var(--sw-muted)] hover:text-[var(--sw-ink)]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Success Icon */}
          <div className="flex justify-center mb-4">
            <svg className="w-12 h-12 text-[var(--sw-up)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-lg font-bold text-[var(--sw-ink)] text-center mb-6">
            Swap complete
          </h2>

          {/* Transaction Details */}
          <div className="sw-list mb-6">
            <div className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="text-[var(--sw-muted)]">From</span>
              <span className="text-[var(--sw-ink)] font-medium sw-mono text-xs text-right break-all">{fromAmount} {fromToken}</span>
            </div>
            <div className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="text-[var(--sw-muted)]">To</span>
              <span className="text-[var(--sw-ink)] font-medium sw-mono text-xs text-right break-all">{toAmount} {toToken}</span>
            </div>
            <div className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="text-[var(--sw-muted)]">Network</span>
              <span className="text-[var(--sw-ink)] font-medium text-right">{chainName}</span>
            </div>
            <div className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="text-[var(--sw-muted)]">Transaction</span>
              <span className="sw-mono text-xs text-[var(--sw-ink)] break-all text-right">
                {txHash.slice(0, 10)}…{txHash.slice(-8)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* View on Scanner Button */}
            <a
              href={scannerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="sw-btn-primary w-full py-3 px-4 text-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span>View on {chainName} Scanner</span>
            </a>

            {/* Return to Wallet Button */}
            <button
              onClick={onReturnToWallet}
              className="sw-btn-ghost w-full py-3 px-4 text-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
              </svg>
              <span>Return to Wallet</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
