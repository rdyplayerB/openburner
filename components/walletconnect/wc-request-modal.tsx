"use client";

import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { X, AlertTriangle, ShieldAlert, Info, ChevronDown } from "lucide-react";
import { useWalletConnectStore } from "@/store/walletconnect-store";
import { useWalletStore } from "@/store/wallet-store";
import { useSigningStore } from "@/store/signing-store";
import { PinInput } from "../pin-input";
import { Modal } from "@/components/common/modal";
import { ChainLogo } from "@/components/common/token-icon";
import { Identicon } from "@/components/common/identicon";
import { AddressText } from "@/components/common/address-text";
import type { ProgressStep } from "@/components/signing/signing-progress";
import { getChainName, getChainInfo, getRpcForChain, parseCaipChainId, requiresSigning } from "@/lib/walletconnect/chains";
import {
  decodeRequest,
  hasDanger,
  parseSiwe,
  verifyStatus,
  type DecodedRequest,
  type Fact,
  type RiskFlag,
  type TokenMeta,
} from "@/lib/walletconnect/decode";
import { getProvider } from "@/lib/provider";
import { DappIcon, VerifyBadge, dappHost, verifyWarning } from "./dapp-identity";

/** Counterparties get the full, grouped address; contracts/tokens a short one. */
const FULL_ADDRESS_LABELS = new Set(["To", "Spender", "Operator", "Account"]);

const erc20 = new ethers.Interface([
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
]);

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
}

/** symbol/decimals for each token contract; missing ones are simply left out. */
async function fetchTokenMeta(chainId: number, addresses: string[]): Promise<Record<string, TokenMeta>> {
  const rpc = getRpcForChain(chainId);
  if (!rpc || addresses.length === 0) return {};
  const provider = getProvider(chainId, rpc);
  const out: Record<string, TokenMeta> = {};
  await Promise.all(
    Array.from(new Set(addresses.map((a) => a.toLowerCase()))).map(async (addr) => {
      try {
        const c = new ethers.Contract(addr, erc20, provider);
        const [symbol, decimals] = await withTimeout(Promise.all([c.symbol(), c.decimals()]), 6000);
        const d = Number(decimals);
        // Implausible decimals are ignored (amounts then show in raw units).
        if (typeof symbol === "string" && symbol.length > 0 && symbol.length <= 16 && Number.isInteger(d) && d >= 0 && d <= 36) {
          out[addr] = { symbol, decimals: d };
        }
      } catch {
        /* not an ERC-20 (or RPC failed): show raw units */
      }
    })
  );
  return out;
}

export function WcRequestModal() {
  const pendingRequest = useWalletConnectStore((s) => s.pendingRequest);
  if (!pendingRequest) return null;
  // Fresh state (checkbox, PIN, token lookups) for every request in the queue.
  return <RequestSheet key={`${pendingRequest.topic}:${pendingRequest.id}`} request={pendingRequest} />;
}

