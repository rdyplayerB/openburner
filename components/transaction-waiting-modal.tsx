import React from 'react';

interface TransactionWaitingModalProps {
  isOpen: boolean;
  txHash: string;
  chainId: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
}

export function TransactionWaitingModal({
  isOpen,
  txHash,
  chainId,
  fromToken,
  toToken,
  fromAmount,
  toAmount,
}: TransactionWaitingModalProps) {
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
      <div className="sw-surface w-full max-w-sm rounded-xl border border-[var(--sw-line)] overflow-hidden">
        <div className="px-5 py-5">
          {/* Loading Animation */}
          <div className="flex justify-center mb-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--sw-accent)]"></div>
          </div>

          {/* Title */}
          <h2 className="text-lg font-bold text-[var(--sw-ink)] text-center mb-1">
            Transaction submitted
          </h2>

          {/* Subtitle */}
          <p className="text-sm text-[var(--sw-ink-soft)] text-center mb-6">
            Waiting for confirmation on {chainName}
          </p>

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

          {/* Status Message */}
          <p className="text-xs text-[var(--sw-muted)] text-center mt-4">
            This may take a few moments depending on network congestion
          </p>
        </div>
      </div>
    </div>
  );
}
