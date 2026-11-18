import { describe, it, expect } from "vitest";
import { ethers } from "ethers";
import { broadcastSigned, BroadcastUncertainError } from "@/lib/broadcast";

const signed = "0x02f86c0180843b9aca00850ba43b740082520894000000000000000000000000000000000000dead0180c001a0aa00000000000000000000000000000000000000000000000000000000000001a0bb00000000000000000000000000000000000000000000000000000000000002";
const hash = ethers.keccak256(signed);

/** A provider stand-in: scripted broadcast outcomes, and whether the network "has" the hash. */
function fakeProvider(outcomes: Array<"ok" | "timeout" | "known" | "funds" | "nonce">, known = () => false) {
  const sent: string[] = [];
  const provider = {
    async broadcastTransaction(tx: string) {
      sent.push(tx);
      const next = outcomes.shift() ?? "ok";
      if (next === "ok") return { hash };
      if (next === "timeout") throw Object.assign(new Error("request timeout"), { code: "TIMEOUT" });
      if (next === "known") throw new Error("already known");
      if (next === "nonce") throw Object.assign(new Error("nonce too low"), { code: "NONCE_EXPIRED" });
      throw Object.assign(new Error("insufficient funds for gas * price + value"), { code: "INSUFFICIENT_FUNDS" });
    },
    async getTransaction() {
      return known() ? { hash } : null;
    },
  } as unknown as ethers.Provider;
  return { provider, sent };
}

describe("broadcastSigned", () => {
  it("returns the hash when the RPC accepts the transaction", async () => {
    const { provider } = fakeProvider(["ok"]);
    expect(await broadcastSigned(provider, signed, 0)).toBe(hash);
  });

  it("resends the same bytes after a timeout, never a new transaction", async () => {
    const { provider, sent } = fakeProvider(["timeout", "ok"]);
    expect(await broadcastSigned(provider, signed, 0)).toBe(hash);
    expect(sent).toEqual([signed, signed]);
  });

  it("treats 'already known' as sent", async () => {
    const { provider } = fakeProvider(["timeout", "known"]);
    expect(await broadcastSigned(provider, signed, 0)).toBe(hash);
  });

  it("counts a timed-out send as sent when the network has the hash", async () => {
    const { provider, sent } = fakeProvider(["timeout"], () => true);
    expect(await broadcastSigned(provider, signed, 0)).toBe(hash);
    expect(sent.length).toBe(1);
  });

  it("says it can't tell when every attempt times out and the hash isn't found", async () => {
    const { provider } = fakeProvider(["timeout", "timeout", "timeout"]);
    const err = await broadcastSigned(provider, signed, 0).catch((e) => e);
    expect(err).toBeInstanceOf(BroadcastUncertainError);
    expect(err.hash).toBe(hash);
  });

  it("passes real rejections straight through without retrying", async () => {
    const { provider, sent } = fakeProvider(["funds"]);
    await expect(broadcastSigned(provider, signed, 0)).rejects.toThrow(/insufficient funds/);
    expect(sent.length).toBe(1);
  });

  it("treats 'nonce too low' as sent only when the network has this hash", async () => {
    expect(await broadcastSigned(fakeProvider(["timeout", "nonce"], () => false).provider, signed, 0).catch((e) => e.message)).toMatch(/nonce too low/);
    let calls = 0;
    // Not found during the timeout check, found once the nonce error arrives.
    expect(await broadcastSigned(fakeProvider(["timeout", "nonce"], () => ++calls > 1).provider, signed, 0)).toBe(hash);
  });
});
