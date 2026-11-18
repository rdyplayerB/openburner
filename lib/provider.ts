import { ethers } from "ethers";
import { getPresetRpcUrls } from "./supported-chains";

/**
 * Shared JSON-RPC providers, one per chainId + RPC URL.
 *
 * `staticNetwork` skips ethers' eth_chainId probe before every first call (and
 * its endless "failed to detect network" retry loop when an RPC is down), and
 * reusing one instance lets ethers batch concurrent calls into one HTTP request.
 *
 * Preset networks get their backup RPC too: when a request to the current RPC
 * fails at the HTTP level (down, timed out, rate-limited), it is retried on the
 * next one. The provider stays on whichever answered, but goes back to the
 * primary after a few minutes, so a short outage doesn't move every later
 * request to the backup's operator.
 *
 * Batches: public RPCs cap batch size (official OP, Scroll and Unichain RPCs at
 * 10, some free tiers at 3), so batches are kept to 10 calls, and a batch an
 * RPC rejects or answers only in part is re-sent one call at a time.
 */
const providers = new Map<string, ethers.JsonRpcProvider>();

const REQUEST_TIMEOUT_MS = 12_000;
const BATCH_MAX_COUNT = 10;
/** After failing over, try the primary again this long after the switch. */
export const RETURN_TO_PRIMARY_MS = 3 * 60_000;

type Payload = ethers.JsonRpcPayload | Array<ethers.JsonRpcPayload>;

/** True when every call in the batch got a reply (result or a per-call error). */
function answersAll(payload: Array<ethers.JsonRpcPayload>, results: Array<ethers.JsonRpcResult>): boolean {
  const ids = new Set(results.map((r) => r.id));
  return payload.every((p) => ids.has(p.id));
}

export class FailoverRpcProvider extends ethers.JsonRpcProvider {
  readonly urls: string[];
  #current = 0;
  #leftPrimaryAt = 0;

  constructor(urls: string[], chainId: number) {
    super(urls[0], chainId, { staticNetwork: ethers.Network.from(chainId), batchMaxCount: BATCH_MAX_COUNT });
    this.urls = urls;
  }

  /** The RPC requests currently go to. */
  get currentUrl(): string {
    return this.urls[this.#current];
  }

  async #post(url: string, payload: Payload): Promise<Array<ethers.JsonRpcResult>> {
    const request = new ethers.FetchRequest(url);
    request.body = JSON.stringify(payload);
    request.setHeader("content-type", "application/json");
    request.timeout = REQUEST_TIMEOUT_MS;
    const response = await request.send();
    response.assertOk();
    const body = response.bodyJson;
    return Array.isArray(body) ? body : [body];
  }

  async #sendTo(url: string, payload: Payload): Promise<Array<ethers.JsonRpcResult>> {
    if (!Array.isArray(payload) || payload.length < 2) return this.#post(url, payload);
    try {
      const results = await this.#post(url, payload);
      if (answersAll(payload, results)) return results;
    } catch {
      /* rejected as a batch: fall through and send the calls one by one */
    }
    const singles = await Promise.all(payload.map((p) => this.#post(url, p)));
    return singles.flat();
  }

  async _send(payload: Payload): Promise<Array<ethers.JsonRpcResult>> {
    if (this.#current !== 0 && Date.now() - this.#leftPrimaryAt >= RETURN_TO_PRIMARY_MS) this.#current = 0;
    let lastError: unknown;
    for (let attempt = 0; attempt < this.urls.length; attempt++) {
      const index = (this.#current + attempt) % this.urls.length;
      try {
        const results = await this.#sendTo(this.urls[index], payload);
        if (index !== this.#current && index !== 0) this.#leftPrimaryAt = Date.now();
        this.#current = index;
        return results;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  }
}

export function getProvider(chainId: number, rpcUrl: string): ethers.JsonRpcProvider {
  const key = `${chainId}:${rpcUrl}`;
  let provider = providers.get(key);
  if (!provider) {
    // A preset's primary RPC brings its backup; any other URL (an added network) stands alone.
    const preset = getPresetRpcUrls(chainId);
    provider = new FailoverRpcProvider(preset && preset[0] === rpcUrl ? preset : [rpcUrl], chainId);
    providers.set(key, provider);
  }
  return provider;
}
