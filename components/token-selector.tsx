"use client";

import { useMemo, useRef, useState } from "react";
import { X, Search, Plus, Check } from "lucide-react";
import { Modal } from "./common/modal";
import { TokenIcon } from "./common/token-icon";
import { getAppConfig } from "@/lib/config/environment";
import { formatTokenBalance } from "@/lib/format-utils";

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  usdPrice?: number;
}

interface TokenSelectorProps {
  tokens: Token[];
  onSelectToken: (token: Token) => void;
  onClose: () => void;
  tokenImages: { [symbol: string]: string };
  tokenPrices: { [symbol: string]: number };
  title?: string;
  onAddToken?: () => void;
  /** Address of the token that's currently chosen (shows a check). */
  selectedAddress?: string | null;
}

const STABLES = new Set(["USDC", "USDT", "DAI", "USDC.E", "USDBC"]);

function usd(value: number): string {
  return value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

export function TokenSelector({
  tokens,
  onSelectToken,
  onClose,
  tokenImages,
  tokenPrices,
  title = "Select a token",
  onAddToken,
  selectedAddress,
}: TokenSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { pricingEnabled } = getAppConfig();
  const searchRef = useRef<HTMLInputElement>(null);
  // Focus search only with a mouse/trackpad; on phones the keyboard would cover the list.
  const finePointer = typeof window !== "undefined" && window.matchMedia?.("(pointer: fine)").matches;

  const filteredTokens = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const value = (t: Token) => parseFloat(t.balance) * (tokenPrices[t.symbol] || 0);
    return tokens
      .filter(
        (t) =>
          !q ||
          t.symbol.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          t.address.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        // Native first, then by USD value, then by balance held, then A–Z.
        if (a.address === "native") return -1;
        if (b.address === "native") return 1;
        const dv = value(b) - value(a);
        if (dv !== 0) return dv;
        const ha = parseFloat(a.balance) > 0 ? 1 : 0;
        const hb = parseFloat(b.balance) > 0 ? 1 : 0;
        if (ha !== hb) return hb - ha;
        return a.symbol.localeCompare(b.symbol);
      });
  }, [tokens, searchQuery, tokenPrices]);

  return (
    <Modal
      onClose={onClose}
      labelledBy="token-selector-title"
      initialFocusRef={finePointer ? searchRef : undefined}
      className="sw-surface w-full max-w-sm rounded-xl border border-(--sw-line) overflow-hidden h-[min(600px,85dvh)] flex flex-col"
    >
      <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
        <h2 id="token-selector-title" className="text-lg font-bold text-(--sw-ink) tracking-tight">
          {title}
        </h2>
        <button onClick={onClose} className="sw-icon-btn p-2 -mr-2" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-5 pb-3 shrink-0">
        <div className="sw-field flex items-center gap-2 px-3 py-2.5">
          <Search className="w-4 h-4 text-(--sw-muted) shrink-0" aria-hidden="true" />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, symbol or address"
            aria-label="Search tokens"
            autoComplete="off"
            spellCheck={false}
            className="sw-field-input text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-(--sw-muted) hover:text-(--sw-ink)" aria-label="Clear search">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-y-auto overscroll-contain flex-1 min-h-0 px-2 pb-2" role="listbox" aria-label="Tokens">
        {tokens.length === 0 ? (
          <div className="text-center py-12 px-6">
            <p className="text-sm font-semibold text-(--sw-ink)">No tokens yet</p>
            <p className="text-xs text-(--sw-muted) mt-1">Tokens you hold on this network show up here.</p>
          </div>
        ) : filteredTokens.length === 0 ? (
          <div className="text-center py-12 px-6">
            <Search className="w-5 h-5 text-(--sw-muted) mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm font-semibold text-(--sw-ink)">No match for &ldquo;{searchQuery.trim()}&rdquo;</p>
            <p className="text-xs text-(--sw-muted) mt-1">
              {onAddToken ? "Paste its contract address to add it." : "Try a name, symbol or contract address."}
            </p>
          </div>
        ) : (
          filteredTokens.map((token) => {
            const amount = parseFloat(token.balance);
            const price = tokenPrices[token.symbol];
            const selected = !!selectedAddress && selectedAddress.toLowerCase() === token.address.toLowerCase();
            return (
              <button
                key={token.address}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onSelectToken(token);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors hover:bg-(--sw-fill) ${
                  selected ? "bg-(--sw-fill)" : ""
                }`}
              >
                <TokenIcon symbol={token.symbol} url={tokenImages[token.symbol.toUpperCase()]} size="md" />
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-(--sw-ink) truncate">{token.symbol}</span>
                    {selected && <Check className="w-3.5 h-3.5 text-(--sw-ink) shrink-0" aria-hidden="true" />}
                  </span>
                  <span className="block text-xs text-(--sw-muted) truncate">{token.name}</span>
                </span>
                {amount > 0 && (
                  <span className="text-right shrink-0">
                    <span className="block text-sm font-semibold text-(--sw-ink) sw-num">
                      {formatTokenBalance(token.balance, STABLES.has(token.symbol.toUpperCase()))}
                    </span>
                    {pricingEnabled && price !== undefined && (
                      <span className="block text-xs text-(--sw-muted) sw-num">{usd(amount * price)}</span>
                    )}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {onAddToken && (
        <div className="px-5 py-3 border-t border-(--sw-line-soft) shrink-0">
          <button onClick={onAddToken} className="sw-link text-sm inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add a token by address
          </button>
        </div>
      )}
    </Modal>
  );
}
