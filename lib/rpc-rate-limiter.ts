/**
 * Small concurrency limiter for RPC calls.
 *
 * Public RPCs (mainnet.base.org, polygon-rpc.com, …) throttle bursts, so we cap
 * how many calls are in flight at once and retry only when the endpoint says
 * "429 / rate limited". Everything else fails fast so the UI can show an error.
 */

const MAX_CONCURRENT = 6;
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 800;

function isRateLimitError(err: any): boolean {
  const status = err?.info?.responseStatus ?? err?.status ?? err?.error?.code;
  if (typeof status === "string" && status.startsWith("429")) return true;
  if (status === 429) return true;
  const msg = String(err?.shortMessage || err?.message || "").toLowerCase();
  return msg.includes("429") || msg.includes("rate limit") || msg.includes("too many requests");
}

class RpcLimiter {
  private active = 0;
  private waiters: Array<() => void> = [];

  private async acquire(): Promise<void> {
    if (this.active < MAX_CONCURRENT) {
      this.active++;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
    this.active++;
  }

  private release(): void {
    this.active--;
    const next = this.waiters.shift();
    if (next) next();
  }

  /** Run `rpcCall` inside a concurrency slot; retry on 429 with backoff. */
  async makeRequest<T>(rpcCall: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      await this.acquire();
      try {
        return await rpcCall();
      } catch (err) {
        if (attempt >= MAX_RETRIES || !isRateLimitError(err)) throw err;
      } finally {
        this.release();
      }
      await new Promise((r) => setTimeout(r, BASE_DELAY_MS * 2 ** attempt));
    }
  }
}

export const rpcRateLimiter = new RpcLimiter();
