import { describe, it, expect, afterAll, vi } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { FailoverRpcProvider, getProvider, RETURN_TO_PRIMARY_MS } from "@/lib/provider";
import { CHAINS } from "@/lib/supported-chains";

const servers: http.Server[] = [];
const hits = { down: 0, up: 0, small: 0 };

/** A JSON-RPC server that answers eth_blockNumber / eth_chainId, always fails, or rejects batches over 3. */
async function serve(kind: "down" | "up" | "small"): Promise<string> {
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      hits[kind]++;
      if (kind === "down") {
        res.writeHead(503).end("unavailable");
        return;
      }
      const payload = JSON.parse(body);
      if (kind === "small" && Array.isArray(payload) && payload.length > 3) {
        res.writeHead(413).end("batch too large");
        return;
      }
      const answer = (p: any) => ({ jsonrpc: "2.0", id: p.id, result: p.method === "eth_chainId" ? "0x89" : "0x10" });
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(Array.isArray(payload) ? payload.map(answer) : answer(payload)));
    });
  });
  servers.push(server);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

afterAll(() => servers.forEach((s) => s.close()));

/** An RPC that can be switched off and on, counting the requests it gets. */
async function serveSwitchable() {
  const state = { down: true, hits: 0 };
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      state.hits++;
      if (state.down) return void res.writeHead(503).end("unavailable");
      const payload = JSON.parse(body);
      const answer = (p: any) => ({ jsonrpc: "2.0", id: p.id, result: "0x10" });
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(Array.isArray(payload) ? payload.map(answer) : answer(payload)));
    });
  });
  servers.push(server);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, state };
}

describe("RPC failover", () => {
  it("moves to the backup when the primary is down, and stays there", async () => {
    const provider = new FailoverRpcProvider([await serve("down"), await serve("up")], 137);
    expect(await provider.getBlockNumber()).toBe(16);
    expect(provider.currentUrl).toBe(provider.urls[1]);
    const downBefore = hits.down;
    expect(await provider.getBlockNumber()).toBeGreaterThanOrEqual(16);
    expect(hits.down).toBe(downBefore); // doesn't keep trying the dead one
    provider.destroy();
  });

  it("goes back to the primary a few minutes after failing over", async () => {
    const primary = await serveSwitchable();
    const provider = new FailoverRpcProvider([primary.url, await serve("up")], 137);
    let now = 1_000_000;
    const clock = vi.spyOn(Date, "now").mockImplementation(() => now);
    try {
      await provider.getBlockNumber();
      expect(provider.currentUrl).toBe(provider.urls[1]);
      primary.state.down = false;
      now += RETURN_TO_PRIMARY_MS - 1000;
      await provider.send("eth_blockNumber", []);
      expect(provider.currentUrl).toBe(provider.urls[1]); // still inside the window
      now += 2000;
      const before = primary.state.hits;
      await provider.send("eth_blockNumber", []);
      expect(primary.state.hits).toBe(before + 1);
      expect(provider.currentUrl).toBe(provider.urls[0]);
    } finally {
      clock.mockRestore();
      provider.destroy();
    }
  });

  it("re-sends a batch call by call when the RPC caps batch size", async () => {
    const provider = new FailoverRpcProvider([await serve("small")], 137);
    const numbers = await Promise.all(Array.from({ length: 8 }, () => provider.getBlockNumber()));
    expect(numbers.every((n) => n === 16)).toBe(true);
    provider.destroy();
  });

  it("gives preset networks a backup and added networks just their own RPC", () => {
    const polygon = CHAINS.find((c) => c.chainId === 137)!;
    expect(polygon.rpcUrls.length).toBeGreaterThan(1);
    expect((getProvider(137, polygon.rpcUrl) as FailoverRpcProvider).urls).toEqual(polygon.rpcUrls);
    expect((getProvider(250, "https://rpc.example.org") as FailoverRpcProvider).urls).toEqual(["https://rpc.example.org"]);
  });

  it("every preset's primary RPC is its first entry, and backups differ", () => {
    for (const c of CHAINS) {
      expect(c.rpcUrls[0]).toBe(c.rpcUrl);
      expect(new Set(c.rpcUrls).size).toBe(c.rpcUrls.length);
    }
  });
});
