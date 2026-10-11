import { describe, it, expect } from "vitest";
import { ethers } from "ethers";
import {
  parseCardPublicKey,
  selectCardKey,
  scanCardKeys,
  MalformedCardKeyError,
  NoCardKeysError,
} from "@/lib/card/keys";

const wallet = ethers.Wallet.createRandom();
const compressed = wallet.signingKey.compressedPublicKey.slice(2); // 66 hex
const uncompressed = wallet.signingKey.publicKey.slice(2); // 130 hex

describe("parseCardPublicKey", () => {
  it("accepts a compressed key and derives the right address", () => {
    const { address, publicKey } = parseCardPublicKey(compressed);
    expect(address).toBe(wallet.address);
    expect(publicKey).toBe(compressed);
  });

  it("accepts an uncompressed key and a 0x prefix", () => {
    expect(parseCardPublicKey(uncompressed).address).toBe(wallet.address);
    expect(parseCardPublicKey("0x" + compressed).address).toBe(wallet.address);
  });

  it.each([
    ["short key (would have been padded)", compressed.slice(0, 64)],
    ["long key (would have been truncated)", compressed + "00"],
    ["non-hex", "zz" + compressed.slice(2)],
    ["wrong prefix", "05" + compressed.slice(2)],
    ["empty string", ""],
  ])("rejects %s", (_label, raw) => {
    expect(() => parseCardPublicKey(raw)).toThrow(MalformedCardKeyError);
  });

  it("rejects a point that is not on the curve", () => {
    // x = 5 has no y on secp256k1 (5^3 + 7 = 132 is not a quadratic residue)
    const offCurve = "02" + "0".repeat(63) + "5";
    expect(() => parseCardPublicKey(offCurve)).toThrow(MalformedCardKeyError);
  });

  it("rejects non-string values", () => {
    expect(() => parseCardPublicKey({ error: "keySlotNotGenerated" })).toThrow(MalformedCardKeyError);
    expect(() => parseCardPublicKey(null)).toThrow(MalformedCardKeyError);
  });
});

describe("selectCardKey", () => {
  it("prefers slot 9, then 8, then 2", () => {
    const other = ethers.Wallet.createRandom().signingKey.compressedPublicKey.slice(2);
    const key = selectCardKey({
      "compressedPublicKey:9": { error: "keySlotNotGenerated" },
      "compressedPublicKey:8": compressed,
      "compressedPublicKey:2": other,
      "publicKeyAttest:8": "3045aa",
    });
    expect(key?.keySlot).toBe(8);
    expect(key?.address).toBe(wallet.address);
    expect(key?.attestationPresent).toBe(true);
  });

  it("treats null and error objects as empty slots", () => {
    expect(
      selectCardKey({ "compressedPublicKey:9": null, "compressedPublicKey:8": { error: "x" } })
    ).toBeNull();
  });

  it("fails closed on a malformed key instead of skipping to another slot", () => {
    expect(() =>
      selectCardKey({
        "compressedPublicKey:9": compressed.slice(0, 64),
        "compressedPublicKey:8": compressed,
      })
    ).toThrow(MalformedCardKeyError);
  });
});

describe("scanCardKeys", () => {
  it("reads the key from a get_data_struct result", async () => {
    const exec = async () => ({ isPartial: false, data: { "compressedPublicKey:9": compressed } });
    const key = await scanCardKeys(exec);
    expect(key.keySlot).toBe(9);
    expect(key.address).toBe(wallet.address);
  });

  it("throws NoCardKeysError when no slot has a key", async () => {
    const exec = async () => ({ data: { "compressedPublicKey:9": null } });
    await expect(scanCardKeys(exec)).rejects.toThrow(NoCardKeysError);
  });

  it("falls back to get_key_info per slot only when allowed", async () => {
    const exec = async (cmd: Record<string, unknown>) => {
      if (cmd.name === "get_data_struct") throw new Error("unsupported");
      if (cmd.keyNo === 9) throw new Error("keySlotNotGenerated");
      return { publicKey: uncompressed, attestSig: "" };
    };
    await expect(scanCardKeys(exec)).rejects.toThrow("unsupported");
    const key = await scanCardKeys(exec, { allowPerSlotFallback: true });
    expect(key.keySlot).toBe(8);
    expect(key.address).toBe(wallet.address);
  });

  it("rejects a malformed key from the per-slot fallback", async () => {
    const exec = async (cmd: Record<string, unknown>) => {
      if (cmd.name === "get_data_struct") throw new Error("unsupported");
      return { publicKey: uncompressed.slice(0, 128) };
    };
    await expect(scanCardKeys(exec, { allowPerSlotFallback: true })).rejects.toThrow(
      MalformedCardKeyError
    );
  });
});
