"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import type { NftItem } from "@/lib/nft";
import { getNftImage } from "@/lib/nft";

/**
 * Renders an NFT's media with graceful fallbacks:
 *  - animated/video NFTs render a <video> when an animationUrl is present
 *  - images that fail to load fall back to a branded placeholder
 */
export function NftMedia({
  nft,
  className = "",
  preferAnimation = false,
  rounded = "rounded-lg",
}: {
  nft: NftItem;
  className?: string;
  preferAnimation?: boolean;
  rounded?: string;
}) {
  const [errored, setErrored] = useState(false);
  const image = getNftImage(nft);
  const isVideo =
    preferAnimation &&
    !!nft.animationUrl &&
    /\.(mp4|webm|mov|ogg)$/i.test(nft.animationUrl);

  if (isVideo && nft.animationUrl && !errored) {
    return (
      <video
        src={nft.animationUrl}
        className={`${className} ${rounded} object-cover bg-[var(--sw-line-soft)]`}
        autoPlay
        loop
        muted
        playsInline
        poster={image}
        onError={() => setErrored(true)}
      />
    );
  }

  if (!image || errored) {
    return (
      <div
        className={`${className} ${rounded} flex flex-col items-center justify-center gap-1.5 bg-[var(--sw-line-soft)] text-[var(--sw-muted)]`}
      >
        <ImageOff className="w-6 h-6" />
        <span className="text-[10px] font-medium">No image</span>
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={image}
      alt={nft.name}
      loading="lazy"
      className={`${className} ${rounded} object-cover bg-[var(--sw-line-soft)]`}
      onError={() => setErrored(true)}
    />
  );
}
