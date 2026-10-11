import { ethers } from "ethers";
import { rpcRateLimiter } from "./rpc-rate-limiter";
import { log } from "./log";

// Multicall3 is deployed at the same address on almost every EVM chain.
const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";

const multicallInterface = new ethers.Interface([
  "function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[] returnData)",
  "function getEthBalance(address addr) view returns (uint256 balance)",
]);
const erc20Interface = new ethers.Interface([
  "function balanceOf(address) view returns (uint256)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
]);

interface Call {
  target: string;
  allowFailure: boolean;
  callData: string;
}

interface Result {
  success: boolean;
  returnData: string;
}

/** Per-chain memo of whether Multicall3 exists (avoids a getCode probe per load). */
const multicallAvailable = new Map<number, boolean>();

/** Errors that mean "the RPC itself is unreachable", as opposed to "no multicall here". */
function isTransportError(err: any): boolean {
  const code = err?.code;
  return (
    code === "NETWORK_ERROR" ||
    code === "TIMEOUT" ||
    code === "SERVER_ERROR" ||
    code === "UNKNOWN_ERROR" ||
    err instanceof TypeError // fetch failed
  );
}

async function chainIdOf(provider: ethers.JsonRpcProvider): Promise<number> {
  return Number((await provider.getNetwork()).chainId);
}

/**
 * Run calls through Multicall3.aggregate3 in a single eth_call.
 * Throws if the RPC is unreachable or Multicall3 is missing.
 */
export async function multicall3(provider: ethers.JsonRpcProvider, calls: Call[]): Promise<Result[]> {
  const data = multicallInterface.encodeFunctionData("aggregate3", [calls]);
  const raw = await rpcRateLimiter.makeRequest(() =>
    provider.call({ to: MULTICALL3_ADDRESS, data })
  );
  const [results] = multicallInterface.decodeFunctionResult("aggregate3", raw);
  return results.map((r: any) => ({ success: r.success, returnData: r.returnData }));
}

/**
 * Try a multicall; on a chain without Multicall3 return null (and remember it).
 * Transport errors are re-thrown so callers can surface "RPC unreachable".
 */
async function tryMulticall(provider: ethers.JsonRpcProvider, calls: Call[]): Promise<Result[] | null> {
  const chainId = await chainIdOf(provider);
  if (multicallAvailable.get(chainId) === false) return null;
  try {
    const results = await multicall3(provider, calls);
    multicallAvailable.set(chainId, true);
    return results;
  } catch (err) {
    if (isTransportError(err)) throw err;
    // Empty return data / revert => no Multicall3 on this chain.
    log.debug("[multicall] unavailable on chain", chainId);
    multicallAvailable.set(chainId, false);
    return null;
  }
}

function decodeUint(result: Result | undefined, fn: "balanceOf" | "getEthBalance"): bigint | undefined {
  if (!result?.success || !result.returnData || result.returnData === "0x") return undefined;
  try {
    const iface = fn === "getEthBalance" ? multicallInterface : erc20Interface;
    return iface.decodeFunctionResult(fn, result.returnData)[0] as bigint;
  } catch {
    return undefined;
  }
}

export interface BalanceResult {
  /** Native balance (only when `includeNative` was set). */
  native?: bigint;
  /** ERC-20 balances keyed by lowercase token address. */
  tokens: Map<string, bigint>;
}

/**
 * Fetch the native balance and every ERC-20 balance in one eth_call (Multicall3),
 * falling back to parallel individual calls on chains without Multicall3.
 * Throws when the RPC is unreachable so the UI can keep last-known values.
 */
