import type { NoiseBlendMode } from "./Noise";

/**
 * The grain overlay's settings, one set per viewport. NoiseOverlay picks the
 * set whose query matches; NoiseTuner (dev only) edits them live and its
 * "Copy config" button prints a replacement for NOISE_CONFIG below.
 */

export type NoiseSettings = {
  enabled: boolean;
  opacity: number;
  size: number;
  fps: number;
  /** Applied to the overlay's wrapper, not the grain — see NoiseOverlay. */
  blendMode: NoiseBlendMode;
  contrast: number;
  colored: boolean;
  dust: number;
  scratches: number;
  scanlines: number;
  flicker: number;
};

export type Viewport = "mobile" | "tablet" | "desktop";

/**
 * Same cut-offs as Tailwind's md / lg, and lg is the one the halftone used to
 * switch off below. Width only: a touch device is judged by its width now, so
 * an iPad in landscape (1024px+) counts as desktop.
 */
export const VIEWPORTS: { id: Viewport; label: string; query: string }[] = [
  { id: "mobile", label: "Mobile <768", query: "(max-width: 767px)" },
  {
    id: "tablet",
    label: "Tablet 768–1023",
    query: "(min-width: 768px) and (max-width: 1023px)",
  },
  { id: "desktop", label: "Desktop ≥1024", query: "(min-width: 1024px)" },
];

/** Shared by every viewport; only strength, grain size and scanlines differ. */
const BASE: Omit<NoiseSettings, "opacity" | "size" | "scanlines"> = {
  enabled: true,
  fps: 12,
  blendMode: "soft-light",
  contrast: 0.6,
  colored: false,
  dust: 0,
  scratches: 0,
  flicker: 0.5,
};

/**
 * Tuned per viewport with NoiseTuner. All three are on, unlike the halftone,
 * which was hidden below lg (see the note above the old body::after in
 * globals.css): a fixed, full-viewport blended layer costs phone GPUs a
 * re-blend of every changed pixel each frame. 12fps — half the component's
 * default — is what keeps that affordable; if the pinned Projects scrub
 * stutters on a phone, fps is the first thing to drop (0 is a still grain).
 */
export const NOISE_CONFIG: Record<Viewport, NoiseSettings> = {
  mobile: { ...BASE, opacity: 0.19, size: 0.5, scanlines: 0.5 },
  tablet: { ...BASE, opacity: 0.21, size: 0.9, scanlines: 0.13 },
  desktop: { ...BASE, opacity: 0.25, size: 1, scanlines: 1 },
};
