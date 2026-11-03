"use client";

import { useEffect, useMemo } from "react";
import { ArrowUpRight, Repeat2, Image as ImageIcon, Globe, ShieldCheck, ExternalLink, Clock } from "lucide-react";
import { useActivityStore, type ActivityItem } from "@/store/activity-store";
import { getChainConfig, getChainDisplayName, getExplorerTxUrl } from "@/lib/supported-chains";
import { getRpcForChain } from "@/lib/walletconnect/chains";
import { getProvider } from "@/lib/provider";
import { ChainLogo } from "../common/token-icon";
import { shortAddress } from "../common/address-text";

const RECHECK_MS = 15_000;

/** Transactions sent from this device, grouped by day, with live status. */
export function ActivityList({ address }: { address: string }) {
  const all = useActivityStore((s) => s.items);
  const update = useActivityStore((s) => s.update);
  const clear = useActivityStore((s) => s.clear);
  const owner = address.toLowerCase();
  const items = useMemo(() => all.filter((i) => i.owner === owner), [all, owner]);
  const pending = useMemo(() => items.filter((i) => i.status === "pending"), [items]);

  // Pending items (including ones from an earlier visit) are re-checked until they settle.
  useEffect(() => {
    if (pending.length === 0) return;
    let cancelled = false;
    async function check() {
      for (const item of pending) {
        const rpc = getRpcForChain(item.chainId) ?? getChainConfig(item.chainId)?.rpcUrl;
        if (!rpc) continue;
        try {
          const receipt = await getProvider(item.chainId, rpc).getTransactionReceipt(item.hash);
          if (!cancelled && receipt) update(item.hash, { status: receipt.status === 1 ? "success" : "failed" });
        } catch {
          /* try again next round */
        }
      }
    }
    check();
    const timer = setInterval(check, RECHECK_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pending, update]);

  const groups = useMemo(() => {
    const out: { label: string; items: ActivityItem[] }[] = [];
    for (const item of items) {
      const label = dayLabel(item.timestamp);
      const last = out[out.length - 1];
      if (last?.label === label) last.items.push(item);
      else out.push({ label, items: [item] });
    }
    return out;
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="text-center px-6 py-16">
        <span className="mx-auto mb-4 w-12 h-12 rounded-full bg-(--sw-fill-strong) flex items-center justify-center">
          <Clock className="w-5 h-5 text-(--sw-ink-soft)" aria-hidden="true" />
        </span>
        <p className="text-sm font-semibold text-(--sw-ink)">No activity yet</p>
        <p className="text-sm text-(--sw-muted) mt-1 max-w-xs mx-auto">
          Sends, swaps and dApp transactions you make from this device show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="px-2 sm:px-3 pb-3">
      {groups.map((group) => (
        <section key={group.label} className="pt-3">
          <h3 className="px-2 pb-1 text-xs font-semibold text-(--sw-muted)">{group.label}</h3>
          <ul>
            {group.items.map((item) => (
              <ActivityRow key={item.hash} item={item} />
            ))}
          </ul>
        </section>
      ))}
      <div className="flex items-center justify-between gap-3 px-2 pt-4 text-xs text-(--sw-muted)">
        <span>Kept on this device only.</span>
        <button onClick={() => clear(owner)} className="font-semibold hover:text-(--sw-ink)">
          Clear history
        </button>
      </div>
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const url = getExplorerTxUrl(item.chainId, item.hash);
  const { title, detail, Icon } = describe(item);
  const time = new Date(item.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const network = getChainDisplayName(item.chainId);

  const content = (
    <>
      <span className="relative w-9 h-9 shrink-0">
        <span className="w-9 h-9 rounded-full bg-(--sw-fill-strong) text-(--sw-ink) flex items-center justify-center">
          <Icon className="w-4 h-4" aria-hidden="true" />
        </span>
        <span className="absolute -right-0.5 -bottom-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-(--sw-surface) bg-(--sw-surface) overflow-hidden">
          <ChainLogo chainId={item.chainId} className="w-full h-full" />
        </span>
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-(--sw-ink) truncate">{title}</span>
        <span className="block text-xs text-(--sw-muted) truncate">
          {detail ? `${detail} · ` : ""}
          {time} · {network}
        </span>
      </span>
      <StatusPill status={item.status} />
      {url && <ExternalLink className="w-3.5 h-3.5 text-(--sw-muted) opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />}
    </>
  );

  const cls = "group flex items-center gap-3 px-2 py-2.5 rounded-xl transition-colors";
  return (
    <li>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className={`${cls} hover:bg-(--sw-fill)`} aria-label={`${title}, ${item.status}. View on explorer`}>
          {content}
        </a>
      ) : (
        <div className={cls}>{content}</div>
      )}
    </li>
  );
}

function StatusPill({ status }: { status: ActivityItem["status"] }) {
  if (status === "success") return null;
  if (status === "failed") {
    return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-(--sw-down-bg) text-(--sw-down)">Failed</span>;
  }
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-(--sw-warn-bg) text-(--sw-warn) inline-flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" aria-hidden="true" />
      Pending
    </span>
  );
}

function describe(item: ActivityItem): { title: string; detail?: string; Icon: typeof ArrowUpRight } {
  switch (item.kind) {
    case "send":
      return {
        title: `Sent ${item.fromAmount ?? ""} ${item.fromToken ?? ""}`.trim(),
        detail: item.recipient ? `To ${shortAddress(item.recipient)}` : undefined,
        Icon: ArrowUpRight,
      };
    case "swap":
      return {
        title: `Swapped ${item.fromToken ?? ""} → ${item.toToken ?? ""}`,
        detail: item.fromAmount && item.toAmount ? `${item.fromAmount} → ${item.toAmount}` : undefined,
        Icon: Repeat2,
      };
    case "nft":
      return {
        title: `Sent ${item.label || "NFT"}`,
        detail: item.recipient ? `To ${shortAddress(item.recipient)}` : undefined,
        Icon: ImageIcon,
      };
    case "approve":
      return { title: `Approved ${item.fromToken ?? "token"}`, detail: "Spending allowance", Icon: ShieldCheck };
    case "dapp":
    default:
      return { title: item.label ? `${item.label} transaction` : "dApp transaction", Icon: Globe };
  }
}

function dayLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}
