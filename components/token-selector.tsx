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
      <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-sm sm:max-w-md w-full shadow-card-lg mx-2 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-900">
            {title}
          </h2>
          <div className="flex items-center gap-3">
            {/* Add Token Button */}
            {onAddToken && (
              <button
                onClick={onAddToken}
                className="text-sm text-slate-700 dark:text-slate-300 hover:text-brand-orange font-semibold flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all group"
              >
                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" strokeWidth={2.5} />
                Add Token
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, symbol, or address..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent bg-white text-slate-900 placeholder-slate-400"
            autoFocus
          />
        </div>


        {/* Token List */}
        <div className="overflow-y-auto flex-1">
          {tokens.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-slate-500 dark:text-slate-400">No tokens available</p>
            </div>
          ) : filteredTokens.length === 0 ? (
            <div className="text-center py-6">
              <Search className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No tokens found</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                Try searching by name, symbol, or address
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
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
                  className="w-full flex items-center justify-between p-2.5 rounded-xl transition-all hover:bg-slate-50 border border-transparent hover:border-brand-orange/30 group cursor-pointer hover:shadow-md active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Token Icon */}
                    <div className="flex-shrink-0">
                      {tokenImages[token.symbol.toUpperCase()] ? (
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-white shadow-sm ring-1 ring-slate-900/5">
                          <img
                            src={tokenImages[token.symbol.toUpperCase()]}
                            alt={token.symbol}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.className = 'w-8 h-8 rounded-full bg-gradient-to-br from-brand-orange/10 to-brand-orange/5 flex items-center justify-center';
                                parent.innerHTML = `<span class="text-xs font-bold text-brand-orange">${token.symbol[0]}</span>`;
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-orange/10 to-brand-orange/5 flex items-center justify-center">
                          <span className="text-xs font-bold text-brand-orange">{token.symbol[0]}</span>
                        </div>
                      )}
                    </div>

                    {/* Token Info */}
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{token.symbol}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{token.name}</p>
                    </div>

                    {/* Balance - Only show if not zero */}
                    <div className="text-right">
                      {parseFloat(token.balance) > 0 ? (
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
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
  );
}