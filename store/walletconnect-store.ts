import { create } from "zustand";
import {
  getWalletKit,
  isWalletConnectConfigured,
  pairWithUri,
  approveProposal as wcApproveProposal,
  rejectProposal as wcRejectProposal,
  respondResult,
  respondError,
  disconnectSession,
  getActiveSessions,
  hasSavedSessionsFlag,
  setSavedSessionsFlag,
} from "@/lib/walletconnect/client";
import { requiresSigning } from "@/lib/walletconnect/chains";
import { useWalletStore } from "./wallet-store";
import { showToast } from "./toast-store";
import { log } from "@/lib/log";

interface WalletConnectState {
  configured: boolean;
  initialized: boolean;
  pairing: boolean;
  sessions: any[];
  pendingProposal: any | null;
  /** Head of the request queue (the one shown to the user). */
  pendingRequest: any | null;
  /** Requests that arrived while another was being reviewed. */
  requestQueue: any[];
  error: string | null;

  init: () => Promise<void>;
  /** Boot the SDK only if this browser has saved dApp sessions. */
  initIfHasSessions: () => Promise<void>;
  pair: (uri: string) => Promise<void>;
  approveProposal: () => Promise<void>;
  rejectProposal: () => Promise<void>;
  approveRequest: (pin?: string) => Promise<void>;
  rejectRequest: () => Promise<void>;
  disconnect: (topic: string) => Promise<void>;
  refreshSessions: () => Promise<void>;
  clearError: () => void;
}

let listenersRegistered = false;

function dappName(get: () => WalletConnectState, topic: string): string {
  const s = get().sessions.find((x) => x.topic === topic);
  return s?.peer?.metadata?.name || "the dApp";
}

export const useWalletConnectStore = create<WalletConnectState>((set, get) => {
  /** Drop the current request and show the next queued one, if any. */
  const advanceQueue = () => {
    const [next, ...rest] = get().requestQueue;
    set({ pendingRequest: next ?? null, requestQueue: rest });
  };

  return {
    configured: isWalletConnectConfigured(),
    initialized: false,
    pairing: false,
    sessions: [],
    pendingProposal: null,
    pendingRequest: null,
    requestQueue: [],
    error: null,

    init: async () => {
      if (!isWalletConnectConfigured() || get().initialized) return;
      try {
        const kit = await getWalletKit();
        if (!listenersRegistered) {
          kit.on("session_proposal", (proposal: any) => {
            set({ pendingProposal: proposal });
          });
          kit.on("session_request", (request: any) => {
            // One request is reviewed at a time; later ones wait in a queue
            // instead of being silently dropped.
            if (!get().pendingRequest) set({ pendingRequest: request });
            else set({ requestQueue: [...get().requestQueue, request] });
          });
          kit.on("session_delete", () => {
            get().refreshSessions();
          });
          listenersRegistered = true;
        }
        set({ initialized: true });
        await get().refreshSessions();
      } catch (err: any) {
        log.warn("[WC] init failed:", err?.message);
        const message = err?.message || "Failed to initialize WalletConnect";
        set({ error: message });
        showToast(`WalletConnect unavailable: ${message}`, "error");
      }
    },

    initIfHasSessions: async () => {
      if (hasSavedSessionsFlag()) await get().init();
    },

    pair: async (uri: string) => {
      set({ pairing: true, error: null });
      try {
        await get().init();
        if (!get().initialized) throw new Error(get().error || "WalletConnect failed to start.");
        await pairWithUri(uri);
        // pendingProposal will arrive via the session_proposal event.
      } catch (err: any) {
        log.warn("[WC] pair failed:", err?.message);
        set({ error: err?.message || "Failed to pair. Check the URI and try again." });
      } finally {
        set({ pairing: false });
      }
    },

    approveProposal: async () => {
      const proposal = get().pendingProposal;
      if (!proposal) return;
      const { address } = useWalletStore.getState();
      const name = proposal.params?.proposer?.metadata?.name || "dApp";
      try {
        await wcApproveProposal(proposal, address || "");
        set({ pendingProposal: null });
        setSavedSessionsFlag(true);
        await get().refreshSessions();
        showToast(`Connected to ${name}`, "success");
      } catch (err: any) {
        log.warn("[WC] approve proposal failed:", err?.message);
        const message = err?.message || "Could not connect to this dApp.";
        set({ error: message, pendingProposal: null });
        showToast(`Couldn't connect to ${name}: ${message}`, "error");
      }
    },

    rejectProposal: async () => {
      const proposal = get().pendingProposal;
      if (!proposal) return;
      set({ pendingProposal: null });
      try {
        await wcRejectProposal(proposal.id);
      } catch (err: any) {
        log.warn("[WC] reject proposal failed:", err?.message);
      }
    },

    approveRequest: async (pin?: string) => {
      const request = get().pendingRequest;
      if (!request) return;
      const { topic, id } = request;
      const method: string = request.params.request.method;
      const name = dappName(get, topic);
      try {
        // Signing stack is loaded only when a request is actually approved.
        const { executeRequest } = await import("@/lib/walletconnect/request-handlers");
        const result = await executeRequest(request, { pin });
        await respondResult(topic, id, result);
        advanceQueue();
        if (method === "eth_sendTransaction") {
          showToast(`Transaction sent to the network for ${name}`, "success", 4000);
        } else if (requiresSigning(method)) {
          showToast(`Signed for ${name}`, "success");
        }
      } catch (err: any) {
        log.warn("[WC] request failed:", err?.message);
        // For wrong-PIN / no-card, keep the request open so the user can retry.
        const retryable = /PIN|WRONG_PWD|password|card detected/i.test(err?.message || "");
        if (retryable && requiresSigning(method)) {
          set({ error: err.message });
          throw err; // let the request modal show the error and stay open
        }
        const code = typeof err?.code === "number" ? err.code : 5000;
        const message = err?.message || "Request failed";
        try {
          await respondError(topic, id, code, message);
        } catch (respondErr: any) {
          log.warn("[WC] respondError failed:", respondErr?.message);
        }
        advanceQueue();
        showToast(`Request from ${name} failed: ${message}`, "error");
      }
    },

    rejectRequest: async () => {
      const request = get().pendingRequest;
      if (!request) return;
      advanceQueue();
      try {
        await respondError(request.topic, request.id, 4001, "User rejected");
      } catch (err: any) {
        log.warn("[WC] reject request failed:", err?.message);
        showToast("Couldn't notify the dApp that the request was rejected.", "error");
      }
    },

    disconnect: async (topic: string) => {
      try {
        await disconnectSession(topic);
      } catch (err: any) {
        log.warn("[WC] disconnect failed:", err?.message);
        showToast("Couldn't disconnect the dApp. Try again.", "error");
      }
      await get().refreshSessions();
    },

    refreshSessions: async () => {
      try {
        const sessions = await getActiveSessions();
        set({ sessions });
        setSavedSessionsFlag(sessions.length > 0);
      } catch {
        /* not initialized yet */
      }
    },

    clearError: () => set({ error: null }),
  };
});