function RequestSheet({ request }: { request: any }) {
  const sessions = useWalletConnectStore((s) => s.sessions);
  const queued = useWalletConnectStore((s) => s.requestQueue.length);
  const approveRequest = useWalletConnectStore((s) => s.approveRequest);
  const rejectRequest = useWalletConnectStore((s) => s.rejectRequest);
  const account = useWalletStore((s) => s.address);
  const phase = useSigningStore((s) => s.phase);

  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [tokens, setTokens] = useState<Record<string, TokenMeta>>({});
  const [metaDone, setMetaDone] = useState(false);

  const { method, params } = request.params.request;
  const chainId = parseCaipChainId(request.params.chainId);
  const session = sessions.find((s) => s.topic === request.topic);
  const meta = session?.peer?.metadata || {};
  const host = dappHost(meta.url);
  const network = getChainName(chainId);
  const needsPin = requiresSigning(method);
  const verify = verifyStatus(request.verifyContext);

  const decoded: DecodedRequest = useMemo(
    () =>
      decodeRequest({
        method,
        params,
        chainId,
        account,
        dappUrl: meta.url,
        verifiedOrigin: verify.origin,
        dappName: meta.name,
        nativeSymbol: getChainInfo(chainId)?.currency || "ETH",
        tokens,
        chainName: getChainName,
      }),
    [method, params, chainId, account, meta.url, verify.origin, meta.name, tokens]
  );

  // Look up token symbols/decimals once, so amounts read "25 USDC" not raw units.
  const lookupKey = decoded.tokenAddresses.map((a) => a.toLowerCase()).sort().join(",");
  useEffect(() => {
    if (!lookupKey) return;
    let cancelled = false;
    fetchTokenMeta(chainId, lookupKey.split(","))
      .then((m) => !cancelled && setTokens(m))
      .finally(() => !cancelled && setMetaDone(true));
    return () => {
      cancelled = true;
    };
    // Keyed on the token list itself, so metadata arriving doesn't refetch.
  }, [chainId, lookupKey]);

  const unsupported = decoded.kind === "unsupported";
  const danger = hasDanger(decoded, verify.status);
  const verifyMsg = verifyWarning(verify.status, verify.origin, host);
  const risks: RiskFlag[] = [
    ...(verifyMsg ? [{ level: "danger" as const, code: "verify", message: verifyMsg }] : []),
    ...decoded.risks,
  ].sort((a, b) => rank(b.level) - rank(a.level));

  const isSend = method === "eth_sendTransaction";
  const isTx = isSend || method === "eth_signTransaction";
  const steps: ProgressStep[] = isTx
    ? [
        { key: "prepare", label: "Prepare transaction" },
        { key: "sign", label: "Sign with your Burner", card: true },
        ...(isSend ? [{ key: "send", label: `Send to ${network}` }] : []),
      ]
    : [{ key: "sign", label: "Sign with your Burner", card: true }];
  const current = !isTx ? "sign" : phase === "tap" ? "sign" : phase === "signed" ? (isSend ? "send" : "sign") : "prepare";

  async function submit(pin?: string) {
    if (busy) return;
    setBusy(true);
    setPinError(null);
    try {
      await approveRequest(pin);
      setShowPin(false);
    } catch (err: any) {
      // Retryable signing error (wrong PIN / no card) — keep PIN open.
      setPinError(err.message || "Signing failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleApprove() {
    if (!needsPin) {
      submit();
      return;
    }
    setPinError(null);
    setShowPin(true);
  }

  const ctaLabel =
    decoded.kind === "network"
      ? method === "wallet_addEthereumChain"
        ? "Add network"
        : "Switch network"
      : "Approve";
  // Hold the summary until token names are known (max ~6s), so amounts don't flash raw units.
  const loadingSummary = decoded.tokenAddresses.length > 0 && !metaDone;
  const blocked = busy || loadingSummary || (danger && !acknowledged);
  const message = decoded.kind === "message" && !decoded.risks.some((r) => r.code === "unreadable") ? decoded.raw : null;
  const siweStatement = decoded.kind === "siwe" ? parseSiwe(decoded.raw)?.statement ?? null : null;
  const showRaw = !message && decoded.raw && decoded.raw !== "[]";

  return (
    <Modal onClose={() => !busy && rejectRequest()} labelledBy="wc-request-title" closeOnBackdrop={false}>
      {/* Who is asking */}
      <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-[var(--sw-line)]">
        <DappIcon src={meta.icons?.[0]} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-[var(--sw-ink)] truncate">{meta.name || "Unknown dApp"}</p>
          <div className="flex items-center gap-2 min-w-0">
            {host && <span className="text-xs text-[var(--sw-ink-soft)] truncate">{host}</span>}
            <VerifyBadge status={verify.status} />
          </div>
        </div>
        {queued > 0 && (
          <span className="text-[11px] font-semibold text-[var(--sw-ink-soft)] bg-[var(--sw-fill-strong)] rounded-full px-2 py-0.5 flex-shrink-0 mt-0.5">
            +{queued} waiting
          </span>
        )}
        <button
          onClick={() => rejectRequest()}
          disabled={busy}
          className="sw-icon-btn p-1.5 -mr-1.5 -mt-0.5 flex-shrink-0"
          aria-label="Reject request"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-5 pt-5 pb-5">
        {/* What it does */}
        {loadingSummary ? (
          <div aria-busy="true">
            <h2 id="wc-request-title" className="sr-only">
              Reading request
            </h2>
            <div className="sw-skeleton h-6 w-3/4" />
            <div className="sw-skeleton h-4 w-1/3 mt-2" />
          </div>
        ) : (
          <>
            <h2 id="wc-request-title" className="text-xl font-bold tracking-tight text-[var(--sw-ink)] break-words">
              {decoded.action}
            </h2>
            {decoded.kind !== "network" && (
              <p className="flex items-center gap-1.5 mt-1 text-sm text-[var(--sw-ink-soft)]">
                <ChainLogo chainId={chainId} name={network} className="w-4 h-4" />
                {network}
              </p>
            )}
          </>
        )}

        {risks.length > 0 && (
          <div className="mt-4 space-y-2">
            {risks.map((r) => (
              <RiskCallout key={r.code} risk={r} />
            ))}
          </div>
        )}

        {siweStatement && (
          <p className="mt-4 text-sm text-[var(--sw-ink)] bg-[var(--sw-fill)] rounded-xl px-3.5 py-3 leading-relaxed">
            {siweStatement}
          </p>
        )}

        {message !== null && (
          <div className="mt-4">
            <p className="sw-label mb-1.5">Message</p>
            <div className="text-sm text-[var(--sw-ink)] whitespace-pre-wrap break-words max-h-48 overflow-auto bg-[var(--sw-fill)] rounded-xl px-3.5 py-3">
              {message}
            </div>
          </div>
        )}

        {decoded.facts.length > 0 && !loadingSummary && (
          <div className="sw-list mt-4">
            {decoded.facts.map((f, i) => (
              <FactRow key={`${f.label}-${i}`} fact={f} tokens={tokens} />
            ))}
          </div>
        )}

        {showRaw && (
          <details className="group mt-3">
            <summary className="flex items-center gap-1 cursor-pointer select-none text-xs font-semibold text-[var(--sw-ink-soft)] hover:text-[var(--sw-ink)] py-2 list-none [&::-webkit-details-marker]:hidden">
              <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
              View raw data
            </summary>
            <pre className="sw-mono text-[11px] leading-relaxed text-[var(--sw-ink-soft)] bg-[var(--sw-fill)] rounded-xl p-3 max-h-56 overflow-auto whitespace-pre-wrap break-all">
              {decoded.raw}
            </pre>
          </details>
        )}

        {danger && !unsupported && (
          <label className="mt-4 flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[var(--sw-down)] flex-shrink-0"
            />
            <span className="text-sm text-[var(--sw-ink)]">I understand the risk and want to continue.</span>
          </label>
        )}

        <div className={`mt-5 grid gap-3 ${unsupported ? "grid-cols-1" : "grid-cols-2"}`}>
          <button onClick={() => rejectRequest()} disabled={busy} className="sw-btn-ghost py-3.5 text-sm disabled:opacity-50">
            Reject
          </button>
          {!unsupported && (
            <button
              onClick={handleApprove}
              disabled={blocked}
              className="sw-btn-primary py-3.5 text-sm"
            >
              {ctaLabel}
            </button>
          )}
        </div>

        {needsPin && !unsupported && (
          <p className="text-xs text-[var(--sw-muted)] text-center mt-3">
            You&apos;ll enter your PIN, then tap your Burner to sign.
          </p>
        )}
      </div>

      <PinInput
        isVisible={showPin}
        onSubmit={(pin) => submit(pin)}
        onCancel={() => {
          setShowPin(false);
          setPinError(null);
        }}
        error={pinError}
        isLoading={busy}
        progress={{ steps, current }}
        loadingMessage="Signing with your Burner…"
      />
    </Modal>
  );
}

function rank(level: RiskFlag["level"]): number {
  return level === "danger" ? 2 : level === "warn" ? 1 : 0;
}

function RiskCallout({ risk }: { risk: RiskFlag }) {
  const view = {
    danger: { cls: "sw-callout-danger", Icon: ShieldAlert, icon: "text-[var(--sw-down)]" },
    warn: { cls: "sw-callout-warn", Icon: AlertTriangle, icon: "text-[var(--sw-warn)]" },
    info: { cls: "sw-callout-info", Icon: Info, icon: "text-[var(--sw-muted)]" },
  }[risk.level];
  return (
    <div className={`sw-callout ${view.cls} flex items-start gap-2`} role={risk.level === "danger" ? "alert" : undefined}>
      <view.Icon className={`w-4 h-4 mt-px flex-shrink-0 ${view.icon}`} aria-hidden="true" />
      <span>{risk.message}</span>
    </div>
  );
}

function FactRow({ fact, tokens }: { fact: Fact; tokens: Record<string, TokenMeta> }) {
  if (fact.address) {
    const symbol = tokens[fact.address.toLowerCase()]?.symbol;
    const full = FULL_ADDRESS_LABELS.has(fact.label);
    return (
      <div className="py-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-[var(--sw-muted)]">{fact.label}</span>
          <span className="flex items-center gap-2 min-w-0">
            <Identicon address={fact.address} size={18} />
            <span className={`text-[var(--sw-ink)] font-medium truncate ${symbol || !fact.value.startsWith("0x") ? "" : "sw-mono text-xs"}`}>
              {symbol ? `${symbol} · ${fact.value}` : fact.value}
            </span>
          </span>
        </div>
        {full && <AddressText address={fact.address} className="block mt-1.5 text-xs" />}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-3 py-3 text-sm">
      <span className="text-[var(--sw-muted)] flex-shrink-0">{fact.label}</span>
      <span className={`text-[var(--sw-ink)] font-medium text-right break-all ${fact.mono ? "sw-mono text-xs" : ""}`}>
        {fact.value}
      </span>
    </div>
  );
}
