/**
 * Burner card renders (public/images/cards). Always show the real card (orange, as on openburner.xyz); never
 * draw one. `angled` is a 3/4 view for "tap" moments, `flat` the card front.
 */

export type BurnerColor = "lime" | "green" | "orange" | "purple";

export const BURNER_CARD = {
  angled: (color: BurnerColor = "orange") => `/images/cards/burner-angled-${color}.webp`,
  flat: (color: BurnerColor | "blue" | "pink" = "orange") => `/images/cards/burner-${color}.webp`,
  /** width / height */
  angledRatio: 459 / 640,
  flatRatio: 404 / 640,
};
