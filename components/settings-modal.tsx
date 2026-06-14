"use client";

import { useEffect, useState } from "react";
import { X, Moon, Sun, ExternalLink } from "lucide-react";
import { useThemeStore } from "@/store/theme-store";
import { getUserKeys, setUserKey, type UserKeyName } from "@/lib/user-keys";

interface ServerStatus {
  coingecko: boolean;
  alchemy: boolean;
  swap: boolean;
  walletconnect: boolean;
}

const APP_VERSION = "1.2.0";

const KEYS: {
  key: UserKeyName;
  statusKey: keyof ServerStatus;
  label: string;
  purpose: string;
  env: string;
  where: string;
}[] = [
  { key: "coingecko", statusKey: "coingecko", label: "Pricing", purpose: "CoinGecko", env: "COINGECKO_API_KEY", where: "coingecko.com" },
  { key: "zerox", statusKey: "swap", label: "Swaps", purpose: "0x", env: "NEXT_PUBLIC_0X_API_KEY", where: "0x.org" },
  { key: "alchemy", statusKey: "alchemy", label: "Collectibles", purpose: "Alchemy", env: "ALCHEMY_API_KEY", where: "alchemy.com" },
  { key: "walletconnect", statusKey: "walletconnect", label: "dApp connections", purpose: "WalletConnect", env: "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", where: "cloud.reown.com" },
];

type KeyState = "saved" | "server" | "none";

function StatusChip({ state, loading }: { state: KeyState; loading: boolean }) {
  if (loading) return <span className="text-[11px] text-[var(--sw-muted)]">…</span>;
  const color = state === "none" ? "var(--sw-muted)" : "var(--sw-up)";
  const text = state === "saved" ? "Saved" : state === "server" ? "Server" : "Not set";
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold" style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {text}
    </span>
  );
}

export function SettingsModal({
  onClose,
  initialEdit,
}: {
  onClose: () => void;
  initialEdit?: UserKeyName;
}) {
  const { isDarkMode, toggleTheme } = useThemeStore();
  const [server, setServer] = useState<ServerStatus | null>(null);
  const [saved, setSaved] = useState<Partial<Record<UserKeyName, string>>>({});
  const [editing, setEditing] = useState<UserKeyName | null>(initialEdit ?? null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setSaved(getUserKeys());
    fetch("/api/config-status")
      .then((r) => r.json())
      .then(setServer)
      .catch(() => setServer({ coingecko: false, alchemy: false, swap: false, walletconnect: false }));
  }, []);

  function openEdit(name: UserKeyName) {
    setEditing(name);
    setDraft("");
  }

  function save(name: UserKeyName) {
    const val = draft.trim();
    if (!val) return;
    setUserKey(name, val);
    window.location.reload(); // reload so every consumer picks up the new key
  }

  function remove(name: UserKeyName) {
    setUserKey(name, "");
    window.location.reload();
  }

  return (
    <div
      className="modal-overlay bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 z-[10000]"
      onClick={onClose}
    >
      <div
        className="sw-surface w-full max-w-sm rounded-xl border border-[var(--sw-line)] overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--sw-line)]">
          <span className="sw-uplabel">Settings</span>
          <button onClick={onClose} className="text-[var(--sw-muted)] hover:text-[var(--sw-ink)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto">
          {/* Appearance */}
          <p className="sw-seclabel mt-1 mb-1">Appearance</p>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2.5">
              {isDarkMode ? <Moon className="w-4 h-4 text-[var(--sw-muted)]" /> : <Sun className="w-4 h-4 text-[var(--sw-muted)]" />}
              <span className="text-sm text-[var(--sw-ink)]">Dark mode</span>
            </div>
            <button
              onClick={toggleTheme}
              role="switch"
              aria-checked={isDarkMode}
              className={`relative w-10 h-6 rounded-full transition-colors ${isDarkMode ? "bg-[var(--sw-accent)]" : "bg-[var(--sw-line)]"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${isDarkMode ? "translate-x-4" : ""}`} />
            </button>
          </div>

          {/* API keys */}
          <p className="sw-seclabel mt-5 mb-1">API keys</p>
          <div className="sw-list">
            {KEYS.map((k) => {
              const isSaved = !!saved[k.key];
              const state: KeyState = isSaved ? "saved" : server?.[k.statusKey] ? "server" : "none";
              const open = editing === k.key;
              return (
                <div key={k.key} className="py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--sw-ink)] truncate">
                        {k.label}
                        <span className="text-[var(--sw-muted)] font-normal"> · {k.purpose}</span>
                      </p>
                      <p className="text-[11px] sw-mono text-[var(--sw-muted)] mt-0.5 truncate">{k.env}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <StatusChip state={state} loading={server === null} />
                      {!open && (
                        <button
                          onClick={() => openEdit(k.key)}
                          className="text-xs font-semibold text-[var(--sw-accent)] hover:opacity-80 transition-opacity"
                        >
                          {isSaved ? "Edit" : "Add key"}
                        </button>
                      )}
                    </div>
                  </div>

                  {open && (
                    <div className="mt-3">
                      <input
                        type="password"
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") save(k.key);
                          if (e.key === "Escape") setEditing(null);
                        }}
                        placeholder="Paste key"
                        className="sw-input w-full border border-[var(--sw-line)] rounded-lg px-3 py-2.5 text-sm sw-mono"
                      />
                      <div className="flex items-center justify-between mt-2.5">
                        <a
                          href={`https://${k.where}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-[var(--sw-muted)] hover:text-[var(--sw-ink)] inline-flex items-center gap-1 transition-colors"
                        >
                          Get a key at {k.where} <ExternalLink className="w-3 h-3" />
                        </a>
                        <div className="flex items-center gap-2">
                          {isSaved && (
                            <button
                              onClick={() => remove(k.key)}
                              className="text-xs font-semibold px-3 py-1.5 rounded-md text-[var(--sw-down)] hover:bg-[var(--sw-line-soft)] transition-colors"
                            >
                              Remove
                            </button>
                          )}
                          <button
                            onClick={() => setEditing(null)}
                            className="sw-btn-ghost text-xs px-3 py-1.5"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => save(k.key)}
                            disabled={!draft.trim()}
                            className="sw-btn-primary text-xs px-4 py-1.5"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-[var(--sw-muted)] mt-3 leading-relaxed">
            Keys are stored in this browser and override server settings. Used only for
            read-only data — never to move funds. Saving reloads the app.
          </p>

          {/* About */}
          <p className="sw-seclabel mt-5 mb-1">About</p>
          <div className="sw-list">
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-[var(--sw-ink)]">Version</span>
              <span className="text-sm sw-mono text-[var(--sw-muted)]">v{APP_VERSION}</span>
            </div>
            <a
              href="https://openburner.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between py-3 group"
            >
              <span className="text-sm text-[var(--sw-ink)]">OpenBurner.xyz</span>
              <ExternalLink className="w-4 h-4 text-[var(--sw-muted)] group-hover:text-[var(--sw-ink)]" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
