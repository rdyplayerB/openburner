import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { rateLimit } from '@/lib/rate-limit';
import { log, errMsg } from '@/lib/log';

const ZEROX_API_BASE_URL = 'https://api.0x.org';
// Prefer the server-only key (not exposed in the client bundle); fall back to the
// legacy NEXT_PUBLIC var for backwards compatibility / local dev.
const ZEROX_API_KEY = process.env.ZEROX_API_KEY || process.env.NEXT_PUBLIC_0X_API_KEY;

// Supported chains by 0x API
const SUPPORTED_CHAINS = {
  1: 'ethereum',      // Ethereum Mainnet
  8453: 'base',       // Base
  42161: 'arbitrum',  // Arbitrum One
  10: 'optimism',     // Optimism
  137: 'polygon',     // Polygon
  56: 'bsc',          // BNB Chain
  43114: 'avalanche', // Avalanche
  81457: 'blast',     // Blast
  59144: 'linea',     // Linea
  5000: 'mantle',     // Mantle
  34443: 'mode',      // Mode
  534352: 'scroll',   // Scroll
  324: 'zksync',      // zkSync Era
};

// Special address used by 0x API to represent native tokens (ETH, BNB, POL, etc.)
const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

/**
 * Convert native token address to the special address used by 0x API
 */
function convertNativeToZeroXFormat(tokenAddress: string): string {
  if (tokenAddress === 'native') {
    return NATIVE_TOKEN_ADDRESS;
  }
  return tokenAddress;
}

function bad(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

const isToken = (t: string) => t === 'native' || ethers.isAddress(t);
const isAmount = (a: string) => /^\d{1,78}$/.test(a);

export async function GET(request: NextRequest) {
  try {
    const blocked = await rateLimit(request, 'zerox', 40, 60_000);
    if (blocked) return blocked;

    const { searchParams } = new URL(request.url);
    const sellToken = searchParams.get('sellToken');
    const buyToken = searchParams.get('buyToken');
    const sellAmount = searchParams.get('sellAmount');
    const buyAmount = searchParams.get('buyAmount');
    const takerAddress = searchParams.get('taker');
    const slippagePercentage = searchParams.get('slippagePercentage') || '0.5';
    const chainId = searchParams.get('chainId');
    const endpoint = searchParams.get('endpoint') || 'quote';

    if (!sellToken || !buyToken || !takerAddress || !chainId) {
      return bad('Missing required parameters: sellToken, buyToken, taker, chainId');
    }
    const chainName = SUPPORTED_CHAINS[Number(chainId) as keyof typeof SUPPORTED_CHAINS];
    if (!chainName) return bad(`Chain ${chainId} is not supported`);
    if (!isToken(sellToken) || !isToken(buyToken)) return bad('Invalid token address');
    if (!ethers.isAddress(takerAddress)) return bad('Invalid taker address');
    if (!sellAmount && !buyAmount) return bad('Either sellAmount or buyAmount must be provided');
    if ((sellAmount && !isAmount(sellAmount)) || (buyAmount && !isAmount(buyAmount))) {
      return bad('Amounts must be whole numbers in base units');
    }
    const slippage = Number(slippagePercentage);
    if (!Number.isFinite(slippage) || slippage < 0 || slippage > 50) {
      return bad('Slippage must be between 0 and 50 percent');
    }
    if (endpoint !== 'price' && endpoint !== 'quote') return bad('Unknown endpoint');

    const convertedSellToken = convertNativeToZeroXFormat(sellToken);
    const convertedBuyToken = convertNativeToZeroXFormat(buyToken);

    const zeroXUrl = new URL(`${ZEROX_API_BASE_URL}/swap/allowance-holder/${endpoint}`);
    zeroXUrl.searchParams.set('sellToken', convertedSellToken);
    zeroXUrl.searchParams.set('buyToken', convertedBuyToken);
    zeroXUrl.searchParams.set('taker', takerAddress);
    zeroXUrl.searchParams.set('chainId', chainId);

    // Platform fee: 0.88%, taken in the sell token
    zeroXUrl.searchParams.set('swapFeeRecipient', '0x084A66020a0CAc73a7161dD473740C82295683Fb');
    zeroXUrl.searchParams.set('swapFeeBps', '88');
    zeroXUrl.searchParams.set('swapFeeToken', convertedSellToken);

    if (endpoint === 'quote') {
      zeroXUrl.searchParams.set('slippageBps', String(Math.round(slippage * 100)));
    }
    if (sellAmount) zeroXUrl.searchParams.set('sellAmount', sellAmount);
    if (buyAmount) zeroXUrl.searchParams.set('buyAmount', buyAmount);

    const headers: HeadersInit = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      '0x-version': 'v2',
    };
    // A user-provided key (forwarded by the client) takes precedence over the env var.
    const zeroxKey = request.headers.get('x-0x-key') || ZEROX_API_KEY;
    if (zeroxKey) headers['0x-api-key'] = zeroxKey;

    const response = await fetch(zeroXUrl.toString(), { method: 'GET', headers });

    if (!response.ok) {
      log.warn(`[Swap Proxy] upstream ${response.status}`);
      let errorMessage = 'Failed to fetch quote';
      if (response.status === 400) {
        errorMessage = 'Invalid swap parameters. Please check token addresses and amounts.';
      } else if (response.status === 404) {
        errorMessage = 'No liquidity available for this token pair.';
      } else if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (response.status >= 500) {
        errorMessage = 'The swap service is having trouble. Please try again later.';
      }
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    log.error(`[Swap Proxy] ${errMsg(error)}`);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
