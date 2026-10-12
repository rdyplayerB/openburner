import { ethers } from "ethers";
import { knobs, net, sleep } from "../scenario";
import { BALANCES } from "../fixtures";

/**
 * A pretend RPC: balances from fixtures, a cheap Base-like fee, and
 * transactions that settle per the `tx` knob. Only hashes broadcast in this
 * session ever get a receipt, so seeded "pending" activity stays pending.
 */
const erc20 = new ethers.Interface([
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
]);
const sent = new Set<string>();

class FakeProvider {
  constructor(readonly chainId: number) {}
  async getNetwork() {
    return ethers.Network.from(this.chainId);
  }
  async getBalance() {
    await net();
    return ethers.parseEther(BALANCES.native.balance);
  }
  async estimateGas(tx: { data?: string }) {
    await net();
    return tx.data && tx.data !== "0x" ? 68_000n : 21_000n;
  }
  async getFeeData() {
    return new ethers.FeeData(6_000_000n, 9_000_000n, 1_000_000n);
  }
  async getTransactionCount() {
    return 7;
  }
  async broadcastTransaction(signed: string) {
    await net();
    const hash = ethers.keccak256(ethers.toUtf8Bytes(`${signed}:${Date.now()}`));
    sent.add(hash);
    return { hash, wait: () => this.waitForTransaction(hash) };
  }
  async waitForTransaction(hash: string, _confirms?: number, timeout?: number) {
    if (knobs.tx === "pending") {
      await sleep(Math.min(timeout ?? 5000, 5000));
      throw Object.assign(new Error("timeout"), { code: "TIMEOUT" });
    }
    await sleep(2400);
    return { hash, status: knobs.tx === "failed" ? 0 : 1 };
  }
  async getTransactionReceipt(hash: string) {
    if (!sent.has(hash) || knobs.tx === "pending") return null;
    return { hash, status: knobs.tx === "failed" ? 0 : 1 };
  }
  async call(tx: { to?: string; data?: string }) {
    await net();
    const token = BALANCES[(tx.to || "").toLowerCase()];
    const fn = erc20.getFunction((tx.data || "0x").slice(0, 10));
    if (!token || !fn) throw Object.assign(new Error("execution reverted"), { code: "CALL_EXCEPTION" });
    const value =
      fn.name === "symbol" ? token.symbol : fn.name === "name" ? token.name : fn.name === "decimals" ? token.decimals : ethers.parseUnits(token.balance, token.decimals);
    return erc20.encodeFunctionResult(fn, [value]);
  }
  async resolveName(name: string) {
    return ethers.isAddress(name) ? name : null;
  }
}

export function getProvider(chainId: number, _rpcUrl?: string): ethers.JsonRpcProvider {
  return new FakeProvider(chainId) as unknown as ethers.JsonRpcProvider;
}
