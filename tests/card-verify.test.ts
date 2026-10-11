import { describe, it, expect } from "vitest";
import { ethers } from "ethers";
import { assertTxSignedBy, assertDigestSignedBy, SignerMismatchError } from "@/lib/card/verify";
import { buildUnsignedTx, signCommand, signatureFromResult } from "@/lib/card/tx";

const card = ethers.Wallet.createRandom();
const otherCard = ethers.Wallet.createRandom();

/** Mimic the HaLo sign result shape: raw r/s (no 0x) and v as 0/1. */
function haloSign(wallet: ethers.HDNodeWallet, digest: string) {
  const sig = wallet.signingKey.sign(digest);
  return { signature: { raw: { r: sig.r.slice(2), s: sig.s.slice(2), v: sig.yParity } } };
}

const txRequest: ethers.TransactionRequest = {
  to: "0x000000000000000000000000000000000000dEaD",
  value: 1n,
  nonce: 0,
  gasLimit: 21000n,
  chainId: 1,
  maxFeePerGas: 1n,
  maxPriorityFeePerGas: 1n,
};

describe("transaction signature binding", () => {
  it("accepts a transaction signed by the connected card", () => {
    const tx = buildUnsignedTx(txRequest);
    tx.signature = signatureFromResult(haloSign(card, tx.unsignedHash));
    expect(() => assertTxSignedBy(tx.serialized, card.address)).not.toThrow();
  });

  it("rejects a transaction signed by a different card", () => {
    const tx = buildUnsignedTx(txRequest);
    tx.signature = signatureFromResult(haloSign(otherCard, tx.unsignedHash));
    expect(() => assertTxSignedBy(tx.serialized, card.address)).toThrow(SignerMismatchError);
  });

  it("signs Base as a legacy transaction", () => {
    const tx = buildUnsignedTx({ ...txRequest, chainId: 8453, gasPrice: 1n });
    expect(tx.type).toBe(0);
  });
});

describe("digest signature binding", () => {
  const digest = ethers.hashMessage("hello");

  it("accepts the connected card's signature", () => {
    const sig = signatureFromResult(haloSign(card, digest));
    expect(sig.v === 27 || sig.v === 28).toBe(true);
    expect(() => assertDigestSignedBy(digest, sig, card.address)).not.toThrow();
  });

  it("rejects another card's signature", () => {
    const sig = signatureFromResult(haloSign(otherCard, digest));
    expect(() => assertDigestSignedBy(digest, sig, card.address)).toThrow(SignerMismatchError);
  });
});

describe("signCommand", () => {
  it("strips 0x and only includes the PIN when given", () => {
    expect(signCommand("0xabcd", 9)).toEqual({ name: "sign", keyNo: 9, digest: "abcd" });
    expect(signCommand("abcd", 8, "123456")).toMatchObject({ password: "123456" });
  });

  it("rejects an empty sign result", () => {
    expect(() => signatureFromResult({})).toThrow();
  });
});
