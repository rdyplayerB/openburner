"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Share2, X } from "lucide-react";
import { Modal } from "../common/modal";
import { AddressText } from "../common/address-text";
import { ChainLogo } from "../common/token-icon";
import { getChainConfig } from "@/lib/supported-chains";
import { showToast } from "@/store/toast-store";

/** Receive: QR (network logo in the middle), full address, copy and share. */
export function ReceiveSheet({
  address,
  chainId,
  chainName,
  noun = "tokens",
  onClose,
}: {
  address: string;
  chainId: number;
  chainName: string;
  noun?: string;
  onClose: () => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const hasLogo = !!getChainConfig(chainId)?.logo;

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    let cancelled = false;
    // High error correction leaves room for the logo in the middle.
    import("qrcode")
      .then((QR) => QR.toDataURL(address, { width: 440, margin: 0, errorCorrectionLevel: "H" }))
      .then((url) => !cancelled && setQr(url))
      .catch(() => !cancelled && setQr(null));
    return () => {
      cancelled = true;
    };
  }, [address]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast("Couldn't copy — select the address and copy it manually.", "error");
    }
  }

  async function share() {
    try {
      await navigator.share({ title: `My ${chainName} address`, text: address });
    } catch {
      /* user dismissed the share sheet */
    }
  }

  return (
    <Modal onClose={onClose} labelledBy="receive-title" className="sw-surface rounded-xl border border-[var(--sw-line)] w-full max-w-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5">
        <h2 id="receive-title" className="text-lg font-bold text-[var(--sw-ink)] tracking-tight">
          Receive
        </h2>
        <button onClick={onClose} className="sw-icon-btn p-2 -mr-2" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-5 pt-3 pb-5">
        <p className="text-sm text-[var(--sw-ink-soft)] mb-4">
          Send only{" "}
          <span className="inline-flex items-center gap-1 font-semibold text-[var(--sw-ink)] align-[-2px]">
            <ChainLogo chainId={chainId} name={chainName} className="w-4 h-4" />
            {chainName}
          </span>{" "}
          {noun} to this address.
        </p>

        <div className="relative mx-auto w-[220px] h-[220px] bg-white rounded-2xl p-4 border border-[var(--sw-line)]">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR code of your wallet address" className="w-full h-full" />
          ) : (
            <div className="w-full h-full sw-skeleton" aria-hidden="true" />
          )}
          {qr && hasLogo && (
            <span className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
              <span className="bg-white p-1.5 rounded-xl">
                <ChainLogo chainId={chainId} className="w-9 h-9" />
              </span>
            </span>
          )}
        </div>

        <div className="mt-5 rounded-xl bg-[var(--sw-fill)] px-4 py-3 text-center">
          <AddressText address={address} className="text-sm" />
        </div>

        <div className={`mt-4 grid gap-2 ${canShare ? "grid-cols-2" : "grid-cols-1"}`}>
          <button onClick={copy} className="sw-btn-primary py-3.5 text-sm flex items-center justify-center gap-2" aria-live="polite">
            {copied ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
            {copied ? "Copied" : "Copy address"}
          </button>
          {canShare && (
            <button onClick={share} className="sw-btn-ghost py-3.5 text-sm flex items-center justify-center gap-2">
              <Share2 className="w-4 h-4" aria-hidden="true" />
              Share
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
