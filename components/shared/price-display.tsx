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
        <span className="text-slate-400 dark:text-slate-500">Price unavailable</span>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          (Hosted version)
        </span>
      </div>
    );
  }

  return (
    <span className="text-slate-600 dark:text-slate-400">
      ${price.toFixed(2)} USD
    </span>
  );
}
