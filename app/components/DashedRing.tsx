// Defaults chosen to sit close to the 1px `border-dashed` on DashedCircle's
// rings, so swapping one component for the other is not also a restyle. They
// are a starting point and nothing more — tuning them is the entire reason this
// component exists, and `dash`/`gap` in particular want to be looked at rather
// than inherited.
const WEIGHT = 1;
const DASH = 3;

type DashedRingProps = {
  /** Diameter as any CSS length, e.g. "80vh" — matches DashedCircle's `size`. */
  size: string;
  /**
   * Stroke width in CSS pixels. Genuinely pixels and not a fraction of the
   * ring: a hairline stays a hairline at 40vh or 250vh, which is what
   * DashedCircle gets for free from a border and what ProgressRing buys with
   * `vector-effect`. See the <svg> note for why neither trick is needed here.
   */
  weight?: number;
  /** Length of one dash, in CSS pixels. */
  dash?: number;
  /** Length of one gap, in CSS pixels. Defaults to `dash`, an even 1:1 pattern. */
  gap?: number;
  /** Applied to the full-bleed centering layer, for animation targeting. */
  id?: string;
  /**
   * Extra classes for that same centering layer. Two jobs: responsive
   * visibility (`max-lg:hidden`), and COLOUR — the stroke is `currentColor`, so
   * any `text-*` here repaints the ring. `text-background` is the one to reach
   * for over the accent, where the site's pairing inverts.
   *
   * Not for layout. The layer is `absolute inset-0` and the ring inside it is
   * sized by an animated height, so anything here that touches the box model is
   * fighting the timeline rather than configuring it.
   */
  className?: string;
  /**
   * Render at zero diameter so a GSAP tween can open it to `size` without the
   * server-rendered ring flashing at full size first. Requires JS — the same
   * bargain DashedCircle's prop of the same name makes.
   */
  collapsed?: boolean;
};

/**
 * A dashed ring, drawn as a single SVG <circle> rather than a dashed CSS
 * border.
 *
 * Visually it is DashedCircle minus the two edge dots. What it adds is a stroke
 * that can actually be animated: `strokeDasharray`, `strokeDashoffset` and
 * `strokeWidth` are all tweenable numbers on one element, so the dash pattern
 * can march, stretch, thin out or draw itself on. A CSS border can do none of
 * that — `border-style: dashed` has no addressable dash length, and the pattern
 * is whatever the UA decides to draw.
 *
 * Two handles are published for the parent timeline to drive, the same division
 * of labour as ProgressRing's `[data-progress-arc]` — the ring declares what
 * can move, the section decides when:
 *
 * - `[data-ring-box]` is the sized square. Tween its `height` to change the
 *   diameter, its `rotate` to turn the dash pattern. Note the deliberate
 *   near-miss with DashedCircle's `data-ring`: an attribute selector matches
 *   the whole name, so `[data-ring]` does NOT pick this up and the ring
 *   conveyors stay un-renumbered.
 * - `[data-dashed-ring]` is the <circle> itself, for the stroke:
 *   `strokeDasharray`, `strokeDashoffset`, `strokeWidth`.
 *
 * Deliberately NOT part of the `[data-ring]` conveyor that HeaderBg, Cta and
 * Footer stagger over. Those timelines index rings by their position in a
 * `[data-ring]` query, so a new component answering it would renumber every
 * ring after it and re-time entrances that currently work. Add the attribute
 * (plus `data-size`/`data-grow`/`data-spin`) when a section actually wants this
 * ring in that wave, and re-check the stagger when you do.
 */
export default function DashedRing({
  size,
  weight = WEIGHT,
  dash = DASH,
  gap = dash,
  id,
  className = "",
  collapsed = false,
}: DashedRingProps) {
  return (
    <div
      id={id}
      className={`pointer-events-none absolute inset-0 flex items-center justify-center text-black/25 ${className}`}
    >
      <div
        data-ring-box
        className="relative aspect-square"
        style={{ height: collapsed ? 0 : size }}
      >
        {/*
          No viewBox, and that omission is the load-bearing decision here.

          With one, the SVG carries a scaling transform: user units stop being
          pixels, `strokeWidth` thickens as the ring grows, and buying it back
          with `vector-effect: non-scaling-stroke` — ProgressRing's answer for
          its ticks — moves the WHOLE stroke computation into screen space,
          dash pattern included. That works, but it makes the units of `dash`
          depend on a spec subtlety rather than on anything visible in this
          file. Without a viewBox there is no transform to undo: one user unit
          is one CSS pixel, `weight` and `dash` are pixels because nothing is
          scaling them, and the ring is sized purely by the box around it.

          The cost is percentage geometry, which resolves oddly: SVG 1.1 gives
          a percentage `r` as a fraction of the NORMALIZED DIAGONAL,
          sqrt(w^2 + h^2) / sqrt(2), not of the width. On the square box above
          that comes out to sqrt(2w^2) / sqrt(2) = w, so `r="50%"` is exactly
          half the width and the aspect-square wrapper is what makes it behave.
          (The same resolution rule the curtain's `circle()` in Preloader leans
          on, from the other direction.)

          `overflow-visible` because the outer half of the stroke sits past
          the <svg> box; clipped, it would be shaved flat at the four compass
          points.
        */}
        {/*
          The inset lives on a plain div rather than on the <svg>, and the <svg>
          is then sized by `h-full w-full` rather than by the insets alone.
          Both halves of that matter: an outermost <svg> with no width/height
          has them default to 100% in SVG 2, so handing one four insets and
          expecting CSS to solve its box is over-constrained — browsers are
          within their rights to keep the 100% and shove the element off centre
          by half the weight instead of shrinking it. A div has no such default,
          and `h-full w-full` is CSS that beats the attribute either way. Same
          belt-and-braces sizing ProgressRing uses.

          Why inset at all: half the weight, so the ring's OUTER edge lands on
          `size` rather than `size + weight`. A stroke straddles its path, so
          an un-inset r = size/2 spills half the weight past the diameter it was
          handed — fine at a hairline, visibly wrong at weight 8, and either way
          a quiet break of the contract DashedCircle's border-box height and
          ProgressRing's R = 50 both keep.
        */}
        <div className="absolute" style={{ inset: weight / 2 }}>
          <svg aria-hidden className="h-full w-full overflow-visible">
            <circle
              data-dashed-ring
              cx="50%"
              cy="50%"
              r="50%"
              fill="none"
              stroke="currentColor"
              strokeWidth={weight}
              // One dash lands short where the path closes: the circumference,
              // pi * (size - weight), is not generally a whole number of
              // dash+gap pairs, so the last pair is truncated at the circle's
              // start point — three o'clock, since that is where an SVG
              // <circle> begins. A dashed CSS border has the same seam, which
              // is why this is left alone rather than papered over; closing it
              // properly means measuring the rendered diameter and snapping
              // `dash` to a length that divides the circumference evenly, and
              // that is a ResizeObserver and a different component.
              strokeDasharray={`${dash} ${gap}`}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
