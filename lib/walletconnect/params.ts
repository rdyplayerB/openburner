import { ethers } from "ethers";

/**
 * One reading of a dApp request's parameters, shared by the review screen
 * (decode.ts) and the signer (request-handlers.ts). Both must see the same
 * message, typed data, transaction and chain — otherwise the screen could show
 * one thing while the card signs another. Anything ambiguous is refused.
 */

export class RequestParamsError extends Error {
  /** JSON-RPC "invalid params". */
  readonly code = -32602;
  constructor(message: string) {
    super(message);
    this.name = "RequestParamsError";
  }
}

function isAccount(value: unknown, account: string | null | undefined): boolean {
  return typeof value === "string" && !!account && ethers.isAddress(value) && value.toLowerCase() === account.toLowerCase();
}

function otherAccount(value: unknown): string | null {
  return typeof value === "string" && ethers.isAddress(value) ? value : null;
}

// ─── personal_sign ───────────────────────────────────────────────────────────

/**
 * personal_sign params are [message, address]; some dApps swap them. The
 * message is whichever parameter is NOT the connected account.
 */
export function parsePersonalSignParams(params: unknown, account: string | null | undefined): string {
  const list = Array.isArray(params) ? params : [];
  if (list.length === 1 && typeof list[0] === "string") return list[0];
  if (list.length !== 2) throw new RequestParamsError("Malformed sign request.");
  const [a, b] = list;
  if (isAccount(b, account) && typeof a === "string") return a;
  if (isAccount(a, account) && typeof b === "string") return b;
  const named = otherAccount(b) ?? otherAccount(a);
  throw new RequestParamsError(
    named ? `This request is for a different account (${named.slice(0, 6)}…${named.slice(-4)}).` : "This request doesn't name your account."
  );
}

/** The bytes (or text) the card signs for a personal_sign payload. */
export function personalSignPayload(message: string): string | Uint8Array {
  return ethers.isHexString(message) ? ethers.getBytes(message) : message;
}

// ─── eth_signTypedData* ──────────────────────────────────────────────────────

export interface TypedDataRequest {
  domain: ethers.TypedDataDomain;
  /** Types without EIP712Domain (what the hash uses). */
  types: Record<string, ethers.TypedDataField[]>;
  message: Record<string, any>;
  /** The primary type the signature actually covers (derived from `types`). */
  primaryType: string;
  /** The full object as sent, for display. */
  json: any;
}

/**
 * Typed-data params are [address, json] (v3/v4). The data is the parameter that
 * isn't the connected account. The primary type is derived from `types` — the
 * same way the hash is computed — and must match any `primaryType` the dApp
 * labelled it with.
 */
export function parseTypedDataParams(params: unknown, account: string | null | undefined): TypedDataRequest {
  const list = Array.isArray(params) ? params : [];
  if (list.length !== 2) throw new RequestParamsError("Malformed typed-data request.");
  const [a, b] = list;
  let payload: unknown;
  if (isAccount(a, account)) payload = b;
  else if (isAccount(b, account)) payload = a;
  else {
    const named = otherAccount(a) ?? otherAccount(b);
    throw new RequestParamsError(
      named ? `This request is for a different account (${named.slice(0, 6)}…${named.slice(-4)}).` : "This request doesn't name your account."
    );
  }

  let json: any = payload;
  if (typeof payload === "string") {
    try {
      json = JSON.parse(payload);
    } catch {
      throw new RequestParamsError("The typed data isn't valid JSON.");
    }
  }
  if (!json || typeof json !== "object" || Array.isArray(json)) throw new RequestParamsError("The typed data is missing.");
  const { domain, types, message } = json;
  if (!types || typeof types !== "object" || !message || typeof message !== "object" || (domain && typeof domain !== "object")) {
    throw new RequestParamsError("The typed data is incomplete.");
  }

  const cleanTypes: Record<string, ethers.TypedDataField[]> = { ...types };
  delete (cleanTypes as any).EIP712Domain;
  let primaryType: string;
  try {
    primaryType = ethers.TypedDataEncoder.getPrimaryType(cleanTypes);
    // Validates the message against the types (throws on mismatch).
    ethers.TypedDataEncoder.hash(domain || {}, cleanTypes, message);
  } catch (err: any) {
    throw new RequestParamsError(`The typed data is invalid: ${err?.shortMessage || err?.message || "unknown error"}`);
  }
  if (json.primaryType !== undefined && json.primaryType !== primaryType) {
    throw new RequestParamsError(
      `The request is labelled "${String(json.primaryType)}" but would sign "${primaryType}". OpenBurner won't sign mislabelled data.`
    );
  }
  return { domain: domain || {}, types: cleanTypes, message, primaryType, json };
}

// ─── eth_sendTransaction / eth_signTransaction ───────────────────────────────

export interface TxRequest {
  from?: string;
  to?: string;
  data: string;
  value: bigint;
  gas?: bigint;
  raw: Record<string, unknown>;
}

function toBigint(v: unknown, field: string): bigint {
  try {
    if (v === undefined || v === null || v === "") return 0n;
    if (typeof v === "bigint") return v;
    if (typeof v === "number" && Number.isSafeInteger(v)) return BigInt(v);
    if (typeof v === "string") return BigInt(v.trim());
  } catch {
    /* fall through */
  }
  throw new RequestParamsError(`Invalid ${field} in transaction.`);
}

/** The transaction object. `data` and the older `input` must agree if both are sent. */
export function parseTxParams(params: unknown): TxRequest {
  const tx = Array.isArray(params) ? params[0] : null;
  if (!tx || typeof tx !== "object") throw new RequestParamsError("Malformed transaction request.");
  const t = tx as Record<string, unknown>;
  const data = typeof t.data === "string" && t.data !== "" ? t.data : undefined;
  const input = typeof t.input === "string" && t.input !== "" ? t.input : undefined;
  if (data && input && data.toLowerCase() !== input.toLowerCase()) {
    throw new RequestParamsError("The transaction has conflicting data and input fields.");
  }
  const body = data ?? input ?? "0x";
  if (!ethers.isHexString(body)) throw new RequestParamsError("The transaction data isn't hex.");
  if (t.to !== undefined && t.to !== null && (typeof t.to !== "string" || !ethers.isAddress(t.to))) {
    throw new RequestParamsError("The transaction recipient isn't a valid address.");
  }
  return {
    from: typeof t.from === "string" ? t.from : undefined,
    to: typeof t.to === "string" ? t.to : undefined,
    data: body,
    value: toBigint(t.value, "value"),
    gas: t.gas !== undefined && t.gas !== null && t.gas !== "" ? toBigint(t.gas, "gas") : undefined,
    raw: t,
  };
}

// ─── wallet_switchEthereumChain / wallet_addEthereumChain ────────────────────

/** A chain id given as hex ("0x2105"), a decimal string or a number. */
export function parseChainIdParam(v: unknown): number {
  let id: number | null = null;
  if (typeof v === "number" && Number.isSafeInteger(v)) id = v;
  else if (typeof v === "string" && /^0x[0-9a-f]+$/i.test(v)) id = parseInt(v, 16);
  else if (typeof v === "string" && /^\d+$/.test(v)) id = parseInt(v, 10);
  if (id === null || !Number.isSafeInteger(id) || id <= 0) throw new RequestParamsError("Invalid chain id.");
  return id;
}
