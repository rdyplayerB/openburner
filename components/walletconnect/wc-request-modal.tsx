"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { X, Globe } from "lucide-react";
import { useWalletConnectStore } from "@/store/walletconnect-store";
import { PinInput } from "../pin-input";
import { getChainName, getChainInfo, parseCaipChainId, requiresSigning } from "@/lib/walletconnect/chains";
import { Modal } from "@/components/common/modal";

function decodePersonalSign(hexOrText: string): string {
  try {
    if (ethers.isHexString(hexOrText)) return ethers.toUtf8String(hexOrText);
  } catch {
    /* not utf8 */
  }
  return hexOrText;
}

const METHOD_LABEL: Record<string, string> = {
  eth_sendTransaction: "Transaction",
  eth_signTransaction: "Sign transaction",
  personal_sign: "Signature request",
  eth_signTypedData: "Signature request",
  eth_signTypedData_v3: "Signature request",
  eth_signTypedData_v4: "Signature request",
  wallet_switchEthereumChain: "Switch network",
  wallet_addEthereumChain: "Add network",
};

export function WcRequestModal() {
  const pendingRequest = useWalletConnectStore((s) => s.pendingRequest);
  const sessions = useWalletConnectStore((s) => s.sessions);
  const queued = useWalletConnectStore((s) => s.requestQueue.length);
  const approveRequest = useWalletConnectStore((s) => s.approveRequest);
  const rejectRequest = useWalletConnectStore((s) => s.rejectRequest);
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!pendingRequest) return null;

  const { method, params } = pendingRequest.params.request;
  const chainId = parseCaipChainId(pendingRequest.params.chainId);
  const session = sessions.find((s) => s.topic === pendingRequest.topic);
  const meta = session?.peer?.metadata || {};
  const needsPin = requiresSigning(method);

  const nativeSymbol = getChainInfo(chainId)?.currency || "ETH";

  async function submit(pin?: string) {
    if (busy) return;
    setBusy(true);
    setPinError(null);
    try {
      await approveRequest(pin);
      setShowPin(false);
    } catch (err: any) {
      // Retryable signing error (wrong PIN / no card) — keep PIN open.
      setPinError(err.message || "Signing failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function renderDetails() {
    if (method === "eth_sendTransaction" || method === "eth_signTransaction") {
      const tx = params[0] || {};
      const value = tx.value ? ethers.formatEther(BigInt(tx.value)) : "0";
      return (
        <div className="sw-list">
          <Row k="To" v={tx.to ? `${tx.to.slice(0, 10)}…${tx.to.slice(-8)}` : "—"} mono />
          <Row k="Value" v={`${value} ${nativeSymbol}`} mono />
          <Row k="Network" v={getChainName(chainId)} />
          {tx.data && tx.data !== "0x" && <Row k="Data" v={`${(tx.data.length - 2) / 2} bytes`} mono />}
        </div>
      );
    }
    if (method === "personal_sign") {
      const msg = decodePersonalSign(params[0]);
      return (
        <div>
          <div className="sw-uplabel mb-2">Message</div>
          <div className="text-sm text-[var(--sw-ink)] whitespace-pre-wrap break-words max-h-40 overflow-auto p-3 rounded-lg border border-[var(--sw-line)]">
            {msg}
          </div>
        </div>
      );
    }
    if (method.startsWith("eth_signTypedData")) {
      let domainName = "";
      let primaryType = "";
      try {
        const json = typeof params[1] === "string" ? JSON.parse(params[1]) : params[1];
        domainName = json?.domain?.name || "";
        primaryType = json?.primaryType || "";
      } catch {
        /* ignore */
      }
      return (
        <div className="sw-list">
          <Row k="Type" v="Typed data (EIP-712)" />
          {domainName && <Row k="Domain" v={domainName} />}
          {primaryType && <Row k="Primary type" v={primaryType} />}
          <Row k="Network" v={getChainName(chainId)} />
        </div>
      );
    }
    if (method === "wallet_switchEthereumChain") {
      const target = parseInt(params[0]?.chainId || "0x0", 16);
      return (
        <div className="sw-list">
          <Row k="Switch to" v={getChainName(target)} />
        </div>
      );
    }
    if (method === "wallet_addEthereumChain") {
      const p = params[0] || {};
      return (
        <div className="sw-list">
          <Row k="Network" v={p.chainName || "—"} />
          <Row k="RPC" v={(p.rpcUrls || [])[0] || "—"} mono />
        </div>
      );
    }
    return <p className="text-sm text-[var(--sw-muted)]">{method}</p>;
  }

  return (
    <Modal
      onClose={() => {
        if (!busy) rejectRequest();
      }}
      labelledBy="wc-request-title"
      closeOnBackdrop={false}
    >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--sw-line)]">
          <h2 id="wc-request-title" className="sw-uplabel">
            {METHOD_LABEL[method] || "Request"}
            {queued > 0 && <span className="ml-2 normal-case tracking-normal">· {queued} more waiting</span>}
          </h2>
          <button
            onClick={() => rejectRequest()}
            disabled={busy}
            className="text-[var(--sw-muted)] hover:text-[var(--sw-ink)]"
            aria-label="Reject request"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 sw-mark rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
              {meta.icons?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={meta.icons[0]} alt="" className="w-full h-full object-cover" />
              ) : (
                <Globe className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--sw-ink)] truncate">{meta.name || "dApp"}</p>
              <p className="text-xs text-[var(--sw-muted)] truncate">{meta.url || ""}</p>
            </div>
          </div>

          <div className="mb-6">{renderDetails()}</div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => rejectRequest()} disabled={busy} className="sw-btn-ghost py-3 text-sm disabled:opacity-50">
              Reject
            </button>
            <button
              onClick={() => (needsPin ? setShowPin(true) : submit())}
              disabled={busy}
              className="sw-btn-primary py-3 text-sm"
            >
              {needsPin ? "Approve & Sign" : "Approve"}
            </button>
          </div>

          {needsPin && (
            <p className="text-xs text-[var(--sw-muted)] text-center mt-3">
              You&apos;ll confirm with your PIN and tap your Burner.
            </p>
          )}
        </div>

      <PinInput
        isVisible={showPin}
        onSubmit={(pin) => submit(pin)}
        onCancel={() => {
          setShowPin(false);
          setPinError(null);
        }}
        error={pinError}
        isLoading={busy}
        loadingMessage="Signing with your Burner…"
      />
    </Modal>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 text-sm">
      <span className="text-[var(--sw-muted)]">{k}</span>
      <span className={`text-[var(--sw-ink)] font-medium text-right break-all ${mono ? "sw-mono text-xs" : ""}`}>
        {v}
      </span>
    </div>
  );
}
