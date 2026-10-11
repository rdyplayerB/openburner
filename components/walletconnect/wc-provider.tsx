"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useWalletStore } from "@/store/wallet-store";
import { useWalletConnectStore } from "@/store/walletconnect-store";
import { Modal } from "@/components/common/modal";
import { ErrorBoundary } from "@/components/common/error-boundary";

const WcSessionProposal = dynamic(() => import("./wc-session-proposal").then((m) => m.WcSessionProposal), {
  ssr: false,
});
const WcRequestModal = dynamic(() => import("./wc-request-modal").then((m) => m.WcRequestModal), {
  ssr: false,
});

/**
 * Mounts once inside the connected dashboard. Boots WalletConnect only when this browser
 * already has dApp sessions (otherwise it waits until the user opens "Connect to dApp"),
 * and renders incoming session proposals / requests over any tab.
 */
export function WcProvider() {
  const isConnected = useWalletStore((s) => s.isConnected);
  const address = useWalletStore((s) => s.address);
  const configured = useWalletConnectStore((s) => s.configured);
  const initIfHasSessions = useWalletConnectStore((s) => s.initIfHasSessions);
  const proposalId = useWalletConnectStore((s) => s.pendingProposal?.id);
  const requestId = useWalletConnectStore((s) => (s.pendingRequest ? `${s.pendingRequest.topic}:${s.pendingRequest.id}` : null));
  const rejectProposal = useWalletConnectStore((s) => s.rejectProposal);
  const rejectRequest = useWalletConnectStore((s) => s.rejectRequest);
  const hasProposal = proposalId !== undefined;
  const hasRequest = requestId !== null;

  useEffect(() => {
    if (configured && isConnected && address) {
      initIfHasSessions();
    }
  }, [configured, isConnected, address, initIfHasSessions]);

  return (
    <>
      {hasProposal && (
        <ErrorBoundary resetKey={proposalId} fallback={<Unreadable what="connection request" onReject={rejectProposal} />}>
          <WcSessionProposal />
        </ErrorBoundary>
      )}
      {hasRequest && (
        <ErrorBoundary resetKey={requestId} fallback={<Unreadable what="request" onReject={rejectRequest} />}>
          <WcRequestModal />
        </ErrorBoundary>
      )}
    </>
  );
}

/** Shown if a dApp sends something the review screen can't render: reject only. */
function Unreadable({ what, onReject }: { what: string; onReject: () => void }) {
  return (
    <Modal onClose={onReject} labelledBy="wc-unreadable-title" closeOnBackdrop={false}>
      <div className="px-5 pt-6 pb-5">
        <h2 id="wc-unreadable-title" className="text-lg font-bold text-[var(--sw-ink)] tracking-tight">
          Couldn&apos;t show this {what}
        </h2>
        <p className="text-sm text-[var(--sw-ink-soft)] mt-1 mb-5">
          The dApp sent something OpenBurner can&apos;t display, so it can&apos;t be approved. Reject it and try again from the dApp.
        </p>
        <button onClick={onReject} className="sw-btn-primary w-full py-3.5 text-sm">
          Reject
        </button>
      </div>
    </Modal>
  );
}
