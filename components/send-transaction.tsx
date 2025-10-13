"use client";

import { useState } from "react";
import { useWalletStore } from "@/store/wallet-store";
import { signTransactionWithHalo } from "@/lib/halo";
import { ethers } from "ethers";
import { Send, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface SendTransactionProps {
  onSuccess: () => void;
}

export function SendTransaction({ onSuccess }: SendTransactionProps) {
  const { address, rpcUrl, chainId } = useWalletStore();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  async function handleSend() {
    if (!recipient || !amount || !address || !rpcUrl) return;

    setIsSending(true);
    setError(null);
    setTxHash(null);

    try {
      // Validate recipient address
      if (!ethers.isAddress(recipient)) {
        throw new Error("Invalid recipient address");
      }

      // Connect to provider
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      // Get current gas price and nonce
      const feeData = await provider.getFeeData();
      const nonce = await provider.getTransactionCount(address);

      // Create transaction
      const transaction: ethers.TransactionRequest = {
        to: recipient,
        value: ethers.parseEther(amount),
        nonce,
        chainId,
        gasLimit: BigInt(21000), // Standard ETH transfer
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        type: 2, // EIP-1559
      };

      // Sign transaction with HaLo chip
      const signedTx = await signTransactionWithHalo(transaction);

      // Broadcast transaction
      const tx = await provider.broadcastTransaction(signedTx);

      setTxHash(tx.hash);

      // Wait for confirmation
      await tx.wait();

      // Reset form
      setRecipient("");
      setAmount("");

      // Refresh balance
      onSuccess();
    } catch (err: any) {
      console.error("Transaction error:", err);
      setError(err.message || "Transaction failed");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Send ETH</h2>

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
          <label className="block text-xs text-slate-600 mb-1">
            Amount (ETH)
          </label>
          <input
            type="number"
            step="0.000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!recipient || !amount || isSending}
          className="w-full bg-slate-900 text-white font-medium py-2.5 px-6 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSending ? (
            <>
              <Loader2 className="animate-spin h-4 w-4" />
              {txHash ? "Confirming..." : "Tap HaLo to Sign..."}
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send ETH
            </>
          )}
        </button>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-xs">{error}</p>
          </div>
        )}

        {txHash && (
          <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-700 text-xs font-medium mb-1">
                  Transaction Submitted
                </p>
                <p className="text-green-600 text-xs font-mono break-all">
                  {txHash}
                </p>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-400 pt-2">
          You'll need to tap your HaLo chip to sign the transaction
        </p>
      </div>
    </div>
  );
}
