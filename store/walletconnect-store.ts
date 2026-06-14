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
} from "@/lib/walletconnect/client";
import { executeRequest, RpcError, requiresSigning } from "@/lib/walletconnect/request-handlers";
import { useWalletStore } from "./wallet-store";

interface WalletConnectState {
  configured: boolean;
  initialized: boolean;
  pairing: boolean;
  sessions: any[];
  pendingProposal: any | null;
  pendingRequest: any | null;
  error: string | null;

  init: () => Promise<void>;
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

export const useWalletConnectStore = create<WalletConnectState>((set, get) => ({
  configured: isWalletConnectConfigured(),
  initialized: false,
  pairing: false,
  sessions: [],
  pendingProposal: null,
  pendingRequest: null,
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
          // Queue: only show one at a time (signing is serialized anyway).
          if (!get().pendingRequest) set({ pendingRequest: request });
        });
        kit.on("session_delete", () => {
          get().refreshSessions();
        });
        listenersRegistered = true;
      }
      set({ initialized: true });
      await get().refreshSessions();
    } catch (err: any) {
      console.error("[WC] init failed:", err);
      set({ error: err.message || "Failed to initialize WalletConnect" });
    }
  },

  pair: async (uri: string) => {
    set({ pairing: true, error: null });
    try {
      await get().init();
      await pairWithUri(uri);
      // pendingProposal will arrive via the session_proposal event.
    } catch (err: any) {
      console.error("[WC] pair failed:", err);
      set({ error: err.message || "Failed to pair. Check the URI and try again." });
    } finally {
      set({ pairing: false });
    }
  },

  approveProposal: async () => {
    const proposal = get().pendingProposal;
    if (!proposal) return;
    const { address } = useWalletStore.getState();
    try {
      await wcApproveProposal(proposal, address || "");
      set({ pendingProposal: null });
      await get().refreshSessions();
    } catch (err: any) {
      console.error("[WC] approve proposal failed:", err);
      set({ error: err.message || "Could not connect to this dApp.", pendingProposal: null });
    }
  },

  rejectProposal: async () => {
    const proposal = get().pendingProposal;
    if (!proposal) return;
    try {
      await wcRejectProposal(proposal.id);
    } catch (err) {
      console.error("[WC] reject proposal failed:", err);
    }
    set({ pendingProposal: null });
  },

  approveRequest: async (pin?: string) => {
    const request = get().pendingRequest;
    if (!request) return;
    const { topic } = request;
    const { id } = request;
    try {
      const result = await executeRequest(request, { pin });
      await respondResult(topic, id, result);
      set({ pendingRequest: null });
    } catch (err: any) {
      console.error("[WC] request failed:", err);
      const code = err instanceof RpcError ? err.code : 5000;
      // For wrong-PIN / no-card, keep the request open so the user can retry.
      const retryable = /PIN|card detected/i.test(err.message || "");
      if (retryable && requiresSigning(request.params.request.method)) {
        set({ error: err.message });
        throw err; // let the request modal show the error and stay open
      }
      await respondError(topic, id, code, err.message || "Request failed");
      set({ pendingRequest: null });
    }
  },

  rejectRequest: async () => {
    const request = get().pendingRequest;
    if (!request) return;
    try {
      await respondError(request.topic, request.id, 4001, "User rejected");
    } catch (err) {
      console.error("[WC] reject request failed:", err);
    }
    set({ pendingRequest: null });
  },

  disconnect: async (topic: string) => {
    try {
      await disconnectSession(topic);
    } catch (err) {
      console.error("[WC] disconnect failed:", err);
    }
    await get().refreshSessions();
  },

  refreshSessions: async () => {
    try {
      const sessions = await getActiveSessions();
      set({ sessions });
    } catch {
      /* not initialized yet */
    }
  },

  clearError: () => set({ error: null }),
}));
