"use client";

import type { ReactNode } from "react";
import { Wordmark as BrandWordmark } from "@/components/common/brand-mark";
import { ArrowUpRight, Check, Loader2 } from "lucide-react";
import { useIntroStore } from "@/store/intro-store";

/**
 * The connect screen shared by every flow (USB reader, phone as reader, phone
 * NFC): one centred card with the wordmark, a line on what to do, the main
 * button, and what's ready underneath.
 */

/** OpenBurner wordmark at the connect screen's two sizes. */
export function Wordmark({ size = "sm" }: { size?: "sm" | "lg" }) {
  return <BrandWordmark fontSize={size === "lg" ? 30 : 18} />;
}

interface ConnectLayoutProps {
  /** One line under the wordmark: what to do. */
  subline: ReactNode;
  /** Above the card (e.g. USB reader / Phone). */
  controls?: ReactNode;
  /** The main button plus anything that belongs right under it (cancel). */
  action: ReactNode;
  /** Rows in the card's lower section (CheckRow). */
  checks?: ReactNode;
  checksTitle?: string;
  /** Quiet extras at the very bottom (e.g. install suggestion). */
  extra?: ReactNode;
}

export function ConnectLayout({ subline, controls, action, checks, checksTitle = "Before you connect", extra }: ConnectLayoutProps) {
  const setIntroSeen = useIntroStore((s) => s.setSeen);
  return (
    <div className="sw-screen min-h-[100dvh] flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 pt-[max(2.5rem,env(safe-area-inset-top))] pb-10">
        <div className="w-full max-w-md">
          {controls && <div className="mb-6">{controls}</div>}

          <div className="sw-surface rounded-xl border border-[var(--sw-line)] overflow-hidden">
            <div className="text-center px-6 sm:px-8 pt-10 pb-8">
              <Wordmark size="lg" />
              <p className="mt-6 text-base leading-relaxed text-[var(--sw-ink-soft)] max-w-sm mx-auto" aria-live="polite">
                {subline}
              </p>
              <div className="mt-8">{action}</div>
            </div>

            {checks && (
              <div className="px-6 sm:px-8 pt-6 pb-4 border-t border-[var(--sw-line)]">
                <div className="sw-uplabel mb-1">{checksTitle}</div>
                <div className="sw-list" aria-live="polite">
                  {checks}
                </div>
              </div>
            )}
          </div>

          <nav className="mt-6 flex items-center justify-center gap-5 text-sm text-[var(--sw-muted)]">
            <button type="button" onClick={() => setIntroSeen(false)} className="hover:text-[var(--sw-ink)] transition-colors">
              What is OpenBurner?
            </button>
            <a
              href="https://openburner.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-[var(--sw-ink)] transition-colors"
            >
              openburner.xyz
              <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
            </a>
          </nav>
        </div>
      </div>

      {extra && (
        <div className="px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="max-w-md mx-auto">{extra}</div>
        </div>
      )}
    </div>
  );
}

/** One row in the card's lower section: a status mark (or step number), a title and a detail. */
export function CheckRow({
  state,
  title,
  detail,
}: {
  /** ok / waiting / checking, or a step number. */
  state: "ok" | "waiting" | "checking" | number;
  title: string;
  detail: ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 py-3">
      <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center" aria-hidden="true">
        {state === "checking" ? (
          <Loader2 className="w-5 h-5 text-[var(--sw-muted)] animate-spin" strokeWidth={2.5} />
        ) : state === "ok" ? (
          <span className="w-5 h-5 rounded-full bg-[var(--sw-up)] text-white flex items-center justify-center">
            <Check className="w-3 h-3" strokeWidth={3.5} />
          </span>
        ) : state === "waiting" ? (
          <span className="w-5 h-5 rounded-full border-2 border-dashed border-[var(--sw-muted)]" />
        ) : (
          <span className="w-5 h-5 rounded-full bg-[var(--sw-fill-strong)] text-[var(--sw-ink)] text-[11px] font-bold sw-num flex items-center justify-center">
            {state}
          </span>
        )}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-[var(--sw-ink)]">{title}</p>
        <p className="text-xs text-[var(--sw-muted)] mt-0.5 leading-snug">{detail}</p>
      </div>
    </div>
  );
}
