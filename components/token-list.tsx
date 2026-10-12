"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import { useWalletStore } from "@/store/wallet-store";
import { Plus, RefreshCw, X, Trash2, Search, ArrowDownUp, AlertTriangle, ArrowUpRight, Repeat2, Copy, Check, ExternalLink } from "lucide-react";
import { getTokenListForChain } from "@/lib/token-lists";
import { batchGetBalances, batchGetTokenMetadata } from "@/lib/multicall";
import { getTokenPricesWithAddresses, clearPriceCache, fetchTokenDataByContract } from "@/lib/price-oracle";
import { batchGetTokenImages, getCachedTokenImage, preloadCommonTokenImages } from "@/lib/token-icons";
import { formatTokenBalance, formatUsd } from "@/lib/format-utils";
import { getAppConfig } from "@/lib/config/environment";
import { getProvider } from "@/lib/provider";
import { getExplorerAddressUrl, getNativeName, getNativeSymbol, isSwapSupported } from "@/lib/supported-chains";
import { friendlyTxError } from "@/lib/tx-errors";
import { log } from "@/lib/log";
import { Modal } from "./common/modal";
import { TokenIcon } from "./common/token-icon";
import { AddressText } from "./common/address-text";
import { showToast } from "@/store/toast-store";

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

/** Forget cached balances (story viewer, tests). */
export function resetTokenListCache() {
  listCache.clear();
}
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
  onSwapToken,
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
  const [openToken, setOpenToken] = useState<Token | null>(null);

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
  const stable = (sym: string) => sym === "USDC" || sym === "USDT" || sym === "DAI";

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <div className="sw-field flex items-center gap-2 px-3 py-2 flex-1 min-w-0 !rounded-full">
          <Search className="w-4 h-4 text-[var(--sw-muted)] flex-shrink-0" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tokens"
            aria-label="Search tokens by name, symbol or address"
            className="sw-field-input text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-[var(--sw-muted)] hover:text-[var(--sw-ink)]" aria-label="Clear search">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => {
            if (sortBy === "value") {
              setSortBy("alphabetical");
              setSortDirection("asc");
            } else {
              setSortBy("value");
              setSortDirection("desc");
            }
          }}
          className="sw-icon-btn px-2.5 py-2 text-xs font-semibold gap-1.5"
          aria-label={`Sorted by ${sortBy === "value" ? "value" : "name"}. Change sort`}
          title={sortBy === "value" ? "Sorted by value" : "Sorted by name"}
        >
          <ArrowDownUp className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">{sortBy === "value" ? "Value" : "A–Z"}</span>
        </button>
        <button
          onClick={handleManualRefresh}
          disabled={isLoading}
          className="sw-icon-btn p-2 disabled:opacity-50"
          aria-label="Refresh balances and prices"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
        </button>
        <button
          onClick={() => {
            setShowAddToken(!showAddToken);
            setAddError(null);
          }}
          aria-expanded={showAddToken}
          className="sw-icon-btn p-2"
          aria-label={showAddToken ? "Cancel adding a token" : "Add a token"}
          title="Add a token"
        >
          {showAddToken ? <X className="w-4 h-4" aria-hidden="true" /> : <Plus className="w-4 h-4" aria-hidden="true" />}
        </button>
      </div>

      {showAddToken && (
        <div className="mx-4 mb-2 mt-1 ob-fade-in">
          <label htmlFor="add-token-address" className="sw-label block mb-1.5">
            Token contract address
          </label>
          <div className="flex gap-2">
            <div className="sw-field px-3 py-2.5 flex-1 min-w-0">
              <input
                id="add-token-address"
                type="text"
                value={newTokenAddress}
                onChange={(e) => setNewTokenAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddToken();
                }}
                placeholder="0x…"
                autoComplete="off"
                spellCheck={false}
                autoFocus
                className="sw-field-input sw-mono text-sm"
              />
            </div>
            <button onClick={handleAddToken} disabled={!newTokenAddress || isAdding} className="sw-btn-primary px-4 text-sm">
              {isAdding ? "Adding…" : "Add"}
            </button>
          </div>
          {addError && (
            <p role="alert" className="text-xs text-[var(--sw-down)] mt-2">
              {addError}
            </p>
          )}
        </div>
      )}

      {/* RPC error while we still have last-known values on screen */}
      {error && hasData && (
        <div role="alert" className="sw-callout sw-callout-danger mx-4 mb-2 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--sw-down)]" aria-hidden="true" />
          <p className="flex-1 min-w-0">
            <span className="font-semibold">Couldn&apos;t refresh balances.</span> {error} Showing last known values.
          </p>
          <button onClick={() => loadTokens({ force: true })} className="sw-link flex-shrink-0">
            Retry
          </button>
        </div>
      )}

      {showSkeleton ? (
        <div className="px-4 pb-3" aria-busy="true" aria-label="Loading assets">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <div className="w-9 h-9 rounded-full sw-skeleton flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-20 sw-skeleton" />
                <div className="h-2.5 w-28 sw-skeleton" />
              </div>
              <div className="space-y-2 flex flex-col items-end">
                <div className="h-3 w-16 sw-skeleton" />
                <div className="h-2.5 w-10 sw-skeleton" />
              </div>
            </div>
          ))}
        </div>
      ) : !hasData && error ? (
        <div className="text-center px-6 py-14" role="alert">
          <span className="mx-auto mb-4 w-12 h-12 rounded-full bg-[var(--sw-down-bg)] flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-[var(--sw-down)]" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold text-[var(--sw-ink)]">Couldn&apos;t load your assets</p>
          <p className="text-sm text-[var(--sw-muted)] mt-1 mb-4 max-w-xs mx-auto">{error}</p>
          <button onClick={() => loadTokens({ force: true })} className="sw-btn-ghost py-2.5 px-5 text-sm">
            Try again
          </button>
        </div>
      ) : visibleTokens.length === 0 ? (
        <div className="text-center px-6 py-14">
          <p className="text-sm font-semibold text-[var(--sw-ink)]">{searchQuery ? "No matching tokens" : "No assets yet"}</p>
          <p className="text-sm text-[var(--sw-muted)] mt-1">
            {searchQuery ? "Try a name, symbol or contract address." : "Popular tokens show up here automatically."}
          </p>
        </div>
      ) : (
        <ul className="px-2 pb-2">
          {visibleTokens.map((token, index) => {
            const isNative = token.address === "native";
            const lower = token.address.toLowerCase();
            const isCustomToken = !isNative && customSet.has(lower) && !popularSet.has(lower);
            const price = tokenPrices[token.symbol];
            const amount = parseFloat(token.balance);
            const usd = pricingEnabled && price !== undefined ? amount * price : null;
            const balanceText = formatTokenBalance(token.balance, stable(token.symbol));

            return (
              <li
                key={token.address}
                className={animateRows ? "ob-rise-in" : ""}
                style={animateRows ? { animationDelay: `${Math.min(index, 10) * 40}ms` } : undefined}
              >
                <button
                  onClick={() => setOpenToken(token)}
                  className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl text-left transition-colors hover:bg-[var(--sw-fill)] focus-visible:bg-[var(--sw-fill)]"
                  aria-label={`${token.name}: ${balanceText} ${token.symbol}${usd !== null ? `, ${formatUsd(usd)}` : ""}`}
                >
                  <TokenIcon symbol={token.symbol} url={tokenImages[token.symbol.toUpperCase()]} size="md" />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[15px] font-semibold text-[var(--sw-ink)] truncate">{token.name}</span>
                      {isCustomToken && (
                        <span className="text-[10px] font-semibold px-1.5 py-px rounded-full bg-[var(--sw-fill-strong)] text-[var(--sw-ink-soft)]">Custom</span>
                      )}
                    </span>
                    <span className="block text-xs text-[var(--sw-muted)] truncate">
                      {usd !== null || !pricingEnabled ? token.symbol : `${token.symbol} · price unavailable`}
                    </span>
                  </span>
                  <span className="text-right flex-shrink-0">
                    {usd !== null ? (
                      <>
                        <span className="block text-[15px] font-semibold text-[var(--sw-ink)] sw-num">{formatUsd(usd)}</span>
                        <span className="block text-xs text-[var(--sw-muted)] sw-num">
                          {balanceText} {token.symbol}
                        </span>
                      </>
                    ) : (
                      <span className="block text-[15px] font-semibold text-[var(--sw-ink)] sw-num">
                        {balanceText} <span className="text-[var(--sw-muted)] font-medium">{token.symbol}</span>
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {openToken && (
        <TokenSheet
          token={openToken}
          chainId={chainId}
          image={tokenImages[openToken.symbol.toUpperCase()]}
          price={pricingEnabled ? tokenPrices[openToken.symbol] : undefined}
          isCustom={
            openToken.address !== "native" &&
            customSet.has(openToken.address.toLowerCase()) &&
            !popularSet.has(openToken.address.toLowerCase())
          }
          onClose={() => setOpenToken(null)}
          onSend={() => {
            const t = openToken;
            setOpenToken(null);
            onSendToken(t);
          }}
          onSwap={
            onSwapToken && isSwapSupported(chainId)
              ? () => {
                  const t = openToken;
                  setOpenToken(null);
                  onSwapToken(t);
                }
              : undefined
          }
          onRemove={() => {
            const addr = openToken.address;
            setOpenToken(null);
            handleRemoveTokenClick(addr);
          }}
        />
      )}

      {showRemoveConfirm && (
        <Modal onClose={() => setShowRemoveConfirm(null)} labelledBy="remove-token-title" className="sw-surface w-full max-w-sm rounded-xl border border-[var(--sw-line)] overflow-hidden p-6">
          <h3 id="remove-token-title" className="text-lg font-bold text-[var(--sw-ink)] mb-1">
            Remove this token?
          </h3>
          <p className="text-sm text-[var(--sw-ink-soft)] mb-4">It disappears from your list. Your balance stays on-chain and you can add it again any time.</p>
          <label className="flex items-center gap-2 mb-6 text-sm text-[var(--sw-ink-soft)] cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 accent-[var(--sw-accent)] rounded"
            />
            Don&apos;t ask again
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setShowRemoveConfirm(null)} className="sw-btn-ghost text-sm py-3">
              Cancel
            </button>
            <button
              onClick={() => removeToken(showRemoveConfirm)}
              className="text-sm font-semibold py-3 rounded-[3px] uppercase tracking-[0.05em] text-white bg-[var(--sw-down)] hover:brightness-105 transition-all"
            >
              Remove
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/** Token detail: balance, value, the actions for it, and its contract. */
function TokenSheet({
  token,
  chainId,
  image,
  price,
  isCustom,
  onClose,
  onSend,
  onSwap,
  onRemove,
}: {
  token: Token;
  chainId: number;
  image?: string;
  price?: number;
  isCustom: boolean;
  onClose: () => void;
  onSend: () => void;
  onSwap?: () => void;
  onRemove: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const isNative = token.address === "native";
  const amount = parseFloat(token.balance);
  const hasBalance = amount > 0;
  const explorer = !isNative ? getExplorerAddressUrl(chainId, token.address) : null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(token.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast("Couldn't copy the contract address.", "error");
    }
  }

  return (
    <Modal onClose={onClose} labelledBy="token-sheet-title" className="sw-surface w-full max-w-sm rounded-xl border border-[var(--sw-line)] overflow-hidden">
      <div className="px-5 pt-5 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <TokenIcon symbol={token.symbol} url={image} size="lg" chainId={chainId} />
            <div className="min-w-0">
              <h2 id="token-sheet-title" className="text-lg font-bold text-[var(--sw-ink)] truncate tracking-tight">
                {token.name}
              </h2>
              <p className="text-sm text-[var(--sw-muted)]">
                {token.symbol}
                {price !== undefined && <> · {formatUsd(price)}</>}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="sw-icon-btn p-2 -mr-2 -mt-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6">
          <p className="text-sm text-[var(--sw-ink-soft)]">Balance</p>
          <p className="text-3xl sw-display text-[var(--sw-ink)] break-all">
            {formatTokenBalance(token.balance)} <span className="text-lg font-semibold text-[var(--sw-muted)] tracking-normal">{token.symbol}</span>
          </p>
          {price !== undefined && <p className="text-sm text-[var(--sw-muted)] sw-num mt-0.5">{formatUsd(amount * price)}</p>}
        </div>

        <div className={`grid gap-2 mt-6 ${onSwap ? "grid-cols-2" : "grid-cols-1"}`}>
          <button onClick={onSend} disabled={!hasBalance} className="sw-btn-primary py-3.5 text-sm flex items-center justify-center gap-1.5">
            <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            Send
          </button>
          {onSwap && (
            <button onClick={onSwap} className="sw-btn-ghost py-3.5 text-sm flex items-center justify-center gap-1.5">
              <Repeat2 className="w-4 h-4" aria-hidden="true" />
              Swap
            </button>
          )}
        </div>

        {!isNative && (
          <div className="mt-6 pt-4 border-t border-[var(--sw-line-soft)]">
            <p className="sw-label mb-1.5">Contract address</p>
            <div className="flex items-start gap-2">
              <AddressText address={token.address} className="text-xs flex-1" />
              <button onClick={copy} className="sw-icon-btn p-1.5" aria-label={copied ? "Copied" : "Copy contract address"}>
                {copied ? <Check className="w-4 h-4 text-[var(--sw-up)]" /> : <Copy className="w-4 h-4" />}
              </button>
              {explorer && (
                <a href={explorer} target="_blank" rel="noopener noreferrer" className="sw-icon-btn p-1.5" aria-label="View contract on explorer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        )}

        {isCustom && (
          <button
            onClick={onRemove}
            className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-[var(--sw-down)] rounded-lg hover:bg-[var(--sw-down-bg)]"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            Remove from list
          </button>
        )}
      </div>
    </Modal>
  );
}

export const TokenList = memo(TokenListImpl);
