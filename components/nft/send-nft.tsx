"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWalletStore } from "@/store/wallet-store";
import { rpcRateLimiter } from "@/lib/rpc-rate-limiter";
import { signTransactionSmart } from "@/lib/smart-signer";
import { PinInput } from "../pin-input";
import { CheckCircle, ExternalLink, Clock, X } from "lucide-react";
import { useEnvironment } from "@/hooks/use-environment";
import { NftMedia } from "./nft-media";
import { encodeNftTransfer, type NftItem } from "@/lib/nft";

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

export function SendNft({
  nft,
  onClose,
  onSuccess,
}: {
  nft: NftItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const environment = useEnvironment();
  const { address, rpcUrl, chainId, keySlot, chainName } = useWalletStore();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("1");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentOperation, setCurrentOperation] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [lastUsedAddress, setLastUsedAddress] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  const isMultiEdition = nft.tokenType === "ERC1155";
  const ownedQty = nft.balance ? parseInt(nft.balance, 10) : 1;

  useEffect(() => {
    const stored = localStorage.getItem("lastRecipientAddress");
    if (stored) setLastUsedAddress(stored);
  }, []);

  function saveLastUsedAddress(addr: string) {
    try {
      localStorage.setItem("lastRecipientAddress", addr);
      setLastUsedAddress(addr);
    } catch (err) {
      console.warn("Failed to save last used address:", err);
    }
  }

  function handleSend() {
    if (!address || !recipient || !rpcUrl) return;
    if (!ethers.isAddress(recipient)) {
      setError("Invalid recipient address");
      return;
    }
    if (isMultiEdition) {
      const qty = parseInt(amount, 10);
      if (!qty || qty < 1 || qty > ownedQty) {
        setError(`Enter a quantity between 1 and ${ownedQty}`);
        return;
      }
    }
    setError(null);
    setPinError(null);
    setShowPinInput(true);
  }

  async function handlePinSubmit(enteredPin: string) {
    if (!address || !recipient || !rpcUrl) return;
    if (isSigning) return;

    setPinError(null);
    setIsSending(true);
    setIsSigning(true);
    setTxHash(null);

    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      const data = encodeNftTransfer(
        nft,
        address,
        recipient,
        isMultiEdition ? amount : "1"
      );

      const [nonce, feeData, gasEstimate] = await rpcRateLimiter.makeRequest(
        async () =>
          Promise.all([
            provider.getTransactionCount(address),
            provider.getFeeData(),
            provider
              .estimateGas({ to: nft.contractAddress, data, value: 0n, from: address })
              .catch(() => 150000n),
          ])
      );

      const gasLimit = (gasEstimate * 120n) / 100n;
      const isBaseNetwork = chainId === 8453;

      let transaction: ethers.TransactionRequest;
      if (isBaseNetwork) {
        transaction = {
          to: nft.contractAddress,
          value: 0n,
          data,
          nonce,
          chainId,
          type: 0,
          gasPrice: feeData.gasPrice,
          gasLimit,
        };
      } else {
        transaction = {
          to: nft.contractAddress,
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

      setCurrentOperation("Signing transaction");
      const signedTx = await signTransactionSmart(
        transaction,
        keySlot || 1,
        enteredPin,
        environment
      );

      setShowPinInput(false);

      setCurrentOperation("Broadcasting transaction");
      const txResponse = await rpcRateLimiter.makeRequest(async () =>
        provider.broadcastTransaction(signedTx)
      );
      setTxHash(txResponse.hash);

      await txResponse.wait();

      saveLastUsedAddress(recipient);
      setIsConfirmed(true);
    } catch (err: any) {
      console.error("Error sending NFT:", err);
      const operationContext = currentOperation ? ` (${currentOperation})` : "";

      if (err.message?.includes("WRONG_PWD") || err.message?.includes("password")) {
        setPinError(`Incorrect PIN${operationContext}. Please try again.`);
      } else if (err.message?.includes("No Burner card detected")) {
        setPinError(
          `No Burner card detected${operationContext}. Please place your Burner card on the reader and try again.`
        );
      } else {
        setError(`${err.message || "Failed to send NFT"}${operationContext}`);
        setShowPinInput(false);
      }
    } finally {
      setIsSending(false);
      setIsSigning(false);
      setCurrentOperation(null);
    }
  }

  function getExplorerTxUrl(txHash: string): string {
    const baseUrl = BLOCK_EXPLORERS[chainId] || "https://etherscan.io";
    return `${baseUrl}/tx/${txHash}`;
  }

  function handleReturnToWallet() {
    onSuccess();
    onClose();
  }

  if (isConfirmed && txHash) {
    return (
      <div className="modal-overlay bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 z-50">
        <div className="sw-surface rounded-xl border border-[var(--sw-line)] p-5 sm:p-6 max-w-sm sm:max-w-md w-full mx-2">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-12 h-12 text-[var(--sw-up)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--sw-ink)] text-center mb-1">
            NFT sent
          </h2>
          <p className="text-sm text-[var(--sw-ink-soft)] text-center mb-5">
            <span className="font-semibold text-[var(--sw-ink)]">{nft.name}</span> is on its way
          </p>

          <div className="sw-list mb-5">
            <div className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="text-[var(--sw-muted)]">Recipient</span>
              <span className="text-[var(--sw-ink)] sw-mono text-xs break-all text-right">{recipient}</span>
            </div>
            <div className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="text-[var(--sw-muted)]">Network</span>
              <span className="text-[var(--sw-ink)] font-medium">{chainName}</span>
            </div>
          </div>

          <div className="space-y-3">
            <a
              href={getExplorerTxUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="sw-btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
            >
              View on block explorer
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={handleReturnToWallet}
              className="sw-btn-ghost w-full py-3 text-sm"
            >
              Return to wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 z-50">
      <div className="sw-surface rounded-xl border border-[var(--sw-line)] max-w-sm sm:max-w-md w-full mx-2 overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--sw-line)]">
          <span className="sw-uplabel">Send NFT</span>
          <button
            onClick={onClose}
            className="text-[var(--sw-muted)] hover:text-[var(--sw-ink)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-5">
        {/* NFT preview */}
        <div className="mb-5 flex items-center gap-3 p-3 rounded-lg border border-[var(--sw-line)]">
          <NftMedia nft={nft} className="w-14 h-14 flex-shrink-0" rounded="rounded-lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--sw-ink)] truncate">{nft.name}</p>
            {nft.collectionName && (
              <p className="text-xs text-[var(--sw-muted)] truncate">{nft.collectionName}</p>
            )}
            <span className="inline-block mt-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium sw-mono border border-[var(--sw-line)] text-[var(--sw-ink-soft)]">
              {nft.tokenType}
              {isMultiEdition ? ` · Owned: ${ownedQty}` : ""}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="sw-uplabel block mb-1.5">Recipient</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="sw-input w-full text-sm sw-mono"
            />
            {lastUsedAddress && lastUsedAddress !== recipient && (
              <button
                onClick={() => setRecipient(lastUsedAddress)}
                className="mt-2 flex items-center gap-1.5 text-xs text-[var(--sw-muted)] hover:text-[var(--sw-ink)] transition-colors"
              >
                <Clock className="w-3 h-3" />
                Last used: <span className="sw-mono">{lastUsedAddress.slice(0, 6)}…{lastUsedAddress.slice(-4)}</span>
              </button>
            )}
          </div>

          {isMultiEdition && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="sw-uplabel block">Quantity</label>
                <button
                  onClick={() => setAmount(String(ownedQty))}
                  className="text-xs text-[var(--sw-accent)] hover:underline"
                >
                  Max ({ownedQty})
                </button>
              </div>
              <input
                type="number"
                min={1}
                max={ownedQty}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="sw-input w-full text-sm sw-mono"
              />
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg border border-[var(--sw-line)]">
              <p className="text-xs text-[var(--sw-down)]">{error}</p>
            </div>
          )}

          {txHash && !isConfirmed && (
            <div className="p-3 rounded-lg border border-[var(--sw-line)]">
              <p className="text-xs text-[var(--sw-ink-soft)] font-medium mb-1">Broadcasting transaction…</p>
              <p className="text-xs text-[var(--sw-muted)] sw-mono break-all">{txHash}</p>
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={!recipient || isSending}
            className="sw-btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
          >
            {isSending ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {txHash ? "Confirming…" : "Signing…"}
              </>
            ) : (
              "Send NFT"
            )}
          </button>

          <p className="text-xs text-[var(--sw-muted)] text-center">
            {isSending ? "Signing with your Burner…" : "Tap your Burner to sign."}
          </p>
        </div>
        </div>
      </div>

      <PinInput
        isVisible={showPinInput}
        onSubmit={handlePinSubmit}
        onCancel={() => {
          setShowPinInput(false);
          setPinError(null);
        }}
        error={pinError}
        isLoading={isSending || isSigning}
        loadingMessage={currentOperation || "Processing..."}
      />
    </div>
  );
}
