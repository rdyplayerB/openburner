/**
 * WalletConnect session_request handlers.
 *
 * executeRequest() runs after the user confirms a request in the UI (PIN collected for
 * signing methods). It routes by method, signs via the Burner (smart-signer), and returns
 * the JSON-RPC result. Errors thrown carry an optional `.code` for the dApp response.
 */
import { ethers } from "ethers";
import { broadcastSigned, BroadcastUncertainError } from "../broadcast";
import { feeFields } from "@/lib/card/tx";
import { addChainToSessions } from "./client";
import { CURRENCY_SYMBOL_RE, getChainConfig } from "@/lib/supported-chains";
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
  requiresSigning,
} from "./chains";
import { getProvider } from "../provider";
import {
  parseChainIdParam,
  parsePersonalSignParams,
  parseTxParams,
  parseTypedDataParams,
  personalSignPayload,
  RequestParamsError,
} from "./params";

export class RpcError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

export { requiresSigning };

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
  const { keySlot, address: account } = useWalletStore.getState();

  try {
    return await execute();
  } catch (err) {
    if (err instanceof RequestParamsError) throw new RpcError(err.code, err.message);
    throw err;
  }

  // Parameters are parsed with the same helpers the review screen uses, so the
  // card signs exactly what was shown.
  async function execute(): Promise<any> {
    switch (method) {
      case "eth_sign":
        // Blind signing is intentionally not supported.
        throw new RpcError(4001, "Blind signing (eth_sign) is not supported by OpenBurner.");

      case "personal_sign": {
        const message = parsePersonalSignParams(params, account);
        return signMessageSmart(personalSignPayload(message), keySlot, pin, config);
      }

      case "eth_signTypedData":
      case "eth_signTypedData_v3":
      case "eth_signTypedData_v4": {
        const { domain, types, message } = parseTypedDataParams(params, account);
        return signTypedDataSmart(domain, types, message, keySlot, pin, config);
      }

      case "eth_sendTransaction":
      case "eth_signTransaction": {
        const rpcUrl = getRpcForChain(requestChainId);
        if (!rpcUrl) {
          throw new RpcError(4902, `No RPC configured for chain ${requestChainId}.`);
        }
        autoSwitchActiveChain(requestChainId);

        const tx = parseTxParams(params);
        if (!account) throw new RpcError(4100, "No wallet connected.");
        const provider = getProvider(requestChainId, rpcUrl);
        // Always the connected card's account (the signer refuses any other).
        const from = account;

        const [nonce, feeData] = await rpcRateLimiter.makeRequest(async () =>
          Promise.all([provider.getTransactionCount(from), provider.getFeeData()])
        );

        // Gas: use dApp-provided limit or estimate (+20%).
        let gasLimit: bigint;
        if (tx.gas) {
          gasLimit = tx.gas;
        } else {
          const est = await rpcRateLimiter
            .makeRequest(async () => provider.estimateGas({ from, to: tx.to, data: tx.data, value: tx.value }))
            .catch(() => 100000n);
          gasLimit = (est * 120n) / 100n;
        }

        const base: ethers.TransactionRequest = {
          to: tx.to,
          value: tx.value,
          data: tx.data,
          nonce,
          chainId: requestChainId,
          gasLimit,
        };

        const transaction: ethers.TransactionRequest = { ...base, ...feeFields(requestChainId, feeData) };

        const signedTx = await signTransactionSmart(transaction, keySlot, pin, config);

        if (method === "eth_signTransaction") {
          return signedTx;
        }
        // Returning the hash even when the RPC didn't confirm it got the transaction
        // stops the app from asking for a second signature (which could pay twice).
        // The transaction goes into Activity, which settles it either way.
        try {
          return await rpcRateLimiter.makeRequest(() => broadcastSigned(provider, signedTx));
        } catch (err) {
          if (err instanceof BroadcastUncertainError) return err.hash;
          throw err;
        }
      }

      case "wallet_switchEthereumChain": {
        const target = parseChainIdParam(params?.[0]?.chainId);
        const info = getChainInfo(target);
        if (!info) {
          throw new RpcError(4902, `Chain ${target} is not configured. Add an RPC for it in Network settings.`);
        }
        useWalletStore.getState().setChain(target, info.rpcUrl, info.name);
        return null;
      }

      case "wallet_addEthereumChain": {
        const p = params?.[0] ?? {};
        const target = parseChainIdParam(p.chainId);
        // A built-in network keeps its tested RPCs: switch to it instead of saving the app's RPC.
        const preset = getChainConfig(target);
        if (preset) {
          useWalletStore.getState().setChain(target, preset.rpcUrl, preset.name);
          return null;
        }
        const rpcUrl: string | undefined = (p.rpcUrls || [])[0];
        if (!rpcUrl) throw new RpcError(4001, "No RPC URL provided by dApp.");

        // Validate the provided RPC actually serves the claimed chain id.
        // staticNetwork: true => one eth_chainId probe, no endless retry loop on a bad URL.
        const probe = new ethers.JsonRpcProvider(rpcUrl, undefined, { staticNetwork: true });
        const net = await probe.getNetwork().catch(() => null);
        probe.destroy();
        if (!net || Number(net.chainId) !== target) {
          throw new RpcError(4001, "The dApp-provided RPC did not match the requested chain.");
        }

        const name: string = p.chainName || `Chain ${target}`;
        const symbol = typeof p.nativeCurrency?.symbol === "string" ? p.nativeCurrency.symbol.trim() : "";
        const currencyName = typeof p.nativeCurrency?.name === "string" ? p.nativeCurrency.name.trim().slice(0, 40) : "";
        const existing = JSON.parse(localStorage.getItem("customRPCs") || "{}");
        existing[String(target)] = {
          name,
          rpcUrl,
          ...(CURRENCY_SYMBOL_RE.test(symbol) ? { symbol, ...(currencyName ? { currencyName } : {}) } : {}),
        };
        localStorage.setItem("customRPCs", JSON.stringify(existing));

        // Let the asking app (and any other open session) use the new network.
        if (account) await addChainToSessions(target, account);
        useWalletStore.getState().setChain(target, rpcUrl, name);
        return null;
      }

      default:
        throw new RpcError(4200, `Method ${method} is not supported.`);
    }
  }
}
