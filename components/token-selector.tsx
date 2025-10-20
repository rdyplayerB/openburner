"use client";

import { useState } from "react";
import { X, Send, Search } from "lucide-react";
import { motion } from "framer-motion";
import { getAppConfig } from "@/lib/config/environment";

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
}

function formatTokenBalance(balance: string): string {
  const num = parseFloat(balance);
  if (num === 0) return "0";
  if (num < 0.0001) return num.toFixed(8);
  if (num < 1) return num.toFixed(6);
  if (num < 1000) return num.toFixed(4);
  return num.toFixed(2);
}

export function TokenSelector({
  tokens,
  onSelectToken,
  onClose,
  tokenImages,
  tokenPrices,
}: TokenSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { pricingEnabled } = getAppConfig();

  // Filter tokens based on search query (by name, symbol, or address)
  const filteredTokens = tokens.filter((token) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    const matchesSymbol = token.symbol.toLowerCase().includes(query);
    const matchesName = token.name.toLowerCase().includes(query);
    const matchesAddress = token.address.toLowerCase().includes(query);
    
    return matchesSymbol || matchesName || matchesAddress;
  });

  return (
    <div className="modal-overlay bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card-lg max-w-sm sm:max-w-md w-full max-h-[85vh] flex flex-col mx-2" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
              Select Token to <span className="text-brand-orange">Send</span>
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, symbol, or address..."
              className="w-full pl-10 pr-4 py-2 sm:py-2.5 text-base border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400"
              autoFocus
            />
          </div>
        </div>

        {/* Token List */}
        <div className="overflow-y-auto flex-1 p-3 sm:p-4">
          {tokens.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <p className="text-slate-500 dark:text-slate-400">No tokens available</p>
            </div>
          ) : filteredTokens.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Search className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No tokens found</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                Try searching by name, symbol, or address
              </p>
            </div>
          ) : (
            <div className="space-y-1">
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
                  className="w-full flex items-center justify-between p-3 sm:p-4 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent hover:border-brand-orange/30 dark:hover:border-brand-orange/40 group cursor-pointer hover:shadow-md active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    {/* Token Icon */}
                    <div className="flex-shrink-0">
                      {tokenImages[token.symbol.toUpperCase()] ? (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-white shadow-sm ring-1 ring-slate-900/5">
                          <img
                            src={tokenImages[token.symbol.toUpperCase()]}
                            alt={token.symbol}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.className = 'w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-brand-orange/10 to-brand-orange/5 flex items-center justify-center';
                                parent.innerHTML = `<span class="text-xs sm:text-sm font-bold text-brand-orange">${token.symbol[0]}</span>`;
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-brand-orange/10 to-brand-orange/5 flex items-center justify-center">
                          <span className="text-xs sm:text-sm font-bold text-brand-orange">{token.symbol[0]}</span>
                        </div>
                      )}
                    </div>

                    {/* Token Info */}
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">{token.symbol}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{token.name}</p>
                    </div>

                    {/* Balance */}
                    <div className="text-right mr-1 sm:mr-2">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                        {formatTokenBalance(token.balance)}
                      </p>
                      {pricingEnabled && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {tokenPrices[token.symbol] !== undefined ? (
                            `≈ $${(parseFloat(token.balance) * tokenPrices[token.symbol]).toFixed(2)}`
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">—</span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Send Icon */}
                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="p-1.5 sm:p-2 bg-brand-orange text-white rounded-lg">
                        <Send className="w-3 h-3 sm:w-4 sm:h-4" strokeWidth={2.5} />
                      </div>
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

