import { ethers } from "ethers";

/**
 * Card key handling shared by every connect path (USB bridge, phone gateway,
 * mobile Web NFC).
 *
 * A card key is accepted only if it is exactly a valid secp256k1 public key.
 * Keys are never padded or truncated: a "repaired" key can decode to a real
 * curve point whose address nobody controls.
 */

export interface CardKey {
  /** Checksummed Ethereum address derived from the key */
  address: string;
  /** Compressed public key, hex without 0x (66 chars) */
  publicKey: string;
  /** Card key slot the key lives in */
  keySlot: number;
  /** Whether the card returned a publicKeyAttest for this slot (not yet verified) */
  attestationPresent: boolean;
}

export class MalformedCardKeyError extends Error {
  readonly code = "MALFORMED_CARD_KEY";
  constructor() {
    super("This card returned an unreadable key. Try again; contact support if it repeats.");
    this.name = "MalformedCardKeyError";
  }
}

export class NoCardKeysError extends Error {
  readonly code = "NO_CARD_KEYS";
  constructor() {
    super("No wallet key found on this card. Keep the card in place and try again.");
    this.name = "NoCardKeysError";
  }
}

/** Slots scanned, in priority order: 9 (user wallet) > 8 (preloaded) > 2 (system). */
export const KEY_SLOTS = [9, 8, 2] as const;

/** One get_data_struct request that returns every slot's key in a single tap. */
export const SCAN_SPEC =
  "latchValue:2,graffiti:1,compressedPublicKey:2,compressedPublicKey:9,publicKeyAttest:9,compressedPublicKey:8,publicKeyAttest:8";

/**
 * True when get_data_struct reported nothing for a slot: null/empty, or an
 * error object such as {"error": "keySlotNotGenerated"}.
 */
export function isEmptySlotValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  if (typeof value === "object" && value !== null && "error" in value) return true;
  return false;
}

/**
 * Parse a public key returned by the card. Accepts only:
 *  - 66 hex chars with prefix 02/03 (compressed), or
 *  - 130 hex chars with prefix 04 (uncompressed),
 * optionally prefixed with 0x. The point must lie on the curve.
 * Throws MalformedCardKeyError otherwise.
 */
export function parseCardPublicKey(raw: unknown): { publicKey: string; address: string } {
  if (typeof raw !== "string") throw new MalformedCardKeyError();
  const hex = (raw.startsWith("0x") || raw.startsWith("0X") ? raw.slice(2) : raw).toLowerCase();
  if (!/^[0-9a-f]+$/.test(hex)) throw new MalformedCardKeyError();

  const prefix = hex.slice(0, 2);
  const shapeOk =
    (hex.length === 66 && (prefix === "02" || prefix === "03")) ||
    (hex.length === 130 && prefix === "04");
  if (!shapeOk) throw new MalformedCardKeyError();

  let compressed: string;
  try {
    // Rejects points that are not on secp256k1.
    compressed = ethers.SigningKey.computePublicKey("0x" + hex, true);
  } catch {
    throw new MalformedCardKeyError();
  }
  return {
    publicKey: compressed.slice(2),
    address: ethers.computeAddress(compressed),
  };
}

/** Runs one HaLo command on whichever transport is connected. */
export type HaloExec = (command: Record<string, unknown>) => Promise<any>;

/**
 * Pick the wallet key from a get_data_struct result.
 * Empty slots are skipped; a malformed key fails the whole scan (fail closed).
 */
export function selectCardKey(data: Record<string, unknown>): CardKey | null {
  for (const keySlot of KEY_SLOTS) {
    const value = data[`compressedPublicKey:${keySlot}`];
    if (isEmptySlotValue(value)) continue;
    const { publicKey, address } = parseCardPublicKey(value);
    return {
      address,
      publicKey,
      keySlot,
      attestationPresent: !isEmptySlotValue(data[`publicKeyAttest:${keySlot}`]),
    };
  }
  return null;
}

/**
 * Scan the card for its wallet key.
 *
 * @param exec  transport-specific command runner
 * @param opts.allowPerSlotFallback  if the combined scan fails, query each slot
 *        with get_key_info (desktop transports only — on mobile Web NFC every
 *        command is a separate tap)
 */
export async function scanCardKeys(
  exec: HaloExec,
  opts: { allowPerSlotFallback?: boolean } = {}
): Promise<CardKey> {
  let result: any;
  try {
    result = await exec({ name: "get_data_struct", spec: SCAN_SPEC });
  } catch (error) {
    if (!opts.allowPerSlotFallback) throw error;
    return scanPerSlot(exec);
  }

  const data = (result && typeof result === "object" && result.data) || result || {};
  const key = selectCardKey(data);
  if (!key) throw new NoCardKeysError();
  return key;
}

async function scanPerSlot(exec: HaloExec): Promise<CardKey> {
  for (const keySlot of KEY_SLOTS) {
    let info: any;
    try {
      info = await exec({ name: "get_key_info", keyNo: keySlot });
    } catch {
      continue; // slot not generated / not available
    }
    if (isEmptySlotValue(info?.publicKey)) continue;
    const { publicKey, address } = parseCardPublicKey(info.publicKey);
    return {
      address,
      publicKey,
      keySlot,
      attestationPresent: !isEmptySlotValue(info?.attestSig),
    };
  }
  throw new NoCardKeysError();
}
