import { NextResponse } from "next/server";

/**
 * Reports which API keys are configured — booleans only, never the values.
 * Lets the Settings screen show each integration as Connected / Not set without
 * exposing any secret (server-side keys like Alchemy/CoinGecko never reach the client).
 */
export async function GET() {
  return NextResponse.json({
    coingecko: !!process.env.COINGECKO_API_KEY || !!process.env.NEXT_PUBLIC_COINGECKO_API_KEY,
    alchemy: !!process.env.ALCHEMY_API_KEY,
    swap: !!process.env.ZEROX_API_KEY || !!process.env.NEXT_PUBLIC_0X_API_KEY,
    walletconnect: !!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  });
}
