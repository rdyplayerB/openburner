import { useEffect, useRef, useState, type ReactNode } from "react";
import { setKnobs, sleep, type Knobs } from "./scenario";
import { ACTIVITY, BALANCES, BASE, CUSTOM_TOKENS, ME, RECENTS } from "./fixtures";
import { useWalletStore } from "@/store/wallet-store";
import { useActivityStore } from "@/store/activity-store";
import { useSwapStore } from "@/store/swap-store";
import { useWalletConnectStore } from "@/store/walletconnect-store";
import { useSigningStore, type CardPhase } from "@/store/signing-store";
import { useToastStore } from "@/store/toast-store";
import { useIntroStore } from "@/store/intro-store";
import { log } from "@/lib/log";
import { resetTokenListCache } from "@/components/token-list";
import { resetGalleryCache } from "@/components/nft/nft-gallery";

/**
 * A step a story performs after it mounts, the way a person would: so a story
 * can open on "Send, filled in and on the review step" and stay a live UI.
 *
 *   { click: "Review" }               button/link/tab/option by its label or text
 *   { type: ["Amount in ETH", "0.1"] } field by aria-label, placeholder or "#id"
 *   { blur: "Address or ENS name" }
 *   { wait: 800 }                      milliseconds
 *   { waitFor: "Confirm and sign" }    until that text is on screen
 */
export type Step = { click: string } | { type: [string, string] } | { blur: string } | { wait: number } | { waitFor: string };

export interface SceneProps {
  knobs?: Partial<Knobs>;
  /** Connected wallet (default true). */
  connected?: boolean;
  /** Show the first-run welcome slides (default false: already seen). */
  intro?: boolean;
  connectionMode?: "bridge" | "gateway";
  /** Seeded activity history (default true). */
  activity?: boolean;
  recents?: boolean;
  signing?: CardPhase;
  walletConnect?: Partial<ReturnType<typeof useWalletConnectStore.getState>>;
  steps?: Step[];
  children: ReactNode;
}

function storage(recents: boolean) {
  try {
    for (const k of Object.keys(localStorage)) {
      if (/^(tokens_|token_metadata_|recentRecipients|lastRecipientAddress|customRPCs)/.test(k)) localStorage.removeItem(k);
    }
    localStorage.setItem(`tokens_${BASE}`, JSON.stringify(CUSTOM_TOKENS));
    for (const a of CUSTOM_TOKENS) {
      const t = BALANCES[a];
      localStorage.setItem(`token_metadata_${BASE}_${a}`, JSON.stringify({ symbol: t.symbol, name: t.name, decimals: t.decimals }));
    }
    if (recents) localStorage.setItem("recentRecipients", JSON.stringify(RECENTS));
  } catch {
    /* storage unavailable */
  }
}

function setup(p: SceneProps) {
  setKnobs(p.knobs);
  resetTokenListCache();
  resetGalleryCache();
  storage(!!p.recents);
  const connected = p.connected ?? true;
  useWalletStore.setState({
    address: connected ? ME : null,
    publicKey: connected ? "0x02" + "ab".repeat(32) : null,
    keySlot: connected ? 9 : null,
    chainId: BASE,
    rpcUrl: "https://mainnet.base.org",
    chainName: "Base",
    isConnected: connected,
    balance: BALANCES.native.balance,
    connectionMode: p.connectionMode ?? "bridge",
  });
  useActivityStore.setState({ items: p.activity === false ? [] : ACTIVITY });
  useSwapStore.getState().resetSwap();
  useWalletConnectStore.setState({
    configured: p.knobs?.walletConnect ?? true,
    initialized: false,
    pairing: false,
    sessions: [],
    pendingProposal: null,
    pendingRequest: null,
    requestQueue: [],
    error: null,
    ...p.walletConnect,
  });
  useSigningStore.setState({ phase: p.signing ?? "idle" });
  useToastStore.setState({ toasts: [] });
  useIntroStore.setState({ seen: !p.intro });
}

/** Sets up the app's state for one story, then runs its steps. */
export function Scene(props: SceneProps) {
  useState(() => {
    setup(props);
    return true;
  });
  const anchor = useRef<HTMLSpanElement>(null);

  // The PIN sheet resets the card phase when it opens; apply ours after it.
  useEffect(() => {
    if (props.signing) useSigningStore.setState({ phase: props.signing });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!props.steps?.length) return;
    let cancelled = false;
    const doc = anchor.current?.ownerDocument ?? document;
    (async () => {
      await sleep(300);
      for (const step of props.steps!) {
        if (cancelled) return;
        await run(doc, step);
      }
    })().catch((err) => log.warn("[story steps]", err));
    return () => {
      cancelled = true;
    };
    // Steps run once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <span ref={anchor} hidden />
      {props.children}
    </>
  );
}

// ─── Steps ──────────────────────────────────────────────────────────────────

const visible = (el: Element) => (el as HTMLElement).offsetParent !== null || (el as HTMLElement).getClientRects().length > 0;

function topLayer(doc: Document): ParentNode {
  const dialogs = Array.from(doc.querySelectorAll('[role="dialog"]'));
  return dialogs[dialogs.length - 1] ?? doc;
}

function findClickable(doc: Document, name: string): HTMLElement | null {
  const label = name.toLowerCase();
  const candidates = (scope: ParentNode) =>
    (Array.from(scope.querySelectorAll('button, a, [role="tab"], [role="option"], [role="radio"], [role="menuitem"]')) as HTMLElement[]).filter(
      (el) => visible(el) && !(el as HTMLButtonElement).disabled
    );
  const names = (el: HTMLElement) => [(el.getAttribute("aria-label") || "").toLowerCase(), (el.textContent || "").trim().toLowerCase()];
  const pick = (scope: ParentNode) => {
    const list = candidates(scope);
    // An exact label wins over a prefix ("Swap" is not "Swap settings").
    return list.find((el) => names(el).includes(label)) ?? list.find((el) => names(el).some((n) => n.startsWith(label))) ?? null;
  };
  return pick(topLayer(doc)) ?? pick(doc);
}

function findField(doc: Document, name: string): HTMLInputElement | null {
  if (name.startsWith("#")) return doc.querySelector<HTMLInputElement>(name);
  const label = name.toLowerCase();
  const fields = Array.from(doc.querySelectorAll("input, textarea")) as HTMLInputElement[];
  return (
    fields.find((f) => visible(f) && ((f.getAttribute("aria-label") || "").toLowerCase() === label || (f.placeholder || "").toLowerCase() === label)) ?? null
  );
}

/** Set a React-controlled input's value the way typing does. */
function setValue(input: HTMLInputElement, value: string) {
  const proto = Object.getPrototypeOf(input);
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

async function until<T>(get: () => T | null, timeout = 8000): Promise<T> {
  const start = Date.now();
  for (;;) {
    const v = get();
    if (v) return v;
    if (Date.now() - start > timeout) throw new Error("timed out");
    await sleep(100);
  }
}

async function run(doc: Document, step: Step) {
  if ("wait" in step) return sleep(step.wait);
  if ("waitFor" in step) {
    await until(() => (doc.body.textContent || "").includes(step.waitFor) || null, 15000);
    return sleep(150);
  }
  if ("click" in step) {
    const el = await until(() => findClickable(doc, step.click));
    el.click();
    return sleep(350);
  }
  if ("type" in step) {
    const [name, value] = step.type;
    const el = await until(() => findField(doc, name));
    el.focus();
    setValue(el, value);
    return sleep(250);
  }
  if ("blur" in step) {
    const el = await until(() => findField(doc, step.blur));
    el.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
    el.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    return sleep(200);
  }
}
