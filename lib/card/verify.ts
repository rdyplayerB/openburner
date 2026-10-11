import { ethers } from "ethers";

/**
 * Every signature the card returns must recover to the connected address.
 * This catches a different card being tapped, a wrong key slot, and a
 * tampered gateway link — before anything is broadcast or handed to a dApp.
 */

export class SignerMismatchError extends Error {
  readonly code = "SIGNER_MISMATCH";
  constructor() {
    super("This isn't the card you connected. Tap the card you signed in with and try again.");
    this.name = "SignerMismatchError";
  }
}

function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/** Throws unless the serialized signed transaction was signed by `expected`. */
export function assertTxSignedBy(serializedTx: string, expected: string): void {
  let from: string | null = null;
  try {
    from = ethers.Transaction.from(serializedTx).from;
  } catch {
    from = null;
  }
  if (!from || !sameAddress(from, expected)) throw new SignerMismatchError();
}

/** Throws unless `signature` over the 32-byte `digest` recovers to `expected`. */
export function assertDigestSignedBy(
  digest: string,
  signature: ethers.SignatureLike,
  expected: string
): void {
  let recovered: string | null = null;
  try {
    recovered = ethers.recoverAddress(digest.startsWith("0x") ? digest : "0x" + digest, signature);
  } catch {
    recovered = null;
  }
  if (!recovered || !sameAddress(recovered, expected)) throw new SignerMismatchError();
}
