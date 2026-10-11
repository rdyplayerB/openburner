"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useWalletStore } from "@/store/wallet-store";
import { useSwapStore } from "@/store/swap-store";
import { useThemeStore } from "@/store/theme-store";
import { useWalletConnectStore } from "@/store/walletconnect-store";
import { showToast } from "@/store/toast-store";
import { TokenList, type Token, type TokenListStatus } from "../token-list";
import { TransactionWaitingModal } from "../transaction-waiting-modal";
import {
  TransactionCompletionModal,
  type TransactionStatus,
  type TransactionSummary,
} from "../transaction-completion-modal";
import { Modal } from "../common/modal";
import { Tooltip } from "../common/tooltip";
import {
  Copy,
  LogOut,
  CheckCircle,
  ChevronDown,
  Plus,
  Send,
  Download,
  Repeat2,
  ExternalLink,
  X,
  Menu,
  Moon,
  Sun,
  Globe,
  Coins,
  Images,
  ScanLine,
  Settings,
} from "lucide-react";
import type { UserKeyName } from "@/lib/user-keys";
import { getAppConfig } from "@/lib/config/environment";
import type { GatewayConnState } from "@/lib/burner-gateway";
import {
  CHAINS,
  getChainConfig,
  getExplorerAddressUrl,
  getNativeName,
  getNativeSymbol,
  isSwapSupported,
  getUnsupportedChainMessage,
} from "@/lib/supported-chains";
import { getProvider } from "@/lib/provider";
import { formatTokenBalance } from "@/lib/format-utils";
import { log } from "@/lib/log";

// Heavier / on-demand UI is split out of the dashboard chunk.
const SendToken = dynamic(() => import("../send-token").then((m) => m.SendToken), { ssr: false });
const SwapToken = dynamic(() => import("../swap-token").then((m) => m.SwapToken), { ssr: false });
const TokenSelector = dynamic(() => import("../token-selector").then((m) => m.TokenSelector), { ssr: false });
const NftGallery = dynamic(() => import("../nft/nft-gallery").then((m) => m.NftGallery), { ssr: false });
const SettingsModal = dynamic(() => import("../settings-modal").then((m) => m.SettingsModal), { ssr: false });
const WcProvider = dynamic(() => import("../walletconnect/wc-provider").then((m) => m.WcProvider), { ssr: false });
const WcConnectModal = dynamic(() => import("../walletconnect/wc-connect-modal").then((m) => m.WcConnectModal), {
  ssr: false,
});
const WcSessionsList = dynamic(() => import("../walletconnect/wc-sessions-list").then((m) => m.WcSessionsList), {
  ssr: false,
});

type CustomRPCs = { [chainId: string]: { name: string; rpcUrl: string } };

