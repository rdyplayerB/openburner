"use client";

import { useState } from "react";
import { X, Search, Plus } from "lucide-react";
import { motion } from "framer-motion";
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
}

export function TokenSelector({
  tokens,
  onSelectToken,
  onClose,
  tokenImages,
  tokenPrices,
  title = "Select Token",
  onAddToken,
}: TokenSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { pricingEnabled } = getAppConfig();

  // Filter and sort tokens
  const filteredTokens = tokens
    .filter((token) => {
      if (!searchQuery.trim()) return true;
      
      const query = searchQuery.toLowerCase().trim();
      const matchesSymbol = token.symbol.toLowerCase().includes(query);
      const matchesName = token.name.toLowerCase().includes(query);
      const matchesAddress = token.address.toLowerCase().includes(query);
      
      return matchesSymbol || matchesName || matchesAddress;
    })
    .sort((a, b) => {
      // Always keep native token at the top
      const aIsNative = a.address === "native";
      const bIsNative = b.address === "native";
      
      if (aIsNative && !bIsNative) return -1;
      if (!aIsNative && bIsNative) return 1;
      
      // Sort all other tokens by USD value (highest first)
      const aValue = parseFloat(a.balance) * (tokenPrices[a.symbol] || 0);
      const bValue = parseFloat(b.balance) * (tokenPrices[b.symbol] || 0);
      return bValue - aValue;
    });

  return (
    <div className="modal-overlay bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 z-50" onClick={onClose}>
      <div className="sw-surface w-full max-w-sm rounded-xl border border-[var(--sw-line)] overflow-hidden max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--sw-line)]">
          <h2 className="text-lg font-bold text-[var(--sw-ink)]">
            {title}
          </h2>
          <div className="flex items-center gap-3">
            {/* Add Token Button */}
            {onAddToken && (
              <button
                onClick={onAddToken}
                className="sw-uplabel text-[var(--sw-accent)] hover:text-[var(--sw-accent-press)] flex items-center gap-1.5 group"
              >
                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                Add token
              </button>
            )}
            <button
              onClick={onClose}
              className="text-[var(--sw-muted)] hover:text-[var(--sw-ink)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-5 pt-4 pb-5 flex flex-col min-h-0 flex-1">
        {/* Search Input */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sw-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, symbol, or address"
            className="sw-input w-full pl-10 pr-3 py-2.5 text-sm border border-[var(--sw-line)] rounded-lg"
            autoFocus
          />
        </div>


        {/* Token List */}
        <div className="overflow-y-auto flex-1">
          {tokens.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-[var(--sw-muted)]">No tokens available</p>
            </div>
          ) : filteredTokens.length === 0 ? (
            <div className="text-center py-6">
              <Search className="w-6 h-6 text-[var(--sw-muted)] mx-auto mb-2" />
              <p className="text-sm text-[var(--sw-ink-soft)]">No tokens found</p>
              <p className="text-xs text-[var(--sw-muted)] mt-1">
                Try a name, symbol, or address
              </p>
            </div>
          ) : (
            <div className="sw-divide">
              {filteredTokens.map((token, index) => (
                <motion.button
                  key={token.address}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.2,
                    delay: index * 0.03,
                    ease: "easeOut"
                  }}
                  onClick={() => {
                    onSelectToken(token);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between py-3 group cursor-pointer"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Token Icon */}
                    <div className="flex-shrink-0">
                      {tokenImages[token.symbol.toUpperCase()] ? (
                        <div className="w-8 h-8 rounded-lg overflow-hidden">
                          <img
                            src={tokenImages[token.symbol.toUpperCase()]}
                            alt={token.symbol}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.className = 'w-8 h-8 sw-mark rounded-lg flex items-center justify-center';
                                parent.innerHTML = `<span class="text-xs font-bold">${token.symbol[0]}</span>`;
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 sw-mark rounded-lg flex items-center justify-center">
                          <span className="text-xs font-bold">{token.symbol[0]}</span>
                        </div>
                      )}
                    </div>

                    {/* Token Info */}
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-bold text-[var(--sw-ink)] text-sm">{token.symbol}</p>
                      <p className="text-xs text-[var(--sw-muted)] truncate">{token.name}</p>
                    </div>

                    {/* Balance - Only show if not zero */}
                    <div className="text-right">
                      {parseFloat(token.balance) > 0 ? (
                        <p className="sw-mono text-sm font-bold text-[var(--sw-ink)]">
                          {formatTokenBalance(token.balance, token.symbol === 'USDC' || token.symbol === 'USDT')}
                        </p>
                      ) : (
                        <div className="h-5"></div>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}