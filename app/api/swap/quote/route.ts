import { NextRequest, NextResponse } from 'next/server';

const ZEROX_API_BASE_URL = 'https://api.0x.org';
const ZEROX_API_KEY = process.env.NEXT_PUBLIC_0X_API_KEY;

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Log all incoming parameters for debugging
    console.log('🔍 [API Proxy] Incoming request URL:', request.url);
    console.log('🔍 [API Proxy] All query params:', Object.fromEntries(searchParams));
    
    // Extract query parameters
    const sellToken = searchParams.get('sellToken');
    const buyToken = searchParams.get('buyToken');
    const sellAmount = searchParams.get('sellAmount');
    const buyAmount = searchParams.get('buyAmount');
    const takerAddress = searchParams.get('taker');
    const slippagePercentage = searchParams.get('slippagePercentage') || '0.5';
    const chainId = searchParams.get('chainId');
    const endpoint = searchParams.get('endpoint') || 'quote'; // 'price' or 'quote'

    // Validate required parameters
    if (!sellToken || !buyToken || !takerAddress || !chainId) {
      return NextResponse.json(
        { error: 'Missing required parameters: sellToken, buyToken, taker, chainId' },
        { status: 400 }
      );
    }

    // Validate chain support
    const chainName = SUPPORTED_CHAINS[parseInt(chainId) as keyof typeof SUPPORTED_CHAINS];
    if (!chainName) {
      return NextResponse.json(
        { error: `Chain ${chainId} is not supported` },
        { status: 400 }
      );
    }

    // Validate that either sellAmount or buyAmount is provided
    if (!sellAmount && !buyAmount) {
      return NextResponse.json(
        { error: 'Either sellAmount or buyAmount must be provided' },
        { status: 400 }
      );
    }

    // Convert native tokens to the special address used by 0x API
    const convertedSellToken = convertNativeToZeroXFormat(sellToken);
    const convertedBuyToken = convertNativeToZeroXFormat(buyToken);

    // Build 0x API URL - use the v2 allowance-holder endpoint only
    const apiEndpoint = endpoint === 'price' ? 'price' : 'quote';
    const zeroXUrl = new URL(`${ZEROX_API_BASE_URL}/swap/allowance-holder/${apiEndpoint}`);
    console.log(`🔧 [API Proxy] Using v2 allowance-holder ${apiEndpoint} endpoint`);
    zeroXUrl.searchParams.set('sellToken', convertedSellToken);
    zeroXUrl.searchParams.set('buyToken', convertedBuyToken);
    zeroXUrl.searchParams.set('taker', takerAddress);
    zeroXUrl.searchParams.set('chainId', chainId);
    
    // Add affiliate fee parameters
    zeroXUrl.searchParams.set('swapFeeRecipient', '0x084A66020a0CAc73a7161dD473740C82295683Fb');
    zeroXUrl.searchParams.set('swapFeeBps', '88'); // 0.88% in basis points (88/10000 = 0.88%)
    zeroXUrl.searchParams.set('swapFeeToken', convertedSellToken); // Receive fees in sell token
    
    // Convert slippage percentage to basis points (0.5% = 50 bps) - only for quote endpoint
    if (apiEndpoint === 'quote') {
      const slippageBps = Math.round(parseFloat(slippagePercentage) * 100);
      zeroXUrl.searchParams.set('slippageBps', slippageBps.toString());
    }
    
    if (sellAmount) {
      zeroXUrl.searchParams.set('sellAmount', sellAmount);
    }
    if (buyAmount) {
      zeroXUrl.searchParams.set('buyAmount', buyAmount);
    }

    // Prepare headers for v2 API only
    const headers: HeadersInit = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      '0x-version': 'v2',
    };

    console.log('🔑 [API Proxy] API Key status:', ZEROX_API_KEY ? 'Present' : 'Missing');
    
    if (ZEROX_API_KEY) {
      headers['0x-api-key'] = ZEROX_API_KEY;
      console.log('🔑 [API Proxy] API Key added to headers');
    } else {
      console.log('❌ [API Proxy] No API key found!');
    }

    console.log('🔄 [API Proxy] Fetching quote from 0x API:', {
      originalSellToken: sellToken,
      originalBuyToken: buyToken,
      convertedSellToken,
      convertedBuyToken,
      sellAmount,
      buyAmount,
      chainId,
      takerAddress,
    });

    console.log('🌐 [API Proxy] Full 0x API URL:', zeroXUrl.toString());
    console.log('🔧 [API Proxy] Parameters being sent to 0x API:', {
      sellToken: convertedSellToken,
      buyToken: convertedBuyToken,
      taker: takerAddress,
      chainId,
      sellAmount,
      buyAmount,
      swapFeeBps: '88',
      apiEndpoint
    });

    // Make request to 0x API
    const response = await fetch(zeroXUrl.toString(), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [API Proxy] 0x API request failed:', response.status, errorText);
      
      let errorMessage = 'Failed to fetch quote';
      if (response.status === 400) {
        errorMessage = 'Invalid swap parameters. Please check token addresses and amounts.';
      } else if (response.status === 404) {
        errorMessage = 'No liquidity available for this token pair.';
      } else if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (response.status === 500) {
        errorMessage = 'Internal server error. Please try again later.';
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const quote = await response.json();
    console.log('✅ [API Proxy] Quote received successfully');
    console.log('🔍 [API Proxy] Quote liquidity available:', quote.liquidityAvailable);
    console.log('🔍 [API Proxy] Quote allowance target:', quote.allowanceTarget || quote.issues?.allowance?.spender);

    // Return the quote with CORS headers
    return NextResponse.json(quote, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error: any) {
    console.error('❌ [API Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
