/**
 * Example data for stories. Addresses are real token contracts on Base so the
 * UI's checks (checksums, known contracts) behave as in production; the
 * wallet and people are made up.
 */
import type { NftItem } from "@/lib/nft";

export const ME = "0x8ba1f109551bD432803012645Ac136ddd64DBA72";
export const FRIEND = "0x4B3A1F9A6c2d8e0F7b5C19a2E4D3F6B8c0a1e2D5";
export const RECENTS = [
  { address: FRIEND },
  { address: "0x983110309620D911731Ac0932219af06091b6744", ens: "brantly.eth" },
  { address: "0x9F8E7D6C5B4a39281706f5e4d3C2b1a098765432" },
];

export const BASE = 8453;
export const ADDR = {
  USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  WETH: "0x4200000000000000000000000000000000000006",
  CBBTC: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
  DEGEN: "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed",
  PERMIT2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  ROUTER: "0x6fF5693b99212Da76ad316178A184AB56D299b43",
  NFT: "0x03c4738Ee98aE44591e1A4A4F3CaB6641d95DD9a",
};

/** Token balances on Base (decimal strings). Native is "native". */
export const BALANCES: Record<string, { symbol: string; name: string; decimals: number; balance: string }> = {
  native: { symbol: "ETH", name: "Ethereum", decimals: 18, balance: "1.2483" },
  [ADDR.USDC.toLowerCase()]: { symbol: "USDC", name: "USD Coin", decimals: 6, balance: "1250.5" },
  [ADDR.WETH.toLowerCase()]: { symbol: "WETH", name: "Wrapped Ether", decimals: 18, balance: "0.35" },
  [ADDR.CBBTC.toLowerCase()]: { symbol: "cbBTC", name: "Coinbase Wrapped BTC", decimals: 8, balance: "0.0123" },
  [ADDR.DEGEN.toLowerCase()]: { symbol: "DEGEN", name: "Degen", decimals: 18, balance: "18420" },
};
/** Tokens the user added by contract (shown with a "Custom" badge). */
export const CUSTOM_TOKENS = [ADDR.CBBTC.toLowerCase(), ADDR.DEGEN.toLowerCase()];

export const PRICES: Record<string, number> = { ETH: 2531.71, WETH: 2531.71, USDC: 1, cbBTC: 61250, DEGEN: 0.0042 };

const cg = (path: string) => `https://coin-images.coingecko.com/coins/images/${path}`;
export const IMAGES: Record<string, string> = {
  ETH: cg("279/small/ethereum.png"),
  WETH: cg("2518/small/weth.png"),
  USDC: cg("6319/small/usdc.png"),
  CBBTC: cg("40143/small/cbbtc.webp"),
  DEGEN: cg("34515/small/android-chrome-512x512.png"),
};

// Real Quantum Echoes QFTs (Quip Network, Ethereum). Their art is vendored in
// .ladle/assets so stories stay deterministic and offline.
const QFT = "0x5a5c9c3cd186d95eff4da56ce48a173c7e46455a";
const qft = (tokenId: string, description: string): NftItem => ({
  contractAddress: QFT,
  tokenId,
  tokenType: "ERC721",
  name: `Quantum Echoes #${tokenId}`,
  collectionName: "Quantum Echoes",
  imageUrl: new URL(`./assets/qft-${tokenId}.webp`, import.meta.url).href,
  description,
});

export const NFTS: NftItem[] = [
  qft("3454", "Holographic. Quasicrystal, Spectra palette."),
  qft("11763", "Plasma. Bloch sphere, Aqua palette."),
  qft("17078", "Quip. Hofstadter butterfly, Ice palette."),
  qft("100000", "Superbloom, Spectra palette."),
];

const now = Date.now();
const H = (c: string) => "0x" + c.repeat(64);
export const ACTIVITY = [
  { hash: H("a"), chainId: BASE, owner: ME.toLowerCase(), kind: "send" as const, status: "pending" as const, timestamp: now - 45_000, fromToken: "ETH", fromAmount: "0.01", recipient: FRIEND },
  { hash: H("b"), chainId: BASE, owner: ME.toLowerCase(), kind: "swap" as const, status: "success" as const, timestamp: now - 3_400_000, fromToken: "ETH", fromAmount: "0.05", toToken: "USDC", toAmount: "125.36" },
  { hash: H("c"), chainId: BASE, owner: ME.toLowerCase(), kind: "approve" as const, status: "success" as const, timestamp: now - 3_500_000, fromToken: "USDC" },
  { hash: H("d"), chainId: 1, owner: ME.toLowerCase(), kind: "dapp" as const, status: "failed" as const, timestamp: now - 88_000_000, label: "Uniswap" },
  { hash: H("e"), chainId: BASE, owner: ME.toLowerCase(), kind: "nft" as const, status: "success" as const, timestamp: now - 260_000_000, label: "Burner Pass #88", recipient: FRIEND },
  { hash: H("f"), chainId: BASE, owner: ME.toLowerCase(), kind: "send" as const, status: "success" as const, timestamp: now - 270_000_000, fromToken: "USDC", fromAmount: "40", recipient: "0x9F8E7D6C5B4a39281706f5e4d3C2b1a098765432" },
];
