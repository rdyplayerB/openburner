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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 relative">
        {/* Success Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-2">
          Swap Completed!
        </h2>

        {/* Transaction Details */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
          <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
            <div className="flex justify-between">
              <span>From:</span>
              <span className="font-medium">{fromAmount} {fromToken}</span>
            </div>
            <div className="flex justify-between">
              <span>To:</span>
              <span className="font-medium">{toAmount} {toToken}</span>
            </div>
            <div className="flex justify-between">
              <span>Network:</span>
              <span className="font-medium">{chainName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Transaction:</span>
              <span className="font-mono text-xs text-blue-600 dark:text-blue-400 break-all">
                {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* View on Scanner Button */}
          <a
            href={scannerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span>View on {chainName} Scanner</span>
          </a>

          {/* Return to Wallet Button */}
          <button
            onClick={onReturnToWallet}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
            </svg>
            <span>Return to Wallet</span>
          </button>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
