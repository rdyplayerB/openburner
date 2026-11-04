"use client";

import { Check } from "lucide-react";
import { useEnvironment } from "@/hooks/use-environment";
import { useWalletStore } from "@/store/wallet-store";
import { useSigningStore } from "@/store/signing-store";
import { FLAME_SMALL, FLAME_VIEWBOX } from "@/components/common/brand-mark-paths";
import { BURNER_CARD } from "@/components/common/burner-card";

/**
 * The "tap your card" moment. Shows what's happening right now (illustration +
 * one plain sentence) and where that sits in the whole flow (step list).
 *
 * Callers pass the steps and the current one. The card step's wording follows
 * the live card phase from the signer, so dApp requests get it too.
 */

export interface ProgressStep {
  key: string;
  label: string;
  /** This step waits on the card. */
  card?: boolean;
}

type Reader = "phone" | "gateway" | "reader";

function useReader(): Reader {
  const env = useEnvironment();
  const connectionMode = useWalletStore((s) => s.connectionMode);
  if (env.isHosted && env.isMobile) return "phone";
  if (env.isHosted || connectionMode === "gateway") return "gateway";
  return "reader";
}

const TAP_HINT: Record<Reader, string> = {
  phone: "Hold your Burner flat against the top of your phone until it buzzes.",
  gateway: "Tap your Burner to your phone on the HaLo Gateway page.",
  reader: "Keep your Burner on the NFC reader.",
};

export function SigningProgress({ steps, current }: { steps: ProgressStep[]; current: string }) {
  const reader = useReader();
  const phase = useSigningStore((s) => s.phase);
  const index = Math.max(0, steps.findIndex((s) => s.key === current));
  const step = steps[index];
  const waitingOnCard = !!step?.card && phase === "tap";

  const title = step?.card ? (phase === "signed" ? "Signed" : waitingOnCard ? "Tap your Burner" : "Getting your card ready…") : `${step?.label ?? "Working"}…`;
  const hint = step?.card
    ? waitingOnCard
      ? TAP_HINT[reader]
      : phase === "signed"
        ? "Checked: the signature matches your card."
        : "Your PIN goes straight to the card."
    : "Keep this window open.";

  return (
    <div className="px-5 pt-6 pb-5" role="status" aria-live="polite">
      <CardTapArt reader={reader} active={waitingOnCard} />

      <h3 className="text-xl font-bold text-(--sw-ink) text-center mt-4 tracking-tight">{title}</h3>
      <p className="text-sm text-(--sw-ink-soft) text-center mt-1 min-h-10 max-w-[18rem] mx-auto leading-snug">
        {hint}
      </p>

      <ol className="mt-5 space-y-0.5" aria-label="Progress">
        {steps.map((s, i) => {
          const done = i < index || (i === index && s.card && phase === "signed");
          const active = i === index && !done;
          return (
            <li key={s.key} className="flex items-center gap-3 py-1.5">
              <StepDot state={done ? "done" : active ? "active" : "todo"} />
              <span
                className={`text-sm ${
                  done ? "text-(--sw-ink-soft)" : active ? "text-(--sw-ink) font-semibold" : "text-(--sw-muted)"
                }`}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StepDot({ state }: { state: "done" | "active" | "todo" }) {
  if (state === "done") {
    return (
      <span className="w-5 h-5 rounded-full bg-(--sw-up) text-white flex items-center justify-center shrink-0">
        <Check className="w-3 h-3" strokeWidth={3} aria-hidden="true" />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="w-5 h-5 flex items-center justify-center shrink-0" aria-hidden="true">
        <span className="w-4 h-4 rounded-full border-2 border-(--sw-line) border-t-(--sw-accent) animate-spin" />
      </span>
    );
  }
  return (
    <span className="w-5 h-5 flex items-center justify-center shrink-0" aria-hidden="true">
      <span className="w-2 h-2 rounded-full bg-(--sw-line)" />
    </span>
  );
}

/** A Burner card easing toward a phone (NFC waves between them), or tapping down onto an abstract tap zone for the USB reader. */
export function CardTapArt({
  reader = "phone",
  active = true,
  className = "w-full max-w-[220px] h-auto mx-auto block",
}: {
  reader?: Reader;
  active?: boolean;
  className?: string;
}) {
  const ink = { stroke: "var(--sw-ink)" };

  if (reader === "reader") {
    // USB reader, drawn abstractly: rings rippling out
    // where the card lands, rather than a picture of the device.
    return (
      <svg viewBox="0 0 200 120" className={className} aria-hidden="true">
        <g style={{ fill: "none", stroke: "var(--sw-accent)" }} strokeWidth="2">
          {active
            ? // Three identical rings, a third of a cycle apart: a steady stream outward.
              [0, -1, -2].map((delay) => (
                <ellipse
                  key={delay}
                  cx="100"
                  cy="98"
                  rx="50"
                  ry="12.5"
                  vectorEffect="non-scaling-stroke"
                  className="ob-ripple"
                  style={{ animationDelay: `${delay}s` }}
                />
              ))
            : [18, 32, 46].map((rx) => <ellipse key={rx} cx="100" cy="98" rx={rx} ry={rx / 4} opacity="0.3" />)}
        </g>

        {/* The card (the real render), coming down onto the zone */}
        <g transform="translate(79 4)">
          <g className={active ? "ob-tap-down" : ""}>
            <image href={BURNER_CARD.angled()} width={64 * BURNER_CARD.angledRatio} height={64} />
          </g>
        </g>
      </svg>
    );
  }

  // The hint says to hold the card against the top of the phone, so that's what
  // this plays: the card lands there, rings spread from the contact, the phone buzzes.
  return (
    <svg viewBox="0 0 200 120" className={className} overflow="visible" aria-hidden="true">
      <g className={active ? "ob-phone-buzz" : ""}>
        <rect x="112" y="8" width="58" height="104" rx="12" style={{ fill: "var(--sw-surface)", ...ink }} strokeWidth="2.5" />
        <rect x="133" y="14" width="16" height="3" rx="1.5" style={{ fill: "var(--sw-line)" }} />
        <svg x="132" y="72" width="18" height="21" viewBox={FLAME_VIEWBOX}>
          <path d={FLAME_SMALL} fill="var(--sw-accent)" fillRule="evenodd" />
        </svg>
      </g>

      {active && (
        <g style={{ fill: "none", stroke: "var(--sw-accent)" }} strokeWidth="2">
          {[0, 0.4].map((delay) => (
            <circle
              key={delay}
              cx="141"
              cy="36"
              r="40"
              vectorEffect="non-scaling-stroke"
              className="ob-tap-ring"
              style={{ animationDelay: `${delay}s` }}
            />
          ))}
        </g>
      )}

      <g transform="translate(16 22)">
        <g className={active ? "ob-tap-card" : ""}>
          <image href={BURNER_CARD.angled()} width={78 * BURNER_CARD.angledRatio} height={78} />
        </g>
      </g>
    </svg>
  );
}
