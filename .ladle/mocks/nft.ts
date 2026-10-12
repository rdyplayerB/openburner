export * from "@/lib/nft";
import { knobs, net } from "../scenario";
import { NFTS } from "../fixtures";

export async function fetchNftsForOwner() {
  await net();
  return { configured: true, nfts: knobs.nfts ? NFTS : [] };
}
export async function fetchNftOnChain(_chainId: number, contract: string, tokenId: string) {
  await net();
  return NFTS.find((n) => n.contractAddress.toLowerCase() === contract.toLowerCase() && n.tokenId === tokenId) ?? null;
}
