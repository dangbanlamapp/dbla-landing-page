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
        const isMajor = Math.abs(i - mid) % major === 0;
        return (
          <span
            key={i}
            data-tick
            data-tick-major={isMajor || undefined}
            style={{ height: isMajor ? majorLength : minorLength }}
            className={`w-px shrink-0 ${collapsed ? "scale-y-0" : ""} ${
              isMajor ? "bg-foreground/60" : "bg-foreground/25"
            }`}
          ></span>
        );
      })}
    </div>
  );
}
