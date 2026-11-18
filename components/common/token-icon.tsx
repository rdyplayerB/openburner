"use client";

import { useEffect, useState } from "react";
import { getChainConfig } from "@/lib/supported-chains";

/**
 * One icon treatment for every token in the app: a circle (token logos are
 * drawn as circles), a letter mark when there's no logo, and an optional
 * network badge in the corner.
 */

const SIZES = {
  xs: { box: "w-5 h-5", text: "text-[10px]", badge: "w-2.5 h-2.5 -right-0.5 -bottom-0.5" },
  sm: { box: "w-7 h-7", text: "text-xs", badge: "w-3 h-3 -right-0.5 -bottom-0.5" },
  md: { box: "w-9 h-9", text: "text-sm", badge: "w-3.5 h-3.5 -right-0.5 -bottom-0.5" },
  lg: { box: "w-12 h-12", text: "text-base", badge: "w-4 h-4 -right-0.5 -bottom-0.5" },
} as const;

export type IconSize = keyof typeof SIZES;

export function TokenIcon({
  symbol,
  url,
  size = "md",
  chainId,
}: {
  symbol: string;
  url?: string | null;
  size?: IconSize;
  /** Show this network's logo as a corner badge. */
  chainId?: number;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);
  const s = SIZES[size];

  return (
    <span className={`relative inline-flex shrink-0 ${s.box}`} aria-hidden="true">
      {url && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          className={`${s.box} rounded-full object-cover bg-(--sw-fill)`}
          onError={() => setBroken(true)}
        />
      ) : (
        <span className={`${s.box} rounded-full sw-mark rounded-full! flex items-center justify-center font-bold ${s.text}`}>
          {(symbol || "?").charAt(0).toUpperCase()}
        </span>
      )}
      {chainId !== undefined && (
        <span className={`absolute ${s.badge} rounded-full ring-2 ring-(--sw-surface) bg-(--sw-surface) overflow-hidden`}>
          <ChainLogo chainId={chainId} className="w-full h-full" />
        </span>
      )}
    </span>
  );
}

/**
 * A network's logo. Base and OP Mainnet are drawn as their square marks; everything else is round.
 * Falls back to the first letter of the network name.
 */
export function ChainLogo({
  chainId,
  name,
  className = "w-5 h-5",
}: {
  chainId: number;
  name?: string;
  className?: string;
}) {
  const chain = getChainConfig(chainId);
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [chainId]);
  const label = name || chain?.name || "?";

  if (!chain?.logo || broken) {
    return (
      <span
        className={`${className} inline-flex items-center justify-center rounded-full bg-(--sw-fill-strong) text-(--sw-ink) text-[9px] font-bold`}
        aria-hidden="true"
      >
        {label.charAt(0)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={chain.logo}
      alt=""
      className={`${className} object-cover ${chain.square ? "rounded-[22%]" : "rounded-full"}`}
      onError={() => setBroken(true)}
    />
  );
}
