"use client";

import { useEffect } from "react";
import { useWalletStore } from "@/store/wallet-store";
import { useWalletConnectStore } from "@/store/walletconnect-store";
import { WcSessionProposal } from "./wc-session-proposal";
import { WcRequestModal } from "./wc-request-modal";

/**
 * Mounts once inside the connected dashboard. Initializes WalletConnect when the wallet is
 * connected and configured, and renders incoming session proposals / requests over any tab.
 */
export function WcProvider() {
  const { isConnected, address } = useWalletStore();
  const { configured, init } = useWalletConnectStore();

  useEffect(() => {
    if (configured && isConnected && address) {
      init();
    }
  }, [configured, isConnected, address, init]);

  return (
    <>
      <WcSessionProposal />
      <WcRequestModal />
    </>
  );
}
