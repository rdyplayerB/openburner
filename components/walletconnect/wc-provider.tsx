"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useWalletStore } from "@/store/wallet-store";
import { useWalletConnectStore } from "@/store/walletconnect-store";

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
  const hasProposal = useWalletConnectStore((s) => !!s.pendingProposal);
  const hasRequest = useWalletConnectStore((s) => !!s.pendingRequest);

  useEffect(() => {
    if (configured && isConnected && address) {
      initIfHasSessions();
    }
  }, [configured, isConnected, address, initIfHasSessions]);

  return (
    <>
      {hasProposal && <WcSessionProposal />}
      {hasRequest && <WcRequestModal />}
    </>
  );
}
