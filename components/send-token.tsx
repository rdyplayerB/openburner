"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWalletStore } from "@/store/wallet-store";
import { rpcRateLimiter } from "@/lib/rpc-rate-limiter";
import { signTransactionSmart } from "@/lib/smart-signer";
import { PinInput } from "./pin-input";
import { CheckCircle, ExternalLink, Clock, X } from "lucide-react";
import { useEnvironment } from "@/hooks/use-environment";
import { formatTokenBalance } from "@/lib/format-utils";

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
  const [currentOperation, setCurrentOperation] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pin, setPin] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [lastUsedAddress, setLastUsedAddress] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);

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
    
    // Prevent double-clicks
    if (isSigning) {
      console.log("⚠️ [SendToken] Signing already in progress, ignoring duplicate call");
      return;
    }

    setPin(enteredPin);
    setPinError(null);
    setIsSending(true);
    setIsSigning(true);
    setTxHash(null);

    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      // Get transaction parameters with rate limiting
      const [nonce, feeData] = await rpcRateLimiter.makeRequest(async () => {
        return await Promise.all([
          provider.getTransactionCount(address),
          provider.getFeeData(),
        ]);
      });

      let transaction: ethers.TransactionRequest;

      // Check if we're on Base network (which doesn't support EIP-1559 properly)
      const isBaseNetwork = chainId === 8453;
      
      // Handle native ETH transfer vs ERC20 transfer
      if (token.address === "native") {
        // Native ETH transfer
        const amountWei = ethers.parseEther(amount);
        
        if (isBaseNetwork) {
          // Use legacy transaction format for Base network
          transaction = {
            to: recipient,
            value: amountWei,
            nonce,
            chainId,
            type: 0,
            gasPrice: feeData.gasPrice,
            gasLimit: 21000n, // Standard for ETH transfer
          };
        } else {
          // Use EIP-1559 for other networks
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
        }
      } else {
        // ERC20 token transfer
        const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
        const amountWei = ethers.parseUnits(amount, token.decimals);
        const data = contract.interface.encodeFunctionData("transfer", [
          recipient,
          amountWei,
        ]);

        // Estimate gas for ERC20 transfer with rate limiting
        const gasEstimate = await rpcRateLimiter.makeRequest(async () => {
          return await provider.estimateGas({
            to: token.address,
            data,
            value: 0n,
            from: address, // Include the from address for proper gas estimation
          });
        });

        // Add 20% buffer to gas estimate
        const gasLimit = (gasEstimate * 120n) / 100n;

        console.log('🔧 [SendToken] ERC20 transfer gas estimation:', {
          tokenAddress: token.address,
          recipient,
          amount: amountWei.toString(),
          gasEstimate: gasEstimate.toString(),
          gasLimit: gasLimit.toString(),
        });

        if (isBaseNetwork) {
          // Use legacy transaction format for Base network
          transaction = {
            to: token.address,
            value: 0n,
            data,
            nonce,
            chainId,
            type: 0,
            gasPrice: feeData.gasPrice,
            gasLimit,
          };
        } else {
          // Use EIP-1559 for other networks
          transaction = {
            to: token.address,
            value: 0n,
            data,
            nonce,
            chainId,
            type: 2,
            maxFeePerGas: feeData.maxFeePerGas,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
            gasLimit,
          };
        }
      }

      // Sign with Burner using PIN (smart signer detects connection mode)
      console.log("🔐 Signing transaction with smart signer...");
      console.log("🔐 [SendToken] Environment config:", environment);
      setCurrentOperation('Signing transaction');
      const signedTx = await signTransactionSmart(transaction, keySlot || 1, enteredPin, environment);

      // Hide PIN input on success
      setShowPinInput(false);

      // Broadcast transaction with rate limiting
      setCurrentOperation('Broadcasting transaction');
      const txResponse = await rpcRateLimiter.makeRequest(async () => {
        return await provider.broadcastTransaction(signedTx);
      });
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
      
      const operationContext = currentOperation ? ` (${currentOperation})` : '';
      
      // Check if it's a PIN error
      if (err.message?.includes("WRONG_PWD") || err.message?.includes("password")) {
        setPinError(`Incorrect PIN${operationContext}. Please try again.`);
        // Keep PIN input open for retry
      } else if (err.message?.includes('No Burner card detected')) {
        setPinError(`No Burner card detected${operationContext}. Please place your Burner card on the reader and try again.`);
      } else {
        setError(`${err.message || "Failed to send transaction"}${operationContext}`);
        setShowPinInput(false);
      }
    } finally {
      setIsSending(false);
      setIsSigning(false);
      setCurrentOperation(null);
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
      <div className="modal-overlay bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 z-50">
        <div className="sw-surface w-full max-w-sm rounded-xl border border-[var(--sw-line)] overflow-hidden">
          <div className="px-5 py-6">
            {/* Success Icon */}
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-[var(--sw-up)]" strokeWidth={1.5} />
            </div>

            {/* Success Message */}
            <h2 className="text-lg font-bold text-[var(--sw-ink)] text-center mb-1">
              Transaction <span className="text-[var(--sw-accent)]">confirmed</span>
            </h2>
            <p className="text-sm text-[var(--sw-ink-soft)] text-center mb-5">
              Sent <span className="sw-mono text-[var(--sw-ink)]">{amount} {token.symbol}</span>
            </p>

            {/* Transaction Details */}
            <div className="sw-list mb-5">
              <div className="py-3">
                <p className="sw-uplabel mb-1">Recipient</p>
                <p className="sw-mono text-xs text-[var(--sw-ink)] break-all">
                  {recipient}
                </p>
              </div>
              <div className="py-3">
                <p className="sw-uplabel mb-1">Amount</p>
                <p className="sw-mono text-sm text-[var(--sw-ink)]">
                  {amount} {token.symbol}
                </p>
              </div>
              <div className="py-3">
                <p className="sw-uplabel mb-1">Network</p>
                <p className="text-sm text-[var(--sw-ink)]">
                  {chainName}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <a
                href={getExplorerTxUrl(chainId, txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="sw-btn-primary py-3 text-sm flex items-center justify-center gap-2"
              >
                View on explorer
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                onClick={handleReturnToWallet}
                className="sw-btn-ghost py-3 text-sm"
              >
                Return
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 z-50">
      <div className="sw-surface w-full max-w-sm rounded-xl border border-[var(--sw-line)] overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--sw-line)]">
          <h2 className="text-lg font-bold text-[var(--sw-ink)]">
            Send <span className="text-[var(--sw-accent)]">{token.symbol}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--sw-muted)] hover:text-[var(--sw-ink)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-5">
        <div className="mb-5 p-3 rounded-lg border border-[var(--sw-line)]">
          <p className="sw-uplabel mb-1">Available balance</p>
          <p className="sw-mono text-base text-[var(--sw-ink)]">
            {formatTokenBalance(token.balance)} {token.symbol}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="sw-uplabel block mb-1.5">
              Recipient
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="sw-input sw-mono w-full border border-[var(--sw-line)] rounded-lg px-3 py-2.5 text-sm"
            />
            {lastUsedAddress && lastUsedAddress !== recipient && (
              <div className="mt-2 flex items-center justify-between">
                <button
                  onClick={useLastAddress}
                  className="flex items-center gap-1.5 text-xs text-[var(--sw-muted)] hover:text-[var(--sw-ink)] transition-colors"
                >
                  <Clock className="w-3 h-3" />
                  <span className="hidden sm:inline sw-mono">Last used: {lastUsedAddress.slice(0, 6)}...{lastUsedAddress.slice(-4)}</span>
                  <span className="sm:hidden sw-mono">Last: {lastUsedAddress.slice(0, 4)}...{lastUsedAddress.slice(-2)}</span>
                </button>
                <button
                  onClick={clearLastUsedAddress}
                  className="p-1 text-[var(--sw-muted)] hover:text-[var(--sw-down)] rounded transition-colors"
                  title="Clear saved address"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="sw-uplabel block">
                Amount
              </label>
              <button
                onClick={() => setAmount(token.balance)}
                className="sw-uplabel text-[var(--sw-accent)] hover:text-[var(--sw-accent-press)]"
              >
                Max
              </button>
            </div>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="sw-input sw-mono w-full border border-[var(--sw-line)] rounded-lg px-3 py-2.5 text-sm"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg border border-[var(--sw-line)]">
              <p className="text-xs text-[var(--sw-down)]">{error}</p>
            </div>
          )}

          {txHash && !isConfirmed && (
            <div className="p-3 rounded-lg border border-[var(--sw-line)]">
              <p className="sw-uplabel mb-1">
                Broadcasting
              </p>
              <p className="sw-mono text-xs text-[var(--sw-ink-soft)] break-all">
                {txHash}
              </p>
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={!recipient || !amount || isSending}
            className="sw-btn-primary w-full py-3.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

          <p className="text-xs text-[var(--sw-muted)] text-center">
            {isSending
              ? "Signing with your Burner…"
              : "Tap your Burner to sign"
            }
          </p>
        </div>
        </div>
      </div>

      <PinInput
        isVisible={showPinInput}
        onSubmit={handlePinSubmit}
        onCancel={handlePinCancel}
        error={pinError}
        isLoading={isSending || isSigning}
        loadingMessage={currentOperation || "Processing..."}
      />
    </div>
  );
}

