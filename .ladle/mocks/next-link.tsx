import type { AnchorHTMLAttributes } from "react";

export default function Link({ href, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string | { pathname: string } }) {
  return <a href={typeof href === "string" ? href : href.pathname} {...rest} />;
}
