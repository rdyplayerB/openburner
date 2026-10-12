"use client";

import { createContext, useContext } from "react";

/**
 * Where dialogs and toasts portal to. Defaults to this document's <body>;
 * a host that renders the app inside an iframe (e.g. the Ladle story viewer)
 * provides the frame's body so overlays stay inside it.
 */
export const PortalRootContext = createContext<HTMLElement | null>(null);

export function usePortalRoot(): HTMLElement | null {
  const root = useContext(PortalRootContext);
  return root ?? (typeof document !== "undefined" ? document.body : null);
}