function ChainLogo({ chainId, name, size = "sm", active = false }: { chainId: number; name: string; size?: "sm" | "md"; active?: boolean }) {
  const chain = getChainConfig(chainId);
  const [broken, setBroken] = useState(false);
  const imgClass =
    size === "sm"
      ? chain?.square
        ? "w-3.5 h-3.5 object-cover rounded-[4px]"
        : "w-4 h-4 object-cover rounded-full"
      : chain?.square
        ? "w-5 h-5 object-cover rounded-[5px]"
        : "w-6 h-6 object-cover rounded-full";
  if (!chain?.logo || broken) {
    return (
      <span className={`${size === "sm" ? "text-[9px] font-bold" : "text-xs font-semibold"} ${active ? "text-white" : "text-[var(--sw-ink)]"}`}>
        {name[0]}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={chain.logo} alt="" className={imgClass} onError={() => setBroken(true)} />;
}

export function WalletDashboard() {
  const address = useWalletStore((s) => s.address);
  const balance = useWalletStore((s) => s.balance);
  const rpcUrl = useWalletStore((s) => s.rpcUrl);
  const chainName = useWalletStore((s) => s.chainName);
  const chainId = useWalletStore((s) => s.chainId);
  const connectionMode = useWalletStore((s) => s.connectionMode);
  const disconnect = useWalletStore((s) => s.disconnect);
  const setBalance = useWalletStore((s) => s.setBalance);
  const setChain = useWalletStore((s) => s.setChain);
  const resetSwap = useSwapStore((s) => s.resetSwap);
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const wcSessions = useWalletConnectStore((s) => s.sessions);
  const { pricingEnabled } = getAppConfig();

  const nativeSymbol = getNativeSymbol(chainId);

  const [customRPCs, setCustomRPCs] = useState<CustomRPCs>({});
  useEffect(() => {
    try {
      const stored = localStorage.getItem("customRPCs");
      if (stored) setCustomRPCs(JSON.parse(stored));
    } catch {
      /* ignore corrupt storage */
    }
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

  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [swapToken, setSwapToken] = useState<Token | null>(null);
  const [copied, setCopied] = useState(false);
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customRpc, setCustomRpc] = useState("");
  const [customChainId, setCustomChainId] = useState("");
  const [customName, setCustomName] = useState("");
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveAddressCopied, setReceiveAddressCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);
  const [tokenImages, setTokenImages] = useState<{ [symbol: string]: string }>({});
  const [tokenPrices, setTokenPrices] = useState<{ [symbol: string]: number }>({});
  const [listStatus, setListStatus] = useState<TokenListStatus>({ loading: true, error: null, hasData: false });
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [showWcConnect, setShowWcConnect] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsFocus, setSettingsFocus] = useState<UserKeyName | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<"tokens" | "collectibles">("tokens");
  // Collectibles mount on first visit, then stay mounted (hidden) for instant switching.
  const [collectiblesMounted, setCollectiblesMounted] = useState(false);
  const [tokenRefreshSignal, setTokenRefreshSignal] = useState(0);

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

  // ─── Transactions ─────────────────────────────────────────────────────
  const trackTransaction = useCallback(
    async (tx: TransactionSummary) => {
      activeTxRef.current = tx.txHash;
      setActiveTx(tx);
      setTxStatus("waiting");
      setShowTxModal(true);

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

      if (activeTxRef.current !== tx.txHash) return;
      setTxStatus(status);
      setShowTxModal(true);
      // Balances changed (or at least gas was spent) — reload tokens + native.
      refreshTokens();
    },
    [rpcUrl, refreshTokens]
  );

  function closeTxModal() {
    setShowTxModal(false);
    if (txStatus !== "waiting") {
      activeTxRef.current = null;
      setActiveTx(null);
      refreshTokens();
    }
  }

  // ─── Swap helpers ─────────────────────────────────────────────────────
  const handleSwapToken = useCallback(
    (token: Token) => {
      resetSwap();
      setSwapToken(token);
    },
    [resetSwap]
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
    showToast(`Token ${token.symbol} added`, "success");
  }

  // ─── Receive QR (qrcode is loaded only when the modal opens) ───────────
  useEffect(() => {
    if (!showReceiveModal || !address) return;
    let cancelled = false;
    import("qrcode")
      .then((QR) => QR.toDataURL(address, { width: 320, margin: 0, errorCorrectionLevel: "H" }))
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => setQrDataUrl(null));
    return () => {
      cancelled = true;
    };
  }, [showReceiveModal, address]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (showNetworkDropdown && !target.closest(".network-dropdown")) setShowNetworkDropdown(false);
      if (showHamburgerMenu && !target.closest(".hamburger-menu")) setShowHamburgerMenu(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowNetworkDropdown(false);
        setShowHamburgerMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [showNetworkDropdown, showHamburgerMenu]);

  function formatAddress(addr: string) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  async function copyAddress(setFlag: (v: boolean) => void) {
    try {
      await navigator.clipboard.writeText(address || "");
      setFlag(true);
      showToast("Address copied!", "success");
      setTimeout(() => setFlag(false), 2000);
    } catch {
      showToast("Couldn't copy — select the address and copy it manually.", "error");
    }
  }

  function handleChainSelect(chainIdToSet: number, url: string, name: string) {
    setChain(chainIdToSet, url, name);
    setShowNetworkDropdown(false);
    setShowCustomForm(false);
  }

  function handleCustomChain() {
    if (!customRpc || !customChainId || !customName) return;
    const id = customChainId.toString();
    const updated = { ...customRPCs, [id]: { name: customName, rpcUrl: customRpc } };
    setCustomRPCs(updated);
    try {
      localStorage.setItem("customRPCs", JSON.stringify(updated));
    } catch {
      /* storage unavailable */
    }
    setChain(parseInt(customChainId), customRpc, customName);
    setCustomRpc("");
    setCustomChainId("");
    setCustomName("");
    setShowCustomForm(false);
    setShowNetworkDropdown(false);
  }

  function removeCustomRPC(id: string) {
    const updated = { ...customRPCs };
    delete updated[id];
    setCustomRPCs(updated);
    try {
      localStorage.setItem("customRPCs", JSON.stringify(updated));
    } catch {
      /* storage unavailable */
    }
    showToast(`Custom RPC removed for chain ${id}`, "info");
  }

  const explorerAddressUrl = address ? getExplorerAddressUrl(chainId, address) : null;
  const hasOtherTokens = availableTokens.some((t) => t.address !== "native" && parseFloat(t.balance) > 0);
  const swapSupported = isSwapSupported(chainId);

  return (
    <div className="space-y-3">
      {/* Gateway link dropped — guide the user to reload their phone (same session) */}
      {gatewayState === "executor-away" && (
        <div role="alert" className="rounded-lg border border-[var(--sw-accent)]/40 bg-[var(--sw-accent)]/10 px-3.5 py-2.5">
          <p className="text-[12px] font-semibold text-[var(--sw-ink)]">Phone disconnected</p>
          <p className="text-[11px] text-[var(--sw-muted)] leading-relaxed mt-0.5">
            Your phone&apos;s link to the gateway dropped — it likely went to sleep. Reload the
            HaLo Gateway page on your phone (tap&nbsp;↻); it rejoins the same session with no
            re-scan, and any pending signature will resume.
          </p>
        </div>
      )}

      {/* Header with Network Selector and Hamburger Menu */}
      <div className="flex items-center justify-between">
        <div className="relative network-dropdown">
          <button
            onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
            aria-haspopup="listbox"
            aria-expanded={showNetworkDropdown}
            aria-label={`Network: ${chainName}. Change network`}
            className="flex items-center gap-2 px-3 py-2 rounded-lg sw-surface border border-[var(--sw-line)] hover:border-[var(--sw-accent)]/50 transition-all"
          >
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--sw-line-soft)] overflow-hidden">
              <ChainLogo key={chainId} chainId={chainId} name={chainName} />
            </div>
            <span className="font-semibold text-base text-[var(--sw-ink)]">{chainName}</span>
            <ChevronDown
              className={`w-3 h-3 text-[var(--sw-muted)] transition-transform ${showNetworkDropdown ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>

          {showNetworkDropdown && (
            <div
              className="absolute left-0 top-full mt-2 w-72 sw-surface rounded-xl border border-[var(--sw-line)] z-50 p-2 max-h-96 overflow-y-auto shadow-lg"
              data-network-dropdown
            >
              <div className="mb-1 px-3 py-2">
                <p className="text-[11px] font-semibold text-[var(--sw-muted)] uppercase tracking-wider">Networks</p>
              </div>
              <div className="space-y-0.5" role="listbox" aria-label="Networks">
                {CHAINS.map((chain) => {
                  const active = chainId === chain.chainId;
                  return (
                    <button
                      key={chain.chainId}
                      role="option"
                      aria-selected={active}
                      onClick={() => handleChainSelect(chain.chainId, chain.rpcUrl, chain.name)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-xs flex items-center gap-3 ${
                        active ? "bg-[var(--sw-accent)] text-white" : "hover:bg-[var(--sw-line-soft)] text-[var(--sw-ink)]"
                      }`}
                    >
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 overflow-hidden ${
                          active ? "bg-white/10" : "bg-[var(--sw-line-soft)]"
                        }`}
                      >
                        <ChainLogo chainId={chain.chainId} name={chain.name} size="md" active={active} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{chain.name}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {Object.keys(customRPCs).length > 0 && (
                <div className="pt-2 mt-2 border-t border-[var(--sw-line)]">
                  <div className="mb-1 px-3 py-2">
                    <p className="text-[11px] font-semibold text-[var(--sw-muted)] uppercase tracking-wider">Custom RPCs</p>
                  </div>
                  <div className="space-y-0.5">
                    {Object.entries(customRPCs).map(([id, rpcData]) => {
                      const active = parseInt(id) === chainId;
                      return (
                        <div
                          key={id}
                          className={`w-full px-3 py-2.5 rounded-lg transition-all text-xs flex items-center gap-3 ${
                            active ? "bg-[var(--sw-accent)] text-white" : "hover:bg-[var(--sw-line-soft)] text-[var(--sw-ink)]"
                          }`}
                        >
                          <button
                            onClick={() => handleChainSelect(parseInt(id), rpcData.rpcUrl, rpcData.name)}
                            className="flex items-center gap-3 flex-1 text-left"
                          >
                            <div
                              className={`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 overflow-hidden ${
                                active ? "bg-white/10" : "bg-[var(--sw-line-soft)]"
                              }`}
                            >
                              <span className={`text-xs font-semibold ${active ? "text-white" : "text-[var(--sw-ink)]"}`}>
                                {rpcData.name[0]}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold truncate">{rpcData.name}</div>
                              <div className="text-[10px] opacity-70 truncate">Chain ID: {id}</div>
                            </div>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeCustomRPC(id);
                            }}
                            className="p-1 rounded text-[var(--sw-muted)] hover:text-[var(--sw-down)] transition-colors"
                            title="Remove custom RPC"
                            aria-label={`Remove custom RPC ${rpcData.name}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-2 mt-2 border-t border-[var(--sw-line)]">
                <button
                  onClick={() => {
                    setShowCustomForm(!showCustomForm);
                    if (!showCustomForm) {
                      setTimeout(() => {
                        const dropdown = document.querySelector("[data-network-dropdown]") as HTMLElement | null;
                        dropdown?.scrollTo({ top: dropdown.scrollHeight, behavior: "smooth" });
                      }, 150);
                    }
                  }}
                  aria-expanded={showCustomForm}
                  className="w-full text-xs text-[var(--sw-muted)] hover:text-[var(--sw-ink)] flex items-center justify-center gap-1.5 py-2 hover:bg-[var(--sw-line-soft)] rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  {showCustomForm ? "Cancel" : "Custom RPC"}
                </button>

                {showCustomForm && (
                  <div className="space-y-2 mt-2 px-1">
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Network Name"
                      aria-label="Network name"
                      className="sw-input w-full px-3 py-2.5 text-sm border border-[var(--sw-line)] rounded-lg sw-mono"
                    />
                    <input
                      type="text"
                      value={customRpc}
                      onChange={(e) => setCustomRpc(e.target.value)}
                      placeholder="RPC URL"
                      aria-label="RPC URL"
                      className="sw-input w-full px-3 py-2.5 text-sm border border-[var(--sw-line)] rounded-lg sw-mono"
                    />
                    <input
                      type="number"
                      value={customChainId}
                      onChange={(e) => setCustomChainId(e.target.value)}
                      placeholder="Chain ID"
                      aria-label="Chain ID"
                      className="sw-input w-full px-3 py-2.5 text-sm border border-[var(--sw-line)] rounded-lg sw-mono"
                    />
                    <button
                      onClick={handleCustomChain}
                      disabled={!customRpc || !customChainId || !customName}
                      className="sw-btn-primary w-full py-2.5 px-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Network
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* dApp connect + Hamburger Menu */}
        <div className="flex items-center gap-2">
          {wcSessions.length > 0 &&
            (() => {
              const MAX = 3;
              const shown = wcSessions.slice(0, MAX);
              const extra = wcSessions.length - shown.length;
              const names = wcSessions.map((s: any) => s?.peer?.metadata?.name || "dApp").join(", ");
              return (
                <button
                  onClick={() => setShowHamburgerMenu(true)}
                  className="flex items-center p-2 rounded-lg sw-surface border border-[var(--sw-line)] hover:border-[var(--sw-accent)]/50 transition-all"
                  title={`Connected to ${names}`}
                  aria-label={`Connected dApps: ${names}`}
                >
                  {shown.map((s: any, i: number) => {
                    const meta = s?.peer?.metadata || {};
                    const icon = meta.icons?.[0];
                    const isLast = i === shown.length - 1;
                    return (
                      <span key={s.topic} className={`relative ${i > 0 ? "-ml-2" : ""}`} style={{ zIndex: shown.length - i }}>
                        <span className="block w-5 h-5 rounded-full overflow-hidden bg-[var(--sw-line-soft)] ring-2 ring-[var(--sw-surface)]">
                          {icon ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={icon} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Globe className="w-3.5 h-3.5 m-[3px] text-[var(--sw-muted)]" aria-hidden="true" />
                          )}
                        </span>
                        {isLast && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--sw-up)] border-2 border-[var(--sw-surface)]" />
                        )}
                      </span>
                    );
                  })}
                  {extra > 0 && <span className="ml-1 text-[11px] font-semibold text-[var(--sw-muted)]">+{extra}</span>}
                </button>
              );
            })()}
          <button
            onClick={() => setShowWcConnect(true)}
            className="p-2 rounded-lg sw-surface border border-[var(--sw-line)] text-[var(--sw-muted)] hover:text-[var(--sw-ink)] transition-all"
            title="Connect to dApp"
            aria-label="Connect to dApp"
          >
            <ScanLine className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <div className="relative hamburger-menu">
            <button
              onClick={() => setShowHamburgerMenu(!showHamburgerMenu)}
              className="p-2 rounded-lg sw-surface border border-[var(--sw-line)] text-[var(--sw-muted)] hover:text-[var(--sw-ink)] transition-all"
              title="Menu"
              aria-label="Menu"
              aria-haspopup="menu"
              aria-expanded={showHamburgerMenu}
            >
              <Menu className="w-5 h-5" strokeWidth={2.5} />
            </button>

            {showHamburgerMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 sw-surface rounded-xl border border-[var(--sw-line)] z-50 py-2 shadow-lg" role="menu">
                <button
                  role="menuitem"
                  onClick={() => {
                    toggleTheme();
                    setShowHamburgerMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--sw-line-soft)] transition-colors"
                >
                  {!isDarkMode ? (
                    <Moon className="w-4 h-4 text-[var(--sw-muted)]" aria-hidden="true" />
                  ) : (
                    <Sun className="w-4 h-4 text-[var(--sw-muted)]" aria-hidden="true" />
                  )}
                  <span className="text-sm font-medium text-[var(--sw-ink)]">{!isDarkMode ? "Dark Mode" : "Light Mode"}</span>
                </button>

                <a
                  role="menuitem"
                  href="https://openburner.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--sw-line-soft)] transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-[var(--sw-muted)]" aria-hidden="true" />
                  <span className="text-sm font-medium text-[var(--sw-ink)]">OpenBurner.xyz</span>
                </a>

                <button
                  role="menuitem"
                  onClick={() => {
                    setShowWcConnect(true);
                    setShowHamburgerMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--sw-line-soft)] transition-colors"
                >
                  <ScanLine className="w-4 h-4 text-[var(--sw-muted)]" aria-hidden="true" />
                  <span className="text-sm font-medium text-[var(--sw-ink)]">Connect to dApp</span>
                </button>
                {wcSessions.length > 0 && (
                  <div className="border-t border-[var(--sw-line)] mt-2 pt-2 px-4">
                    <p className="sw-uplabel mb-1">Connected dApps</p>
                    <WcSessionsList compact />
                  </div>
                )}

                <button
                  role="menuitem"
                  onClick={() => {
                    setSettingsFocus(undefined);
                    setShowSettings(true);
                    setShowHamburgerMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--sw-line-soft)] transition-colors"
                >
                  <Settings className="w-4 h-4 text-[var(--sw-muted)]" aria-hidden="true" />
                  <span className="text-sm font-medium text-[var(--sw-ink)]">Settings</span>
                </button>

                <div className="border-t border-[var(--sw-line)] mt-2 pt-2">
                  <button
                    role="menuitem"
                    onClick={() => {
                      disconnect();
                      setShowHamburgerMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--sw-line-soft)] text-[var(--sw-down)] transition-colors"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                    <span className="text-sm font-medium">Disconnect</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Balance Card */}
      <div className="sw-surface rounded-xl border border-[var(--sw-line)] p-5">
        {/* Address Bar */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--sw-line)]">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="flex items-center justify-center flex-shrink-0">
              <Image src="/images/openburnerlogo.svg" alt="" width={26} height={26} className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="sw-uplabel mb-1">Wallet address</p>
              <div className="flex items-center gap-2">
                <p className="text-sm sw-mono font-medium text-[var(--sw-ink)] truncate">{address ? formatAddress(address) : ""}</p>
                <button
                  onClick={() => copyAddress(setCopied)}
                  className="text-[var(--sw-muted)] hover:text-[var(--sw-ink)] transition-colors flex-shrink-0"
                  title={copied ? "Copied" : "Copy address"}
                  aria-label={copied ? "Address copied" : "Copy wallet address"}
                >
                  {copied ? <CheckCircle className="w-4 h-4 text-[var(--sw-up)]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          {explorerAddressUrl && (
            <a
              href={explorerAddressUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-[var(--sw-muted)] hover:text-[var(--sw-ink)] transition-colors"
              title="View on explorer"
              aria-label="View address on block explorer"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* Balance Display */}
        <div className="mb-5" aria-live="polite">
          <p className="sw-uplabel mb-2">Total balance</p>
          <div className="flex items-baseline gap-2 mb-1.5">
            <p className="text-5xl sw-display text-[var(--sw-ink)]">
              {totals !== null ? (
                <>
                  <span className="sw-accent">$</span>
                  {totals.toFixed(2)}
                </>
              ) : (
                <span className="text-[var(--sw-muted)]" aria-label="Total not available">
                  <span className="sw-accent">$</span>—
                </span>
              )}
            </p>
            <p className="text-base font-semibold text-[var(--sw-muted)]">USD</p>
          </div>
          <div className="text-sm text-[var(--sw-muted)]">
            {!listStatus.hasData ? (
              listStatus.error ? (
                <span className="text-[var(--sw-down)]">Couldn&apos;t load balances</span>
              ) : (
                "Loading assets…"
              )
            ) : (
              <>
                <span className="sw-num">{formatTokenBalance(balance, false)}</span> {nativeSymbol}
                {hasOtherTokens && " + other tokens"}
                {listStatus.error && <span className="text-[var(--sw-down)]"> · last known</span>}
                {!pricingEnabled ? (
                  <>
                    {" · "}
                    <Tooltip
                      content={
                        <div className="space-y-2">
                          <p className="font-medium">Pricing disabled</p>
                          <p className="text-xs text-white/70">
                            Add a CoinGecko key in Settings, or run OpenBurner locally, to see USD values.
                          </p>
                          <a
                            href="https://github.com/rdyplayerB/openburner/blob/main/DOCS.md"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--sw-accent)] hover:opacity-80 text-xs underline inline-flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View docs <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      }
                    >
                      <span tabIndex={0} className="cursor-help underline decoration-dotted underline-offset-2 hover:decoration-solid">
                        Pricing disabled
                      </span>
                    </Tooltip>
                  </>
                ) : (
                  totals === null && " · Loading prices…"
                )}
              </>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2.5">
          <button
            onClick={() => setShowTokenSelector(true)}
            className="sw-btn-primary flex-1 flex items-center justify-center gap-2 py-3 text-sm"
          >
            <Send className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
            Send
          </button>

          <Tooltip content={!swapSupported ? getUnsupportedChainMessage(chainId, chainName) : "Swap tokens"} className="flex flex-1">
            <button
              onClick={() => {
                if (!swapSupported) return;
                resetSwap();
                setSwapToken({ address: "native", symbol: nativeSymbol, name: getNativeName(chainId), decimals: 18, balance });
              }}
              disabled={!swapSupported}
              className="sw-btn-ghost flex-1 flex items-center justify-center gap-2 py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Repeat2 className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
              Swap
            </button>
          </Tooltip>

          <button
            onClick={() => setShowReceiveModal(true)}
            className="sw-btn-ghost flex-1 flex items-center justify-center gap-2 py-3 text-sm"
          >
            <Download className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
            Receive
          </button>
        </div>
      </div>

      {/* Receive Modal */}
      {showReceiveModal && (
        <Modal onClose={() => setShowReceiveModal(false)} labelledBy="receive-title" className="sw-surface rounded-xl border border-[var(--sw-line)] w-full max-w-sm mx-2 overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--sw-line)]">
            <h2 id="receive-title" className="sw-uplabel">
              Receive {activeTab === "collectibles" ? "NFTs" : "tokens"}
            </h2>
            <button
              onClick={() => setShowReceiveModal(false)}
              className="text-[var(--sw-muted)] hover:text-[var(--sw-ink)] transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-5 py-5">
            <p className="text-xs text-[var(--sw-ink-soft)] mb-4 leading-relaxed">
              Send only <span className="font-semibold text-[var(--sw-ink)]">{chainName}</span> assets to this address. Other networks will be lost.
            </p>

            <div className="bg-white rounded-lg p-5 mb-4 flex items-center justify-center border border-[var(--sw-line)]">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="QR code of your wallet address" width={160} height={160} className="w-40 h-40" />
              ) : (
                <div className="w-40 h-40 animate-pulse bg-black/5 rounded" aria-hidden="true" />
              )}
            </div>

            <div className="rounded-lg p-3 border border-[var(--sw-line)]">
              <p className="sw-uplabel mb-2">Your {chainName} address</p>
              <div className="flex items-center gap-2">
                <p className="flex-1 text-xs sw-mono text-[var(--sw-ink)] break-all">{address}</p>
                <button
                  onClick={() => copyAddress(setReceiveAddressCopied)}
                  className="flex-shrink-0 text-[var(--sw-muted)] hover:text-[var(--sw-ink)] transition-colors"
                  title={receiveAddressCopied ? "Copied" : "Copy address"}
                  aria-label={receiveAddressCopied ? "Address copied" : "Copy wallet address"}
                >
                  {receiveAddressCopied ? <CheckCircle className="w-5 h-5 text-[var(--sw-up)]" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button onClick={() => setShowReceiveModal(false)} className="sw-btn-primary w-full py-3 mt-5 text-sm">
              Done
            </button>
          </div>
        </Modal>
      )}

      {/* Tabs: Tokens | Collectibles */}
      <div className="flex gap-6 border-b border-[var(--sw-line)] px-1" role="tablist" aria-label="Assets">
        <button
          role="tab"
          id="tab-tokens"
          aria-selected={activeTab === "tokens"}
          aria-controls="panel-tokens"
          onClick={() => setActiveTab("tokens")}
          className={`sw-tab text-sm pb-3 flex items-center gap-2 ${activeTab === "tokens" ? "sw-tab-active" : ""}`}
        >
          <Coins className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
          Tokens
        </button>
        <button
          role="tab"
          id="tab-collectibles"
          aria-selected={activeTab === "collectibles"}
          aria-controls="panel-collectibles"
          onClick={() => {
            setActiveTab("collectibles");
            setCollectiblesMounted(true);
          }}
          className={`sw-tab text-sm pb-3 flex items-center gap-2 ${activeTab === "collectibles" ? "sw-tab-active" : ""}`}
        >
          <Images className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
          Collectibles
        </button>
      </div>

      {/* Both tabs stay mounted once opened, so switching back is instant. */}
      <div
        id="panel-tokens"
        role="tabpanel"
        aria-labelledby="tab-tokens"
        hidden={activeTab !== "tokens"}
        className="border border-[var(--sw-line)] rounded-xl overflow-hidden"
      >
        <TokenList
          refreshSignal={tokenRefreshSignal}
          onSendToken={setSelectedToken}
          onSwapToken={handleSwapToken}
          onTokensLoaded={handleTokensLoaded}
          onStatusChange={handleStatusChange}
        />
      </div>
      {collectiblesMounted && (
        <div
          id="panel-collectibles"
          role="tabpanel"
          aria-labelledby="tab-collectibles"
          hidden={activeTab !== "collectibles"}
          className="border border-[var(--sw-line)] rounded-xl overflow-hidden"
        >
          <NftGallery onReceive={() => setShowReceiveModal(true)} />
        </div>
      )}

      {showTokenSelector && (
        <TokenSelector
          tokens={availableTokens}
          onSelectToken={setSelectedToken}
          onClose={() => setShowTokenSelector(false)}
          tokenImages={tokenImages}
          tokenPrices={tokenPrices}
        />
      )}

      {selectedToken && (
        <SendToken
          token={selectedToken}
          onClose={() => setSelectedToken(null)}
          onSubmitted={(tx) => {
            setSelectedToken(null);
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

      {activeTx && (
        <>
          <TransactionWaitingModal
            isOpen={showTxModal && txStatus === "waiting"}
            tx={activeTx}
            chainName={chainName}
            onDismiss={() => setShowTxModal(false)}
          />
          {txStatus !== "waiting" && (
            <TransactionCompletionModal
              isOpen={showTxModal}
              status={txStatus}
              tx={activeTx}
              chainName={chainName}
              onClose={closeTxModal}
            />
          )}
        </>
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
