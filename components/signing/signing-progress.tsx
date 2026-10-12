"use client";

import { Check } from "lucide-react";
import { useEnvironment } from "@/hooks/use-environment";
import { useWalletStore } from "@/store/wallet-store";
import { useSigningStore } from "@/store/signing-store";
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

      <h3 className="text-xl font-bold text-[var(--sw-ink)] text-center mt-4 tracking-tight">{title}</h3>
      <p className="text-sm text-[var(--sw-ink-soft)] text-center mt-1 min-h-[2.5rem] max-w-[18rem] mx-auto leading-snug">
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
                  done ? "text-[var(--sw-ink-soft)]" : active ? "text-[var(--sw-ink)] font-semibold" : "text-[var(--sw-muted)]"
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
      <span className="w-5 h-5 rounded-full bg-[var(--sw-up)] text-white flex items-center justify-center flex-shrink-0">
        <Check className="w-3 h-3" strokeWidth={3} aria-hidden="true" />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="w-5 h-5 flex items-center justify-center flex-shrink-0" aria-hidden="true">
        <span className="w-4 h-4 rounded-full border-2 border-[var(--sw-line)] border-t-[var(--sw-accent)] animate-spin" />
      </span>
    );
  }
  return (
    <span className="w-5 h-5 flex items-center justify-center flex-shrink-0" aria-hidden="true">
      <span className="w-2 h-2 rounded-full bg-[var(--sw-line)]" />
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
  const waves = (
    <>
      <path className={active ? "ob-wave" : ""} d="M -4 -8 A 10 10 0 0 1 -4 8" />
      <path className={active ? "ob-wave ob-wave-2" : ""} d="M -11 -14 A 18 18 0 0 1 -11 14" />
      <path className={active ? "ob-wave ob-wave-3" : ""} d="M -18 -20 A 26 26 0 0 1 -18 20" />
    </>
  );
  const waveStyle = { stroke: "var(--sw-accent)", fill: "none", opacity: active ? 1 : 0.25 };

  if (reader === "reader") {
    // USB reader, drawn abstractly: a flat tap zone with rings rippling out
    // where the card lands, rather than a picture of the device.
    return (
      <svg viewBox="0 0 200 120" className={className} aria-hidden="true">
        <ellipse cx="100" cy="98" rx="62" ry="15" style={{ fill: "var(--sw-fill-strong)" }} />
        <g style={{ fill: "none", stroke: "var(--sw-accent)", opacity: active ? 1 : 0.3 }} strokeWidth="2">
          {[
            { rx: 18, ry: 4.5, cls: "" },
            { rx: 32, ry: 8, cls: "ob-wave-2" },
            { rx: 46, ry: 11.5, cls: "ob-wave-3" },
          ].map((r) => (
            <ellipse key={r.rx} cx="100" cy="98" rx={r.rx} ry={r.ry} className={active ? `ob-wave ${r.cls}` : ""} />
          ))}
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

  return (
    <svg viewBox="0 0 200 120" className={className} aria-hidden="true">
      {/* Phone */}
      <g>
        <rect x="120" y="10" width="56" height="100" rx="11" style={{ fill: "var(--sw-surface)", ...ink }} strokeWidth="2" />
        <rect x="140" y="16" width="16" height="3" rx="1.5" style={{ fill: "var(--sw-line)" }} />
        {reader === "gateway" && (
          <g style={{ fill: "var(--sw-line)" }}>
            <rect x="130" y="36" width="36" height="5" rx="2.5" />
            <rect x="130" y="47" width="26" height="5" rx="2.5" />
          </g>
        )}
      </g>

      {/* The card (the real render) */}
      <g transform="translate(34 10)">
        <g className={active ? "ob-tap-card" : ""}>
          <image href={BURNER_CARD.angled()} width={92 * BURNER_CARD.angledRatio} height={92} />
        </g>
      </g>

      {/* NFC waves, between the card and the phone */}
      <g transform="translate(118 34)" style={waveStyle} strokeWidth="2.5" strokeLinecap="round">
        {waves}
      </g>
    </svg>
  );
}
