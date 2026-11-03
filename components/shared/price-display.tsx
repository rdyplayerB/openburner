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
        <span className="text-(--sw-muted)">Price unavailable</span>
        <span className="text-xs text-(--sw-muted)">
          (Hosted version)
        </span>
      </div>
    );
  }

  return (
    <span className="text-(--sw-ink-soft) sw-num">
      ${price.toFixed(2)} USD
    </span>
  );
}
