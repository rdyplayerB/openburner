/**
 * Turn raw ethers / RPC / card errors into short, plain-language messages.
 * Never returns a JSON blob or stack-trace-like text.
 */
export function friendlyTxError(err: any, nativeSymbol = "ETH"): string {
  const code: string | undefined = err?.code;
  const raw = String(err?.shortMessage || err?.reason || err?.message || "").trim();
  const msg = raw.toLowerCase();

  if (msg.includes("wrong_pwd") || msg.includes("incorrect pin") || msg.includes("password")) {
    return "Incorrect PIN. Please try again.";
  }
  if (msg.includes("no burner card detected")) {
    return "No Burner card detected. Place your card on the reader and try again.";
  }
  if (msg.includes("another signing operation")) {
    return "Another signature is in progress. Wait for it to finish and try again.";
  }
  if (code === "ACTION_REJECTED" || msg.includes("user rejected")) {
    return "Signing was cancelled.";
  }
  if (code === "INSUFFICIENT_FUNDS" || msg.includes("insufficient funds")) {
    return `Not enough ${nativeSymbol} to cover the amount plus the network fee.`;
  }
  if (code === "NONCE_EXPIRED" || msg.includes("nonce too low") || msg.includes("nonce has already been used")) {
    return "A previous transaction is still settling. Wait a moment and try again.";
  }
  if (code === "REPLACEMENT_UNDERPRICED" || msg.includes("underpriced")) {
    return "Network fee too low to replace a pending transaction. Try again shortly.";
  }
  if (code === "CALL_EXCEPTION" || msg.includes("execution reverted")) {
    return "The network rejected this transaction (it would fail on-chain). Check the amount and try again.";
  }
  if (code === "NUMERIC_FAULT" || code === "INVALID_ARGUMENT") {
    return "That amount or address isn't valid.";
  }
  if (code === "TIMEOUT" || msg.includes("timeout")) {
    return "The network took too long to respond. Check your connection and try again.";
  }
  if (code === "NETWORK_ERROR" || code === "SERVER_ERROR" || msg.includes("failed to fetch")) {
    return "Couldn't reach the network. Check your connection and try again.";
  }
  if (!raw) return "Something went wrong. Please try again.";
  // Keep the first sentence and drop any embedded JSON / data dumps.
  const first = raw.split(/[({[]/)[0].split(/\. /)[0].trim();
  return first.length > 0 && first.length < 160 ? first : "Something went wrong. Please try again.";
}

/** True for errors where the PIN dialog should stay open for a retry. */
export function isRetryablePinError(err: any): boolean {
  const msg = String(err?.message || "").toLowerCase();
  return (
    msg.includes("wrong_pwd") ||
    msg.includes("incorrect pin") ||
    msg.includes("password") ||
    msg.includes("no burner card detected")
  );
}
