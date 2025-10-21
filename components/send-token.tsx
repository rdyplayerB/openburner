"use client";

import { useState, useEffect } from "react";
import { useWalletStore } from "@/store/wallet-store";
import { ethers } from "ethers";
import { signTransactionSmart } from "@/lib/smart-signer";
import { PinInput } from "./pin-input";
import { CheckCircle, ExternalLink, Clock, X } from "lucide-react";
import { useEnvironment } from "@/hooks/use-environment";

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
}

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
];

// Block explorer URLs for each chain
const BLOCK_EXPLORERS: Record<number, string> = {
  1: "https://etherscan.io",
  8453: "https://basescan.org",
  56: "https://bscscan.com",
  42161: "https://arbiscan.io",
  43114: "https://snowtrace.io",
  81457: "https://blastscan.io",
  59144: "https://lineascan.build",
  5000: "https://explorer.mantle.xyz",
  34443: "https://explorer.mode.network",
  10: "https://optimistic.etherscan.io",
  137: "https://polygonscan.com",
  534352: "https://scrollscan.com",
  1301: "https://unichain-sepolia.blockscout.com",
};

export function SendToken({
  token,
  onClose,
  onSuccess,
}: {
  token: Token;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const environment = useEnvironment();
  const { address, rpcUrl, chainId, keySlot, chainName } = useWalletStore();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pin, setPin] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [lastUsedAddress, setLastUsedAddress] = useState<string | null>(null);

  // Load last used address on mount
  useEffect(() => {
    const stored = localStorage.getItem("lastRecipientAddress");
    if (stored) {
      setLastUsedAddress(stored);
    }
  }, []);

  // Save recipient address to localStorage
  function saveLastUsedAddress(addr: string) {
    try {
      localStorage.setItem("lastRecipientAddress", addr);
      setLastUsedAddress(addr);
    } catch (error) {
      console.warn("Failed to save last used address:", error);
    }
  }

  // Use last used address
  function useLastAddress() {
    if (lastUsedAddress) {
      setRecipient(lastUsedAddress);
    }
  }

  // Clear last used address
  function clearLastUsedAddress() {
    try {
      localStorage.removeItem("lastRecipientAddress");
      setLastUsedAddress(null);
    } catch (error) {
      console.warn("Failed to clear last used address:", error);
    }
  }

  function handleSend() {
    // Validate inputs first
    if (!address || !recipient || !amount || !rpcUrl) return;
    if (!ethers.isAddress(recipient)) {
      setError("Invalid recipient address");
      return;
    }

    // Show PIN input
    setError(null);
    setPinError(null);
    setShowPinInput(true);
  }

  async function handlePinSubmit(enteredPin: string) {
    if (!address || !recipient || !amount || !rpcUrl) return;

    setPin(enteredPin);
    setPinError(null);
    setIsSending(true);
    setTxHash(null);

    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      // Get transaction parameters
      const [nonce, feeData] = await Promise.all([
        provider.getTransactionCount(address),
        provider.getFeeData(),
      ]);

      let transaction: ethers.TransactionRequest;

      // Handle native ETH transfer vs ERC20 transfer
      if (token.address === "native") {
        // Native ETH transfer
        const amountWei = ethers.parseEther(amount);
        
        transaction = {
          to: recipient,
          value: amountWei,
          nonce,
          chainId,
          type: 2,
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
          gasLimit: 21000n, // Standard for ETH transfer
        };
      } else {
        // ERC20 token transfer
        const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
        const amountWei = ethers.parseUnits(amount, token.decimals);
        const data = contract.interface.encodeFunctionData("transfer", [
          recipient,
          amountWei,
        ]);

        transaction = {
          to: token.address,
          value: 0n,
          data,
          nonce,
          chainId,
          type: 2,
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
          gasLimit: 100000n, // Standard for ERC20 transfers
        };
      }

      // Sign with Burner using PIN (smart signer detects connection mode)
      console.log("🔐 Signing transaction with smart signer...");
      const signedTx = await signTransactionSmart(transaction, keySlot || 1, enteredPin, environment);

      // Hide PIN input on success
      setShowPinInput(false);

      // Broadcast transaction
      const txResponse = await provider.broadcastTransaction(signedTx);
      setTxHash(txResponse.hash);

      console.log("Transaction sent:", txResponse.hash);
      await txResponse.wait();
      console.log("Transaction confirmed!");

      // Save recipient address for future use
      saveLastUsedAddress(recipient);

      // Show confirmation screen - don't call onSuccess yet
      // onSuccess will be called when user clicks "Return to Wallet"
      setIsConfirmed(true);
    } catch (err: any) {
      console.error("Error sending token:", err);
      
      // Check if it's a PIN error
      if (err.message?.includes("WRONG_PWD") || err.message?.includes("password")) {
        setPinError("Incorrect PIN. Please try again.");
        // Keep PIN input open for retry
      } else {
        setError(err.message || "Failed to send transaction");
        setShowPinInput(false);
      }
    } finally {
      setIsSending(false);
    }
  }

  function handlePinCancel() {
    setShowPinInput(false);
    setPinError(null);
    setPin(null);
  }

  function getExplorerTxUrl(chainId: number, txHash: string): string {
    const baseUrl = BLOCK_EXPLORERS[chainId] || "https://etherscan.io";
    return `${baseUrl}/tx/${txHash}`;
  }

  function handleReturnToWallet() {
    // Refresh balance before closing
    onSuccess();
    onClose();
  }

  // If transaction is confirmed, show confirmation screen
  if (isConfirmed && txHash) {
    return (
      <div className="modal-overlay bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card-lg p-4 sm:p-6 max-w-sm sm:max-w-md w-full mx-2">
          {/* Success Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" />
            </div>
          </div>

          {/* Success Message */}
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 text-center mb-2">
            Transaction <span className="text-brand-orange">Confirmed!</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-600 text-center mb-4 sm:mb-6">
            Your <span className="font-semibold text-slate-900">{amount} {token.symbol}</span> has been sent successfully
          </p>

          {/* Transaction Details */}
          <div className="bg-slate-50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="space-y-2 sm:space-y-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">Recipient</p>
                <p className="text-xs sm:text-sm font-mono text-slate-900 break-all">
                  {recipient}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Amount</p>
                <p className="text-sm font-semibold text-slate-900">
                  {amount} {token.symbol}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Network</p>
                <p className="text-sm font-semibold text-slate-900">
                  {chainName}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 sm:space-y-3">
            <a
              href={getExplorerTxUrl(chainId, txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-xl transition-all duration-150 font-semibold shadow-md hover:shadow-glow-orange active:scale-95 text-sm sm:text-base"
            >
              <span>View on Block Explorer</span>
              <ExternalLink className="w-4 h-4" strokeWidth={2.5} />
            </a>
            
            <button
              onClick={handleReturnToWallet}
              className="w-full px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-slate-200 text-slate-900 rounded-xl hover:bg-slate-50 hover:border-brand-orange/30 transition-all duration-150 font-semibold active:scale-95 text-sm sm:text-base"
            >
              Return to Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card-lg p-4 sm:p-6 max-w-sm sm:max-w-md w-full mx-2">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Send <span className="text-brand-orange">{token.symbol}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-500 mb-1">Available Balance</p>
          <p className="text-base sm:text-lg font-semibold text-slate-900">
            {parseFloat(token.balance).toFixed(6)} {token.symbol}
          </p>
        </div>

        <div className="space-y-2 sm:space-y-3">
          <div>
            <label className="block text-xs text-slate-600 mb-1">
              Recipient
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 text-base border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
            {lastUsedAddress && lastUsedAddress !== recipient && (
              <div className="mt-2 flex items-center justify-between">
                <button
                  onClick={useLastAddress}
                  className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <Clock className="w-3 h-3" />
                  <span className="hidden sm:inline">Last used: {lastUsedAddress.slice(0, 6)}...{lastUsedAddress.slice(-4)}</span>
                  <span className="sm:hidden">Last: {lastUsedAddress.slice(0, 4)}...{lastUsedAddress.slice(-2)}</span>
                </button>
                <button
                  onClick={clearLastUsedAddress}
                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Clear saved address"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs text-slate-600">
                Amount
              </label>
              <button
                onClick={() => setAmount(token.balance)}
                className="text-xs text-slate-600 hover:text-slate-900"
              >
                Max
              </button>
            </div>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="w-full px-3 py-2 text-base border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {txHash && !isConfirmed && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs text-blue-700 font-medium mb-1">
                Transaction broadcasting...
              </p>
              <p className="text-xs text-blue-600 font-mono break-all">
                {txHash}
              </p>
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={!recipient || !amount || isSending}
            className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-semibold py-2.5 sm:py-3 px-4 rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-glow-orange active:scale-95 text-sm sm:text-base"
          >
            {isSending ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {txHash ? "Confirming..." : "Signing..."}
              </>
            ) : (
              "Send"
            )}
          </button>

          <p className="text-xs text-slate-400 text-center">
            {isSending 
              ? "Signing with your Burner..." 
              : "Tap your Burner to sign the transaction"
            }
          </p>
        </div>
      </div>

      <PinInput
        isVisible={showPinInput}
        onSubmit={handlePinSubmit}
        onCancel={handlePinCancel}
        error={pinError}
      />
    </div>
  );
}

