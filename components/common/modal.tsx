"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

/**
 * Shared accessible modal.
 *
 * - Portalled to <body>, so stacking never depends on where it is rendered.
 *   Modals opened later sit above earlier ones; toasts (z 2000) sit above all.
 * - role="dialog" + aria-modal, labelled by `title`/`labelledBy`/`ariaLabel`.
 * - Escape closes the top-most modal only; backdrop click closes (opt-out).
 * - Focus moves into the dialog, is trapped while open, and is restored after.
 * - Body scroll is locked while any modal is open.
 */

const stack: string[] = [];
let scrollLocks = 0;
let savedOverflow = "";

function lockScroll() {
  if (scrollLocks++ === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
}
function unlockScroll() {
  if (--scrollLocks === 0) document.body.style.overflow = savedOverflow;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  /** Accessible name when there is no visible heading with `labelledBy`. */
  ariaLabel?: string;
  /** id of the visible heading that names the dialog. */
  labelledBy?: string;
  /** Classes for the dialog panel (width, radius, overflow…). */
  className?: string;
  /** Close on backdrop click (default true). Disable for in-progress/irreversible steps. */
  closeOnBackdrop?: boolean;
  /** Close on Escape (default true). */
  closeOnEscape?: boolean;
  /** Element to focus first; defaults to the first focusable element. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Vertical alignment on small screens. */
  align?: "center" | "top";
}

export function Modal({
  onClose,
  children,
  ariaLabel,
  labelledBy,
  className = "sw-surface w-full max-w-sm rounded-xl border border-[var(--sw-line)] overflow-hidden",
  closeOnBackdrop = true,
  closeOnEscape = true,
  initialFocusRef,
  align = "center",
}: ModalProps) {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    stack.push(id);
    lockScroll();

    const focusTarget =
      initialFocusRef?.current ||
      panelRef.current?.querySelector<HTMLElement>("[autofocus]") ||
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE) ||
      panelRef.current;
    focusTarget?.focus({ preventScroll: true });

    function onKeyDown(e: KeyboardEvent) {
      if (stack[stack.length - 1] !== id) return;
      if (e.key === "Escape" && closeOnEscape) {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
          (el) => el.offsetParent !== null || el === document.activeElement
        );
        if (nodes.length === 0) {
          e.preventDefault();
          panelRef.current.focus();
          return;
        }
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (active === last || !panelRef.current.contains(active))) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const idx = stack.lastIndexOf(id);
      if (idx >= 0) stack.splice(idx, 1);
      unlockScroll();
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
    // Run once per open; handlers read the latest props through refs/closure flags.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, id]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`ob-modal-backdrop fixed inset-0 z-[1000] flex justify-center bg-black/50 backdrop-blur-sm p-3 ${
        align === "top" ? "items-start sm:items-center pt-[max(0.75rem,env(safe-area-inset-top))]" : "items-center"
      }`}
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onCloseRef.current();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={labelledBy ? undefined : ariaLabel}
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`ob-modal-panel outline-none ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
