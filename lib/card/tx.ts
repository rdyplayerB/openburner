import { ethers } from "ethers";

/**
 * Transaction / signature helpers shared by every transport.
 */

type FeeFields = Pick<ethers.TransactionRequest, "type" | "gasPrice" | "maxFeePerGas" | "maxPriorityFeePerGas">;

/**
 * Fee fields for a transaction on this network. EIP-1559 where the network
 * reports a base fee; a legacy gasPrice where it doesn't (so any EVM network
 * works, including ones added by RPC). Base is always signed as legacy.
 */
export function feeFields(chainId: number | bigint, fee: ethers.FeeData): FeeFields {
  if (Number(chainId) === 8453 || fee.maxFeePerGas == null) {
    return { type: 0, gasPrice: fee.gasPrice };
  }
  return { type: 2, maxFeePerGas: fee.maxFeePerGas, maxPriorityFeePerGas: fee.maxPriorityFeePerGas };
}

/** Build the unsigned transaction the card will sign. */
export function buildUnsignedTx(transaction: ethers.TransactionRequest): ethers.Transaction {
  // Legacy (type 0) when asked for, when only a gasPrice is given, and always on Base.
  const isLegacy =
    transaction.type === 0 ||
    transaction.chainId === 8453 ||
    (transaction.maxFeePerGas == null && transaction.gasPrice != null);
  return ethers.Transaction.from({
    to: transaction.to as string,
    value: transaction.value?.toString(),
    data: transaction.data as string,
    nonce: transaction.nonce as number,
    gasLimit: transaction.gasLimit?.toString(),
    chainId: transaction.chainId as number,
    type: isLegacy ? 0 : 2,
    ...(isLegacy
      ? { gasPrice: transaction.gasPrice?.toString() }
      : {
          maxFeePerGas: transaction.maxFeePerGas?.toString(),
          maxPriorityFeePerGas: transaction.maxPriorityFeePerGas?.toString(),
        }),
  });
}

/** The HaLo `sign` command for a 32-byte digest. */
export function signCommand(digest: string, keySlot: number, pin?: string): Record<string, unknown> {
  const command: Record<string, unknown> = {
    name: "sign",
    keyNo: keySlot,
    digest: digest.startsWith("0x") ? digest.slice(2) : digest,
  };
  if (pin) command.password = pin;
  return command;
}

/** Convert a HaLo sign result (raw r/s/v) into an ethers Signature with v in 27/28. */
export function signatureFromResult(result: any): ethers.Signature {
  const sig = result?.signature?.raw || result?.signature;
  if (!sig?.r || !sig?.s || sig.v === undefined) {
    throw new Error("The card returned no signature. Try again.");
  }
  let v = Number(sig.v);
  if (v < 27) v += 27;
  return ethers.Signature.from({ r: "0x" + sig.r, s: "0x" + sig.s, v });
}
