import { ethers } from "ethers";
import { rpcRateLimiter } from "./rpc-rate-limiter";
import { getUserKey } from "./user-keys";

/**
 * NFT support for OpenBurner.
 *
 * Discovery is hybrid (matching the app's bring-your-own-key philosophy):
 *  - When an Alchemy API key is configured on the server, the gallery is
 *    auto-populated via the Alchemy NFT API (proxied through /api/nft).
 *  - On any chain (including custom RPCs) the user can manually add an NFT by
 *    contract address + token id, which is read directly on-chain via their RPC.
 *
 * NFT support always follows the active network selected in the wallet — there
 * is a single, unified chain control shared with the token wallet.
 */

export type NftTokenType = "ERC721" | "ERC1155";

export interface NftAttribute {
  trait_type?: string;
  value?: string | number | boolean;
}

export interface NftItem {
  contractAddress: string;
  tokenId: string;
  tokenType: NftTokenType;
  name: string;
  description?: string;
  collectionName?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  animationUrl?: string;
  /** ERC1155 owned quantity (always "1" for ERC721). */
  balance?: string;
  attributes?: NftAttribute[];
}

/**
 * chainId -> Alchemy NFT API network slug.
 * Only chains Alchemy's NFT API covers are listed; everything else falls back
 * to manual (on-chain) add via the user's RPC.
 */
export const ALCHEMY_NFT_NETWORKS: Record<number, string> = {
  1: "eth-mainnet",
  8453: "base-mainnet",
  137: "polygon-mainnet",
  42161: "arb-mainnet",
  10: "opt-mainnet",
  81457: "blast-mainnet",
  59144: "linea-mainnet",
  534352: "scroll-mainnet",
  5000: "mantle-mainnet",
  43114: "avax-mainnet",
  56: "bnb-mainnet",
  7777777: "zora-mainnet",
};

export function isNftAutoDiscoverySupported(chainId: number): boolean {
  return chainId in ALCHEMY_NFT_NETWORKS;
}

/**
 * chainId -> OpenSea chain slug. Used to build "View on OpenSea" links.
 * Chains not present here fall back to a block-explorer link.
 */
export const OPENSEA_CHAIN_SLUGS: Record<number, string> = {
  1: "ethereum",
  8453: "base",
  137: "matic",
  42161: "arbitrum",
  10: "optimism",
  81457: "blast",
  43114: "avalanche",
  56: "bsc",
  7777777: "zora",
};

// Block explorer URLs (kept in sync with the rest of the app).
const BLOCK_EXPLORERS: Record<number, string> = {
  1: "https://etherscan.io",
  8453: "https://basescan.org",
  56: "https://bscscan.com",
  42161: "https://arbiscan.io",
  43114: "https://snowtrace.io",
  81457: "https://blastscan.io",
  59144: "https://lineascan.build",
  5000: "https://explorer.mantle.xyz",
  34443: "https://explorer.mode.network",
  10: "https://optimistic.etherscan.io",
  137: "https://polygonscan.com",
  534352: "https://scrollscan.com",
  1301: "https://unichain-sepolia.blockscout.com",
};

/** Build a "View on OpenSea" URL, falling back to the chain's block explorer. */
export function getMarketplaceUrl(
  chainId: number,
  contractAddress: string,
  tokenId: string
): { url: string; label: string } {
  const slug = OPENSEA_CHAIN_SLUGS[chainId];
  if (slug) {
    return {
      url: `https://opensea.io/assets/${slug}/${contractAddress}/${tokenId}`,
      label: "OpenSea",
    };
  }
  const explorer = BLOCK_EXPLORERS[chainId] || "https://etherscan.io";
  return {
    url: `${explorer}/token/${contractAddress}?a=${tokenId}`,
    label: "Explorer",
  };
}

