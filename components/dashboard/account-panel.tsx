"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownLeft, Repeat2, Copy, Check, ExternalLink } from "lucide-react";
import { Identicon } from "../common/identicon";
import { shortAddress } from "../common/address-text";
import { Tooltip } from "../common/tooltip";
import { useCountUp } from "@/hooks/use-count-up";
import { formatTokenBalance, formatUsd } from "@/lib/format-utils";
import { cachedEnsName, lookupEnsName } from "@/lib/ens";
import { showToast } from "@/store/toast-store";

export interface AccountPanelProps {
  address: string;
  explorerUrl: string | null;
  nativeSymbol: string;
  /** Native balance as a decimal string. */
  nativeBalance: string;
  /** Total USD value, or null when prices aren't available. */
  totalUsd: number | null;
  pricingEnabled: boolean;
  /** Prices are on but haven't arrived yet (shows a placeholder, not "$—"). */
  pricesPending: boolean;
  loading: boolean;
  error: string | null;
  hasData: boolean;
  otherTokenCount: number;
  swapSupported: boolean;
  swapUnsupportedMessage: string;
  onSend: () => void;
  onSwap: () => void;
  onReceive: () => void;
  onRetry: () => void;
}

/** Who you are, what you have, and the three things you can do with it. */
export function AccountPanel(p: AccountPanelProps) {
  const [ens, setEns] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setEns(cachedEnsName(p.address));
    let cancelled = false;
    lookupEnsName(p.address).then((name) => !cancelled && setEns(name));
    return () => {
      cancelled = true;
    };
  }, [p.address]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(p.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast("Couldn't copy — select the address and copy it manually.", "error");
    }
  }

  const showUsd = p.pricingEnabled && p.totalUsd !== null && !p.pricesPending;
  const animatedUsd = useCountUp(showUsd ? p.totalUsd : null);
  const others = p.otherTokenCount;

  return (
    <section aria-label="Account" className="sw-surface rounded-2xl border border-[var(--sw-line)] p-5 sm:p-6">
      {/* Identity */}
      <div className="flex items-center gap-3">
        <Identicon address={p.address} size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-[var(--sw-ink)] truncate">{ens ?? shortAddress(p.address)}</p>
          <div className="flex items-center gap-1 text-xs text-[var(--sw-muted)]">
            <span className="sw-mono truncate">{ens ? shortAddress(p.address) : "Your Burner wallet"}</span>
          </div>
        </div>
        <button onClick={copy} className="sw-icon-btn p-2" aria-label={copied ? "Address copied" : "Copy wallet address"} title="Copy address">
          {copied ? <Check className="w-4 h-4 text-[var(--sw-up)]" /> : <Copy className="w-4 h-4" />}
        </button>
        {p.explorerUrl && (
          <a
            href={p.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="sw-icon-btn p-2 -mr-2"
            title="View on explorer"
            aria-label="View address on block explorer"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Balance */}
      <div className="mt-7 mb-6" aria-live="polite">
        <p className="text-sm text-[var(--sw-ink-soft)] mb-1">{showUsd ? "Total balance" : "Balance"}</p>
        {!p.hasData ? (
          p.error ? (
            <div>
              <p className="text-lg font-semibold text-[var(--sw-ink)]">Couldn&apos;t load your balance</p>
              <button onClick={p.onRetry} className="sw-link text-sm mt-1">
                Try again
              </button>
            </div>
          ) : (
            <div aria-label="Loading balance">
              <div className="sw-skeleton h-12 w-48 my-1" />
              <div className="sw-skeleton h-4 w-32 mt-3" />
            </div>
          )
        ) : (
          <>
            {p.pricesPending ? (
              <div className="sw-skeleton h-12 w-44 my-1" aria-label="Loading prices" />
            ) : showUsd ? (
              <p className="text-5xl sm:text-[3.5rem] leading-none sw-display text-[var(--sw-ink)] py-1">
                {formatUsd(animatedUsd ?? p.totalUsd ?? 0)}
              </p>
            ) : (
              <p className="leading-none sw-display text-[var(--sw-ink)] py-1 break-all">
                <span className="text-5xl sm:text-[3.5rem]">{formatTokenBalance(p.nativeBalance)}</span>
                <span className="text-2xl font-semibold text-[var(--sw-muted)] ml-2 tracking-normal">{p.nativeSymbol}</span>
              </p>
            )}
            <p className="text-sm text-[var(--sw-muted)] mt-2">
              {showUsd || p.pricesPending ? (
                <>
                  <span className="sw-num">{formatTokenBalance(p.nativeBalance)}</span> {p.nativeSymbol}
                  {others > 0 && ` · ${others} other token${others === 1 ? "" : "s"}`}
                </>
              ) : (
                others > 0 && `+ ${others} other token${others === 1 ? "" : "s"}`
              )}
              {p.error && <span className="text-[var(--sw-down)]"> · last known</span>}
            </p>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={p.onSend} className="sw-btn-primary py-3.5 text-sm flex items-center justify-center gap-1.5">
          <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
          Send
        </button>
        <Tooltip content={p.swapSupported ? "Swap tokens" : p.swapUnsupportedMessage} className="flex">
          <button
            onClick={p.onSwap}
            disabled={!p.swapSupported}
            className="sw-btn-ghost w-full py-3.5 text-sm flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Repeat2 className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
            Swap
          </button>
        </Tooltip>
        <button onClick={p.onReceive} className="sw-btn-ghost py-3.5 text-sm flex items-center justify-center gap-1.5">
          <ArrowDownLeft className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
          Receive
        </button>
      </div>
    </section>
  );
}
