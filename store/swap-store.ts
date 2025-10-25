/**
 * Swap Store
 * Manages swap-related state and operations
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SwapQuote, SwapQuoteParams } from '../lib/swap-api';
import { AllowanceInfo } from '../lib/token-allowance';

export interface SwapTokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  logoURI?: string;
}

export interface SwapSettings {
  slippagePercentage: number;
  autoApprove: boolean;
  showAdvancedSettings: boolean;
}

export interface SwapState {
  // Current swap state
  fromToken: SwapTokenInfo | null;
  toToken: SwapTokenInfo | null;
  fromAmount: string;
  toAmount: string;
  quote: SwapQuote | null;
  isLoadingQuote: boolean;
  quoteError: string | null;
  
  // Allowance state
  allowanceInfo: AllowanceInfo | null;
  needsApproval: boolean;
  
  // Swap settings
  settings: SwapSettings;
  
  // Swap history
  swapHistory: Array<{
    id: string;
    fromToken: SwapTokenInfo;
    toToken: SwapTokenInfo;
    fromAmount: string;
    toAmount: string;
    txHash: string;
    timestamp: number;
    chainId: number;
  }>;
  
  // Actions
  setFromToken: (token: SwapTokenInfo | null) => void;
  setToToken: (token: SwapTokenInfo | null) => void;
  setFromAmount: (amount: string) => void;
  setToAmount: (amount: string) => void;
  setQuote: (quote: SwapQuote | null) => void;
  setQuoteLoading: (loading: boolean) => void;
  setQuoteError: (error: string | null) => void;
  setAllowanceInfo: (info: AllowanceInfo | null) => void;
  setNeedsApproval: (needs: boolean) => void;
  updateSettings: (settings: Partial<SwapSettings>) => void;
  addSwapToHistory: (swap: SwapState['swapHistory'][0]) => void;
  clearSwapHistory: () => void;
  resetSwap: () => void;
  swapTokens: () => void;
}

const defaultSettings: SwapSettings = {
  slippagePercentage: 0.5,
  autoApprove: true,
  showAdvancedSettings: false,
};

export const useSwapStore = create<SwapState>()(
  persist(
    (set, get) => ({
      // Initial state
      fromToken: null,
      toToken: null,
      fromAmount: '',
      toAmount: '',
      quote: null,
      isLoadingQuote: false,
      quoteError: null,
      allowanceInfo: null,
      needsApproval: false,
      settings: defaultSettings,
      swapHistory: [],

      // Actions
      setFromToken: (token) => {
        console.log('🔄 [Swap Store] Setting from token:', token?.symbol);
        set({ fromToken: token, quote: null, quoteError: null });
      },

      setToToken: (token) => {
        console.log('🔄 [Swap Store] Setting to token:', token?.symbol);
        set({ toToken: token, quote: null, quoteError: null });
      },

      setFromAmount: (amount) => {
        console.log('🔄 [Swap Store] Setting from amount:', amount);
        set({ fromAmount: amount, quoteError: null });
      },

      setToAmount: (amount) => {
        console.log('🔄 [Swap Store] Setting to amount:', amount);
        set({ toAmount: amount, quoteError: null });
      },

      setQuote: (quote) => {
        console.log('🔄 [Swap Store] Setting quote:', quote ? 'received' : 'cleared');
        set({ quote, quoteError: null });
      },

      setQuoteLoading: (loading) => {
        console.log('🔄 [Swap Store] Setting quote loading:', loading);
        set({ isLoadingQuote: loading });
      },

      setQuoteError: (error) => {
        console.log('🔄 [Swap Store] Setting quote error:', error);
        set({ quoteError: error, quote: null });
      },

      setAllowanceInfo: (info) => {
        console.log('🔄 [Swap Store] Setting allowance info:', info ? 'received' : 'cleared');
        set({ allowanceInfo: info });
      },

      setNeedsApproval: (needs) => {
        console.log('🔄 [Swap Store] Setting needs approval:', needs);
        set({ needsApproval: needs });
      },

      updateSettings: (newSettings) => {
        console.log('🔄 [Swap Store] Updating settings:', newSettings);
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      addSwapToHistory: (swap) => {
        console.log('🔄 [Swap Store] Adding swap to history:', swap.id);
        set((state) => ({
          swapHistory: [swap, ...state.swapHistory].slice(0, 50), // Keep last 50 swaps
        }));
      },

      clearSwapHistory: () => {
        console.log('🔄 [Swap Store] Clearing swap history');
        set({ swapHistory: [] });
      },

      resetSwap: () => {
        console.log('🔄 [Swap Store] Resetting swap state');
        set({
          fromToken: null,
          toToken: null,
          fromAmount: '',
          toAmount: '',
          quote: null,
          isLoadingQuote: false,
          quoteError: null,
          allowanceInfo: null,
          needsApproval: false,
        });
      },

      swapTokens: () => {
        console.log('🔄 [Swap Store] Swapping token positions');
        const { fromToken, toToken, fromAmount, toAmount } = get();
        set({
          fromToken: toToken,
          toToken: fromToken,
          fromAmount: toAmount,
          toAmount: fromAmount,
          quote: null,
          quoteError: null,
        });
      },
    }),
    {
      name: 'swap-store',
      partialize: (state) => ({
        settings: state.settings,
        swapHistory: state.swapHistory,
      }),
    }
  )
);

/**
 * Get quote parameters for API call
 */
export function getQuoteParams(state: SwapState, chainId: number): SwapQuoteParams | null {
  const { fromToken, toToken, fromAmount, toAmount, settings } = state;

  if (!fromToken || !toToken) {
    return null;
  }

  // Determine if we're selling or buying
  if (fromAmount && fromAmount !== '0') {
    return {
      sellToken: fromToken.address,
      buyToken: toToken.address,
      sellAmount: fromAmount,
      slippagePercentage: settings.slippagePercentage,
      takerAddress: '', // Will be set when making the call
      chainId,
    };
  } else if (toAmount && toAmount !== '0') {
    return {
      sellToken: fromToken.address,
      buyToken: toToken.address,
      buyAmount: toAmount,
      slippagePercentage: settings.slippagePercentage,
      takerAddress: '', // Will be set when making the call
      chainId,
    };
  }

  return null;
}

/**
 * Check if swap is ready to execute
 */
export function isSwapReady(state: SwapState): boolean {
  const { fromToken, toToken, fromAmount, quote, needsApproval } = state;
  
  return !!(
    fromToken &&
    toToken &&
    fromAmount &&
    fromAmount !== '0' &&
    quote &&
    !needsApproval
  );
}

/**
 * Get swap summary for display
 */
export function getSwapSummary(state: SwapState): {
  from: string;
  to: string;
  rate: string;
  priceImpact: string;
  minimumReceived: string;
} | null {
  const { fromToken, toToken, fromAmount, toAmount, quote } = state;

  if (!fromToken || !toToken || !quote) {
    return null;
  }

  const fromAmountDisplay = fromAmount || '0';
  const toAmountDisplay = toAmount || '0';

  return {
    from: `${fromAmountDisplay} ${fromToken.symbol}`,
    to: `${toAmountDisplay} ${toToken.symbol}`,
    rate: `1 ${fromToken.symbol} = ${(parseFloat(toAmountDisplay) / parseFloat(fromAmountDisplay)).toFixed(6)} ${toToken.symbol}`,
    priceImpact: quote.priceImpact || '0',
    minimumReceived: quote.buyAmount,
  };
}