/** Resolve ipfs:// (and ar://) URIs to an HTTP gateway URL. */
export function resolveMediaUrl(url?: string): string | undefined {
  if (!url) return undefined;
  let u = url.trim();
  if (u.startsWith("ipfs://")) {
    u = u.replace(/^ipfs:\/\/(ipfs\/)?/, "https://ipfs.io/ipfs/");
  } else if (u.startsWith("ar://")) {
    u = u.replace(/^ar:\/\//, "https://arweave.net/");
  }
  return u;
}

/** Best display image for an NFT (full image preferred, thumbnail fallback). */
export function getNftImage(nft: NftItem): string | undefined {
  return nft.imageUrl || nft.thumbnailUrl;
}

// ---------------------------------------------------------------------------
// Auto-discovery via the Alchemy proxy (/api/nft)
// ---------------------------------------------------------------------------

export interface FetchNftsResult {
  /** Whether server-side auto-discovery (Alchemy key) is configured. */
  configured: boolean;
  nfts: NftItem[];
}

/**
 * Fetch all NFTs owned by `owner` on `chainId` via the Alchemy proxy.
 * Returns { configured: false } when no Alchemy key is set on the server or the
 * active chain isn't covered by Alchemy — callers should then rely on manual add.
 */
export async function fetchNftsForOwner(
  chainId: number,
  owner: string
): Promise<FetchNftsResult> {
  if (!isNftAutoDiscoverySupported(chainId)) {
    return { configured: false, nfts: [] };
  }

  const userAlchemyKey = getUserKey("alchemy");
  const res = await fetch(
    `/api/nft?chainId=${chainId}&owner=${encodeURIComponent(owner)}`,
    userAlchemyKey ? { headers: { "x-alchemy-key": userAlchemyKey } } : undefined
  );

  if (res.status === 501) {
    // No Alchemy key configured on the server.
    return { configured: false, nfts: [] };
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to load NFTs (${res.status})`);
  }

  const data = await res.json();
  return { configured: true, nfts: (data.nfts as NftItem[]) || [] };
}

// ---------------------------------------------------------------------------
// Manual add — read a single NFT directly on-chain via the user's RPC
// ---------------------------------------------------------------------------

const ERC165_ABI = [
  "function supportsInterface(bytes4 interfaceId) view returns (bool)",
];
const ERC721_ABI = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function name() view returns (string)",
];
const ERC1155_ABI = [
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function uri(uint256 id) view returns (string)",
];

const INTERFACE_ID_ERC721 = "0x80ac58cd";
const INTERFACE_ID_ERC1155 = "0xd9b67a26";

/** Expand an ERC1155 `{id}` URI template with the zero-padded hex token id. */
function expand1155Uri(uri: string, tokenId: string): string {
  if (!uri.includes("{id}")) return uri;
  const hexId = BigInt(tokenId).toString(16).padStart(64, "0");
  return uri.replace(/\{id\}/g, hexId);
}

/** Fetch and parse a tokenURI's JSON metadata (handles data: and ipfs URIs). */
async function fetchTokenMetadata(
  tokenUri: string
): Promise<{ name?: string; description?: string; image?: string; animation_url?: string; attributes?: NftAttribute[] } | null> {
  try {
    if (tokenUri.startsWith("data:application/json")) {
      const comma = tokenUri.indexOf(",");
      const payload = tokenUri.slice(comma + 1);
      const json = tokenUri.includes(";base64,")
        ? atob(payload)
        : decodeURIComponent(payload);
      return JSON.parse(json);
    }

    const url = resolveMediaUrl(tokenUri);
    if (!url) return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn("[NFT] Failed to fetch token metadata:", err);
    return null;
  }
}

/**
 * Read a single NFT on-chain and verify the wallet owns it.
 * Detects ERC721 vs ERC1155 via ERC-165 and resolves its metadata/image.
 */
export async function fetchNftOnChain(
  rpcUrl: string,
  contractAddress: string,
  tokenId: string,
  owner: string
): Promise<NftItem> {
  if (!ethers.isAddress(contractAddress)) {
    throw new Error("Invalid contract address");
  }
  if (!/^\d+$/.test(tokenId.trim())) {
    throw new Error("Token ID must be a number");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const id = tokenId.trim();

  // Detect token type via ERC-165.
  const erc165 = new ethers.Contract(contractAddress, ERC165_ABI, provider);
  let tokenType: NftTokenType;
  try {
    const [is721, is1155] = await rpcRateLimiter.makeRequest(async () =>
      Promise.all([
        erc165.supportsInterface(INTERFACE_ID_ERC721).catch(() => false),
        erc165.supportsInterface(INTERFACE_ID_ERC1155).catch(() => false),
      ])
    );
    if (is721) tokenType = "ERC721";
    else if (is1155) tokenType = "ERC1155";
    else throw new Error("Contract is not a recognized ERC721 or ERC1155 NFT");
  } catch (err: any) {
    if (err?.message?.includes("not a recognized")) throw err;
    throw new Error("Could not read contract — is this an NFT contract on this network?");
  }

  let balance = "1";
  let tokenUri = "";
  let collectionName: string | undefined;

  if (tokenType === "ERC721") {
    const c = new ethers.Contract(contractAddress, ERC721_ABI, provider);
    const [ownerOf, uri, name] = await rpcRateLimiter.makeRequest(async () =>
      Promise.all([
        c.ownerOf(id).catch(() => null),
        c.tokenURI(id).catch(() => ""),
        c.name().catch(() => undefined),
      ])
    );
    if (!ownerOf || ownerOf.toLowerCase() !== owner.toLowerCase()) {
      throw new Error("This wallet does not own that token");
    }
    tokenUri = uri;
    collectionName = name;
  } else {
    const c = new ethers.Contract(contractAddress, ERC1155_ABI, provider);
    const [bal, uri] = await rpcRateLimiter.makeRequest(async () =>
      Promise.all([
        c.balanceOf(owner, id).catch(() => 0n),
        c.uri(id).catch(() => ""),
      ])
    );
    if (!bal || bal === 0n) {
      throw new Error("This wallet does not own that token");
    }
    balance = bal.toString();
    tokenUri = expand1155Uri(uri, id);
  }

  const metadata = tokenUri ? await fetchTokenMetadata(tokenUri) : null;

  return {
    contractAddress,
    tokenId: id,
    tokenType,
    name: metadata?.name || `#${id}`,
    description: metadata?.description,
    collectionName,
    imageUrl: resolveMediaUrl(metadata?.image),
    animationUrl: resolveMediaUrl(metadata?.animation_url),
    balance,
    attributes: Array.isArray(metadata?.attributes) ? metadata!.attributes : undefined,
  };
}

// ---------------------------------------------------------------------------
// Transfers
// ---------------------------------------------------------------------------

const NFT_TRANSFER_ABI = [
  "function safeTransferFrom(address from, address to, uint256 tokenId)",
  "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)",
];

/**
 * Encode the calldata for transferring an NFT.
 * ERC721 uses 3-arg safeTransferFrom; ERC1155 uses the 5-arg variant.
 */
export function encodeNftTransfer(
  nft: NftItem,
  from: string,
  to: string,
  amount: string = "1"
): string {
  const iface = new ethers.Interface(NFT_TRANSFER_ABI);
  if (nft.tokenType === "ERC721") {
    return iface.encodeFunctionData(
      "safeTransferFrom(address,address,uint256)",
      [from, to, nft.tokenId]
    );
  }
  return iface.encodeFunctionData(
    "safeTransferFrom(address,address,uint256,uint256,bytes)",
    [from, to, nft.tokenId, amount, "0x"]
  );
}

/** Stable unique key for an NFT (contract + tokenId, lowercased). */
export function nftKey(nft: Pick<NftItem, "contractAddress" | "tokenId">): string {
  return `${nft.contractAddress.toLowerCase()}:${nft.tokenId}`;
}
