"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { ArrowUpRight, Check, Loader2 } from "lucide-react";
import { CardTapArt } from "@/components/signing/signing-progress";

/**
 * The welcome screen shared by every connect flow (USB reader, phone gateway,
 * phone NFC). Phones: illustration on top, the main button pinned near the
 * bottom within thumb reach. Desktop: copy and button on the left,
 * illustration on the right.
 */

export const HEADLINE = "Your Burner card is your wallet.";
export const SUBLINE = "Keys stay on the card. Tap to see balances, send, swap and sign.";

const STEPS = [
  { title: "Tap your card", hint: "Connect with your phone or a USB reader." },
  { title: "See your balances", hint: "Tokens and collectibles on every supported network." },
  { title: "Sign with PIN + tap", hint: "Nothing moves without your PIN and your card." },
];

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2">
      <Image src="/images/openburnerlogo.svg" alt="" width={28} height={28} className="w-7 h-7" priority />
      <span className="text-lg font-bold tracking-tight text-[var(--sw-ink)]">OpenBurner</span>
    </span>
  );
}

interface ConnectLayoutProps {
  /** Which reader the illustration shows. */
  reader: "phone" | "gateway" | "reader";
  /** Animate the card and NFC waves. */
  artActive?: boolean;
  headline?: ReactNode;
  subline?: ReactNode;
  /** Shown above the main button (e.g. the reader choice). */
  controls?: ReactNode;
  /** The main button plus anything that belongs right under it (status, cancel). */
  action: ReactNode;
  /** Quiet extras at the very bottom on phones (e.g. install suggestion). */
  extra?: ReactNode;
  /** Hide "How it works" (e.g. while connecting). */
  hideSteps?: boolean;
}

export function ConnectLayout({
  reader,
  artActive = true,
  headline = HEADLINE,
  subline = SUBLINE,
  controls,
  action,
  extra,
  hideSteps = false,
}: ConnectLayoutProps) {
  return (
    <div className="sw-screen min-h-[100dvh] flex flex-col">
      <header className="w-full max-w-[1040px] mx-auto px-5 sm:px-8 pt-[max(1.25rem,env(safe-area-inset-top))] pb-2">
        <Wordmark />
      </header>

      <div className="flex-1 w-full max-w-[1040px] mx-auto px-5 sm:px-8 flex flex-col lg:grid lg:grid-cols-2 lg:grid-rows-[1fr_auto_auto_auto_1fr] lg:gap-x-16 lg:py-12">
        {/* Illustration */}
        <div className="order-1 lg:col-start-2 lg:row-start-1 lg:row-span-5 lg:self-center pt-4 pb-2 lg:p-0">
          <div className="rounded-3xl bg-[var(--sw-fill)] flex items-center justify-center px-6 py-6 sm:py-10 lg:aspect-square">
            <CardTapArt reader={reader} active={artActive} className="w-full max-w-[280px] lg:max-w-[400px] h-auto mx-auto block" />
          </div>
        </div>

        {/* Copy */}
        <div className="order-2 lg:col-start-1 lg:row-start-2 pt-5 lg:pt-0">
          <h1 className="text-[2rem] leading-[1.08] sm:text-5xl sm:leading-[1.04] font-bold tracking-tight text-[var(--sw-ink)] max-w-[16ch]">
            {headline}
          </h1>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-[var(--sw-ink-soft)] leading-relaxed max-w-[30rem]">
            {subline}
          </p>
          {controls && <div className="mt-6">{controls}</div>}
        </div>

        {/* How it works */}
        {!hideSteps && (
          <ol className="order-3 lg:col-start-1 lg:row-start-4 mt-6 lg:mt-10 grid gap-3 sm:grid-cols-3 sm:gap-4" aria-label="How it works">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex sm:flex-col items-start gap-3 sm:gap-2">
                <span className="w-6 h-6 rounded-full bg-[var(--sw-fill-strong)] text-[var(--sw-ink)] text-xs font-bold sw-num flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[var(--sw-ink)]">{step.title}</span>
                  <span className="hidden sm:block text-xs text-[var(--sw-muted)] mt-0.5 leading-snug">{step.hint}</span>
                </span>
              </li>
            ))}
          </ol>
        )}

        {/* Main action: pinned near the bottom on phones, inline on desktop */}
        <div className="order-4 lg:col-start-1 lg:row-start-3 mt-auto lg:mt-8 sticky bottom-0 lg:static z-10 -mx-5 px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0 pt-6 lg:pt-0 pb-[max(1rem,env(safe-area-inset-bottom))] lg:pb-0 bg-gradient-to-t from-[var(--sw-paper)] from-70% to-transparent lg:bg-none">
          <div className="max-w-md">{action}</div>
          {extra && <div className="mt-4 max-w-md lg:hidden">{extra}</div>}
        </div>
      </div>

      <footer className="w-full max-w-[1040px] mx-auto px-5 sm:px-8 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-[var(--sw-muted)]">
        <span>Open source. Your keys never leave the card.</span>
        <a
          href="https://openburner.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-[var(--sw-ink)] transition-colors"
        >
          openburner.xyz
          <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
        </a>
      </footer>
    </div>
  );
}

/** A compact live status: "Bridge ● Ready". */
export function StatusPill({
  label,
  value,
  state,
}: {
  label: string;
  value: string;
  state: "ok" | "bad" | "checking";
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[var(--sw-fill)] pl-2.5 pr-3 py-1.5 text-xs">
      {state === "checking" ? (
        <Loader2 className="w-3 h-3 animate-spin text-[var(--sw-muted)]" aria-hidden="true" />
      ) : state === "ok" ? (
        <span className="w-3 h-3 rounded-full bg-[var(--sw-up)] text-white flex items-center justify-center" aria-hidden="true">
          <Check className="w-2 h-2" strokeWidth={4} />
        </span>
      ) : (
        <span className="w-2 h-2 m-0.5 rounded-full bg-[var(--sw-warn)]" aria-hidden="true" />
      )}
      <span className="font-semibold text-[var(--sw-ink)]">{label}</span>
      <span className="text-[var(--sw-ink-soft)]">{value}</span>
    </span>
  );
}
