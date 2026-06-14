import { NextRequest, NextResponse } from "next/server";
import { rateLimit, checkOrigin, cacheGet, cacheSet } from "@/lib/rate-limit";

/**
 * Proxy route for the Alchemy NFT API.
 *
 * Mirrors the CoinGecko proxy pattern: the Alchemy API key lives server-side
 * (ALCHEMY_API_KEY) and is never exposed to the client. When no key is
 * configured the route returns 501 so the gallery can gracefully fall back to
 * manual (on-chain) NFT add.
 */

// chainId -> Alchemy network slug (kept in sync with lib/nft.ts).
const ALCHEMY_NFT_NETWORKS: Record<number, string> = {
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

function resolveMedia(url?: string): string | undefined {
  if (!url) return undefined;
  let u = url.trim();
  if (u.startsWith("ipfs://")) {
    u = u.replace(/^ipfs:\/\/(ipfs\/)?/, "https://ipfs.io/ipfs/");
  } else if (u.startsWith("ar://")) {
    u = u.replace(/^ar:\/\//, "https://arweave.net/");
  }
  return u;
}

export async function GET(request: NextRequest) {
  try {
    const blocked = checkOrigin(request) || rateLimit(request, "nft", 60, 60_000);
    if (blocked) return blocked;

    // User-provided key (header) takes precedence over the server env var.
    const ALCHEMY_API_KEY =
      request.headers.get("x-alchemy-key") || process.env.ALCHEMY_API_KEY;

    if (!ALCHEMY_API_KEY) {
      return NextResponse.json(
        { configured: false, error: "Alchemy API key not configured" },
        { status: 501 }
      );
    }

    const { searchParams } = new URL(request.url);
    const chainId = Number(searchParams.get("chainId"));
    const owner = searchParams.get("owner");

    if (!chainId || !owner) {
      return NextResponse.json(
        { error: "Missing required parameters: chainId, owner" },
        { status: 400 }
      );
    }

    // Serve a recent cached result if available (owner+chain → same NFTs).
    const cacheKey = `nft:${chainId}:${owner.toLowerCase()}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      return NextResponse.json({ configured: true, nfts: cached });
    }

    const network = ALCHEMY_NFT_NETWORKS[chainId];
    if (!network) {
      return NextResponse.json(
        { configured: false, error: "NFT auto-discovery not available on this network" },
        { status: 501 }
      );
    }

    // Page through all owned NFTs (Alchemy returns up to 100 per page).
    const nfts: any[] = [];
    let pageKey: string | undefined;
    let pages = 0;
    const MAX_PAGES = 10; // safety cap (1000 NFTs)

    do {
      const url = new URL(
        `https://${network}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner`
      );
      url.searchParams.set("owner", owner);
      url.searchParams.set("withMetadata", "true");
      url.searchParams.set("pageSize", "100");
      // NOTE: excludeFilters[]=SPAM requires Alchemy's Growth (paid) plan and
      // returns 403 on the free tier. We instead drop spam ourselves below
      // using the contract.isSpam flag, which is returned on all plans.
      if (pageKey) url.searchParams.set("pageKey", pageKey);

      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ [NFT Proxy] Alchemy request failed:", response.status, errorText);
        const message =
          response.status === 429
            ? "Rate limit exceeded. Please try again later."
            : "Failed to fetch NFTs from Alchemy";
        return NextResponse.json({ error: message }, { status: response.status });
      }

      const data = await response.json();
      const owned = data.ownedNfts || [];

      for (const nft of owned) {
        // Drop spam ourselves (free-tier-friendly; replaces excludeFilters=SPAM).
        if (nft.contract?.isSpam) continue;

        const tokenType =
          nft.tokenType === "ERC1155" || nft.contract?.tokenType === "ERC1155"
            ? "ERC1155"
            : "ERC721";

        nfts.push({
          contractAddress: nft.contract?.address,
          tokenId: nft.tokenId,
          tokenType,
          name:
            nft.name ||
            nft.raw?.metadata?.name ||
            `#${nft.tokenId}`,
          description: nft.description || nft.raw?.metadata?.description,
          collectionName:
            nft.contract?.name ||
            nft.contract?.openSeaMetadata?.collectionName,
          imageUrl:
            nft.image?.cachedUrl ||
            nft.image?.pngUrl ||
            resolveMedia(nft.image?.originalUrl) ||
            resolveMedia(nft.raw?.metadata?.image),
          thumbnailUrl: nft.image?.thumbnailUrl,
          animationUrl:
            nft.animation?.cachedUrl ||
            resolveMedia(nft.raw?.metadata?.animation_url),
          balance: nft.balance || "1",
          attributes:
            nft.raw?.metadata?.attributes ||
            nft.metadata?.attributes ||
            undefined,
        });
      }

      pageKey = data.pageKey;
      pages += 1;
    } while (pageKey && pages < MAX_PAGES);

    // Drop entries with no contract address (malformed) and obvious dust.
    const cleaned = nfts.filter((n) => n.contractAddress);

    console.log(`✅ [NFT Proxy] Returning ${cleaned.length} NFTs for ${owner} on chain ${chainId}`);

    cacheSet(cacheKey, cleaned, 60_000); // 60s

    return NextResponse.json(
      { configured: true, nfts: cleaned },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  } catch (error: any) {
    console.error("❌ [NFT Proxy] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
