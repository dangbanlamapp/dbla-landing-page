type DashedCircleProps = {
  /** Diameter as any CSS length, e.g. "80vmin" or "180vmin". */
  size: string;
  /** Applied to the full-bleed centering layer, for animation targeting. */
  id?: string;
  /**
   * Extra classes for that same centering layer. Meant for responsive
   * visibility — `max-lg:hidden` to drop a ring on small screens — and not for
   * layout: the layer is `absolute inset-0` and the ring inside it is sized by
   * an animated height, so anything here that touches the box model is
   * fighting the timeline rather than configuring it.
   *
   * Hiding is `display: none` on purpose, rather than the parent choosing not
   * to render the ring at all. The intro staggers rings by their index in a
   * `[data-ring]` query (`i * 0.25`), so a ring that disappears from the DOM
   * renumbers every ring after it and re-times the whole entrance. Hidden, it
   * still answers the query, still holds its slot, and costs one wasted height
   * write per frame.
   */
  className?: string;
  /**
   * Render at zero diameter so a GSAP tween can open it to `size` without the
   * server-rendered circle flashing at full size first. Requires JS.
   */
  collapsed?: boolean;
  /** Which edges the two dots sit on: left/right or top/bottom. */
  dots?: "horizontal" | "vertical";
  /**
   * Degrees the ring turns while it opens, published as `data-spin` for the
   * parent timeline to read — same declarative contract as `size`/`growTo`, so
   * the amount lives with the ring rather than in an index lookup upstream.
   * The sign is the direction: pass a negative value to counter-rotate against
   * a neighbouring ring.
   */
  spin?: number;
  /**
   * Diameter to expand to during the scroll pin. Each ring grows into the next
   * one's resting size, which is what makes the set read as an outward wave.
   */
  growTo?: string;
  /**
   * Optional text printed on the ring, upright at the top and inverted at the
   * bottom.
   *
   * It renders *inside* the ring box rather than beside it, and that placement
   * is the whole point: the ring is sized by an animated `height`, so the label
   * inherits the animation for free and stays welded to the ring at every
   * diameter — including out at `growTo`. A sibling pinned to its own width
   * would sit at its final radius while the ring was still opening, and drift
   * loose the moment the ring grew.
   *
   * The inset is a percentage for the same reason: it has to hold its
   * proportion as the ring expands, which a fixed length would not.
   */
  label?: string;
};

export default function DashedCircle({
  size,
  id,
  className = "",
  collapsed = false,
  dots = "horizontal",
  spin,
  growTo,
  label,
}: DashedCircleProps) {
  const dotPositions =
    dots === "vertical"
      ? [
          "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2",
          "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2",
        ]
      : [
          "top-1/2 left-0 -translate-x-1/2 -translate-y-1/2",
          "top-1/2 right-0 translate-x-1/2 -translate-y-1/2",
        ];

  return (
    <div
      id={id}
      className={`absolute inset-0 flex items-center justify-center ${className}`}
    >
      <div
        data-ring
        data-size={size}
        data-grow={growTo}
        data-spin={spin}
        style={{ height: collapsed ? 0 : size }}
        className="relative aspect-square rounded-full border border-dashed border-black/25"
      >
        {dotPositions.map((position) => (
          <div
            key={position}
            className={`absolute ${position} h-1 w-1 rounded-full bg-black lg:h-1.5 lg:w-1.5`}
          ></div>
        ))}
        {label && (
          <div
            data-ring-label
            className={`heading-style absolute inset-[3%] flex rotate-90 flex-col items-center justify-between py-space--1x text-xs opacity-75 ${
              collapsed ? "invisible opacity-0" : ""
            }`}
          >
            <p>{label}</p>
            <p className="rotate-180">{label}</p>
          </div>
        )}
      </div>
    </div>
  );
}
