"use client";

import { useState } from "react";
import { useWalletStore } from "@/store/wallet-store";
import { ethers } from "ethers";
import { signTransactionWithHalo } from "@/lib/halo";
import { PinInput } from "./pin-input";

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

export function SendToken({
  token,
  onClose,
  onSuccess,
}: {
  token: Token;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { address, rpcUrl, chainId, keySlot } = useWalletStore();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pin, setPin] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

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

      // Sign with HaLo chip using PIN
      console.log("🔐 Signing transaction with HaLo chip...");
      const signedTx = await signTransactionWithHalo(transaction, keySlot || 1, enteredPin);

      // Hide PIN input on success
      setShowPinInput(false);

      // Broadcast transaction
      const txResponse = await provider.broadcastTransaction(signedTx);
      setTxHash(txResponse.hash);

      console.log("Transaction sent:", txResponse.hash);
      await txResponse.wait();
      console.log("Transaction confirmed!");

      onSuccess();
      setTimeout(() => {
        onClose();
      }, 2000);
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

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Send {token.symbol}
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

        <div className="mb-4 p-4 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-500 mb-1">Available Balance</p>
          <p className="text-lg font-semibold text-slate-900">
            {parseFloat(token.balance).toFixed(6)} {token.symbol}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-600 mb-1">
              Recipient
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
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
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {txHash && (
            <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
              <p className="text-xs text-green-700 font-medium mb-1">
                Transaction submitted!
              </p>
              <p className="text-xs text-green-600 font-mono break-all">
                {txHash}
              </p>
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={!recipient || !amount || isSending}
            className="w-full bg-slate-900 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              token.symbol
            )}
          </button>

          <p className="text-xs text-slate-400 text-center">
            {isSending 
              ? "Signing with your HaLo chip..." 
              : "Tap your HaLo chip to sign the transaction"
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

