import { IMAGES } from "../fixtures";

export function getCachedTokenImage(symbol: string): string | null {
  return IMAGES[symbol.toUpperCase()] ?? null;
}
export async function getTokenImage(symbol: string): Promise<string | null> {
  return getCachedTokenImage(symbol);
}
export async function batchGetTokenImages(tokens: Array<{ symbol: string }>) {
  const out = new Map<string, string>();
  for (const t of tokens) {
    const url = getCachedTokenImage(t.symbol);
    if (url) out.set(t.symbol.toUpperCase(), url);
  }
  return out;
}
export function clearTokenImageCache() {}
export function preloadCommonTokenImages() {}
