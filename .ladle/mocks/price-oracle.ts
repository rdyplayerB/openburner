import { knobs, net } from "../scenario";
import { BALANCES, IMAGES, PRICES } from "../fixtures";

export async function getTokenPricesWithAddresses(tokens: Array<{ symbol: string }>) {
  await net();
  const out: Record<string, number> = {};
  for (const t of tokens) out[t.symbol] = knobs.pricing ? (PRICES[t.symbol] ?? 0) : 0;
  return out;
}
export async function getTokenPrices(symbols: string[]) {
  return getTokenPricesWithAddresses(symbols.map((symbol) => ({ symbol })));
}
export async function getTokenPrice(symbol: string) {
  return PRICES[symbol] ?? 0;
}
export async function fetchTokenDataByContract(address: string) {
  await net();
  const t = BALANCES[address.toLowerCase()];
  return t ? { symbol: t.symbol, name: t.name, decimals: t.decimals, price: PRICES[t.symbol] ?? 0, imageUrl: IMAGES[t.symbol.toUpperCase()] ?? null } : null;
}
export function clearPriceCache() {}