export async function batchGetBalances(
  provider: ethers.JsonRpcProvider,
  tokenAddresses: string[],
  walletAddress: string,
  opts: { includeNative?: boolean } = {}
): Promise<BalanceResult> {
  const includeNative = !!opts.includeNative;
  const calls: Call[] = [];
  if (includeNative) {
    calls.push({
      target: MULTICALL3_ADDRESS,
      allowFailure: true,
      callData: multicallInterface.encodeFunctionData("getEthBalance", [walletAddress]),
    });
  }
  for (const token of tokenAddresses) {
    calls.push({
      target: token,
      allowFailure: true,
      callData: erc20Interface.encodeFunctionData("balanceOf", [walletAddress]),
    });
  }

  const out: BalanceResult = { tokens: new Map() };
  const results = calls.length > 0 ? await tryMulticall(provider, calls) : [];

  if (results) {
    let i = 0;
    if (includeNative) {
      out.native = decodeUint(results[i++], "getEthBalance");
      // Some chains' Multicall3 deployments lack getEthBalance — fall back.
      if (out.native === undefined) {
        out.native = await rpcRateLimiter.makeRequest(() => provider.getBalance(walletAddress));
      }
    }
    tokenAddresses.forEach((token) => {
      const bal = decodeUint(results[i++], "balanceOf");
      if (bal !== undefined) out.tokens.set(token.toLowerCase(), bal);
    });
    return out;
  }

  // Fallback: individual calls in parallel (bounded by the RPC limiter).
  const nativePromise = includeNative
    ? rpcRateLimiter.makeRequest(() => provider.getBalance(walletAddress))
    : Promise.resolve(undefined);
  const tokenPromises = tokenAddresses.map(async (token) => {
    try {
      const raw = await rpcRateLimiter.makeRequest(() =>
        provider.call({ to: token, data: erc20Interface.encodeFunctionData("balanceOf", [walletAddress]) })
      );
      const bal = decodeUint({ success: true, returnData: raw }, "balanceOf");
      if (bal !== undefined) out.tokens.set(token.toLowerCase(), bal);
    } catch (err) {
      if (isTransportError(err)) throw err;
    }
  });
  const [native] = await Promise.all([nativePromise, ...tokenPromises]);
  out.native = native as bigint | undefined;
  return out;
}

export interface TokenMetadata {
  symbol: string;
  name: string;
  decimals: number;
  success: boolean;
}

/**
 * Batch token metadata (symbol, name, decimals) via Multicall3, with an
 * individual-call fallback. Missing/undecodable tokens are simply absent.
 */
export async function batchGetTokenMetadata(
  provider: ethers.JsonRpcProvider,
  tokenAddresses: string[]
): Promise<Map<string, TokenMetadata>> {
  const metadata = new Map<string, TokenMetadata>();
  if (tokenAddresses.length === 0) return metadata;

  const fns = ["symbol", "name", "decimals"] as const;
  const calls: Call[] = tokenAddresses.flatMap((target) =>
    fns.map((fn) => ({ target, allowFailure: true, callData: erc20Interface.encodeFunctionData(fn) }))
  );

  const decode = (fn: (typeof fns)[number], r: Result | undefined) => {
    if (!r?.success || !r.returnData || r.returnData === "0x") return undefined;
    try {
      return erc20Interface.decodeFunctionResult(fn, r.returnData)[0];
    } catch {
      return undefined;
    }
  };

  const results = await tryMulticall(provider, calls);
  if (results) {
    tokenAddresses.forEach((token, i) => {
      const symbol = decode("symbol", results[i * 3]);
      const name = decode("name", results[i * 3 + 1]);
      const decimals = decode("decimals", results[i * 3 + 2]);
      if (symbol !== undefined && name !== undefined && decimals !== undefined) {
        metadata.set(token.toLowerCase(), { symbol, name, decimals: Number(decimals), success: true });
      }
    });
    return metadata;
  }

  await Promise.all(
    tokenAddresses.map(async (token) => {
      try {
        const raws = await Promise.all(
          fns.map((fn) =>
            rpcRateLimiter.makeRequest(() =>
              provider.call({ to: token, data: erc20Interface.encodeFunctionData(fn) })
            )
          )
        );
        const [symbol, name, decimals] = fns.map((fn, i) => decode(fn, { success: true, returnData: raws[i] }));
        if (symbol !== undefined && name !== undefined && decimals !== undefined) {
          metadata.set(token.toLowerCase(), { symbol, name, decimals: Number(decimals), success: true });
        }
      } catch {
        /* skip this token */
      }
    })
  );
  return metadata;
}
