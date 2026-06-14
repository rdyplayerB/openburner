"use client";

import { useState } from "react";
import { useWalletStore } from "@/store/wallet-store";
import { X, ExternalLink, Send, Copy, CheckCircle } from "lucide-react";
import { NftMedia } from "./nft-media";
import { SendNft } from "./send-nft";
import { getMarketplaceUrl, type NftItem } from "@/lib/nft";

export function NftDetailModal({
  nft,
  onClose,
  onSent,
}: {
  nft: NftItem;
  onClose: () => void;
  onSent: () => void;
}) {
  const { chainId } = useWalletStore();
  const [showSend, setShowSend] = useState(false);
  const [copied, setCopied] = useState(false);

  const { url: marketUrl, label: marketLabel } = getMarketplaceUrl(
    chainId,
    nft.contractAddress,
    nft.tokenId
  );

  function copyContract() {
    navigator.clipboard.writeText(nft.contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (showSend) {
    return (
      <SendNft
        nft={nft}
        onClose={() => setShowSend(false)}
        onSuccess={() => {
          setShowSend(false);
          onSent();
        }}
      />
    );
  }

  return (
    <div
      className="modal-overlay bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 z-50"
      onClick={onClose}
    >
      <div
        className="sw-surface rounded-xl border border-[var(--sw-line)] max-w-sm sm:max-w-md w-full mx-2 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 sw-surface border-b border-[var(--sw-line)]">
          <h2 className="text-lg font-bold text-[var(--sw-ink)] truncate pr-2">
            {nft.name}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--sw-muted)] hover:text-[var(--sw-ink)] flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Media */}
          <NftMedia
            nft={nft}
            preferAnimation
            className="w-full aspect-square"
            rounded="rounded-lg"
          />

          {/* Collection + type */}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              {nft.collectionName && (
                <p className="text-sm font-semibold text-[var(--sw-ink)] truncate">
                  {nft.collectionName}
                </p>
              )}
              <p className="text-xs text-[var(--sw-muted)] sw-mono">Token #{nft.tokenId}</p>
            </div>
            <span className="flex-shrink-0 px-2 py-1 rounded-sm text-[11px] font-medium sw-mono border border-[var(--sw-line)] text-[var(--sw-ink-soft)]">
              {nft.tokenType}
              {nft.tokenType === "ERC1155" && nft.balance ? ` · ${nft.balance}` : ""}
            </span>
          </div>

          {/* Description */}
          {nft.description && (
            <div>
              <p className="sw-uplabel mb-1">Description</p>
              <p className="text-sm text-[var(--sw-ink-soft)] whitespace-pre-line break-words">
                {nft.description}
              </p>
            </div>
          )}

          {/* Attributes / traits */}
          {nft.attributes && nft.attributes.length > 0 && (
            <div>
              <p className="sw-uplabel mb-2">Traits</p>
              <div className="grid grid-cols-2 gap-2">
                {nft.attributes
                  .filter((a) => a && (a.trait_type || a.value !== undefined))
                  .map((attr, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-[var(--sw-line)] px-3 py-2"
                    >
                      {attr.trait_type && (
                        <p className="text-[10px] font-medium uppercase tracking-wide truncate text-[var(--sw-accent)]">
                          {attr.trait_type}
                        </p>
                      )}
                      <p className="text-xs font-semibold text-[var(--sw-ink)] truncate sw-mono">
                        {String(attr.value ?? "—")}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Contract */}
          <div>
            <p className="sw-uplabel mb-1">Contract</p>
            <button
              onClick={copyContract}
              className="flex items-center gap-2 text-xs sw-mono text-[var(--sw-ink-soft)] hover:text-[var(--sw-ink)] transition-colors"
            >
              <span className="break-all text-left">{nft.contractAddress}</span>
              {copied ? (
                <CheckCircle className="w-3.5 h-3.5 text-[var(--sw-up)] flex-shrink-0" />
              ) : (
                <Copy className="w-3.5 h-3.5 flex-shrink-0" />
              )}
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => setShowSend(true)}
              className="sw-btn-primary flex-1 py-3 text-sm flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
            <a
              href={marketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="sw-btn-ghost flex-1 py-3 text-sm flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              {marketLabel}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
