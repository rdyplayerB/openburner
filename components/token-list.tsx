"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import { useWalletStore } from "@/store/wallet-store";
import { Plus, Send, RefreshCw, X, Trash2, Search, SortAsc, AlertTriangle } from "lucide-react";
import { getTokenListForChain } from "@/lib/token-lists";
import { batchGetBalances, batchGetTokenMetadata } from "@/lib/multicall";
import { getTokenPricesWithAddresses, clearPriceCache, fetchTokenDataByContract } from "@/lib/price-oracle";
import { batchGetTokenImages, getCachedTokenImage, preloadCommonTokenImages } from "@/lib/token-icons";
import { formatTokenBalance } from "@/lib/format-utils";
import { getAppConfig } from "@/lib/config/environment";
import { getProvider } from "@/lib/provider";
import { getNativeName, getNativeSymbol } from "@/lib/supported-chains";
import { friendlyTxError } from "@/lib/tx-errors";
import { log } from "@/lib/log";
import { Modal } from "./common/modal";

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  usdPrice?: number;
}

type PriceMap = { [symbol: string]: number };
type ImageMap = { [symbol: string]: string };

export interface TokenListStatus {
  loading: boolean;
  error: string | null;
  /** True once balances for the current chain/address are on screen (fresh or cached). */
  hasData: boolean;
}

// ─── Per chain:address cache (module scope: survives remounts / tab and chain switches) ──
interface CacheEntry {
  tokens: Token[];
  prices: PriceMap;
  images: ImageMap;
  loadedAt: number;
}
const listCache = new Map<string, CacheEntry>();
const REVALIDATE_AFTER_MS = 60_000;

function cacheKey(chainId: number, address: string) {
  return `${chainId}:${address.toLowerCase()}`;
}

