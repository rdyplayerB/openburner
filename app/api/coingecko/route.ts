import { NextRequest, NextResponse } from 'next/server';

const COINGECKO_API_BASE_URL = 'https://api.coingecko.com/api/v3';
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;

/**
 * Proxy API route for CoinGecko requests to solve CORS issues
 * This allows the frontend to make requests to CoinGecko through our server
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract the endpoint path from the request
    const endpoint = searchParams.get('endpoint');
    if (!endpoint) {
      return NextResponse.json(
        { error: 'Missing required parameter: endpoint' },
        { status: 400 }
      );
    }

    // Build the CoinGecko API URL
    const coingeckoUrl = new URL(`${COINGECKO_API_BASE_URL}/${endpoint}`);
    
    // Forward all other query parameters to CoinGecko
    for (const [key, value] of searchParams.entries()) {
      if (key !== 'endpoint') {
        coingeckoUrl.searchParams.set(key, value);
      }
    }

    // Prepare headers
    const headers: HeadersInit = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    // Add API key if available
    if (COINGECKO_API_KEY) {
      headers['x-cg-pro-api-key'] = COINGECKO_API_KEY;
    }

    console.log('🔄 [CoinGecko Proxy] Fetching from:', coingeckoUrl.toString());
    console.log('🔑 [CoinGecko Proxy] API Key status:', COINGECKO_API_KEY ? 'Present' : 'Missing');

    // Make request to CoinGecko API
    const response = await fetch(coingeckoUrl.toString(), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [CoinGecko Proxy] API request failed:', response.status, errorText);
      
      let errorMessage = 'Failed to fetch data from CoinGecko';
      if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (response.status === 400) {
        errorMessage = 'Invalid request parameters.';
      } else if (response.status === 404) {
        errorMessage = 'Data not found.';
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ [CoinGecko Proxy] Data received successfully');

    // Return the data with CORS headers
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error: any) {
    console.error('❌ [CoinGecko Proxy] Error:', error);
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
