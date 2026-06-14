"use client";

import { getAppConfig } from '@/lib/config/environment';

interface PriceDisplayProps {
  price: number;
  symbol: string;
}

export function PriceDisplay({ price, symbol }: PriceDisplayProps) {
  const { pricingEnabled } = getAppConfig();

  if (!pricingEnabled) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[var(--sw-muted)]">Price unavailable</span>
        <span className="text-xs text-[var(--sw-muted)]">
          (Hosted version)
        </span>
      </div>
    );
  }

  return (
    <span className="text-[var(--sw-ink-soft)] sw-num">
      ${price.toFixed(2)} USD
    </span>
  );
}
