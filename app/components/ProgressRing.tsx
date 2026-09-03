"use client";

import { useId } from "react";

// Geometry, in the viewBox's own 0–100 user units. R is the OUTER tip of every
// tick, and deliberately half the viewBox — the ring's diameter is then exactly
// `size`, the same contract DashedCircle's `height` gives, so this ring and the
// dashed ones can be centred on each other and simply agree. Any inset here and
// the dial reads smaller than the size it was handed. The ticks' outer
// half-pixel spills past the viewBox; `overflow-visible` on the <svg> is what
// keeps it from being clipped.
const R = 50;

// How far each tick reaches inward from R, in user units — i.e. as a percentage
// of the DIAMETER, so the mark scales with the ring while its stroke width does
// not (see the tick definition below). This is the knob for how deep the dial
// reads, and the one to reach for when the ticks crowd whatever sits inside the
// ring.
const TICK_LENGTH = 1.5;

// How many ticks go around the full 360° — the dial's density. Fixed rather
// than derived from the rendered pixel size, which the component cannot know at
// render time. Raise it for a finer dial; the ceiling is the point where 1px
// hairlines land closer than ~2px apart on the rendered circumference and merge
// into a solid ring, which at the 80vh the section uses is far above this.
const TICK_COUNT = 288;
const TICK_STEP = 360 / TICK_COUNT;

// Rotate the whole tick set half a step so no tick sits exactly on the mask
// arc's start boundary at twelve o'clock. Both are radial lines, and a tick
// lying along the boundary renders as an antialiased half-lit sliver at 0%
// progress — a stray mark on what should be an empty ring.
const TICK_PHASE = TICK_STEP / 2;

// Precomputed once at module scope: the geometry never varies per instance, so
// two rings on a page should not each rebuild the same 144 angles.
const TICK_ANGLES = Array.from({ length: TICK_COUNT }, (_, i) => i * TICK_STEP);

// The reveal window: a band centred on the ticks' midpoint, fat enough to
// swallow a whole tick (R - TICK_LENGTH → R) with slack at both ends, so a tick
// is either fully revealed or fully hidden and never clipped part-way along its
// own length. Width costs nothing angularly because the default `butt` linecap
// ends the arc on a clean radial line — which is also what lets ticks switch on
// one at a time instead of fading. A `round` cap would overshoot the leading
// edge by half of MASK_WIDTH.
const MASK_R = R - TICK_LENGTH / 2;
const MASK_WIDTH = TICK_LENGTH + 3;

// The mask path's length, so the arc's dash units are the circumference itself:
// dasharray = C is one full on-segment, and dashoffset runs C (nothing drawn) →
// 0 (fully drawn). Computed rather than declared with SVG 2's `pathLength`
// attribute, which would let this be a flat 1 — support for pathLength on
// <circle> (as opposed to <path>) is recent enough not to be worth depending on
// for the one thing that makes the ring work at all. Note it follows MASK_R and
// not R: the arc rides the band, not the tick tips.
const C = 2 * Math.PI * MASK_R;

type ProgressRingProps = {
  /** Diameter as any CSS length, e.g. "80vh" — matches DashedCircle's `size`. */
  size: string;
  /** Applied to the full-bleed centering layer, for animation targeting. */
  id?: string;
};

/**
 * A dial of small radial tick marks that fills itself clockwise from twelve
 * o'clock over a faint track.
 *
 * The one animated part is published as a handle for the parent timeline —
 * `[data-progress-arc]`, a mask arc whose `strokeDashoffset` runs C → 0 — so
 * the ring declares what can move and the section decides when, the same
 * division DashedCircle uses.
 *
 * SVG rather than a bordered div because a CSS border cannot be partially
 * drawn, and because radial ticks are not a border pattern at all; that is the
 * only reason this is not just a DashedCircle variant.
 */
export default function ProgressRing({ size, id }: ProgressRingProps) {
  // Two rings on one page would otherwise fight over the same ids, and the
  // second one's `url(#…)` / `href="#…"` would resolve to the first one's nodes.
  const maskId = useId();
  const ticksId = useId();

  return (
    <div
      id={id}
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      <div className="relative aspect-square" style={{ height: size }}>
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden
        >
          <defs>
            {/*
              The tick set, authored once and stamped twice below. Sharing one
              definition is not just DOM economy: the track and the filled dial
              are then guaranteed to sit on identical geometry, so a revealed
              tick lands exactly on the faint one it replaces instead of
              interleaving with it by a fraction of a degree — the same
              concern the old single-circle version met by giving both rings
              the same dash phase.

              Each tick is a vertical line at twelve o'clock reaching inward
              from R, rotated into place about the centre.
              `vector-effect: non-scaling-stroke` keeps its WIDTH in screen
              pixels — a hairline at any diameter, matching the CSS
              `border-dashed` rings in DashedCircle — while its LENGTH stays in
              user units and scales with the ring.
            */}
            <g id={ticksId} transform={`rotate(${TICK_PHASE} 50 50)`}>
              {TICK_ANGLES.map((angle) => (
                <line
                  key={angle}
                  x1="50"
                  y1={50 - R}
                  x2="50"
                  y2={50 - R + TICK_LENGTH}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                  transform={`rotate(${angle} 50 50)`}
                />
              ))}
            </g>
          </defs>

          {/*
            An SVG <circle> starts its path at three o'clock and runs clockwise
            (the y axis points down), so a single -90° turn about the centre
            puts the start at twelve o'clock with the sweep direction already
            correct — no reversed path, no negative dashoffset.
          */}
          <g transform="rotate(-90 50 50)">
            <mask
              id={maskId}
              maskUnits="userSpaceOnUse"
              x="-10"
              y="-10"
              width="120"
              height="120"
            >
              {/*
                A luminance mask: unpainted area is black and hides, white
                reveals. So this arc is the progress — it uncovers a dial that
                is fully drawn underneath the whole time, which is what keeps
                the ticks STATIONARY. Animating a visible ring's own dashoffset
                instead would slide the marks around the circumference and read
                as a spinner rather than as a measure.

                dasharray is the full circumference — one on-segment as long as
                the path — so `strokeDashoffset` sweeps the whole ring: C is
                nothing drawn, 0 is fully drawn, and progress is exactly
                1 - dashoffset / C.
              */}
              <circle
                data-progress-arc
                cx="50"
                cy="50"
                r={MASK_R}
                fill="none"
                stroke="#fff"
                strokeWidth={MASK_WIDTH}
                strokeDasharray={C}
                // Ships undrawn, matching the tween's start value — the same
                // no-SSR-flash rule as DashedCircle's `collapsed`. The server
                // frame is a bare track with the dot parked at twelve, which is
                // a correct 0% state rather than a flash of a finished ring.
                strokeDashoffset={C}
              />
            </mask>

            {/* The track: the run not yet made, faint. */}
            <use href={`#${ticksId}`} className="stroke-black/15" />

            {/*
              The filled dial: the same ticks, darker, revealed by the mask. It
              reads as the track darkening tick by tick, not as a second ring
              laid over it, because both stamps are the one definition above.
            */}
            <use
              href={`#${ticksId}`}
              mask={`url(#${maskId})`}
              className="stroke-black/60"
            />
          </g>
        </svg>
      </div>
    </div>
  );
}
