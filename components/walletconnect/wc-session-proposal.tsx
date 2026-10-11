"use client";

import { useState } from "react";
import { X, Check, Minus, ShieldAlert } from "lucide-react";
import { useWalletConnectStore } from "@/store/walletconnect-store";
import { getChainInfo, getChainName, parseCaipChainId } from "@/lib/walletconnect/chains";
import { verifyStatus } from "@/lib/walletconnect/decode";
import { Modal } from "@/components/common/modal";
import { ChainLogo } from "@/components/common/token-icon";
import { DappIcon, VerifyBadge, dappHost, verifyWarning } from "./dapp-identity";

export function WcSessionProposal() {
  const pendingProposal = useWalletConnectStore((s) => s.pendingProposal);
  const approveProposal = useWalletConnectStore((s) => s.approveProposal);
  const rejectProposal = useWalletConnectStore((s) => s.rejectProposal);
  const [busy, setBusy] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  if (!pendingProposal) return null;

  const meta = pendingProposal.params?.proposer?.metadata || {};
  const host = dappHost(meta.url);
  const verify = verifyStatus(pendingProposal.verifyContext);
  const warning = verifyWarning(verify.status, verify.origin, host);
  const ns = {
    ...(pendingProposal.params?.requiredNamespaces || {}),
    ...(pendingProposal.params?.optionalNamespaces || {}),
  };
  const chainIds = Array.from(
    new Set(
      Object.values(ns)
        .flatMap((n: any) => n.chains || [])
        .map((c: string) => parseCaipChainId(c))
        .filter((id: number) => Number.isFinite(id))
    )
  ) as number[];
  // Sessions are only approved for networks OpenBurner can serve.
  const available = chainIds.filter((id) => getChainInfo(id));
  const unavailable = chainIds.length - available.length;
  const name = meta.name || "This dApp";

  async function handle(approve: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      if (approve) await approveProposal();
      else await rejectProposal();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={() => handle(false)} labelledBy="wc-proposal-title" closeOnBackdrop={false}>
      <div className="relative px-5 pt-6 pb-5">
        <button
          onClick={() => handle(false)}
          className="sw-icon-btn p-1.5 absolute top-4 right-4"
          aria-label="Reject and close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <DappIcon src={meta.icons?.[0]} size="lg" />
          <h2 id="wc-proposal-title" className="text-xl font-bold tracking-tight text-[var(--sw-ink)] mt-3 max-w-full break-words">
            Connect to {name}?
          </h2>
          <div className="flex items-center justify-center gap-2 mt-1 min-w-0 max-w-full">
            {host && <span className="text-sm text-[var(--sw-ink-soft)] truncate">{host}</span>}
            <VerifyBadge status={verify.status} />
          </div>
        </div>

        {warning && (
          <div className="sw-callout sw-callout-danger flex items-start gap-2 mt-4" role="alert">
            <ShieldAlert className="w-4 h-4 mt-px flex-shrink-0 text-[var(--sw-down)]" aria-hidden="true" />
            <span>{warning}</span>
          </div>
        )}

        <ul className="mt-5 space-y-2.5 text-sm">
          <Permission ok>See your wallet address and balances</Permission>
          <Permission ok>Ask you to approve transactions and signatures</Permission>
          <Permission>Can&apos;t move funds without your PIN and a tap of your Burner</Permission>
        </ul>

        <div className="mt-5">
          <p className="sw-label mb-2">Networks</p>
          {available.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {available.map((id) => (
                <span key={id} className="sw-chip px-2.5 py-1 text-xs !font-medium">
                  <ChainLogo chainId={id} name={getChainName(id)} className="w-4 h-4" />
                  {getChainName(id)}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--sw-muted)]">
              {chainIds.length > 0 ? "None of the requested networks are set up in OpenBurner." : "No networks requested."}
            </p>
          )}
          {unavailable > 0 && available.length > 0 && (
            <p className="text-xs text-[var(--sw-muted)] mt-2">
              {unavailable} other requested {unavailable === 1 ? "network isn't" : "networks aren't"} set up and won&apos;t be shared.
            </p>
          )}
        </div>

        {warning && (
          <label className="mt-4 flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[var(--sw-down)] flex-shrink-0"
            />
            <span className="text-sm text-[var(--sw-ink)]">I understand the risk and want to connect.</span>
          </label>
        )}

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button onClick={() => handle(false)} disabled={busy} className="sw-btn-ghost py-3.5 text-sm">
            Reject
          </button>
          <button
            onClick={() => handle(true)}
            disabled={busy || (!!warning && !acknowledged)}
            className="sw-btn-primary py-3.5 text-sm"
          >
            Connect
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Permission({ ok = false, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
          ok ? "bg-[var(--sw-up-bg)] text-[var(--sw-up)]" : "bg-[var(--sw-fill-strong)] text-[var(--sw-muted)]"
        }`}
        aria-hidden="true"
      >
        {ok ? <Check className="w-3 h-3" strokeWidth={3} /> : <Minus className="w-3 h-3" strokeWidth={3} />}
      </span>
      <span className={ok ? "text-[var(--sw-ink)]" : "text-[var(--sw-muted)]"}>{children}</span>
    </li>
  );
}
