/**
 * CoinGecko fetch wrapper.
 *
 * The /api/coingecko proxy caches at the edge and rate-limits server-side, so the
 * client only needs to (a) cap concurrency, (b) de-duplicate identical in-flight
 * requests and (c) back off briefly after a 429 instead of hammering.
 */

const MAX_CONCURRENT = 4;
const BACKOFF_MS = 30_000;

class CoinGeckoLimiter {
  private active = 0;
  private waiters: Array<() => void> = [];
  private inflight = new Map<string, Promise<Response>>();
  private blockedUntil = 0;

  private async acquire() {
    if (this.active < MAX_CONCURRENT) {
      this.active++;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
    this.active++;
  }

  private release() {
    this.active--;
    this.waiters.shift()?.();
  }

  async fetch(url: string, options?: RequestInit): Promise<Response> {
    if (Date.now() < this.blockedUntil) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    const key = `${url}|${JSON.stringify(options?.headers ?? {})}`;
    const existing = this.inflight.get(key);
    if (existing) return existing.then((r) => r.clone());

    const p = (async () => {
      await this.acquire();
      try {
        const res = await fetch(url, options);
        if (res.status === 429) this.blockedUntil = Date.now() + BACKOFF_MS;
        return res;
      } finally {
        this.release();
      }
    })();
    this.inflight.set(key, p);
    p.finally(() => this.inflight.delete(key)).catch(() => {});
    return p.then((r) => r.clone());
  }
}

// Shared by every CoinGecko call in the app.
export const coinGeckoLimiter = new CoinGeckoLimiter();
