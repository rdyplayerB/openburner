"use client";

import { Nfc, Smartphone, Wifi, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/common/modal";

interface MobileErrorModalProps {
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
}

type Kind = "nfc" | "card" | "network" | "permission" | "other";

function classify(error: string): Kind {
  if (/not ?supported|NFC (is )?(off|disabled|unavailable)|NotSupportedError/i.test(error)) return "nfc";
  if (/permission|not allowed|denied|access/i.test(error)) return "permission";
  if (/network|connection|offline|failed to fetch/i.test(error)) return "network";
  if (/card|tap|detected|key/i.test(error)) return "card";
  return "other";
}

const COPY: Record<Kind, { title: string; body: string; tips: string[]; Icon: typeof Nfc }> = {
  nfc: {
    title: "NFC isn't available",
    body: "This browser can't read your card.",
    tips: ["Turn on NFC in your phone's settings.", "On Android use Chrome; on iPhone use Safari."],
    Icon: Smartphone,
  },
  card: {
    title: "Your card wasn't read",
    body: "Hold it flat against the top of your phone and keep it still until it buzzes.",
    tips: ["Take the phone out of a thick case.", "Move the card slowly around the top edge."],
    Icon: Nfc,
  },
  network: {
    title: "You're offline",
    body: "Check your Wi-Fi or mobile data, then try again.",
    tips: [],
    Icon: Wifi,
  },
  permission: {
    title: "NFC access was blocked",
    body: "Allow NFC when your phone asks, then try again.",
    tips: [],
    Icon: Smartphone,
  },
  other: {
    title: "Couldn't connect",
    body: "Something went wrong reading your card. Try again.",
    tips: [],
    Icon: AlertTriangle,
  },
};

export function MobileErrorModal({ error, onClose, onRetry }: MobileErrorModalProps) {
  if (!error) return null;
  const { title, body, tips, Icon } = COPY[classify(error)];

  return (
    <Modal onClose={onClose} labelledBy="mobile-error-title">
      <div className="px-5 pt-6 pb-5" role="alert">
        <span className="mx-auto mb-3 w-11 h-11 rounded-full bg-(--sw-down-bg) text-(--sw-down) flex items-center justify-center">
          <Icon className="w-5 h-5" aria-hidden="true" />
        </span>
        <h2 id="mobile-error-title" className="text-xl font-bold tracking-tight text-(--sw-ink) text-center">
          {title}
        </h2>
        <p className="text-sm text-(--sw-ink-soft) text-center mt-1.5 leading-relaxed">{body}</p>

        {tips.length > 0 && (
          <ul className="sw-callout sw-callout-info mt-4 space-y-1">
            {tips.map((tip) => (
              <li key={tip} className="flex gap-2">
                <span aria-hidden="true">·</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={() => {
            onClose();
            onRetry();
          }}
          className="sw-btn-primary w-full py-3.5 mt-5 text-sm"
        >
          Try again
        </button>
        <button
          onClick={onClose}
          className="w-full py-3 mt-1 text-sm font-semibold text-(--sw-ink-soft) hover:text-(--sw-ink) transition-colors"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
