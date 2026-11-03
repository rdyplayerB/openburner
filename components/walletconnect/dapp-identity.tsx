"use client";

import { useState } from "react";
import { BadgeCheck, Globe, ShieldAlert, ShieldQuestion } from "lucide-react";
import type { VerifyStatus } from "@/lib/walletconnect/decode";

/** dApp host for display ("app.uniswap.org"), or null. */
export function dappHost(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url.includes("://") ? url : `https://${url}`).host;
  } catch {
    return null;
  }
}

export function DappIcon({ src, size = "md" }: { src?: string; size?: "sm" | "md" | "lg" }) {
  const [broken, setBroken] = useState(false);
  const box = size === "lg" ? "w-12 h-12" : size === "sm" ? "w-8 h-8" : "w-10 h-10";
  return (
    <span
      className={`${box} rounded-xl overflow-hidden flex items-center justify-center shrink-0 bg-(--sw-fill-strong) text-(--sw-ink-soft)`}
      aria-hidden="true"
    >
      {src && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="w-full h-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <Globe className="w-1/2 h-1/2" />
      )}
    </span>
  );
}

/** WalletConnect Verify result as a small inline badge. Renders nothing when unknown. */
export function VerifyBadge({ status }: { status: VerifyStatus }) {
  if (status === "none") return null;
  const view = {
    verified: { Icon: BadgeCheck, text: "Verified", cls: "text-(--sw-up)" },
    unverified: { Icon: ShieldQuestion, text: "Unverified", cls: "text-(--sw-muted)" },
    mismatch: { Icon: ShieldAlert, text: "Domain mismatch", cls: "text-(--sw-down)" },
    scam: { Icon: ShieldAlert, text: "Known scam", cls: "text-(--sw-down)" },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${view.cls}`}>
      <view.Icon className="w-3.5 h-3.5" aria-hidden="true" />
      {view.text}
    </span>
  );
}

/** Plain-language callout for a Verify result that should stop people. */
export function verifyWarning(status: VerifyStatus, origin: string | undefined, host: string | null): string | null {
  if (status === "scam") return "WalletConnect lists this site as a known scam. Reject unless you're certain.";
  if (status === "mismatch") {
    const from = dappHost(origin) ?? "another site";
    return `This request came from ${from}${host ? `, not ${host}` : ""}. It may be impersonating the dApp.`;
  }
  return null;
}
