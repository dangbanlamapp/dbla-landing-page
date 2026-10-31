"use client";

import { useState } from "react";
import type { NoiseBlendMode } from "./Noise";
import {
  NOISE_CONFIG,
  VIEWPORTS,
  type NoiseSettings,
  type Viewport,
} from "./noise-config";

/**
 * Dev-only side panel for the grain overlay. Edits are live and kept in
 * localStorage so a reload doesn't lose them; nothing here reaches the
 * production build or other people. To ship a set, "Copy config" and paste
 * it over NOISE_CONFIG in noise-config.ts — then "Reset all", or the stored
 * copy keeps shadowing the new defaults in this browser.
 */

const STORAGE_KEY = "dbla-noise-tuner";

type Config = Record<Viewport, NoiseSettings>;

/** The stored config, merged over the defaults so an added field still has a value. */
export function loadTunedConfig(): Config | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Partial<Record<Viewport, NoiseSettings>>;
    return {
      mobile: { ...NOISE_CONFIG.mobile, ...stored.mobile },
      tablet: { ...NOISE_CONFIG.tablet, ...stored.tablet },
      desktop: { ...NOISE_CONFIG.desktop, ...stored.desktop },
    };
  } catch {
    return null;
  }
}

function save(config: Config | null) {
  try {
    if (config)
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private window or blocked storage: tuning still works, it just won't
    // survive a reload.
  }
}

type NumberKey = {
  [K in keyof NoiseSettings]: NoiseSettings[K] extends number ? K : never;
}[keyof NoiseSettings];

const SLIDERS: { key: NumberKey; min: number; max: number; step: number }[] = [
  { key: "opacity", min: 0, max: 1, step: 0.01 },
  { key: "size", min: 0.5, max: 4, step: 0.1 },
  { key: "fps", min: 0, max: 60, step: 1 },
  { key: "contrast", min: 0, max: 1, step: 0.01 },
  { key: "flicker", min: 0, max: 1, step: 0.01 },
  { key: "scanlines", min: 0, max: 1, step: 0.01 },
  { key: "dust", min: 0, max: 1, step: 0.01 },
  { key: "scratches", min: 0, max: 1, step: 0.01 },
];

const BLENDS: NoiseBlendMode[] = [
  "normal",
  "overlay",
  "soft-light",
  "multiply",
  "screen",
  "difference",
];

type Props = {
  config: Config;
  onChange: (config: Config) => void;
  /** The viewport the window is actually in. */
  viewport: Viewport;
  /** The viewport being previewed instead, or null to follow the window. */
  preview: Viewport | null;
  onPreview: (viewport: Viewport | null) => void;
};

export default function NoiseTuner({
  config,
  onChange,
  viewport,
  preview,
  onPreview,
}: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const tab = preview ?? viewport;
  const settings = config[tab];

  const commit = (next: Config | null) => {
    save(next);
    onChange(next ?? NOISE_CONFIG);
  };
  const set = <K extends keyof NoiseSettings>(
    key: K,
    value: NoiseSettings[K],
  ) => commit({ ...config, [tab]: { ...settings, [key]: value } });

  const close = () => {
    setOpen(false);
    onPreview(null);
  };

  const copy = async () => {
    const body = JSON.stringify(config, null, 2);
    await navigator.clipboard.writeText(
      `export const NOISE_CONFIG: Record<Viewport, NoiseSettings> = ${body};\n`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 z-100 rounded-full bg-black px-4 py-2 text-xs text-white shadow-lg"
      >
        Noise
      </button>
    );
  }

  return (
    <aside
      data-lenis-prevent
      className="fixed top-0 right-0 z-100 flex h-dvh w-80 max-w-full flex-col gap-4 overflow-y-auto bg-black/90 p-4 text-xs text-white shadow-2xl backdrop-blur"
    >
      <header className="flex items-center justify-between">
        <span className="font-bold uppercase">Noise tuner</span>
        <button type="button" onClick={close} aria-label="Close">
          ✕
        </button>
      </header>

      <div className="flex flex-col gap-1">
        <span className="text-white/60">Viewport</span>
        <div className="grid grid-cols-3 gap-1">
          {VIEWPORTS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onPreview(id === viewport ? null : id)}
              className={`rounded px-1 py-2 leading-tight ${
                id === tab ? "bg-accent text-black" : "bg-white/10"
              }`}
            >
              {label}
              {id === viewport && <span className="block">● window</span>}
            </button>
          ))}
        </div>
        {tab !== viewport && (
          <span className="text-white/60">
            Previewing {tab} at this window size.
          </span>
        )}
      </div>

      <label className="flex items-center justify-between">
        <span>Enabled</span>
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => set("enabled", e.target.checked)}
        />
      </label>

      {SLIDERS.map(({ key, min, max, step }) => (
        <label key={key} className="flex flex-col gap-1">
          <span className="flex justify-between">
            <span className="capitalize">{key}</span>
            <span className="tabular-nums">{settings[key]}</span>
          </span>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={settings[key]}
            onChange={(e) => set(key, Number(e.target.value))}
            className="accent-accent"
          />
        </label>
      ))}

      <label className="flex items-center justify-between">
        <span>Blend mode</span>
        <select
          value={settings.blendMode}
          onChange={(e) => set("blendMode", e.target.value as NoiseBlendMode)}
          className="rounded bg-white/10 px-2 py-1"
        >
          {BLENDS.map((mode) => (
            <option key={mode} value={mode} className="text-black">
              {mode}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center justify-between">
        <span>Colored</span>
        <input
          type="checkbox"
          checked={settings.colored}
          onChange={(e) => set("colored", e.target.checked)}
        />
      </label>

      <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
        <button
          type="button"
          onClick={() =>
            commit({ mobile: settings, tablet: settings, desktop: settings })
          }
          className="rounded bg-white/10 py-2"
        >
          Apply to all
        </button>
        <button
          type="button"
          onClick={() => commit({ ...config, [tab]: NOISE_CONFIG[tab] })}
          className="rounded bg-white/10 py-2"
        >
          Reset {tab}
        </button>
        <button
          type="button"
          onClick={() => commit(null)}
          className="rounded bg-white/10 py-2"
        >
          Reset all
        </button>
        <button
          type="button"
          onClick={copy}
          className="rounded bg-accent py-2 text-black"
        >
          {copied ? "Copied" : "Copy config"}
        </button>
      </div>
    </aside>
  );
}
