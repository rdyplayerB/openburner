/**
 * WalletConnect session_request handlers.
 *
 * executeRequest() runs after the user confirms a request in the UI (PIN collected for
 * signing methods). It routes by method, signs via the Burner (smart-signer), and returns
 * the JSON-RPC result. Errors thrown carry an optional `.code` for the dApp response.
 */
import { ethers } from "ethers";
import {
  signTransactionSmart,
  signMessageSmart,
  signTypedDataSmart,
} from "../smart-signer";
import { rpcRateLimiter } from "../rpc-rate-limiter";
import { useWalletStore } from "../../store/wallet-store";
import { getAppConfig, AppConfig } from "../config/environment";
import {
  getRpcForChain,
  getChainInfo,
  parseCaipChainId,
} from "./chains";

export class RpcError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

/** Signing methods require a PIN + Burner tap; switch/add only need confirmation. */
export function requiresSigning(method: string): boolean {
  return [
    "eth_sendTransaction",
    "eth_signTransaction",
    "personal_sign",
    "eth_sign",
    "eth_signTypedData",
    "eth_signTypedData_v3",
    "eth_signTypedData_v4",
  ].includes(method);
}

/** Auto-switch the app's active chain to `chainId` when we can serve it. */
function autoSwitchActiveChain(chainId: number) {
  const store = useWalletStore.getState();
  if (store.chainId === chainId) return;
  const info = getChainInfo(chainId);
  if (info) {
    store.setChain(chainId, info.rpcUrl, info.name);
  }
}

interface ExecuteOptions {
  pin?: string;
  config?: AppConfig;
}

/**
 * Execute a confirmed WalletConnect request and return its JSON-RPC result.
 * `request` is the full WalletKit session_request event.
 */
export async function executeRequest(request: any, opts: ExecuteOptions = {}): Promise<any> {
  const { pin } = opts;
  const config = opts.config || getAppConfig();
  const { method, params } = request.params.request;
  const requestChainId = parseCaipChainId(request.params.chainId);
  const { keySlot } = useWalletStore.getState();

  switch (method) {
    case "eth_sign":
      // Blind signing is intentionally not supported.
      throw new RpcError(4001, "Blind signing (eth_sign) is not supported by OpenBurner.");

    case "personal_sign": {
      // params: [message, address]
      const raw = params[0];
      const message = ethers.isHexString(raw) ? ethers.getBytes(raw) : raw;
      return signMessageSmart(message, keySlot || 1, pin, config);
    }

    case "eth_signTypedData":
    case "eth_signTypedData_v3":
    case "eth_signTypedData_v4": {
      // params: [address, typedDataJson]
      const json = typeof params[1] === "string" ? JSON.parse(params[1]) : params[1];
      const { domain, types, message } = json;
      return signTypedDataSmart(domain, types, message, keySlot || 1, pin, config);
    }

    case "eth_sendTransaction":
    case "eth_signTransaction": {
      const rpcUrl = getRpcForChain(requestChainId);
      if (!rpcUrl) {
        throw new RpcError(4902, `No RPC configured for chain ${requestChainId}.`);
      }
      autoSwitchActiveChain(requestChainId);

      const txParam = params[0];
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const from: string = txParam.from;
      const isBaseNetwork = requestChainId === 8453;

      const [nonce, feeData] = await rpcRateLimiter.makeRequest(async () =>
        Promise.all([provider.getTransactionCount(from), provider.getFeeData()])
      );

      // Gas: use dApp-provided limit or estimate (+20%).
      let gasLimit: bigint;
      if (txParam.gas) {
        gasLimit = BigInt(txParam.gas);
      } else {
        const est = await rpcRateLimiter
          .makeRequest(async () =>
            provider.estimateGas({
              from,
              to: txParam.to,
              data: txParam.data || "0x",
              value: txParam.value ? BigInt(txParam.value) : 0n,
            })
          )
          .catch(() => 100000n);
        gasLimit = (est * 120n) / 100n;
      }

      const base: ethers.TransactionRequest = {
        to: txParam.to,
        value: txParam.value ? BigInt(txParam.value) : 0n,
        data: txParam.data || "0x",
        nonce,
        chainId: requestChainId,
        gasLimit,
      };

      const transaction: ethers.TransactionRequest = isBaseNetwork
        ? { ...base, type: 0, gasPrice: feeData.gasPrice }
        : {
            ...base,
            type: 2,
            maxFeePerGas: feeData.maxFeePerGas,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
          };

      const signedTx = await signTransactionSmart(transaction, keySlot || 1, pin, config);

      if (method === "eth_signTransaction") {
        return signedTx;
      }
      const txResponse = await rpcRateLimiter.makeRequest(async () =>
        provider.broadcastTransaction(signedTx)
      );
      return txResponse.hash;
    }

    case "wallet_switchEthereumChain": {
      const target = parseInt(params[0].chainId, 16);
      const info = getChainInfo(target);
      if (!info) {
        throw new RpcError(4902, `Chain ${target} is not configured. Add an RPC for it in Network settings.`);
      }
      useWalletStore.getState().setChain(target, info.rpcUrl, info.name);
      return null;
    }

    case "wallet_addEthereumChain": {
      const p = params[0];
      const target = parseInt(p.chainId, 16);
      const rpcUrl: string | undefined = (p.rpcUrls || [])[0];
      if (!rpcUrl) throw new RpcError(4001, "No RPC URL provided by dApp.");

      // Validate the provided RPC actually serves the claimed chain id.
      const probe = new ethers.JsonRpcProvider(rpcUrl);
      const net = await probe.getNetwork().catch(() => null);
      if (!net || Number(net.chainId) !== target) {
        throw new RpcError(4001, "The dApp-provided RPC did not match the requested chain.");
      }

      const name: string = p.chainName || `Chain ${target}`;
      const existing = JSON.parse(localStorage.getItem("customRPCs") || "{}");
      existing[String(target)] = { name, rpcUrl };
      localStorage.setItem("customRPCs", JSON.stringify(existing));

      useWalletStore.getState().setChain(target, rpcUrl, name);
      return null;
    }

    default:
      throw new RpcError(4200, `Method ${method} is not supported.`);
  }
}
