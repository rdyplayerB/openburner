import { ethers } from "ethers";

/**
 * Shared JSON-RPC providers, one per chainId + RPC URL.
 *
 * `staticNetwork` skips ethers' eth_chainId probe before every first call (and
 * its endless "failed to detect network" retry loop when an RPC is down), and
 * reusing one instance lets ethers batch concurrent calls into one HTTP request.
 */
const providers = new Map<string, ethers.JsonRpcProvider>();

export function getProvider(chainId: number, rpcUrl: string): ethers.JsonRpcProvider {
  const key = `${chainId}:${rpcUrl}`;
  let provider = providers.get(key);
  if (!provider) {
    provider = new ethers.JsonRpcProvider(rpcUrl, chainId, {
      staticNetwork: ethers.Network.from(chainId),
    });
    providers.set(key, provider);
  }
  return provider;
}
