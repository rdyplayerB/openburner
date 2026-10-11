import { ethers } from "ethers";
import { getAppConfig, AppConfig } from "./config/environment";
import { useWalletStore } from "../store/wallet-store";
import { buildUnsignedTx, signCommand, signatureFromResult } from "./card/tx";
import { assertTxSignedBy, assertDigestSignedBy, SignerMismatchError } from "./card/verify";
import { log } from "./log";

/**
 * Routes signing to the active transport (mobile Web NFC, phone gateway, or USB
 * bridge), then checks that the signature recovers to the connected address
 * before anything is broadcast or returned to a dApp.
 *
 * Transports are imported on demand so libhalo stays out of the first load.
 */

type Exec = (command: Record<string, unknown>) => Promise<any>;

let signing = false;

async function getExec(config?: AppConfig): Promise<Exec> {
  const env = config || getAppConfig();
  const { connectionMode } = useWalletStore.getState();

  if (env.isHosted && env.isMobile) {
    const { runNfcCommand } = await import("./mobile/nfc");
    return runNfcCommand;
  }
  if (env.isHosted || connectionMode === "gateway") {
    const { runGatewayCommand } = await import("./burner-gateway");
    return runGatewayCommand;
  }
  const { runBridgeCommand } = await import("./burner");
  return runBridgeCommand;
}

/** The connected wallet, or an error telling the user to reconnect. */
function connectedWallet(): { address: string; keySlot: number } {
  const { address, keySlot } = useWalletStore.getState();
  if (!address || !keySlot) {
    throw new Error("Your card session is missing its key. Disconnect and tap your card again.");
  }
  return { address, keySlot };
}

function friendlyError(error: any, fallback: string): Error {
  if (error instanceof SignerMismatchError) return error;
  const msg = String(error?.message || "");
  if (msg.includes("No Burner card detected")) {
    return new Error("No Burner card detected. Please place your Burner card on the reader and try again.");
  }
  if (msg.includes("WRONG_PWD") || msg.includes("Incorrect PIN") || msg.includes("password")) {
    return new Error("Incorrect PIN. Please try again.");
  }
  if (msg.includes("GATEWAY_SESSION_CLOSED") || msg.includes("no connection open")) {
    return new Error("Phone connection dropped. Reconnect your phone and keep it awake, then try again.");
  }
  if (msg.includes("GATEWAY_EXECUTOR_TIMEOUT") || msg.includes("no executor connected")) {
    return new Error("Waiting on your phone timed out. Wake your phone (keep the gateway page open), then try again.");
  }
  if (msg.includes("transaction type not supported")) {
    return new Error("Transaction type not supported. Please try again.");
  }
  return new Error(msg || fallback);
}

async function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  if (signing) {
    throw new Error("Please wait for the current operation to complete before trying again.");
  }
  signing = true;
  try {
    return await fn();
  } finally {
    signing = false;
  }
}

/**
 * Sign a transaction with the connected card. Returns the serialized signed tx.
 * `_keySlot` is ignored: the slot always comes from the connected card session.
 */
export async function signTransactionSmart(
  transaction: ethers.TransactionRequest,
  _keySlot?: number | null,
  pin?: string,
  config?: AppConfig
): Promise<string> {
  return exclusive(async () => {
    try {
      const { address, keySlot } = connectedWallet();
      const exec = await getExec(config);
      const tx = buildUnsignedTx(transaction);
      const result = await exec(signCommand(tx.unsignedHash, keySlot, pin));
      tx.signature = signatureFromResult(result);
      const serialized = tx.serialized;
      assertTxSignedBy(serialized, address);
      return serialized;
    } catch (error) {
      log.warn("[Signer] Transaction signing failed");
      throw friendlyError(error, "Failed to sign transaction");
    }
  });
}

/**
 * Sign a raw 32-byte digest (message / typed-data signing).
 */
export async function signDigestSmart(
  digest: string,
  _keySlot?: number | null,
  pin?: string,
  config?: AppConfig
): Promise<ethers.Signature> {
  return exclusive(async () => {
    try {
      const { address, keySlot } = connectedWallet();
      const exec = await getExec(config);
      const result = await exec(signCommand(digest, keySlot, pin));
      const signature = signatureFromResult(result);
      assertDigestSignedBy(digest, signature, address);
      return signature;
    } catch (error) {
      log.warn("[Signer] Message signing failed");
      throw friendlyError(error, "Failed to sign message");
    }
  });
}

/**
 * Sign an EIP-191 personal message. `message` may be a UTF-8 string or raw bytes.
 * Returns a 65-byte 0x-prefixed signature.
 */
export async function signMessageSmart(
  message: string | Uint8Array,
  keySlot?: number | null,
  pin?: string,
  config?: AppConfig
): Promise<string> {
  const digest = ethers.hashMessage(message);
  const sig = await signDigestSmart(digest, keySlot, pin, config);
  return sig.serialized;
}

/**
 * Sign EIP-712 typed data. `types` may include EIP712Domain (it is stripped before hashing).
 * Returns a 65-byte 0x-prefixed signature.
 */
export async function signTypedDataSmart(
  domain: ethers.TypedDataDomain,
  types: Record<string, Array<ethers.TypedDataField>>,
  message: Record<string, any>,
  keySlot?: number | null,
  pin?: string,
  config?: AppConfig
): Promise<string> {
  const cleanTypes = { ...types };
  delete (cleanTypes as any).EIP712Domain;
  const digest = ethers.TypedDataEncoder.hash(domain, cleanTypes, message);
  const sig = await signDigestSmart(digest, keySlot, pin, config);
  return sig.serialized;
}
