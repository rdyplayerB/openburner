"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useWalletStore } from "@/store/wallet-store";
import { useSwapStore } from "@/store/swap-store";
import { useThemeStore } from "@/store/theme-store";
import { useWalletConnectStore } from "@/store/walletconnect-store";
import { useActivityStore, recordActivity, settleActivity } from "@/store/activity-store";
import { showToast } from "@/store/toast-store";
import { TokenList, type Token, type TokenListStatus } from "../token-list";
import { TransactionStatusModal, type TransactionStatus, type TransactionSummary } from "../transaction-completion-modal";
import { AccountPanel } from "../dashboard/account-panel";
import { NetworkMenu } from "../dashboard/network-menu";
import { ActivityList } from "../dashboard/activity-list";
import { ReceiveSheet } from "../dashboard/receive-sheet";
import { LogOut, ExternalLink, Menu, Moon, Sun, Globe, ScanLine, Settings, WifiOff } from "lucide-react";
import type { UserKeyName } from "@/lib/user-keys";
import { getAppConfig } from "@/lib/config/environment";
import type { GatewayConnState } from "@/lib/burner-gateway";
import {
  getExplorerAddressUrl,
  getNativeName,
  getNativeSymbol,
  isSwapSupported,
  getUnsupportedChainMessage,
} from "@/lib/supported-chains";
import { getProvider } from "@/lib/provider";
import { log } from "@/lib/log";

// Heavier / on-demand UI is split out of the dashboard chunk.
const SendToken = dynamic(() => import("../send-token").then((m) => m.SendToken), { ssr: false });
const SwapToken = dynamic(() => import("../swap-token").then((m) => m.SwapToken), { ssr: false });
const NftGallery = dynamic(() => import("../nft/nft-gallery").then((m) => m.NftGallery), { ssr: false });
const SettingsModal = dynamic(() => import("../settings-modal").then((m) => m.SettingsModal), { ssr: false });
const WcProvider = dynamic(() => import("../walletconnect/wc-provider").then((m) => m.WcProvider), { ssr: false });
const WcConnectModal = dynamic(() => import("../walletconnect/wc-connect-modal").then((m) => m.WcConnectModal), {
  ssr: false,
});
const WcSessionsList = dynamic(() => import("../walletconnect/wc-sessions-list").then((m) => m.WcSessionsList), {
  ssr: false,
});

type Tab = "tokens" | "collectibles" | "activity";

/** How long to wait for prices before showing the native balance instead. */
const PRICE_WAIT_MS = 8000;

