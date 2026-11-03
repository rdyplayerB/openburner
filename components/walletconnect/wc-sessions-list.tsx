"use client";

import { Unplug } from "lucide-react";
import { useWalletConnectStore } from "@/store/walletconnect-store";
import { DappIcon, dappHost } from "./dapp-identity";

/**
 * List of active dApp connections with per-session disconnect.
 * Rendered inside the menu / settings.
 */
export function WcSessionsList({ compact = false }: { compact?: boolean }) {
  const sessions = useWalletConnectStore((s) => s.sessions);
  const disconnect = useWalletConnectStore((s) => s.disconnect);

  if (sessions.length === 0) {
    return <p className="text-xs text-(--sw-muted) py-3">No connected dApps.</p>;
  }

  return (
    <div className="sw-list">
      {sessions.map((s) => {
        const meta = s.peer?.metadata || {};
        const host = dappHost(meta.url);
        return (
          <div key={s.topic} className={`flex items-center gap-3 ${compact ? "py-2" : "py-3"}`}>
            <DappIcon src={meta.icons?.[0]} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-(--sw-ink) truncate">{meta.name || "dApp"}</p>
              {!compact && host && <p className="text-xs text-(--sw-muted) truncate">{host}</p>}
            </div>
            <button
              onClick={() => disconnect(s.topic)}
              className="sw-icon-btn p-1.5 hover:text-(--sw-down)!"
              title="Disconnect"
              aria-label={`Disconnect ${meta.name || "dApp"}`}
            >
              <Unplug className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
