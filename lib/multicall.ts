import { ethers } from "ethers";

// Multicall3 contract deployed on most chains at the same address
const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";

const MULTICALL3_ABI = [
  "function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) returns (tuple(bool success, bytes returnData)[] returnData)",
];

interface Call {
  target: string;
  allowFailure: boolean;
  callData: string;
}

interface Result {
  success: boolean;
  returnData: string;
}

/**
 * Batch multiple contract calls into a single RPC request using Multicall3
 * This dramatically reduces RPC load and avoids rate limiting
 */
export async function multicall3(
  provider: ethers.JsonRpcProvider,
  calls: Call[]
): Promise<Result[]> {
  const multicall = new ethers.Contract(
    MULTICALL3_ADDRESS,
    MULTICALL3_ABI,
    provider
  );

  try {
    // Use staticCall for read-only operations (ethers v6)
    const results = await multicall.aggregate3.staticCall(calls);
    return results.map((r: any) => ({
      success: r.success,
      returnData: r.returnData,
    }));
  } catch (err) {
    console.error("Multicall failed:", err);
    throw err;
  }
}

/**
 * Batch token balance checks using Multicall3
 * Falls back to individual calls if multicall fails (rate limiting)
 */
export async function batchGetBalances(
  provider: ethers.JsonRpcProvider,
  tokenAddresses: string[],
  walletAddress: string
): Promise<Map<string, bigint>> {
  const balanceInterface = new ethers.Interface([
    "function balanceOf(address) view returns (uint256)",
  ]);

  // Try multicall first (much faster if it works)
  try {
    // Create multicall calls for all token balances
    const calls: Call[] = tokenAddresses.map((tokenAddr) => ({
      target: tokenAddr,
      allowFailure: true,
      callData: balanceInterface.encodeFunctionData("balanceOf", [walletAddress]),
    }));

    const results = await multicall3(provider, calls);
    const balances = new Map<string, bigint>();

    results.forEach((result, index) => {
      if (result.success && result.returnData !== "0x") {
        try {
          const [balance] = balanceInterface.decodeFunctionResult(
            "balanceOf",
            result.returnData
          );
          balances.set(tokenAddresses[index].toLowerCase(), balance);
        } catch (err) {
          console.log(`Failed to decode balance for ${tokenAddresses[index]}`);
        }
      }
    });

    return balances;
  } catch (err) {
    console.warn("Multicall failed, falling back to individual calls:", err);
    
    // Fallback: Check balances individually with delays
    const balances = new Map<string, bigint>();
    const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];
    
    for (const tokenAddr of tokenAddresses) {
      try {
        const contract = new ethers.Contract(tokenAddr, ERC20_ABI, provider);
        const balance = await contract.balanceOf(walletAddress);
        if (balance > 0n) {
          balances.set(tokenAddr.toLowerCase(), balance);
        }
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.log(`Failed to check balance for ${tokenAddr}`);
      }
    }
    
    return balances;
  }
}

/**
 * Batch token metadata checks (symbol, name, decimals) using Multicall3
 * Falls back to individual calls if multicall fails (rate limiting)
 */
export async function batchGetTokenMetadata(
  provider: ethers.JsonRpcProvider,
  tokenAddresses: string[]
): Promise<
  Map<
    string,
    { symbol: string; name: string; decimals: number; success: boolean }
  >
> {
  const tokenInterface = new ethers.Interface([
    "function symbol() view returns (string)",
    "function name() view returns (string)",
    "function decimals() view returns (uint8)",
  ]);

  // Try multicall first (much faster if it works)
  try {
    // Create calls for all metadata
    const calls: Call[] = [];
    tokenAddresses.forEach((tokenAddr) => {
      calls.push({
        target: tokenAddr,
        allowFailure: true,
        callData: tokenInterface.encodeFunctionData("symbol"),
      });
      calls.push({
        target: tokenAddr,
        allowFailure: true,
        callData: tokenInterface.encodeFunctionData("name"),
      });
      calls.push({
        target: tokenAddr,
        allowFailure: true,
        callData: tokenInterface.encodeFunctionData("decimals"),
      });
    });

    const results = await multicall3(provider, calls);
    const metadata = new Map();

    for (let i = 0; i < tokenAddresses.length; i++) {
      const symbolResult = results[i * 3];
      const nameResult = results[i * 3 + 1];
      const decimalsResult = results[i * 3 + 2];

      if (
        symbolResult.success &&
        nameResult.success &&
        decimalsResult.success
      ) {
        try {
          const [symbol] = tokenInterface.decodeFunctionResult(
            "symbol",
            symbolResult.returnData
          );
          const [name] = tokenInterface.decodeFunctionResult(
            "name",
            nameResult.returnData
          );
          const [decimals] = tokenInterface.decodeFunctionResult(
            "decimals",
            decimalsResult.returnData
          );

          metadata.set(tokenAddresses[i].toLowerCase(), {
            symbol,
            name,
            decimals: Number(decimals),
            success: true,
          });
        } catch (err) {
          console.log(`Failed to decode metadata for ${tokenAddresses[i]}`);
        }
      }
    }

    return metadata;
  } catch (err) {
    console.warn("Multicall metadata failed, falling back to individual calls:", err);
    
    // Fallback: Fetch metadata individually with delays
    const metadata = new Map();
    const ERC20_ABI = [
      "function symbol() view returns (string)",
      "function name() view returns (string)",
      "function decimals() view returns (uint8)",
    ];
    
    for (const tokenAddr of tokenAddresses) {
      try {
        const contract = new ethers.Contract(tokenAddr, ERC20_ABI, provider);
        const [symbol, name, decimals] = await Promise.all([
          contract.symbol(),
          contract.name(),
          contract.decimals(),
        ]);
        
        metadata.set(tokenAddr.toLowerCase(), {
          symbol,
          name,
          decimals: Number(decimals),
          success: true,
        });
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (err) {
        console.log(`Failed to fetch metadata for ${tokenAddr}`);
      }
    }
    
    return metadata;
  }
}

