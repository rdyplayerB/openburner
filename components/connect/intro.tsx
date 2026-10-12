"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import { useIntroStore } from "@/store/intro-store";
import { Wordmark } from "./connect-layout";
import { BalancesArt, CardArt, SignArt } from "./intro-art";

/**
 * First-run welcome: three slides on what OpenBurner is, then the connect
 * screen. Swipe, use the arrow keys, or press Next. Shown once; "What is
 * OpenBurner?" on the connect screen brings it back.
 */

const SLIDES = [
  {
    Art: CardArt,
    title: "Your Burner card is your wallet.",
    body: "OpenBurner is an open-source app for your Burner card. Your keys are made on the card’s chip and never leave it.",
  },
  {
    Art: BalancesArt,
    title: "Tap to see what you hold.",
    body: "Use your phone or a USB reader. See your tokens, collectibles and activity on Ethereum, Base and more.",
  },
  {
    Art: SignArt,
    title: "Nothing moves without your card.",
    body: "Sends, swaps and app requests each need your PIN and a tap. You see what you’re signing, in plain words, first.",
  },
];

function prefersReducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function Intro() {
  const setSeen = useIntroStore((s) => s.setSeen);
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

  const go = useCallback((i: number) => {
    const track = trackRef.current;
    const next = Math.max(0, Math.min(SLIDES.length - 1, i));
    setIndex(next);
    track?.scrollTo({ left: next * track.clientWidth, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, []);

  // Follow swipes.
  const onScroll = () => {
    const track = trackRef.current;
    if (!track || !track.clientWidth) return;
    const i = Math.round(track.scrollLeft / track.clientWidth);
    if (i !== index) setIndex(i);
  };

  // Stay on the current slide when the window is resized.
  const indexRef = useRef(index);
  indexRef.current = index;
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let width = track.clientWidth;
    const ro = new ResizeObserver(() => {
      if (track.clientWidth === width) return;
      width = track.clientWidth;
      track.scrollTo({ left: indexRef.current * width, behavior: "auto" });
    });
    ro.observe(track);
    return () => ro.disconnect();
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(index - 1);
    }
  };

  const finish = () => setSeen(true);

  return (
    <div className="sw-screen min-h-[100dvh] flex flex-col sm:items-center sm:justify-center sm:px-6 sm:py-10">
      <div className="flex-1 sm:flex-none flex flex-col w-full sm:max-w-[440px] sm:rounded-xl sm:border sm:border-[var(--sw-line)] sm:bg-[var(--sw-surface)] sm:overflow-hidden">
        <header className="flex items-center justify-between px-5 sm:px-8 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-6 pb-2">
          <Wordmark />
          <button
            type="button"
            onClick={finish}
            className={`text-sm font-semibold text-[var(--sw-ink-soft)] hover:text-[var(--sw-ink)] px-2 py-2 -mr-2 transition-opacity ${
              last ? "opacity-0 pointer-events-none" : ""
            }`}
            tabIndex={last ? -1 : 0}
            aria-hidden={last}
          >
            Skip
          </button>
        </header>

        <div
          ref={trackRef}
          onScroll={onScroll}
          onKeyDown={onKeyDown}
          tabIndex={0}
          role="region"
          aria-roledescription="carousel"
          aria-label="What OpenBurner is"
          className="flex overflow-x-auto snap-x snap-mandatory overscroll-x-contain ob-no-scrollbar focus-visible:outline-none"
        >
          {SLIDES.map(({ Art, title, body }, i) => (
            <section
              key={title}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${SLIDES.length}`}
              aria-hidden={i !== index}
              className="w-full flex-shrink-0 snap-start snap-always px-5 sm:px-8 pt-3"
            >
              <div
                className="ob-intro-stage rounded-2xl bg-[var(--sw-fill)] overflow-hidden"
                style={{
                  backgroundImage:
                    "linear-gradient(var(--sw-line-soft) 1px, transparent 1px), linear-gradient(90deg, var(--sw-line-soft) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                  backgroundPosition: "-1px -1px",
                }}
              >
                <Art active={i === index} />
              </div>
              <h1 className="mt-7 text-[1.75rem] leading-[1.1] sm:text-[2rem] font-bold tracking-tight text-[var(--sw-ink)]">
                {title}
              </h1>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--sw-ink-soft)]">{body}</p>
            </section>
          ))}
        </div>

        <div className="mt-auto sm:mt-0 px-5 sm:px-8 pt-8 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-8">
          <div className="flex items-center gap-1.5 mb-5" role="group" aria-label="Slides">
            {SLIDES.map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => go(i)}
                aria-label={`Slide ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                className="py-2 -my-2 group"
              >
                <span
                  className={`block h-[3px] rounded-full transition-all duration-300 ${
                    i === index
                      ? "w-8 bg-[var(--sw-accent)]"
                      : "w-4 bg-[var(--sw-line)] group-hover:bg-[var(--sw-muted)]"
                  }`}
                />
              </button>
            ))}
            <span className="ml-auto text-xs text-[var(--sw-muted)] sw-num" aria-hidden="true">
              {String(index + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
            </span>
          </div>
          <button
            type="button"
            onClick={() => (last ? finish() : go(index + 1))}
            className="sw-btn-primary w-full py-4 text-sm"
          >
            {last ? "Get started" : "Next"}
          </button>
        </div>
      </div>

      <a
        href="https://openburner.xyz"
        target="_blank"
        rel="noopener noreferrer"
        className="hidden sm:inline-flex items-center gap-1 mt-6 text-xs text-[var(--sw-muted)] hover:text-[var(--sw-ink)] transition-colors"
      >
        Open source · openburner.xyz
        <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
      </a>
    </div>
  );
}
