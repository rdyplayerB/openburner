import { ethers } from "ethers";

/**
 * Broadcast a signed transaction without ever risking a second payment.
 *
 * A signed transaction has a fixed nonce and hash, so sending the same bytes
 * again can never make the network apply it twice. When a public RPC times out
 * or rate-limits, we resend the same bytes and ask whether the network has seen
 * the hash, instead of telling the user to "try again" (which would sign a new
 * transaction with the next nonce and could pay twice).
 */

/** The RPC never confirmed it got the transaction, and we couldn't find it either. */
export class BroadcastUncertainError extends Error {
  constructor(public readonly hash: string, public readonly cause?: unknown) {
    super("This network's RPC didn't confirm it got this transaction.");
    this.name = "BroadcastUncertainError";
  }
}

/** Shown when a broadcast is uncertain: the transaction is in Activity, so check there before sending again. */
export const UNCERTAIN_SEND_MESSAGE =
  "This network's RPC didn't confirm it got your transaction. It's in Activity, so check there before you send it again.";

const ATTEMPTS = 3;
const LOOKUP_TIMEOUT_MS = 6_000;

function messageOf(err: any): string {
  return String(err?.shortMessage || err?.message || err?.error?.message || "").toLowerCase();
}

/** The node already has this exact transaction: it was sent. */
function alreadyKnown(err: any): boolean {
  const msg = messageOf(err);
  return ["already known", "known transaction", "already imported", "already exists", "alreadyknown"].some((s) => msg.includes(s));
}

function nonceUsed(err: any): boolean {
  const msg = messageOf(err);
  return err?.code === "NONCE_EXPIRED" || msg.includes("nonce too low") || msg.includes("nonce has already been used");
}

/** Failures that say nothing about the transaction itself: the RPC was down, slow or rate-limiting. */
function transport(err: any): boolean {
  const msg = messageOf(err);
  return (
    ["TIMEOUT", "NETWORK_ERROR", "SERVER_ERROR", "UNKNOWN_ERROR"].includes(err?.code) ||
    msg.includes("timeout") ||
    msg.includes("failed to fetch") ||
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("429")
  );
}

/** Has the network seen this hash (pending or mined)? False when we can't tell. */
async function seen(provider: ethers.Provider, hash: string): Promise<boolean> {
  try {
    const tx = await Promise.race([
      provider.getTransaction(hash),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), LOOKUP_TIMEOUT_MS)),
    ]);
    return !!tx;
  } catch {
    return false;
  }
}

/** Broadcast `signedTx` and return its hash. Throws the RPC's error when it rejected the transaction, or BroadcastUncertainError. */
export async function broadcastSigned(provider: ethers.Provider, signedTx: string, retryDelayMs = 1_500): Promise<string> {
  const hash = ethers.keccak256(signedTx);
  let lastError: unknown;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    try {
      return (await provider.broadcastTransaction(signedTx)).hash;
    } catch (err) {
      lastError = err;
      if (alreadyKnown(err)) return hash;
      // "Nonce too low" right after an earlier attempt usually means that attempt landed.
      if (nonceUsed(err)) {
        if (await seen(provider, hash)) return hash;
        throw err;
      }
      // A real rejection (not enough funds, fee too low, would revert): nothing was sent.
      if (!transport(err)) throw err;
      if (await seen(provider, hash)) return hash;
      if (attempt < ATTEMPTS - 1) await new Promise((r) => setTimeout(r, retryDelayMs * (attempt + 1)));
    }
  }
  if (await seen(provider, hash)) return hash;
  throw new BroadcastUncertainError(hash, lastError);
}
