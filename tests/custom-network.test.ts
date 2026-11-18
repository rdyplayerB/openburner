import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getNativeName, getNativeSymbol } from "@/lib/supported-chains";

const store = new Map<string, string>();
const g = globalThis as any;

beforeEach(() => {
  g.window = {};
  g.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) };
});
afterEach(() => {
  delete g.window;
  delete g.localStorage;
  store.clear();
});

const save = (saved: object) => store.set("customRPCs", JSON.stringify(saved));

describe("custom network currency", () => {
  it("shows a custom network's own symbol and name", () => {
    save({ 250: { name: "Fantom", rpcUrl: "https://rpc.example.org", symbol: "FTM", currencyName: "Fantom" } });
    expect(getNativeSymbol(250)).toBe("FTM");
    expect(getNativeName(250)).toBe("Fantom");
  });

  it("falls back to ETH without a symbol, or with one that isn't a plain symbol", () => {
    save({ 250: { name: "A", rpcUrl: "x" }, 251: { name: "B", rpcUrl: "x", symbol: "<script>" } });
    expect(getNativeSymbol(250)).toBe("ETH");
    expect(getNativeSymbol(251)).toBe("ETH");
  });

  it("keeps built-in networks' symbols even if a custom entry exists", () => {
    save({ 137: { name: "Polygon", rpcUrl: "x", symbol: "FAKE" } });
    expect(getNativeSymbol(137)).toBe("POL");
  });
});

describe("custom network prices", () => {
  it("doesn't price an unnamed coin as Ether", async () => {
    const { sourceFor } = await import("@/lib/price-oracle");
    save({ 250: { name: "Fantom", rpcUrl: "x" } });
    expect(sourceFor({ symbol: "ETH", address: "native", chainId: 250 })).toBeNull();
  });

  it("prices a coin by the symbol its owner gave it", async () => {
    const { sourceFor } = await import("@/lib/price-oracle");
    save({ 7777777: { name: "Zora", rpcUrl: "x", symbol: "ETH" } });
    expect(sourceFor({ symbol: "ETH", address: "native", chainId: 7777777 })).toMatchObject({ kind: "id", id: "ethereum" });
  });

  it("never prices tokens on a custom network by symbol", async () => {
    const { sourceFor } = await import("@/lib/price-oracle");
    save({ 250: { name: "Fantom", rpcUrl: "x", symbol: "FTM" } });
    expect(sourceFor({ symbol: "USDC", address: "0x0000000000000000000000000000000000000001", chainId: 250 })).toBeNull();
  });

  it("leaves built-in networks as they were", async () => {
    const { sourceFor } = await import("@/lib/price-oracle");
    expect(sourceFor({ symbol: "POL", address: "native", chainId: 137 })).not.toBeNull();
  });
});

describe("your own RPC for a built-in network", () => {
  it("replaces the public primary and backup, and can be removed", async () => {
    const { getPresetRpcUrls, getPrimaryRpcUrl, setRpcOverride, getChainConfig } = await import("@/lib/supported-chains");
    const publicUrls = getChainConfig(1)!.rpcUrls;
    setRpcOverride(1, "https://my-node.example.org");
    expect(getPresetRpcUrls(1)).toEqual(["https://my-node.example.org"]);
    expect(getPrimaryRpcUrl(1)).toBe("https://my-node.example.org");
    setRpcOverride(1, null);
    expect(getPresetRpcUrls(1)).toEqual(publicUrls);
  });

  it("ignores saved overrides for networks that aren't built in", async () => {
    const { getPrimaryRpcUrl } = await import("@/lib/supported-chains");
    store.set("rpcOverrides", JSON.stringify({ 250: "https://x.example.org" }));
    expect(getPrimaryRpcUrl(250)).toBeUndefined();
  });
});
