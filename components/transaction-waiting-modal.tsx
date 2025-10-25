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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        {/* Loading Animation */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-2">
          Transaction Submitted
        </h2>

        {/* Subtitle */}
        <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-6">
          Waiting for confirmation on {chainName}...
        </p>

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

        {/* Status Message */}
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
          This may take a few moments depending on network congestion
        </p>
      </div>
    </div>
  );
}
