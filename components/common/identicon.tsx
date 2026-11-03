"use client";

import { useMemo } from "react";

/**
 * A small, deterministic picture of an address (5×5 mirrored grid), so people
 * can recognise their own wallet and spot a lookalike recipient at a glance.
 * Pure function of the address — no network, no library.
 */

function bytesOf(address: string): number[] {
  const hex = address.toLowerCase().replace(/^0x/, "").padEnd(40, "0").slice(0, 40);
  const out: number[] = [];
  for (let i = 0; i < 40; i += 2) out.push(parseInt(hex.slice(i, i + 2), 16) || 0);
  return out;
}

export function Identicon({ address, size = 32, className = "" }: { address: string; size?: number; className?: string }) {
  const { cells, fg, bg } = useMemo(() => {
    const b = bytesOf(address);
    const hue = Math.round(((b[0] << 8) | b[1]) % 360);
    const fg = `hsl(${hue} 62% 48%)`;
    const bg = `hsl(${(hue + 180) % 360} 30% 92%)`;
    const cells: Array<[number, number]> = [];
    // 5 rows × 3 columns of bits, mirrored to 5 columns.
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        const on = (b[2 + row * 3 + col] & 1) === 1;
        if (!on) continue;
        cells.push([col, row]);
        if (col < 2) cells.push([4 - col, row]);
      }
    }
    return { cells, fg, bg };
  }, [address]);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 5 5"
      className={`rounded-full shrink-0 ${className}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <rect width="5" height="5" fill={bg} />
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={fg} />
      ))}
    </svg>
  );
}
