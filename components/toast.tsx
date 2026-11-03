"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePortalRoot } from "./common/portal-root";
import { CheckCircle, AlertTriangle, Info, X } from "lucide-react";
import { useToastStore, type ToastItem, type ToastType } from "@/store/toast-store";

const ICONS: Record<ToastType, { Icon: typeof CheckCircle; color: string }> = {
  success: { Icon: CheckCircle, color: "text-(--sw-up)" },
  error: { Icon: AlertTriangle, color: "text-(--sw-down)" },
  info: { Icon: Info, color: "text-(--sw-accent)" },
};

function ToastView({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setExiting(true), toast.duration);
    return () => clearTimeout(t);
  }, [toast.duration]);

  useEffect(() => {
    if (!exiting) return;
    const t = setTimeout(onClose, 250);
    return () => clearTimeout(t);
  }, [exiting, onClose]);

  const { Icon, color } = ICONS[toast.type];
  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      className={`pointer-events-auto sw-surface border border-(--sw-line) text-(--sw-ink) px-4 py-3 rounded-lg flex items-center gap-3 min-w-[220px] max-w-[min(92vw,380px)] shadow-lg ${
        exiting ? "toast-slide-out" : "toast-slide-in"
      }`}
    >
      <Icon className={`w-5 h-5 shrink-0 ${color}`} strokeWidth={2.5} aria-hidden="true" />
      <span className="text-sm font-medium flex-1">{toast.message}</span>
      <button
        onClick={() => setExiting(true)}
        className="text-(--sw-muted) hover:text-(--sw-ink) transition-colors p-1 rounded-sm shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}

/** Renders app-wide toasts above every modal (portalled, z-index 2000). */
export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  const [mounted, setMounted] = useState(false);
  const portalRoot = usePortalRoot();
  useEffect(() => setMounted(true), []);
  if (!mounted || !portalRoot) return null;

  return createPortal(
    <div
      aria-live="polite"
      className="fixed top-[max(1rem,env(safe-area-inset-top))] right-4 left-4 sm:left-auto z-2000 pointer-events-none flex flex-col items-end gap-2"
    >
      {toasts.map((t) => (
        <ToastView key={t.id} toast={t} onClose={() => dismiss(t.id)} />
      ))}
    </div>,
    portalRoot
  );
}
