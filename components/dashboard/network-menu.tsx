"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { useWalletStore } from "@/store/wallet-store";
import { showToast } from "@/store/toast-store";
import { CHAINS } from "@/lib/supported-chains";
import { ChainLogo } from "../common/token-icon";

type CustomRPCs = { [chainId: string]: { name: string; rpcUrl: string } };

/** Network picker: built-in networks, saved custom RPCs, and a form to add one. */
export function NetworkMenu() {
  const chainId = useWalletStore((s) => s.chainId);
  const chainName = useWalletStore((s) => s.chainName);
  const setChain = useWalletStore((s) => s.setChain);

  const [open, setOpen] = useState(false);
  const [customRPCs, setCustomRPCs] = useState<CustomRPCs>({});
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [rpc, setRpc] = useState("");
  const [id, setId] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("customRPCs");
      if (stored) setCustomRPCs(JSON.parse(stored));
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function save(next: CustomRPCs) {
    setCustomRPCs(next);
    try {
      localStorage.setItem("customRPCs", JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  }

  function select(nextId: number, url: string, label: string) {
    setChain(nextId, url, label);
    setOpen(false);
    setShowForm(false);
  }

  function addCustom() {
    if (!rpc || !id || !name) return;
    save({ ...customRPCs, [id]: { name, rpcUrl: rpc } });
    setChain(parseInt(id), rpc, name);
    setName("");
    setRpc("");
    setId("");
    setShowForm(false);
    setOpen(false);
  }

  function removeCustom(key: string) {
    const next = { ...customRPCs };
    delete next[key];
    save(next);
    showToast(`Removed ${customRPCs[key]?.name ?? "custom network"}`, "info");
  }

  const row = (active: boolean) =>
    `w-full text-left px-2.5 py-2 rounded-lg text-sm flex items-center gap-3 transition-colors ${
      active ? "bg-[var(--sw-fill-strong)] text-[var(--sw-ink)] font-semibold" : "text-[var(--sw-ink)] hover:bg-[var(--sw-fill)]"
    }`;

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Network: ${chainName}. Change network`}
        className="sw-chip pl-1.5 pr-3 py-1.5 text-sm"
      >
        <ChainLogo key={chainId} chainId={chainId} name={chainName} className="w-6 h-6" />
        <span className="max-w-[9rem] truncate">{chainName}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-[var(--sw-muted)] transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={listRef}
          className="ob-pop-in absolute left-0 top-full mt-2 w-72 sw-surface rounded-xl border border-[var(--sw-line)] z-50 p-1.5 max-h-[70vh] overflow-y-auto shadow-xl"
        >
          <div className="space-y-0.5" role="listbox" aria-label="Networks">
            {CHAINS.map((chain) => {
              const active = chainId === chain.chainId;
              return (
                <button
                  key={chain.chainId}
                  role="option"
                  aria-selected={active}
                  onClick={() => select(chain.chainId, chain.rpcUrl, chain.name)}
                  className={row(active)}
                >
                  <ChainLogo chainId={chain.chainId} name={chain.name} className="w-6 h-6" />
                  <span className="flex-1 truncate">{chain.name}</span>
                  {active && <Check className="w-4 h-4 text-[var(--sw-ink)]" aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          {Object.keys(customRPCs).length > 0 && (
            <div className="pt-1.5 mt-1.5 border-t border-[var(--sw-line-soft)] space-y-0.5">
              {Object.entries(customRPCs).map(([key, data]) => {
                const active = parseInt(key) === chainId;
                return (
                  <div key={key} className={row(active)}>
                    <button onClick={() => select(parseInt(key), data.rpcUrl, data.name)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                      <ChainLogo chainId={parseInt(key)} name={data.name} className="w-6 h-6" />
                      <span className="min-w-0">
                        <span className="block truncate">{data.name}</span>
                        <span className="block text-[11px] text-[var(--sw-muted)] font-normal">Chain {key}</span>
                      </span>
                    </button>
                    <button
                      onClick={() => removeCustom(key)}
                      className="sw-icon-btn p-1.5 hover:!text-[var(--sw-down)]"
                      aria-label={`Remove ${data.name}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-1.5 mt-1.5 border-t border-[var(--sw-line-soft)]">
            <button
              onClick={() => {
                setShowForm(!showForm);
                if (!showForm) setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), 120);
              }}
              aria-expanded={showForm}
              className="w-full text-sm text-[var(--sw-ink-soft)] hover:text-[var(--sw-ink)] flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-[var(--sw-fill)]"
            >
              <span className="w-6 h-6 rounded-full bg-[var(--sw-fill-strong)] flex items-center justify-center">
                {showForm ? <X className="w-3.5 h-3.5" aria-hidden="true" /> : <Plus className="w-3.5 h-3.5" aria-hidden="true" />}
              </span>
              {showForm ? "Cancel" : "Add a custom network"}
            </button>

            {showForm && (
              <form
                className="space-y-2 mt-2 px-1 pb-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  addCustom();
                }}
              >
                {[
                  { v: name, set: setName, ph: "Network name", label: "Network name", type: "text" },
                  { v: rpc, set: setRpc, ph: "https://rpc.example.org", label: "RPC URL", type: "url" },
                  { v: id, set: setId, ph: "Chain ID", label: "Chain ID", type: "number" },
                ].map((f) => (
                  <div key={f.label} className="sw-field px-3 py-2">
                    <input
                      type={f.type}
                      value={f.v}
                      onChange={(e) => f.set(e.target.value)}
                      placeholder={f.ph}
                      aria-label={f.label}
                      className="sw-field-input text-sm sw-mono"
                    />
                  </div>
                ))}
                <button type="submit" disabled={!rpc || !id || !name} className="sw-btn-primary w-full py-2.5 text-sm">
                  Add network
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
