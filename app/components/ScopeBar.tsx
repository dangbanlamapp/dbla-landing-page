type ScopeBarProps = {
  /** Applied to the full-bleed centering layer, for animation targeting. */
  id?: string;
  /**
   * Render every tick flattened to zero height so a GSAP tween can open them
   * without the server-rendered bar flashing at full height first. Pair it
   * with a **fromTo** tween (`scaleY: 0` -> `1`): a plain `from` would read the
   * collapsed markup as the end state and animate 0 -> 0. Requires JS.
   */
  collapsed?: boolean;
  /**
   * How many ticks to draw. Fixed rather than derived from the viewport on
   * purpose: a count measured from `window` would differ between the server
   * render and hydration. The ticks are distributed with `justify-between`, so
   * the count stays constant and the *gap* is what responds to the viewport.
   *
   * Rounded up to the nearest odd number so there is a true middle tick to
   * centre the graduations on — see `mid` below. The default is picked so the
   * half-span (78) is a whole number of `major` steps, which puts a long tick
   * on both screen edges as well as on the centre line.
   */
  count?: number;
  /** Every Nth tick out from the centre is drawn long — the major graduations. */
  major?: number;
  /**
   * Below `lg`, keep only every Nth tick counted out from the centre and hide
   * the rest. 1, the default, draws every tick at every width.
   *
   * A CSS thinning rather than a smaller `count`, and it has to be: `count`
   * decides how many spans EXIST, so a value read from the viewport would
   * differ between the server render and hydration — the very reason `count`
   * is fixed in the first place. Rendering every tick and hiding the surplus
   * keeps one deterministic DOM and lets a media query do the responsive part.
   * `justify-between` then redistributes whatever survives, so the bar stays
   * full-bleed at any density.
   *
   * It must DIVIDE `major`, or a long graduation lands on a hidden tick and
   * the ruler loses the marks that make it readable. With the default major of
   * 6 that leaves 1, 2, 3 and 6 — and 6 hides every minor, so there is nothing
   * left to graduate against. The half-span is a whole number of steps too, so
   * the ticks on the centre line and on both screen edges survive any of them.
   *
   * The entrance and pulse tweens still target every tick, hidden ones
   * included. That is deliberate: GSAP's `from: "center"` stagger is pure
   * index arithmetic when no `grid` is given (distance is |i - mid|, no layout
   * is read), so the surviving ticks keep exactly the timing they had and the
   * wave still leaves the true centre. A hidden tick just scales nothing.
   */
  mobileEvery?: number;
  /** Long-tick length, as any CSS length. */
  majorLength?: string;
  /** Short-tick length. */
  minorLength?: string;
  /**
   * "center" mirrors every tick about the bar's mid-line (reads as a scope
   * reticle); "top" hangs them all from a shared top edge (reads as a ruler).
   */
  align?: "center" | "top";
};

/**
 * A full-bleed row of vertical graduation lines — the scope/ruler rule that
 * runs across the centre of the section.
 *
 * The layer is `inset-x-0` rather than `w-screen`: `html` is `overflow-x:
 * hidden`, and `100vw` includes the scrollbar gutter, so `w-screen` would
 * overhang by the scrollbar width and shift the ticks off-centre. Inside a
 * full-bleed section `inset-x-0` *is* the 100vw the design asks for.
 */
export default function ScopeBar({
  id,
  collapsed = false,
  count = 157,
  major = 6,
  mobileEvery = 1,
  majorLength = "1rem",
  minorLength = "0.375rem",
  align = "center",
}: ScopeBarProps) {
  // Force an odd count: with an even one the centre of the bar falls in the
  // *gap* between the two middle ticks, so nothing can sit on the centre line
  // and the pattern has no axis to mirror about.
  const total = count % 2 === 0 ? count + 1 : count;
  const mid = (total - 1) / 2;

  // Deterministic on both server and client — see the `count` note above.
  const ticks = Array.from({ length: total }, (_, i) => i);

  return (
    <div
      id={id}
      className={`pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between ${
        align === "center" ? "items-center" : "items-start"
      }`}
    >
      {ticks.map((i) => {
        // Counted outward from the middle rather than from the left edge. That
        // is what makes the bar read as centred: a major graduation lands
        // exactly on the centre line (under the crosshair), and every tick has
        // a twin the same distance away on the other side, so the two halves —
        // and therefore the two screen edges — mirror each other.
        const offset = Math.abs(i - mid);
        const isMajor = offset % major === 0;
        // Dropped below lg — see `mobileEvery`. Derived from the index, never
        // from the viewport, so the server and the client agree on it.
        const thinned = offset % mobileEvery !== 0;
        return (
          <span
            key={i}
            data-tick
            data-tick-major={isMajor || undefined}
            style={{ height: isMajor ? majorLength : minorLength }}
            className={`w-px shrink-0 ${thinned ? "max-lg:hidden" : ""} ${
              collapsed ? "scale-y-0" : ""
            } ${isMajor ? "bg-foreground/60" : "bg-foreground/25"}`}
          ></span>
        );
      })}
    </div>
  );
}
