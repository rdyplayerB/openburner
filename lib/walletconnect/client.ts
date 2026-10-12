/**
 * WalletConnect (Reown WalletKit) client singleton.
 *
 * Holds the WalletKit instance, handles init/pairing/session lifecycle, and exposes thin
 * helpers used by the store. The Burner only ever signs after the user confirms a request
 * (PIN + tap), so this module never signs on its own.
 *
 * The WalletConnect SDK (~400 kB) is loaded with dynamic import() the first time it is
 * needed — i.e. when the user opens "Connect to dApp" or already has saved sessions.
 */
import { buildSupportedNamespaces } from "./chains";
import { getUserKey } from "../user-keys";

type WalletKitModule = typeof import("@reown/walletkit");
type WalletKitInstance = Awaited<ReturnType<WalletKitModule["WalletKit"]["init"]>>;

// User-entered project id (this browser) takes precedence over the build env var.
function projectId(): string {
  return getUserKey("walletconnect") || process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";
}

const METADATA = {
  name: "OpenBurner",
  description: "An open-source app for Burner Ethereum cards",
  url: typeof window !== "undefined" ? window.location.origin : "https://openburner.xyz",
  icons: ["https://openburner.xyz/icons/icon-512x512.png"],
};

/** localStorage flag: set while at least one dApp session exists, so we only boot the SDK when useful. */
const HAS_SESSIONS_KEY = "openburner:wc-has-sessions";

export function hasSavedSessionsFlag(): boolean {
  try {
    return localStorage.getItem(HAS_SESSIONS_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSavedSessionsFlag(has: boolean): void {
  try {
    if (has) localStorage.setItem(HAS_SESSIONS_KEY, "1");
    else localStorage.removeItem(HAS_SESSIONS_KEY);
  } catch {
    /* storage unavailable */
  }
}

let walletKit: WalletKitInstance | null = null;
let initPromise: Promise<WalletKitInstance> | null = null;

export function isWalletConnectConfigured(): boolean {
  return projectId().length > 0;
}

export function isWalletKitLoaded(): boolean {
  return walletKit !== null;
}

function loadUtils() {
  return import("@walletconnect/utils");
}

/** Initialize (once) and return the WalletKit instance. Throws if no project id is set. */
export async function getWalletKit(): Promise<WalletKitInstance> {
  if (walletKit) return walletKit;
  const id = projectId();
  if (!id) {
    throw new Error("WalletConnect is not configured. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.");
  }
  if (!initPromise) {
    initPromise = (async () => {
      const [{ Core }, { WalletKit }] = await Promise.all([
        import("@walletconnect/core"),
        import("@reown/walletkit"),
      ]);
      const core = new Core({ projectId: id });
      const kit = await WalletKit.init({ core, metadata: METADATA });
      walletKit = kit;
      return kit;
    })().catch((err) => {
      initPromise = null; // allow a retry after a failed init
      throw err;
    });
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
  const [kit, { buildApprovedNamespaces }] = await Promise.all([getWalletKit(), loadUtils()]);
  const approvedNamespaces = buildApprovedNamespaces({
    proposal: proposal.params,
    supportedNamespaces: buildSupportedNamespaces(address),
  });
  return kit.approveSession({ id: proposal.id, namespaces: approvedNamespaces });
}

export async function rejectProposal(proposalId: number) {
  const [kit, { getSdkError }] = await Promise.all([getWalletKit(), loadUtils()]);
  await kit.rejectSession({ id: proposalId, reason: getSdkError("USER_REJECTED") });
}

/** Send a successful JSON-RPC result back to the dApp. */
export async function respondResult(topic: string, id: number, result: any) {
  const kit = await getWalletKit();
  await kit.respondSessionRequest({ topic, response: { id, jsonrpc: "2.0", result } });
}

/** Send a JSON-RPC error back to the dApp. */
export async function respondError(topic: string, id: number, code = 5000, message = "User rejected") {
  const kit = await getWalletKit();
  await kit.respondSessionRequest({
    topic,
    response: { id, jsonrpc: "2.0", error: { code, message } },
  });
}

export async function disconnectSession(topic: string) {
  const [kit, { getSdkError }] = await Promise.all([getWalletKit(), loadUtils()]);
  await kit.disconnectSession({ topic, reason: getSdkError("USER_DISCONNECTED") });
}

/**
 * Add a newly saved network to every open session, so apps that are already
 * connected (including the one that asked to add it) can use it. A no-op when
 * WalletConnect hasn't been loaded, since there are no sessions to update.
 */
export async function addChainToSessions(chainId: number, address: string): Promise<void> {
  if (!walletKit) return;
  const chain = `eip155:${chainId}`;
  for (const session of Object.values(walletKit.getActiveSessions())) {
    const ns = session.namespaces?.eip155;
    if (!ns || ns.chains?.includes(chain) || ns.accounts.some((a: string) => a.startsWith(`${chain}:`))) continue;
    await walletKit.updateSession({
      topic: session.topic,
      namespaces: {
        ...session.namespaces,
        eip155: { ...ns, chains: [...(ns.chains ?? []), chain], accounts: [...ns.accounts, `${chain}:${address}`] },
      },
    });
  }
}

export async function getActiveSessions() {
  const kit = await getWalletKit();
  return Object.values(kit.getActiveSessions());
}