export function WalletDashboard() {
  const address = useWalletStore((s) => s.address);
  const balance = useWalletStore((s) => s.balance);
  const rpcUrl = useWalletStore((s) => s.rpcUrl);
  const chainName = useWalletStore((s) => s.chainName);
  const chainId = useWalletStore((s) => s.chainId);
  const connectionMode = useWalletStore((s) => s.connectionMode);
  const disconnect = useWalletStore((s) => s.disconnect);
  const setBalance = useWalletStore((s) => s.setBalance);
  const resetSwap = useSwapStore((s) => s.resetSwap);
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const wcSessions = useWalletConnectStore((s) => s.sessions);
  const activity = useActivityStore((s) => s.items);
  const { pricingEnabled } = getAppConfig();

  const nativeSymbol = getNativeSymbol(chainId);

  useEffect(() => {
    // Fix up persisted RPC URLs for built-in networks if needed.
    useWalletStore.getState().initialize();
  }, []);

  // Track the HaLo gateway link so we can prompt a phone reload if it drops
  // mid-session. Only relevant (and only loaded) in gateway mode.
  const [gatewayState, setGatewayState] = useState<GatewayConnState>("connected");
  useEffect(() => {
    if (connectionMode !== "gateway") return;
    let unsub: (() => void) | undefined;
    let cancelled = false;
    import("@/lib/burner-gateway").then((m) => {
      if (cancelled) return;
      setGatewayState(m.getGatewayConnectionState());
      unsub = m.onGatewayStateChange(setGatewayState);
    });
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [connectionMode]);

  const [sendToken, setSendToken] = useState<Token | null>(null);
  const [swapToken, setSwapToken] = useState<Token | null>(null);
  const [showReceive, setShowReceive] = useState(false);
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);
  const [tokenImages, setTokenImages] = useState<{ [symbol: string]: string }>({});
  const [tokenPrices, setTokenPrices] = useState<{ [symbol: string]: number }>({});
  const [listStatus, setListStatus] = useState<TokenListStatus>({ loading: true, error: null, hasData: false });
  const [showMenu, setShowMenu] = useState(false);
  const [showWcConnect, setShowWcConnect] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsFocus, setSettingsFocus] = useState<UserKeyName | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<Tab>("tokens");
  // Collectibles mount on first visit, then stay mounted (hidden) for instant switching.
  const [collectiblesMounted, setCollectiblesMounted] = useState(false);
  const [tokenRefreshSignal, setTokenRefreshSignal] = useState(0);
  const [priceGaveUp, setPriceGaveUp] = useState(false);

  // Submitted transaction being tracked (send or swap).
  const [activeTx, setActiveTx] = useState<TransactionSummary | null>(null);
  const [txStatus, setTxStatus] = useState<"waiting" | TransactionStatus>("waiting");
  const [showTxModal, setShowTxModal] = useState(false);
  const activeTxRef = useRef<string | null>(null);

  const refreshTokens = useCallback(() => setTokenRefreshSignal((n) => n + 1), []);

  // ─── Token list reporting ─────────────────────────────────────────────
  const handleTokensLoaded = useCallback(
    (tokens: Token[], images: { [symbol: string]: string }, prices: { [symbol: string]: number }) => {
      setAvailableTokens(tokens);
      setTokenImages(images);
      setTokenPrices(prices);
      const native = tokens.find((t) => t.address === "native");
      if (native) setBalance(native.balance);
    },
    [setBalance]
  );
  const handleStatusChange = useCallback((status: TokenListStatus) => setListStatus(status), []);

  const totals = useMemo(() => {
    if (!pricingEnabled || !listStatus.hasData) return null;
    if (tokenPrices[nativeSymbol] === undefined) return null;
    let total = 0;
    for (const t of availableTokens) {
      const price = tokenPrices[t.symbol];
      const amount = parseFloat(t.balance);
      if (price && amount > 0) total += amount * price;
    }
    return total;
  }, [pricingEnabled, listStatus.hasData, availableTokens, tokenPrices, nativeSymbol]);

  // Prices arrive after balances. Wait briefly for them, then fall back to the
  // native balance rather than showing an empty "$—".
  useEffect(() => setPriceGaveUp(false), [chainId, address]);
  useEffect(() => {
    if (!pricingEnabled || !listStatus.hasData || totals !== null) return;
    const t = setTimeout(() => setPriceGaveUp(true), PRICE_WAIT_MS);
    return () => clearTimeout(t);
  }, [pricingEnabled, listStatus.hasData, totals]);
  const pricesPending = pricingEnabled && listStatus.hasData && totals === null && !priceGaveUp;

  const otherTokenCount = availableTokens.filter((t) => t.address !== "native" && parseFloat(t.balance) > 0).length;
  const pendingCount = useMemo(
    () => activity.filter((i) => i.owner === address?.toLowerCase() && i.status === "pending").length,
    [activity, address]
  );

  // ─── Transactions ─────────────────────────────────────────────────────
  const trackTransaction = useCallback(
    async (tx: TransactionSummary) => {
      activeTxRef.current = tx.txHash;
      setActiveTx(tx);
      setTxStatus("waiting");
      setShowTxModal(true);
      recordActivity({
        hash: tx.txHash,
        chainId: tx.chainId,
        kind: tx.kind,
        fromToken: tx.fromToken,
        fromAmount: tx.fromAmount,
        toToken: tx.toToken,
        toAmount: tx.toAmount,
        recipient: tx.recipient,
      });

      let status: TransactionStatus = "pending";
      try {
        const provider = getProvider(tx.chainId, rpcUrl);
        // Resolves with the receipt once mined; throws TIMEOUT after 2 minutes.
        const receipt = await provider.waitForTransaction(tx.txHash, 1, 120_000);
        if (receipt) status = receipt.status === 1 ? "success" : "failed";
      } catch (err: any) {
        log.debug("[tx] confirmation wait ended without receipt:", err?.code || err?.message);
        status = "pending";
      }

      if (status !== "pending") settleActivity(tx.txHash, { status });
      if (status === "success" && typeof navigator !== "undefined") navigator.vibrate?.(40);
      // Balances changed (or at least gas was spent) — reload tokens + native.
      refreshTokens();
      if (activeTxRef.current !== tx.txHash) return;
      setTxStatus(status);
      setShowTxModal(true);
    },
    [rpcUrl, refreshTokens]
  );

  function closeTxModal() {
    setShowTxModal(false);
    if (txStatus !== "waiting") {
      activeTxRef.current = null;
      setActiveTx(null);
    }
  }

  // ─── Actions ──────────────────────────────────────────────────────────
  const nativeToken = useCallback(
    (): Token =>
      availableTokens.find((t) => t.address === "native") ?? {
        address: "native",
        symbol: nativeSymbol,
        name: getNativeName(chainId),
        decimals: 18,
        balance,
      },
    [availableTokens, nativeSymbol, chainId, balance]
  );

  const openSwap = useCallback(
    (token: Token) => {
      if (!isSwapSupported(chainId)) return;
      resetSwap();
      setSwapToken(token);
    },
    [chainId, resetSwap]
  );

  function handleTokenAdded(token: Token, imageUrl?: string) {
    setAvailableTokens((prev) => (prev.some((t) => t.address.toLowerCase() === token.address.toLowerCase()) ? prev : [...prev, token]));
    if (imageUrl) setTokenImages((prev) => ({ ...prev, [token.symbol.toUpperCase()]: imageUrl }));
    try {
      const key = `tokens_${chainId}`;
      const current: string[] = JSON.parse(localStorage.getItem(key) || "[]");
      if (!current.includes(token.address.toLowerCase())) {
        current.push(token.address.toLowerCase());
        localStorage.setItem(key, JSON.stringify(current));
        refreshTokens();
      }
    } catch {
      /* storage unavailable */
    }
    showToast(`${token.symbol} added`, "success");
  }

  // ─── App menu ─────────────────────────────────────────────────────────
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showMenu) return;
    function onDown(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setShowMenu(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowMenu(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [showMenu]);

  if (!address) return null;

  const explorerAddressUrl = getExplorerAddressUrl(chainId, address);
  const swapSupported = isSwapSupported(chainId);
  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "tokens", label: "Tokens" },
    { id: "collectibles", label: "Collectibles" },
    { id: "activity", label: "Activity", badge: pendingCount || undefined },
  ];

  const menuItem = "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm font-medium text-[var(--sw-ink)] hover:bg-[var(--sw-fill)] transition-colors";

  return (
    <div className="min-h-screen pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--sw-line-soft)] bg-[color-mix(in_srgb,var(--sw-paper)_88%,transparent)] backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 h-16 flex items-center gap-3">
          <a href="https://openburner.xyz" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 flex-shrink-0" aria-label="OpenBurner website">
            <Image src="/images/openburnerlogo.svg" alt="" width={28} height={28} className="w-7 h-7" priority />
            <span className="hidden md:inline text-[17px] font-bold tracking-tight text-[var(--sw-ink)]">OpenBurner</span>
          </a>
          <span className="hidden md:block w-px h-6 bg-[var(--sw-line)] mx-1" aria-hidden="true" />
          <NetworkMenu />

          <div className="ml-auto flex items-center gap-1">
            {wcSessions.length > 0 && <DappStack sessions={wcSessions} onClick={() => setShowMenu(true)} />}
            <button onClick={() => setShowWcConnect(true)} className="sw-icon-btn p-2.5" title="Connect to a dApp" aria-label="Connect to a dApp">
              <ScanLine className="w-5 h-5" />
            </button>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="sw-icon-btn p-2.5"
                title="Menu"
                aria-label="Menu"
                aria-haspopup="menu"
                aria-expanded={showMenu}
              >
                <Menu className="w-5 h-5" />
              </button>

              {showMenu && (
                <div className="ob-pop-in absolute right-0 top-full mt-2 w-64 sw-surface rounded-xl border border-[var(--sw-line)] z-50 p-1.5 shadow-xl" role="menu">
                  <button
                    role="menuitem"
                    onClick={() => {
                      toggleTheme();
                      setShowMenu(false);
                    }}
                    className={menuItem}
                  >
                    {isDarkMode ? <Sun className="w-4 h-4 text-[var(--sw-ink-soft)]" aria-hidden="true" /> : <Moon className="w-4 h-4 text-[var(--sw-ink-soft)]" aria-hidden="true" />}
                    {isDarkMode ? "Light mode" : "Dark mode"}
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setShowWcConnect(true);
                      setShowMenu(false);
                    }}
                    className={menuItem}
                  >
                    <ScanLine className="w-4 h-4 text-[var(--sw-ink-soft)]" aria-hidden="true" />
                    Connect to a dApp
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setSettingsFocus(undefined);
                      setShowSettings(true);
                      setShowMenu(false);
                    }}
                    className={menuItem}
                  >
                    <Settings className="w-4 h-4 text-[var(--sw-ink-soft)]" aria-hidden="true" />
                    Settings
                  </button>
                  <a role="menuitem" href="https://openburner.xyz" target="_blank" rel="noopener noreferrer" className={menuItem}>
                    <ExternalLink className="w-4 h-4 text-[var(--sw-ink-soft)]" aria-hidden="true" />
                    openburner.xyz
                  </a>

                  {wcSessions.length > 0 && (
                    <div className="border-t border-[var(--sw-line-soft)] mt-1.5 pt-2 px-3 pb-1">
                      <p className="sw-label mb-1">Connected dApps</p>
                      <WcSessionsList compact />
                    </div>
                  )}

                  <div className="border-t border-[var(--sw-line-soft)] mt-1.5 pt-1.5">
                    <button
                      role="menuitem"
                      onClick={() => {
                        disconnect();
                        setShowMenu(false);
                      }}
                      className={`${menuItem} !text-[var(--sw-down)] hover:!bg-[var(--sw-down-bg)]`}
                    >
                      <LogOut className="w-4 h-4" aria-hidden="true" />
                      Disconnect card
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-4 lg:pt-8">
        {/* Gateway link dropped — guide the user to reload their phone (same session) */}
        {gatewayState === "executor-away" && (
          <div role="alert" className="sw-callout sw-callout-warn mb-4 flex items-start gap-3">
            <WifiOff className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--sw-warn)]" aria-hidden="true" />
            <p>
              <span className="font-semibold">Your phone disconnected.</span> It probably went to sleep. Reload the HaLo
              Gateway page on your phone — it rejoins this session without a new scan, and any pending signature resumes.
            </p>
          </div>
        )}

        <div className="grid gap-4 lg:gap-8 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] items-start">
          <div className="lg:sticky lg:top-24">
            <AccountPanel
              address={address}
              explorerUrl={explorerAddressUrl}
              nativeSymbol={nativeSymbol}
              nativeBalance={balance}
              totalUsd={totals}
              pricingEnabled={pricingEnabled}
              pricesPending={pricesPending}
              loading={listStatus.loading}
              error={listStatus.error}
              hasData={listStatus.hasData}
              otherTokenCount={otherTokenCount}
              swapSupported={swapSupported}
              swapUnsupportedMessage={getUnsupportedChainMessage(chainId, chainName)}
              onSend={() => setSendToken(nativeToken())}
              onSwap={() => openSwap(nativeToken())}
              onReceive={() => setShowReceive(true)}
              onRetry={refreshTokens}
            />
          </div>

          <section className="sw-surface rounded-2xl border border-[var(--sw-line)] min-w-0 overflow-hidden" aria-label="Assets and activity">
            <div className="flex gap-6 border-b border-[var(--sw-line-soft)] px-5" role="tablist" aria-label="Assets">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-selected={activeTab === t.id}
                  aria-controls={`panel-${t.id}`}
                  onClick={() => {
                    setActiveTab(t.id);
                    if (t.id === "collectibles") setCollectiblesMounted(true);
                  }}
                  className={`sw-tab text-sm py-4 flex items-center gap-1.5 ${activeTab === t.id ? "sw-tab-active" : ""}`}
                >
                  {t.label}
                  {t.badge ? (
                    <span className="min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-[var(--sw-warn-bg)] text-[var(--sw-warn)] text-[10px] font-bold flex items-center justify-center">
                      {t.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            {/* Panels stay mounted once opened, so switching back is instant. */}
            <div id="panel-tokens" role="tabpanel" aria-labelledby="tab-tokens" hidden={activeTab !== "tokens"}>
              <TokenList
                refreshSignal={tokenRefreshSignal}
                onSendToken={setSendToken}
                onSwapToken={openSwap}
                onTokensLoaded={handleTokensLoaded}
                onStatusChange={handleStatusChange}
              />
            </div>
            {collectiblesMounted && (
              <div id="panel-collectibles" role="tabpanel" aria-labelledby="tab-collectibles" hidden={activeTab !== "collectibles"}>
                <NftGallery onReceive={() => setShowReceive(true)} />
              </div>
            )}
            {activeTab === "activity" && (
              <div id="panel-activity" role="tabpanel" aria-labelledby="tab-activity">
                <ActivityList address={address} />
              </div>
            )}
          </section>
        </div>
      </div>

      {showReceive && (
        <ReceiveSheet
          address={address}
          chainId={chainId}
          chainName={chainName}
          noun={activeTab === "collectibles" ? "NFTs" : "tokens"}
          onClose={() => setShowReceive(false)}
        />
      )}

      {sendToken && (
        <SendToken
          token={sendToken}
          tokens={availableTokens}
          tokenImages={tokenImages}
          tokenPrices={tokenPrices}
          onClose={() => setSendToken(null)}
          onSubmitted={(tx) => {
            setSendToken(null);
            trackTransaction(tx);
          }}
        />
      )}

      {swapToken && (
        <SwapToken
          onClose={() => setSwapToken(null)}
          onSuccess={() => setSwapToken(null)}
          onTransactionSubmitted={trackTransaction}
          initialFromToken={swapToken}
          availableTokens={availableTokens}
          tokenImages={tokenImages}
          tokenPrices={tokenPrices}
          onTokenAdded={handleTokenAdded}
        />
      )}

      {activeTx && showTxModal && (
        <TransactionStatusModal status={txStatus} tx={activeTx} chainName={chainName} onClose={closeTxModal} />
      )}

      {/* WalletConnect: global proposal/request handling + connect modal */}
      <WcProvider />
      {showWcConnect && (
        <WcConnectModal
          onClose={() => setShowWcConnect(false)}
          onOpenSettings={() => {
            setShowWcConnect(false);
            setSettingsFocus("walletconnect");
            setShowSettings(true);
          }}
        />
      )}

      {showSettings && (
        <SettingsModal
          initialEdit={settingsFocus}
          onClose={() => {
            setShowSettings(false);
            setSettingsFocus(undefined);
          }}
        />
      )}
    </div>
  );
}

/** Overlapping icons of connected dApps (opens the menu that lists them). */
function DappStack({ sessions, onClick }: { sessions: any[]; onClick: () => void }) {
  const MAX = 3;
  const shown = sessions.slice(0, MAX);
  const extra = sessions.length - shown.length;
  const names = sessions.map((s: any) => s?.peer?.metadata?.name || "dApp").join(", ");
  return (
    <button onClick={onClick} className="sw-icon-btn px-2 py-2 gap-0" title={`Connected to ${names}`} aria-label={`Connected dApps: ${names}`}>
      {shown.map((s: any, i: number) => {
        const icon = s?.peer?.metadata?.icons?.[0];
        return (
          <span key={s.topic} className={`relative ${i > 0 ? "-ml-2" : ""}`} style={{ zIndex: shown.length - i }}>
            <span className="block w-6 h-6 rounded-full overflow-hidden bg-[var(--sw-fill-strong)] ring-2 ring-[var(--sw-paper)]">
              {icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={icon} alt="" className="w-full h-full object-cover" />
              ) : (
                <Globe className="w-4 h-4 m-1 text-[var(--sw-muted)]" aria-hidden="true" />
              )}
            </span>
            {i === shown.length - 1 && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--sw-up)] ring-2 ring-[var(--sw-paper)]" />
            )}
          </span>
        );
      })}
      {extra > 0 && <span className="ml-1 text-[11px] font-semibold text-[var(--sw-muted)]">+{extra}</span>}
    </button>
  );
}
