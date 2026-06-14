"use client";

import { Globe, Unplug } from "lucide-react";
import { useWalletConnectStore } from "@/store/walletconnect-store";

/**
 * List of active dApp connections with per-session disconnect.
 * Rendered inside the menu / settings.
 */
export function WcSessionsList({ compact = false }: { compact?: boolean }) {
  const { sessions, disconnect } = useWalletConnectStore();

  if (sessions.length === 0) {
    return (
      <p className="text-xs text-[var(--sw-muted)] py-3">No connected dApps.</p>
    );
  }

  return (
    <div className="sw-list">
      {sessions.map((s) => {
        const meta = s.peer?.metadata || {};
        return (
          <div key={s.topic} className="flex items-center gap-3 py-3">
            <div className="w-8 h-8 sw-mark rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
              {meta.icons?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={meta.icons[0]} alt={meta.name || "dApp"} className="w-full h-full object-cover" />
              ) : (
                <Globe className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--sw-ink)] truncate">{meta.name || "dApp"}</p>
              {!compact && <p className="text-xs text-[var(--sw-muted)] truncate">{meta.url || ""}</p>}
            </div>
            <button
              onClick={() => disconnect(s.topic)}
              className="text-[var(--sw-muted)] hover:text-[var(--sw-down)] transition-colors p-1.5"
              title="Disconnect"
            >
              <Unplug className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
