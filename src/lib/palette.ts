/**
 * Palette registry — the three structural themes for Shuttle Stats.
 *
 * Hallmark diversification axes (must all differ per pair):
 *   telemetry  → dark      · grotesk-sans  · warm-red   27°
 *   glass      → mid       · rounded-sans  · cool-teal  185°
 *   journal    → light     · roman-serif   · amber      72°
 */

export type PaletteId = "telemetry" | "glass" | "journal";

export interface Palette {
  id: PaletteId;
  label: string;
  subtitle: string;
  /** OKLCH accent colour for the preview swatch */
  swatchAccent: string;
  /** OKLCH paper colour for the preview swatch */
  swatchPaper: string;
  /** Short descriptor shown in tooltip */
  description: string;
}

export const PALETTES: Palette[] = [
  {
    id: "telemetry",
    label: "Telemetry",
    subtitle: "Dark cockpit",
    swatchAccent: "oklch(56% 0.22 27)",
    swatchPaper: "oklch(11% 0.008 27)",
    description: "Dark sports telemetry — aviation red on near-black",
  },
  {
    id: "glass",
    label: "Court Glass",
    subtitle: "Teal court",
    swatchAccent: "oklch(48% 0.20 185)",
    swatchPaper: "oklch(97% 0.008 185)",
    description: "Glassmorphism court aesthetic — cool teal on frosted white",
  },
  {
    id: "journal",
    label: "Field Journal",
    subtitle: "Parchment",
    swatchAccent: "oklch(52% 0.17 72)",
    swatchPaper: "oklch(96% 0.018 72)",
    description: "Editorial field-notes — amber ink on warm parchment",
  },
];

export const PALETTE_STORAGE_KEY = "hm-palette";
export const DEFAULT_PALETTE: PaletteId = "telemetry";
