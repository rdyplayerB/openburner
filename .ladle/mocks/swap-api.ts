// Real formatters and validation; only the network calls are faked.
export * from "@/lib/swap-api";
import { ethers } from "ethers";
import type { SwapQuote, SwapQuoteParams } from "@/lib/swap-api";
import { knobs, net } from "../scenario";
import { BALANCES, PRICES } from "../fixtures";

const ALLOWANCE_HOLDER = "0x0000000000001fF3684f28c67538d4D072C22734";
const meta = (addr: string) => (addr === "native" || /^0xeeee/i.test(addr) ? BALANCES.native : BALANCES[addr.toLowerCase()]);

export async function getSwapQuote(params: SwapQuoteParams): Promise<SwapQuote> {
  await net();
  await net();
  const sell = meta(params.sellToken);
  const buy = meta(params.buyToken);
  if (!sell || !buy || !params.sellAmount) throw new Error("No route found for this pair.");
  const sellUsd = Number(ethers.formatUnits(params.sellAmount, sell.decimals)) * (PRICES[sell.symbol] ?? 0);
  const buyUnits = (sellUsd * 0.9985) / (PRICES[buy.symbol] ?? 1);
  const buyAmount = ethers.parseUnits(buyUnits.toFixed(Math.min(buy.decimals, 12)), buy.decimals);
  const slip = BigInt(Math.round((params.slippagePercentage ?? 0.5) * 100));
  const fee = (BigInt(params.sellAmount) * 15n) / 10_000n;
  return {
    sellToken: params.sellToken,
    buyToken: params.buyToken,
    sellAmount: params.sellAmount,
    buyAmount: buyAmount.toString(),
    minBuyAmount: ((buyAmount * (10_000n - slip)) / 10_000n).toString(),
    allowanceTarget: ALLOWANCE_HOLDER,
    blockNumber: "21000000",
    liquidityAvailable: true,
    priceImpact: String(knobs.priceImpact),
    transaction: { to: ALLOWANCE_HOLDER, data: "0x2213bc0b", gas: "180000", gasPrice: "6000000", value: params.sellToken === "native" ? params.sellAmount : "0" },
    route: { fills: [{ from: params.sellToken, to: params.buyToken, source: "Uniswap_V3", proportionBps: "10000" }], tokens: [] },
    fees: { integratorFee: { amount: fee.toString(), token: params.sellToken, type: "volume" }, gasFee: null },
    totalNetworkFee: (180_000n * 6_000_000n).toString(),
  } as SwapQuote;
}

export async function getSwapPrice(params: SwapQuoteParams) {
  return getSwapQuote(params);
}

export async function buildSwapTransaction(quote: SwapQuote, _from: string, _provider: unknown, chainId?: number): Promise<ethers.TransactionRequest> {
  return { to: quote.transaction.to, data: quote.transaction.data, value: BigInt(quote.transaction.value || "0"), gasLimit: 180_000n, chainId };
}
