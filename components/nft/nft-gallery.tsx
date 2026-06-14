"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useWalletStore } from "@/store/wallet-store";
import {
  Images,
  RefreshCw,
  Plus,
  X,
  Search,
  Download,
  Loader2,
} from "lucide-react";
import { NftMedia } from "./nft-media";
import { NftDetailModal } from "./nft-detail-modal";
import {
  fetchNftsForOwner,
  fetchNftOnChain,
  isNftAutoDiscoverySupported,
  nftKey,
  type NftItem,
} from "@/lib/nft";

const MANUAL_KEY = (chainId: number) => `nfts_manual_${chainId}`;

export function NftGallery({ onReceive }: { onReceive?: () => void }) {
  const { address, rpcUrl, chainId, chainName } = useWalletStore();

  const [nfts, setNfts] = useState<NftItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoConfigured, setAutoConfigured] = useState(true);
  const [selected, setSelected] = useState<NftItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Manual add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [manualContract, setManualContract] = useState("");
  const [manualTokenId, setManualTokenId] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const requestId = useRef(0);

  const loadManual = useCallback((): NftItem[] => {
    try {
      const stored = localStorage.getItem(MANUAL_KEY(chainId));
      return stored ? (JSON.parse(stored) as NftItem[]) : [];
    } catch {
      return [];
    }
  }, [chainId]);

  const saveManual = useCallback(
    (items: NftItem[]) => {
      localStorage.setItem(MANUAL_KEY(chainId), JSON.stringify(items));
    },
    [chainId]
  );

  const loadNfts = useCallback(async () => {
    if (!address) return;
    const myRequest = ++requestId.current;
    setIsLoading(true);
    setError(null);

    const manual = loadManual();

    try {
      const { configured, nfts: discovered } = await fetchNftsForOwner(
        chainId,
        address
      );

      // A newer request superseded this one — discard.
      if (myRequest !== requestId.current) return;

      setAutoConfigured(configured && isNftAutoDiscoverySupported(chainId));

      // Merge discovered + manual, de-duped (discovered wins on richer metadata).
      const seen = new Set(discovered.map((n) => nftKey(n)));
      const merged = [...discovered, ...manual.filter((n) => !seen.has(nftKey(n)))];
      setNfts(merged);
    } catch (err: any) {
      if (myRequest !== requestId.current) return;
      console.error("[NFT Gallery] load error:", err);
      setError(err.message || "Failed to load NFTs");
      setNfts(manual);
    } finally {
      if (myRequest === requestId.current) setIsLoading(false);
    }
  }, [address, chainId, loadManual]);

  // Reload whenever the active wallet/chain changes (single unified chain control).
  useEffect(() => {
    loadNfts();
  }, [loadNfts]);

  async function handleManualAdd() {
    if (!address || !rpcUrl) return;
    if (!manualContract || !manualTokenId) {
      setAddError("Enter both a contract address and token ID");
      return;
    }
    setAddError(null);
    setIsAdding(true);
    try {
      const nft = await fetchNftOnChain(
        rpcUrl,
        manualContract.trim(),
        manualTokenId.trim(),
        address
      );

      const manual = loadManual();
      if (!manual.some((n) => nftKey(n) === nftKey(nft))) {
        saveManual([nft, ...manual]);
      }

      // Add to view if not already present.
      setNfts((prev) =>
        prev.some((n) => nftKey(n) === nftKey(nft)) ? prev : [nft, ...prev]
      );

      setManualContract("");
      setManualTokenId("");
      setShowAddForm(false);
    } catch (err: any) {
      setAddError(err.message || "Failed to add NFT");
    } finally {
      setIsAdding(false);
    }
  }

  function handleSent() {
    // After a successful transfer, drop it from any manual cache and refresh.
    if (selected) {
      const manual = loadManual().filter((n) => nftKey(n) !== nftKey(selected));
      saveManual(manual);
    }
    setSelected(null);
    loadNfts();
  }

  const filtered = searchQuery
    ? nfts.filter((n) => {
        const q = searchQuery.toLowerCase();
        return (
          n.name?.toLowerCase().includes(q) ||
          n.collectionName?.toLowerCase().includes(q) ||
          n.contractAddress.toLowerCase().includes(q)
        );
      })
    : nfts;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[var(--sw-line)]">
        <div className="flex items-center gap-2">
          <span className="sw-uplabel">Collectibles</span>
          {nfts.length > 0 && (
            <span className="text-xs text-[var(--sw-muted)] sw-num">{nfts.length}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowAddForm((s) => !s)}
            className="p-2 text-[var(--sw-muted)] hover:text-[var(--sw-ink)] transition-colors"
            title="Add NFT by contract"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={loadNfts}
            disabled={isLoading}
            className="p-2 text-[var(--sw-muted)] hover:text-[var(--sw-ink)] transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Manual add form */}
      {showAddForm && (
        <div className="mx-4 mb-3 mt-3 p-3 rounded-lg border border-[var(--sw-line)] space-y-3">
          <p className="text-xs text-[var(--sw-ink-soft)]">
            Add an NFT you own by contract address (ERC-721 or ERC-1155).
          </p>
          <input
            type="text"
            value={manualContract}
            onChange={(e) => setManualContract(e.target.value)}
            placeholder="Contract address (0x...)"
            className="sw-input w-full text-sm"
          />
          <input
            type="text"
            value={manualTokenId}
            onChange={(e) => setManualTokenId(e.target.value)}
            placeholder="Token ID"
            className="sw-input w-full text-sm"
          />
          {addError && <p className="text-xs text-[var(--sw-down)]">{addError}</p>}
          <button
            onClick={handleManualAdd}
            disabled={isAdding}
            className="sw-btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
          >
            {isAdding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Adding…
              </>
            ) : (
              "Add NFT"
            )}
          </button>
        </div>
      )}

      {/* Search (only when there are enough items) */}
      {nfts.length > 4 && (
        <div className="px-4 mb-3 mt-3">
          <div className="relative">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sw-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search collectibles"
              className="sw-input w-full pl-6 text-sm"
            />
          </div>
        </div>
      )}

      {/* Auto-discovery note */}
      {!autoConfigured && nfts.length === 0 && !isLoading && (
        <div className="mx-4 mb-3 mt-3 flex items-start gap-2.5 p-3 rounded-lg border border-[var(--sw-line)]">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--sw-accent)] flex-shrink-0" />
          <p className="text-xs text-[var(--sw-ink-soft)]">
            {isNftAutoDiscoverySupported(chainId)
              ? "Automatic NFT discovery isn't configured. Add an Alchemy API key to auto-load your gallery, or add NFTs manually above."
              : `Automatic NFT discovery isn't available on ${chainName}. Add NFTs manually by contract address above.`}
          </p>
        </div>
      )}

      {/* Body */}
      <div className="px-4 pb-4 pt-4">
        {isLoading && nfts.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-lg bg-[var(--sw-line-soft)] animate-pulse"
              />
            ))}
          </div>
        ) : error && nfts.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-[var(--sw-down)] mb-2">{error}</p>
            <button
              onClick={loadNfts}
              className="text-xs font-medium text-[var(--sw-accent)] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-lg bg-[var(--sw-line-soft)] flex items-center justify-center mb-3">
              <Images className="w-7 h-7 text-[var(--sw-muted)]" />
            </div>
            <p className="text-sm font-semibold text-[var(--sw-ink)] mb-1">
              {searchQuery ? "No matches" : "No collectibles yet"}
            </p>
            <p className="text-xs text-[var(--sw-muted)] mb-4 max-w-[15rem]">
              {searchQuery
                ? "Try a different search."
                : `NFTs you hold on ${chainName} will appear here.`}
            </p>
            {!searchQuery && onReceive && (
              <button
                onClick={onReceive}
                className="sw-btn-ghost py-3 px-4 text-sm flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                Receive NFT
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map((nft) => (
              <motion.button
                key={nftKey(nft)}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                onClick={() => setSelected(nft)}
                className="group text-left rounded-lg overflow-hidden border border-[var(--sw-line)] hover:border-[var(--sw-accent)] transition-colors"
              >
                <div className="relative">
                  <NftMedia nft={nft} className="w-full aspect-square" rounded="rounded-none" />
                  {nft.tokenType === "ERC1155" && nft.balance && parseInt(nft.balance, 10) > 1 && (
                    <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-sm text-[10px] font-bold sw-mono bg-[var(--sw-ink)] text-[var(--sw-paper)]">
                      ×{nft.balance}
                    </span>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-semibold text-[var(--sw-ink)] truncate">
                    {nft.name}
                  </p>
                  {nft.collectionName && (
                    <p className="text-[10px] text-[var(--sw-muted)] truncate">
                      {nft.collectionName}
                    </p>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <NftDetailModal
          nft={selected}
          onClose={() => setSelected(null)}
          onSent={handleSent}
        />
      )}
    </div>
  );
}
