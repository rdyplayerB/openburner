import { FLAME_ASPECT, FLAME_SMALL, FLAME_VIEWBOX } from "./brand-mark-paths";

/**
 * The OpenBurner flame, drawn inline so it takes the theme's accent orange. One
 * solid drawing at every size. Geometry: design/brand (npm run brand).
 */
export function BrandMark({
  size,
  className,
  color = "var(--sw-accent)",
  title,
}: {
  /** Rendered height in px. */
  size: number;
  className?: string;
  color?: string;
  /** Accessible name; omit when the mark sits next to the word "OpenBurner". */
  title?: string;
}) {
  return (
    <svg
      viewBox={FLAME_VIEWBOX}
      overflow="visible"
      width={Math.round(size * FLAME_ASPECT * 100) / 100}
      height={size}
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <path d={FLAME_SMALL} fill={color} fillRule="evenodd" />
    </svg>
  );
}

/**
 * Flame + "OpenBurner" in one ink colour. The flame is the only orange.
 * Proportions are tied to the type: flame 0.92em tall, sitting on the baseline
 * (its circle bottoms out with the "O"), 0.19em gap, -0.018em tracking.
 */
export function Wordmark({
  fontSize = 18,
  className = "",
  hideTextBelow,
}: {
  /** Text size in px; everything else scales with it. */
  fontSize?: number;
  className?: string;
  /** Tailwind breakpoint below which only the flame shows, e.g. "md". */
  hideTextBelow?: "sm" | "md";
}) {
  const hide = hideTextBelow === "md" ? "hidden md:inline" : hideTextBelow === "sm" ? "hidden sm:inline" : "";
  return (
    <span
      className={`inline-flex items-center font-bold leading-none text-(--sw-ink) ${className}`}
      style={{ fontSize, gap: "0.19em", letterSpacing: fontSize <= 20 ? "-0.01em" : "-0.018em" }}
    >
      <span className="inline-flex" style={{ transform: "translateY(-0.075em)" }}>
        <BrandMark size={fontSize * 0.92} />
      </span>
      <span className={hide}>OpenBurner</span>
    </span>
  );
}
