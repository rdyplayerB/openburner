"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Eases a number from its previous value to the new one (balance updates).
 * Jumps straight to the value on first render and for reduced-motion users.
 */
export function useCountUp(value: number | null, durationMs = 500): number | null {
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    if (value === null) {
      from.current = null;
      setShown(null);
      return;
    }
    const start = from.current;
    from.current = value;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (start === null || reduce || start === value) {
      setShown(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(start + (value - start) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return shown;
}
