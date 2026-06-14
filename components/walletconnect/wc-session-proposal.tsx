"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Check, Globe } from "lucide-react";
import { useWalletConnectStore } from "@/store/walletconnect-store";
import { getChainName, parseCaipChainId } from "@/lib/walletconnect/chains";

export function WcSessionProposal() {
  const { pendingProposal, approveProposal, rejectProposal } = useWalletConnectStore();
  const [busy, setBusy] = useState(false);

  if (!pendingProposal) return null;

  const meta = pendingProposal.params?.proposer?.metadata || {};
  const ns = {
    ...(pendingProposal.params?.requiredNamespaces || {}),
    ...(pendingProposal.params?.optionalNamespaces || {}),
  };
  const chainIds = Array.from(
    new Set(
      Object.values(ns).flatMap((n: any) => n.chains || []).map((c: string) => parseCaipChainId(c))
    )
  );
  const icon = meta.icons?.[0];

  async function handle(approve: boolean) {
    setBusy(true);
    try {
      if (approve) await approveProposal();
      else await rejectProposal();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 z-[10000]">
      <div className="sw-surface w-full max-w-sm rounded-xl border border-[var(--sw-line)] overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--sw-line)]">
          <span className="sw-uplabel">Connection request</span>
          <button onClick={() => handle(false)} className="text-[var(--sw-muted)] hover:text-[var(--sw-ink)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 sw-mark rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
              {icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={icon} alt={meta.name || "dApp"} className="w-full h-full object-cover" />
              ) : (
                <Globe className="w-6 h-6" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[var(--sw-ink)] truncate">{meta.name || "Unknown dApp"}</p>
              <p className="text-xs text-[var(--sw-muted)] truncate">{meta.url || ""}</p>
            </div>
          </div>

          <p className="text-sm text-[var(--sw-ink-soft)] mb-5 leading-relaxed">
            <span className="font-semibold text-[var(--sw-ink)]">{meta.name || "This dApp"}</span> wants to
            connect to your Burner wallet and request approval for transactions and signatures.
          </p>

          <div className="sw-seclabel mb-3">Networks</div>
          <div className="flex flex-wrap gap-2 mb-6">
            {chainIds.length > 0 ? (
              chainIds.map((id) => (
                <span
                  key={id}
                  className="text-xs font-medium px-2.5 py-1 rounded-md border border-[var(--sw-line)] text-[var(--sw-ink-soft)]"
                >
                  {getChainName(id)}
                </span>
              ))
            ) : (
              <span className="text-xs text-[var(--sw-muted)]">No networks requested</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handle(false)}
              disabled={busy}
              className="sw-btn-ghost py-3 text-sm flex items-center justify-center gap-2"
            >
              Reject
            </button>
            <button
              onClick={() => handle(true)}
              disabled={busy}
              className="sw-btn-primary py-3 text-sm flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" strokeWidth={2.5} />
              Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
