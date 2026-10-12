/* eslint-disable @next/next/no-img-element */
import type { ImgHTMLAttributes } from "react";

type Props = ImgHTMLAttributes<HTMLImageElement> & { src: string | { src: string }; priority?: boolean; fill?: boolean; quality?: number };

/** next/image for Ladle: a plain <img> (Next-only props are dropped). */
export default function Image({ src, alt = "", priority: _priority, fill: _fill, quality: _quality, ...rest }: Props) {
  return <img src={typeof src === "string" ? src : src.src} alt={alt} {...rest} />;
}
