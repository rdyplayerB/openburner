"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWalletStore } from "@/store/wallet-store";
import { PinInput } from "../pin-input";
import { CheckCircle, ExternalLink, Clock, X } from "lucide-react";
import { useEnvironment } from "@/hooks/use-environment";
import { NftMedia } from "./nft-media";
import { encodeNftTransfer, type NftItem } from "@/lib/nft";
import { Modal } from "@/components/common/modal";
import { getProvider } from "@/lib/provider";
import { getExplorerTxUrl, getNativeSymbol } from "@/lib/supported-chains";
import { friendlyTxError, isRetryablePinError } from "@/lib/tx-errors";

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
  const address = useWalletStore((s) => s.address);
  const rpcUrl = useWalletStore((s) => s.rpcUrl);
  const chainId = useWalletStore((s) => s.chainId);
  const keySlot = useWalletStore((s) => s.keySlot);
  const chainName = useWalletStore((s) => s.chainName);
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
    } catch {
      /* storage unavailable */
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
      const provider = getProvider(chainId, rpcUrl);

      const data = encodeNftTransfer(
        nft,
        address,
        recipient,
        isMultiEdition ? amount : "1"
      );

      const [nonce, feeData, gasEstimate] = await Promise.all([
        provider.getTransactionCount(address, "pending"),
        provider.getFeeData(),
        provider
          .estimateGas({ to: nft.contractAddress, data, value: 0n, from: address })
          .catch(() => 150000n),
      ]);

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
      const { signTransactionSmart } = await import("@/lib/smart-signer");
      const signedTx = await signTransactionSmart(
        transaction,
        keySlot || 1,
        enteredPin,
        environment
      );

      setShowPinInput(false);

      setCurrentOperation("Broadcasting transaction");
      const txResponse = await provider.broadcastTransaction(signedTx);
      setTxHash(txResponse.hash);

      setCurrentOperation("Waiting for confirmation");
      const receipt = await txResponse.wait().catch((e: any) => {
        // ethers throws CALL_EXCEPTION for a mined-but-reverted tx.
        if (e?.code === "CALL_EXCEPTION") return { status: 0 };
        throw e;
      });
      if (receipt && receipt.status === 0) {
        throw new Error("The transfer was reverted on-chain, so the NFT was not sent. A network fee may still have been charged.");
      }

      saveLastUsedAddress(recipient);
      setIsConfirmed(true);
    } catch (err: any) {
      if (isRetryablePinError(err)) {
        setPinError(friendlyTxError(err, getNativeSymbol(chainId)));
      } else {
        setShowPinInput(false);
        setError(
          String(err?.message || "").startsWith("The transfer was reverted")
            ? err.message
            : friendlyTxError(err, getNativeSymbol(chainId))
        );
      }
    } finally {
      setIsSending(false);
      setIsSigning(false);
      setCurrentOperation(null);
    }
  }

  const explorerUrl = txHash ? getExplorerTxUrl(chainId, txHash) : null;

  function handleReturnToWallet() {
    onSuccess();
    onClose();
  }

  if (isConfirmed && txHash) {
    return (
      <Modal
        onClose={handleReturnToWallet}
        labelledBy="nft-sent-title"
        className="sw-surface rounded-xl border border-[var(--sw-line)] p-5 sm:p-6 max-w-sm sm:max-w-md w-full mx-2"
      >
          <div className="flex justify-center mb-4" role="status">
            <CheckCircle className="w-12 h-12 text-[var(--sw-up)]" />
          </div>
          <h2 id="nft-sent-title" className="text-xl font-bold text-[var(--sw-ink)] text-center mb-1">
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
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="sw-btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
              >
                View on block explorer
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
              </a>
            )}
            <button
              onClick={handleReturnToWallet}
              className="sw-btn-ghost w-full py-3 text-sm"
            >
              Return to wallet
            </button>
          </div>
      </Modal>
    );
  }

  return (
    <Modal
      onClose={() => !isSending && onClose()}
      labelledBy="send-nft-title"
      closeOnBackdrop={!isSending}
      className="sw-surface rounded-xl border border-[var(--sw-line)] max-w-sm sm:max-w-md w-full mx-2 overflow-hidden"
    >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--sw-line)]">
          <h2 id="send-nft-title" className="sw-uplabel">Send NFT</h2>
          <button
            onClick={onClose}
            disabled={isSending}
            className="text-[var(--sw-muted)] hover:text-[var(--sw-ink)]"
            aria-label="Close"
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
            <label htmlFor="send-nft-recipient" className="sw-uplabel block mb-1.5">Recipient</label>
            <input
              id="send-nft-recipient"
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
                <label htmlFor="send-nft-qty" className="sw-uplabel block">Quantity</label>
                <button
                  onClick={() => setAmount(String(ownedQty))}
                  className="text-xs text-[var(--sw-accent)] hover:underline"
                >
                  Max ({ownedQty})
                </button>
              </div>
              <input
                id="send-nft-qty"
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
            <div role="alert" className="p-3 rounded-lg border border-[var(--sw-line)]">
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
    </Modal>
  );
}