function readStoredTokenAddresses(chainId: number): string[] {
  try {
    const stored = localStorage.getItem(`tokens_${chainId}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function writeStoredTokenAddresses(chainId: number, addresses: string[]) {
  try {
    localStorage.setItem(`tokens_${chainId}`, JSON.stringify(addresses));
  } catch {
    /* storage unavailable */
  }
}

interface StoredMeta {
  symbol: string;
  name: string;
  decimals: number;
}

function readStoredMetadata(chainId: number, address: string): StoredMeta | null {
  try {
    const raw = localStorage.getItem(`token_metadata_${chainId}_${address.toLowerCase()}`);
    if (!raw) return null;
    const meta = JSON.parse(raw);
    if (!meta?.symbol || String(meta.symbol).startsWith("TOKEN_")) return null;
    return { symbol: meta.symbol, name: meta.name || meta.symbol, decimals: Number(meta.decimals ?? 18) };
  } catch {
    return null;
  }
}

function writeStoredMetadata(chainId: number, address: string, meta: StoredMeta) {
  try {
    localStorage.setItem(
      `token_metadata_${chainId}_${address.toLowerCase()}`,
      JSON.stringify({ ...meta, timestamp: Date.now() })
    );
  } catch {
    /* storage unavailable */
  }
}

/** Fetch balances (native + ERC-20, one multicall) and build the visible token list. */
async function fetchTokenBalances(chainId: number, rpcUrl: string, address: string): Promise<Token[]> {
  const provider = getProvider(chainId, rpcUrl);
  const popular = getTokenListForChain(chainId);
  const popularSet = new Set(popular.map((t) => t.address.toLowerCase()));
  const custom = readStoredTokenAddresses(chainId).filter((a) => !popularSet.has(a.toLowerCase()));

  const { native, tokens: balances } = await batchGetBalances(
    provider,
    [...popular.map((t) => t.address), ...custom],
    address,
    { includeNative: true }
  );
  if (native === undefined) throw new Error("Couldn't read your balance from the network.");

  const list: Token[] = [
    {
      address: "native",
      symbol: getNativeSymbol(chainId),
      name: getNativeName(chainId),
      decimals: 18,
      balance: ethers.formatEther(native),
    },
  ];

  for (const info of popular) {
    const bal = balances.get(info.address.toLowerCase());
    if (bal && bal > 0n) {
      list.push({ ...info, balance: ethers.formatUnits(bal, info.decimals) });
    }
  }

  // Custom tokens: use remembered metadata; only hit the chain for unknown ones.
  const metas = new Map<string, StoredMeta>();
  const unknown: string[] = [];
  for (const addr of custom) {
    const m = readStoredMetadata(chainId, addr);
    if (m) metas.set(addr.toLowerCase(), m);
    else unknown.push(addr);
  }
  if (unknown.length > 0) {
    try {
      const fetched = await batchGetTokenMetadata(provider, unknown);
      fetched.forEach((m, addr) => {
        const meta = { symbol: m.symbol, name: m.name, decimals: m.decimals };
        metas.set(addr, meta);
        writeStoredMetadata(chainId, addr, meta);
      });
    } catch (err) {
      log.warn("[tokens] custom token metadata failed:", (err as Error)?.message);
    }
  }
  for (const addr of custom) {
    const bal = balances.get(addr.toLowerCase());
    const meta = metas.get(addr.toLowerCase()) ?? {
      symbol: `TOKEN_${addr.slice(2, 8).toUpperCase()}`,
      name: `Custom Token ${addr.slice(0, 6)}...${addr.slice(-4)}`,
      decimals: 18,
    };
    // Custom tokens are listed even at zero balance (so they can be bought/swapped into).
    list.push({ address: addr, ...meta, balance: bal ? ethers.formatUnits(bal, meta.decimals) : "0" });
  }
  return list;
}

function TokenIcon({ symbol, url }: { symbol: string; url?: string }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);
  if (url && !broken) {
    return (
      <div className="w-8 h-8 rounded-lg overflow-hidden border border-[var(--sw-line)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          width={32}
          height={32}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
          onError={() => setBroken(true)}
        />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 sw-mark rounded-lg flex items-center justify-center" aria-hidden="true">
      <span className="text-sm font-bold">{symbol[0]}</span>
    </div>
  );
}

interface TokenListProps {
  onSendToken: (token: Token) => void;
  onSwapToken?: (token: Token) => void;
  /** Bump to force a fresh reload of balances + prices (e.g. after a send/swap). */
  refreshSignal?: number;
  /** Called whenever tokens, icons or prices change (balances first; icons/prices as they arrive). */
  onTokensLoaded?: (tokens: Token[], images: ImageMap, prices: PriceMap) => void;
  onStatusChange?: (status: TokenListStatus) => void;
  onTokenRemoved?: (tokenAddress: string) => void;
}

function TokenListImpl({
  onSendToken,
  refreshSignal = 0,
  onTokensLoaded,
  onStatusChange,
  onTokenRemoved,
}: TokenListProps) {
  const { pricingEnabled } = getAppConfig();
  const address = useWalletStore((s) => s.address);
  const rpcUrl = useWalletStore((s) => s.rpcUrl);
  const chainId = useWalletStore((s) => s.chainId);

  const [tokens, setTokens] = useState<Token[]>([]);
  const [tokenPrices, setTokenPrices] = useState<PriceMap>({});
  const [tokenImages, setTokenImages] = useState<ImageMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animateRows, setAnimateRows] = useState(true);

  const [newTokenAddress, setNewTokenAddress] = useState("");
  const [showAddToken, setShowAddToken] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"alphabetical" | "value">("value");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [customVersion, setCustomVersion] = useState(0);

  const requestId = useRef(0);
  const onTokensLoadedRef = useRef(onTokensLoaded);
  onTokensLoadedRef.current = onTokensLoaded;
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  useEffect(() => {
    preloadCommonTokenImages();
  }, []);

  // Report to the parent: balances as soon as they land, then icons/prices as they arrive.
  useEffect(() => {
    if (hasData) onTokensLoadedRef.current?.(tokens, tokenImages, tokenPrices);
  }, [tokens, tokenImages, tokenPrices, hasData]);

  useEffect(() => {
    onStatusChangeRef.current?.({ loading: isLoading, error, hasData });
  }, [isLoading, error, hasData]);

  const loadPrices = useCallback(
    (list: Token[], key: string, req: number, force: boolean) => {
      if (!getAppConfig().pricingEnabled) return;
      getTokenPricesWithAddresses(
        list.map((t) => ({ symbol: t.symbol, address: t.address, chainId })),
        { force }
      )
        .then((prices) => {
          if (req !== requestId.current) return;
          setTokenPrices(prices);
          const entry = listCache.get(key);
          if (entry) entry.prices = prices;
        })
        .catch((err) => log.warn("[tokens] prices failed:", err?.message));
    },
    [chainId]
  );

  const loadImages = useCallback(
    (list: Token[], key: string, req: number) => {
      const known: ImageMap = {};
      const missing: Token[] = [];
      for (const t of list) {
        const url = getCachedTokenImage(t.symbol, t.address, chainId);
        if (url) known[t.symbol.toUpperCase()] = url;
        else missing.push(t);
      }
      setTokenImages((prev) => ({ ...prev, ...known }));
      if (missing.length === 0) {
        const entry = listCache.get(key);
        if (entry) entry.images = { ...entry.images, ...known };
        return;
      }
      batchGetTokenImages(missing.map((t) => ({ symbol: t.symbol, address: t.address, chainId })))
        .then((found) => {
          if (req !== requestId.current) return;
          const fetched: ImageMap = {};
          found.forEach((url, sym) => (fetched[sym] = url));
          setTokenImages((prev) => {
            const next = { ...prev, ...known, ...fetched };
            const entry = listCache.get(key);
            if (entry) entry.images = next;
            return next;
          });
        })
        .catch(() => {});
    },
    [chainId]
  );

  const loadTokens = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (!address || !rpcUrl) return;
      const key = cacheKey(chainId, address);
      const req = ++requestId.current;
      setIsLoading(true);
      setError(null);
      try {
        const list = await fetchTokenBalances(chainId, rpcUrl, address);
        if (req !== requestId.current) return;
        const prev = listCache.get(key);
        listCache.set(key, {
          tokens: list,
          prices: prev?.prices ?? {},
          images: prev?.images ?? {},
          loadedAt: Date.now(),
        });
        setTokens(list);
        setHasData(true);
        setIsLoading(false);
        loadPrices(list, key, req, force);
        loadImages(list, key, req);
      } catch (err: any) {
        if (req !== requestId.current) return;
        log.warn("[tokens] load failed:", err?.message);
        // Keep whatever is on screen (last known values) and surface the error.
        setError(friendlyTxError(err));
        setIsLoading(false);
      }
    },
    [address, rpcUrl, chainId, loadPrices, loadImages]
  );

  // Chain / account change: paint cached data instantly, revalidate if stale.
  useEffect(() => {
    if (!address || !rpcUrl) return;
    const cached = listCache.get(cacheKey(chainId, address));
    requestId.current++; // drop any in-flight load for the previous chain/account
    setError(null);
    setSearchQuery("");
    if (cached) {
      setTokens(cached.tokens);
      setTokenPrices(cached.prices);
      setTokenImages(cached.images);
      setHasData(true);
      setAnimateRows(false);
      setIsLoading(false);
      if (Date.now() - cached.loadedAt > REVALIDATE_AFTER_MS) loadTokens();
    } else {
      setTokens([]);
      setTokenPrices({});
      setTokenImages({});
      setHasData(false);
      setAnimateRows(true);
      loadTokens();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, rpcUrl, chainId]);

  // Parent-requested refresh (after send/swap, manual refresh in the header).
  const firstSignal = useRef(refreshSignal);
  useEffect(() => {
    if (refreshSignal === firstSignal.current) return;
    loadTokens({ force: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  // Rows animate in only on the first load for a chain, never on refresh.
  useEffect(() => {
    if (!animateRows || !hasData) return;
    const t = setTimeout(() => setAnimateRows(false), 800);
    return () => clearTimeout(t);
  }, [animateRows, hasData]);

  function handleManualRefresh() {
    clearPriceCache();
    loadTokens({ force: true });
  }

  const customSet = useMemo(
    () => new Set(readStoredTokenAddresses(chainId).map((a) => a.toLowerCase())),
    // customVersion bumps when the user adds/removes a token
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chainId, customVersion, tokens]
  );
  const popularSet = useMemo(
    () => new Set(getTokenListForChain(chainId).map((t) => t.address.toLowerCase())),
    [chainId]
  );

  const visibleTokens = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = q
      ? tokens.filter(
          (t) =>
            t.symbol.toLowerCase().includes(q) ||
            t.name.toLowerCase().includes(q) ||
            t.address.toLowerCase().includes(q)
        )
      : tokens;
    const value = (t: Token) => parseFloat(t.balance) * (tokenPrices[t.symbol] || 0);
    return [...filtered].sort((a, b) => {
      // Native token always first.
      if (a.address === "native") return -1;
      if (b.address === "native") return 1;
      if (sortBy === "alphabetical") {
        const c = a.symbol.localeCompare(b.symbol);
        return sortDirection === "asc" ? c : -c;
      }
      const av = value(a);
      const bv = value(b);
      if (av > 0 && bv > 0) return sortDirection === "desc" ? bv - av : av - bv;
      if (av === 0 && bv === 0) return a.symbol.localeCompare(b.symbol);
      return bv - av;
    });
  }, [tokens, tokenPrices, searchQuery, sortBy, sortDirection]);

  function removeToken(tokenAddress: string) {
    if (dontShowAgain) {
      try {
        localStorage.setItem("hideRemoveTokenConfirmation", "true");
      } catch {
        /* ignore */
      }
    }
    const updated = readStoredTokenAddresses(chainId).filter(
      (a) => a.toLowerCase() !== tokenAddress.toLowerCase()
    );
    writeStoredTokenAddresses(chainId, updated);
    try {
      localStorage.removeItem(`token_metadata_${chainId}_${tokenAddress.toLowerCase()}`);
    } catch {
      /* ignore */
    }
    const next = tokens.filter((t) => t.address.toLowerCase() !== tokenAddress.toLowerCase());
    setTokens(next);
    if (address) {
      const entry = listCache.get(cacheKey(chainId, address));
      if (entry) entry.tokens = next;
    }
    setCustomVersion((v) => v + 1);
    onTokenRemoved?.(tokenAddress);
    setShowRemoveConfirm(null);
    setDontShowAgain(false);
  }

  function handleRemoveTokenClick(tokenAddress: string) {
    let hide = false;
    try {
      hide = localStorage.getItem("hideRemoveTokenConfirmation") === "true";
    } catch {
      /* ignore */
    }
    if (hide) removeToken(tokenAddress);
    else setShowRemoveConfirm(tokenAddress);
  }

  async function handleAddToken() {
    const tokenAddr = newTokenAddress.trim();
    if (!tokenAddr || !address || !rpcUrl) return;
    if (!ethers.isAddress(tokenAddr)) {
      setAddError("That isn't a valid contract address.");
      return;
    }
    setAddError(null);
    setIsAdding(true);
    try {
      const provider = getProvider(chainId, rpcUrl);
      const [{ tokens: bals }, metas] = await Promise.all([
        batchGetBalances(provider, [tokenAddr], address),
        batchGetTokenMetadata(provider, [tokenAddr]),
      ]);
      let meta: StoredMeta | null = null;
      const onChain = metas.get(tokenAddr.toLowerCase());
      if (onChain) meta = { symbol: onChain.symbol, name: onChain.name, decimals: onChain.decimals };
      if (!meta) {
        const cg = await fetchTokenDataByContract(tokenAddr, chainId);
        if (cg) meta = { symbol: cg.symbol, name: cg.name, decimals: cg.decimals };
      }
      const bal = bals.get(tokenAddr.toLowerCase());
      if (!meta || bal === undefined) {
        throw new Error("This contract doesn't look like an ERC-20 token on this network.");
      }

      const stored = readStoredTokenAddresses(chainId);
      if (!stored.includes(tokenAddr.toLowerCase())) {
        writeStoredTokenAddresses(chainId, [...stored, tokenAddr.toLowerCase()]);
      }
      writeStoredMetadata(chainId, tokenAddr, meta);

      if (!tokens.some((t) => t.address.toLowerCase() === tokenAddr.toLowerCase())) {
        const next = [...tokens, { address: tokenAddr, ...meta, balance: ethers.formatUnits(bal, meta.decimals) }];
        setTokens(next);
        const entry = listCache.get(cacheKey(chainId, address));
        if (entry) entry.tokens = next;
        const req = requestId.current;
        loadImages(next, cacheKey(chainId, address), req);
        loadPrices(next, cacheKey(chainId, address), req, false);
      }
      setCustomVersion((v) => v + 1);
      setNewTokenAddress("");
      setShowAddToken(false);
    } catch (err: any) {
      setAddError(err?.message?.startsWith("This contract") ? err.message : friendlyTxError(err));
    } finally {
      setIsAdding(false);
    }
  }

  const showSkeleton = !hasData && (isLoading || !error);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--sw-line)]">
        <h2 className="sw-seclabel !border-b-0 !pb-0">Assets</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="text-[var(--sw-muted)] hover:text-[var(--sw-ink)] transition-colors disabled:opacity-50"
            aria-label="Refresh balances and prices"
            title="Refresh balances & prices"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
          </button>
          <button
            onClick={() => {
              setShowAddToken(!showAddToken);
              setAddError(null);
            }}
            aria-expanded={showAddToken}
            className="text-xs sw-accent hover:opacity-80 font-semibold flex items-center gap-1 transition-opacity group"
          >
            {showAddToken ? (
              <>
                <X className="w-3.5 h-3.5" aria-hidden="true" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-300" aria-hidden="true" />
                Add token
              </>
            )}
          </button>
        </div>
      </div>

      {/* RPC error while we still have last-known values on screen */}
      {error && hasData && (
        <div
          role="alert"
          className="mb-3 flex items-start gap-2.5 rounded-lg border border-[var(--sw-down)]/40 bg-[color-mix(in_srgb,var(--sw-down)_8%,transparent)] px-3 py-2.5"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--sw-down)]" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[var(--sw-ink)]">Couldn&apos;t refresh balances</p>
            <p className="text-[11px] text-[var(--sw-muted)] leading-relaxed">{error} Showing last known values.</p>
          </div>
          <button
            onClick={() => loadTokens({ force: true })}
            className="text-xs font-semibold text-[var(--sw-accent)] hover:opacity-80 flex-shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search and Sort Controls */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sw-muted)]" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, symbol, or address"
            aria-label="Search tokens"
            className="sw-input w-full pl-6 pr-2 py-2 text-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="sw-uplabel" aria-hidden="true">Sort</span>
          <div className="flex gap-3" role="group" aria-label="Sort tokens">
            <button
              onClick={() => {
                if (sortBy === "alphabetical") setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                else {
                  setSortBy("alphabetical");
                  setSortDirection("asc");
                }
              }}
              aria-pressed={sortBy === "alphabetical"}
              className={`flex items-center gap-1 text-xs font-semibold transition-colors ${
                sortBy === "alphabetical" ? "sw-accent" : "text-[var(--sw-muted)] hover:text-[var(--sw-ink)]"
              }`}
            >
              <SortAsc
                className={`w-3 h-3 ${sortBy === "alphabetical" && sortDirection === "desc" ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
              {sortBy === "alphabetical" && sortDirection === "desc" ? "Z-A" : "A-Z"}
            </button>
            <button
              onClick={() => {
                if (sortBy === "value") setSortDirection(sortDirection === "desc" ? "asc" : "desc");
                else {
                  setSortBy("value");
                  setSortDirection("desc");
                }
              }}
              aria-pressed={sortBy === "value"}
              className={`flex items-center gap-1 text-xs font-semibold transition-colors ${
                sortBy === "value" ? "sw-accent" : "text-[var(--sw-muted)] hover:text-[var(--sw-ink)]"
              }`}
            >
              <SortAsc
                className={`w-3 h-3 ${sortBy === "value" && sortDirection === "asc" ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
              Value
            </button>
          </div>
        </div>
      </div>

      {showAddToken && (
        <div className="mb-3 p-4 sw-surface rounded-xl border border-[var(--sw-line)]">
          <label htmlFor="add-token-address" className="block sw-uplabel mb-2">
            Token contract address
          </label>
          <input
            id="add-token-address"
            type="text"
            value={newTokenAddress}
            onChange={(e) => setNewTokenAddress(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddToken();
            }}
            placeholder="0x..."
            autoComplete="off"
            spellCheck={false}
            className="sw-input sw-mono w-full px-0 py-2 text-sm mb-3"
          />
          {addError && (
            <p role="alert" className="text-xs text-[var(--sw-down)] mb-3 font-medium">
              {addError}
            </p>
          )}
          <button
            onClick={handleAddToken}
            disabled={!newTokenAddress || isAdding}
            className="sw-btn-primary w-full text-sm py-2.5 px-3"
          >
            {isAdding ? "Adding..." : "Add token"}
          </button>
        </div>
      )}

      {showSkeleton ? (
        <div className="sw-list" aria-busy="true" aria-label="Loading assets">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 py-3 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-[var(--sw-line-soft)] flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-20 rounded bg-[var(--sw-line-soft)]" />
                <div className="h-2.5 w-28 rounded bg-[var(--sw-line-soft)]" />
              </div>
              <div className="h-3 w-16 rounded bg-[var(--sw-line-soft)]" />
            </div>
          ))}
        </div>
      ) : !hasData && error ? (
        <div className="text-center py-12" role="alert">
          <div className="w-12 h-12 mx-auto mb-4 rounded-lg border border-[var(--sw-line)] flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-[var(--sw-down)]" aria-hidden="true" />
          </div>
          <p className="text-[var(--sw-ink)] text-sm font-semibold mb-1">Couldn&apos;t load your assets</p>
          <p className="text-[var(--sw-muted)] text-xs mb-4 max-w-xs mx-auto">{error}</p>
          <button onClick={() => loadTokens({ force: true })} className="sw-btn-ghost py-2.5 px-5 text-sm">
            Retry
          </button>
        </div>
      ) : tokens.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 mx-auto mb-4 rounded-lg border border-[var(--sw-line)] flex items-center justify-center">
            <Plus className="w-6 h-6 text-[var(--sw-muted)]" aria-hidden="true" />
          </div>
          <p className="text-[var(--sw-ink)] text-sm font-semibold mb-1">No assets found</p>
          <p className="text-[var(--sw-muted)] text-xs">Popular tokens are auto-detected</p>
        </div>
      ) : (
        <ul className="sw-list">
          {visibleTokens.map((token, index) => {
            const isNative = token.address === "native";
            const lower = token.address.toLowerCase();
            const isCustomToken = !isNative && customSet.has(lower) && !popularSet.has(lower);
            const hasBalance = parseFloat(token.balance) > 0;
            const price = tokenPrices[token.symbol];

            return (
              <li
                key={token.address}
                className={`flex items-center justify-between py-3 transition-colors hover:bg-[color-mix(in_srgb,var(--sw-ink)_4%,transparent)] group ${
                  animateRows ? "ob-rise-in" : ""
                }`}
                style={animateRows ? { animationDelay: `${Math.min(index, 10) * 40}ms` } : undefined}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    <TokenIcon symbol={token.symbol} url={tokenImages[token.symbol.toUpperCase()]} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-[var(--sw-ink)] token-opacity">{token.symbol}</p>
                      {isCustomToken && <span className="sw-uplabel">Custom</span>}
                    </div>
                    <p className="text-xs text-[var(--sw-muted)] truncate leading-tight">{token.name}</p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    {hasBalance && (
                      <>
                        <p className="text-sm font-semibold text-[var(--sw-ink)] sw-num balance-number">
                          {formatTokenBalance(token.balance, token.symbol === "USDC" || token.symbol === "USDT")}
                        </p>
                        <p className="text-xs text-[var(--sw-muted)] sw-num leading-tight">
                          {pricingEnabled
                            ? price !== undefined
                              ? `≈ $${(parseFloat(token.balance) * price).toFixed(2)}`
                              : "—"
                            : "-"}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Row actions: on hover/focus (pointer) and always on touch screens */}
                <div className="ml-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity flex items-center gap-1">
                  {hasBalance && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSendToken(token);
                      }}
                      className="p-2 sw-accent hover:bg-[color-mix(in_srgb,var(--sw-accent)_12%,transparent)] rounded-lg transition-colors"
                      title="Send"
                      aria-label={`Send ${token.symbol}`}
                    >
                      <Send className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                  {isCustomToken ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveTokenClick(token.address);
                      }}
                      className="p-2 text-[var(--sw-down)] hover:bg-[color-mix(in_srgb,var(--sw-down)_12%,transparent)] rounded-lg transition-colors"
                      title="Remove from wallet"
                      aria-label={`Remove ${token.symbol} from wallet`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  ) : (
                    <div className="w-8 h-8" />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showRemoveConfirm && (
        <Modal onClose={() => setShowRemoveConfirm(null)} labelledBy="remove-token-title" className="sw-surface w-full max-w-sm rounded-xl border border-[var(--sw-line)] overflow-hidden p-6">
          <h3 id="remove-token-title" className="text-lg font-bold text-[var(--sw-ink)] mb-2">
            Remove token
          </h3>
          <p className="text-sm text-[var(--sw-ink-soft)] mb-4">Remove this token from your wallet?</p>
          <div className="flex items-center gap-2 mb-6">
            <input
              type="checkbox"
              id="dontShowAgain"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 accent-[var(--sw-accent)] rounded"
            />
            <label htmlFor="dontShowAgain" className="text-sm text-[var(--sw-muted)] cursor-pointer">
              Don&apos;t show this again
            </label>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowRemoveConfirm(null)} className="sw-btn-ghost flex-1 text-sm py-2.5 px-4">
              Cancel
            </button>
            <button
              onClick={() => removeToken(showRemoveConfirm)}
              className="flex-1 text-sm font-semibold py-2.5 px-4 rounded-[3px] uppercase tracking-[0.05em] text-white bg-[var(--sw-down)] hover:brightness-105 transition-all"
            >
              Remove
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export const TokenList = memo(TokenListImpl);
