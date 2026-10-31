"use client";

import { useState, useSyncExternalStore } from "react";
import Noise from "./Noise";
import NoiseTuner, { loadTunedConfig } from "./NoiseTuner";
import {
  NOISE_CONFIG,
  VIEWPORTS,
  type NoiseSettings,
  type Viewport,
} from "./noise-config";

const subscribe = (onChange: () => void) => {
  const lists = VIEWPORTS.map(({ query }) => window.matchMedia(query));
  lists.forEach((list) => list.addEventListener("change", onChange));
  return () =>
    lists.forEach((list) => list.removeEventListener("change", onChange));
};

const current = (): Viewport =>
  VIEWPORTS.find(({ query }) => window.matchMedia(query).matches)?.id ??
  "desktop";

// null on the server and during hydration: the viewport is unknowable there,
// and the grain paints nothing before its effects run anyway, so rendering
// nothing first costs no flash and avoids a mismatch.
const useViewport = () => useSyncExternalStore(subscribe, current, () => null);

// Statically replaced by Next, so the production build drops the tuner.
const TUNER = process.env.NODE_ENV === "development";

/**
 * Film grain over the whole page, at the z-index (99) the halftone body::after
 * used. Settings come from NOISE_CONFIG, picked by viewport.
 *
 * The blend mode goes on the wrapper, not the grain: a fixed box with a
 * z-index is its own stacking context, which isolates its children, so a
 * blend set inside it only mixes with the empty wrapper and never reaches the
 * page.
 */
export default function NoiseOverlay() {
  const viewport = useViewport();
  // The tuner's stored edits, in dev. Safe to read in the initializer: this
  // component renders nothing until the viewport is known, so hydration has
  // no markup to compare the stored values against.
  const [config, setConfig] = useState<Record<Viewport, NoiseSettings>>(
    () =>
      (TUNER && typeof window !== "undefined" && loadTunedConfig()) ||
      NOISE_CONFIG,
  );
  // Set by the tuner while it is open: the viewport being edited, previewed
  // whatever the window's width.
  const [preview, setPreview] = useState<Viewport | null>(null);

  // Crossing a breakpoint drops the preview, so resizing the window to test a
  // viewport for real lands on that viewport's tab. Adjusted during render
  // (React's "storing information from previous renders") rather than in an
  // effect, which would paint one frame of the stale preview first.
  const [seen, setSeen] = useState(viewport);
  if (seen !== viewport) {
    setSeen(viewport);
    setPreview(null);
  }

  const active = preview ?? viewport;
  const settings = active && config[active];

  return (
    <>
      {settings?.enabled && (
        <Noise
          fixed
          zIndex={99}
          opacity={settings.opacity}
          size={settings.size}
          fps={settings.fps}
          contrast={settings.contrast}
          colored={settings.colored}
          dust={settings.dust}
          scratches={settings.scratches}
          scanlines={settings.scanlines}
          flicker={settings.flicker}
          blendMode="normal"
          style={{ mixBlendMode: settings.blendMode }}
        />
      )}
      {TUNER && viewport && (
        <NoiseTuner
          config={config}
          onChange={setConfig}
          viewport={viewport}
          preview={preview}
          onPreview={setPreview}
        />
      )}
    </>
  );
}
