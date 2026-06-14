/**
 * WalletConnect (Reown WalletKit) client singleton.
 *
 * Holds the WalletKit instance, handles init/pairing/session lifecycle, and exposes thin
 * helpers used by the store. The Burner only ever signs after the user confirms a request
 * (PIN + tap), so this module never signs on its own.
 */
import { Core } from "@walletconnect/core";
import { WalletKit } from "@reown/walletkit";
import { buildApprovedNamespaces, getSdkError } from "@walletconnect/utils";
import { buildSupportedNamespaces } from "./chains";
import { getUserKey } from "../user-keys";

type WalletKitInstance = Awaited<ReturnType<typeof WalletKit.init>>;

// User-entered project id (this browser) takes precedence over the build env var.
function projectId(): string {
  return getUserKey("walletconnect") || process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";
}

const METADATA = {
  name: "OpenBurner",
  description: "OpenBurner — a web3 wallet for Burner hardware cards",
  url: typeof window !== "undefined" ? window.location.origin : "https://openburner.xyz",
  icons: ["https://openburner.xyz/openburnerlogo.svg"],
};

let walletKit: WalletKitInstance | null = null;
let initPromise: Promise<WalletKitInstance> | null = null;

export function isWalletConnectConfigured(): boolean {
  return projectId().length > 0;
}

/** Initialize (once) and return the WalletKit instance. Throws if no project id is set. */
export async function getWalletKit(): Promise<WalletKitInstance> {
  if (walletKit) return walletKit;
  const id = projectId();
  if (!id) {
    throw new Error(
      "WalletConnect is not configured. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID."
    );
  }
  if (!initPromise) {
    initPromise = (async () => {
      const core = new Core({ projectId: id });
      const kit = await WalletKit.init({ core, metadata: METADATA });
      walletKit = kit;
      return kit;
    })();
  }
  return initPromise;
}

/** Pair with a dApp from a `wc:` URI (scanned or pasted). */
export async function pairWithUri(uri: string): Promise<void> {
  const kit = await getWalletKit();
  await kit.pair({ uri: uri.trim() });
}

/** Approve a session proposal, scoped to the chains we can serve. */
export async function approveProposal(proposal: any, address: string) {
  const kit = await getWalletKit();
  const approvedNamespaces = buildApprovedNamespaces({
    proposal: proposal.params,
    supportedNamespaces: buildSupportedNamespaces(address),
  });
  return kit.approveSession({ id: proposal.id, namespaces: approvedNamespaces });
}

export async function rejectProposal(proposalId: number) {
  const kit = await getWalletKit();
  await kit.rejectSession({ id: proposalId, reason: getSdkError("USER_REJECTED") });
}

/** Send a successful JSON-RPC result back to the dApp. */
export async function respondResult(topic: string, id: number, result: any) {
  const kit = await getWalletKit();
  await kit.respondSessionRequest({ topic, response: { id, jsonrpc: "2.0", result } });
}

/** Send a JSON-RPC error back to the dApp. */
export async function respondError(
  topic: string,
  id: number,
  code = 5000,
  message = "User rejected"
) {
  const kit = await getWalletKit();
  await kit.respondSessionRequest({
    topic,
    response: { id, jsonrpc: "2.0", error: { code, message } },
  });
}

export async function disconnectSession(topic: string) {
  const kit = await getWalletKit();
  await kit.disconnectSession({ topic, reason: getSdkError("USER_DISCONNECTED") });
}

export async function getActiveSessions() {
  const kit = await getWalletKit();
  return Object.values(kit.getActiveSessions());
}

export { getSdkError };
