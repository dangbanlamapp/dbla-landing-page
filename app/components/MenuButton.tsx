"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(useGSAP, SplitText);

/**
 * Two labels stacked in one grid cell, rolling past each other on click, over
 * a foreground-coloured disc that opens out from the centre to swap the pill's
 * fill underneath them.
 *
 * The look is passed in, not owned here: Header defines the pill recipe once
 * and hands the same one to this and to the CTA, so the two cannot drift.
 *
 * `open` is a prop rather than local state because MenuPanel reads the same
 * value, so Header owns it. The button only reports the click and animates to
 * match — it never decides. That also means the animation is driven off the
 * prop rather than off the click, so anything else that closes the menu (the
 * Escape key in Header today, a link inside the panel later) rolls the label
 * back without needing to know this component exists.
 */
export default function MenuButton({
  open,
  onToggle,
  className,
}: {
  open: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const container = useRef<HTMLButtonElement>(null);
  const menuLabel = useRef<HTMLSpanElement>(null);
  const closeLabel = useRef<HTMLSpanElement>(null);
  const disc = useRef<HTMLSpanElement>(null);

  // The timeline is built once and then only played and reversed, so it has to
  // outlive every render — hence a ref rather than state. Writing to it never
  // needs to repaint anything.
  const timeline = useRef<gsap.core.Timeline | null>(null);

  // useGSAP runs with an empty dependency list, so the closure inside it can
  // never see a later `open`. matchMedia can rebuild the timeline at any time
  // (see below) and needs to know where to leave it, so the current value is
  // mirrored into a ref the effect *can* read.
  const openRef = useRef(false);

  useGSAP(
    () => {
      /**
       * `mask: "chars"` is what makes this work at all: it wraps every
       * character in its own overflow-hidden box, so a character translated a
       * full 100% of that box is clipped away completely rather than spilling
       * over the pill's padding.
       *
       * No `autoSplit` here, unlike the headings in Hero. autoSplit exists to
       * re-split when line *breaks* move — on font load or resize — and a
       * chars split has no line breaks to invalidate. The wrappers are
       * inline-block with no measured size baked in, so when the webfont swaps
       * in the characters simply re-flow at their new widths.
       */
      const menuChars = SplitText.create(menuLabel.current, {
        type: "chars",
        mask: "chars",
      }).chars;

      const closeChars = SplitText.create(closeLabel.current, {
        type: "chars",
        mask: "chars",
      }).chars;

      /**
       * Opacity only, and deliberately so — parking the CLOSE characters at
       * -100% here as well would break them exactly the way it broke the
       * panel in MenuPanel: this set writes a resolved matrix, the timeline
       * below is built inside a matchMedia context, and its fromTo re-parses
       * that matrix from the computed style. A matrix cannot say which of its
       * pixels came from a percentage, so the offset is banked as a literal
       * `y` and the tween's yPercent stacks on top of it. The characters would
       * rest two line-boxes up and "arrive" one line-box up, i.e. never.
       *
       * The timeline's fromTo renders its from-state the moment it is created,
       * so it parks them itself, with one owner for the transform.
       *
       * Opacity is safe on this line because nothing else animates it. The
       * markup carries `opacity-0` because the two labels share a grid cell
       * and would otherwise print on top of each other in the server HTML;
       * useGSAP runs in a layout effect, i.e. before the browser paints, so
       * clearing it here is never visible as a flash.
       */
      gsap.set(closeLabel.current, { opacity: 1 });

      /**
       * Reduced motion collapses the travel to nothing rather than dropping
       * the toggle: the label still has to change, it just changes instantly.
       *
       * Both conditions are listed because gsap.matchMedia only runs the
       * callback when at least one matches — with only the `reduce` query
       * there would be no timeline at all for everyone else.
       */
      const mm = gsap.matchMedia();

      mm.add(
        {
          reduced: "(prefers-reduced-motion: reduce)",
          motion: "(prefers-reduced-motion: no-preference)",
        },
        (ctx) => {
          const { reduced } = ctx.conditions as { reduced: boolean };

          const tl = gsap.timeline({
            paused: true,
            defaults: {
              duration: reduced ? 0 : 0.45,
              ease: "power3.inOut",
            },
          });

          /**
           * The two label tweens start at position 0 and share a duration, an
           * ease and a stagger, and that exact symmetry is the whole trick. At
           * progress p a MENU character sits at +p of its box and shows the
           * slice below p; its CLOSE counterpart sits at -100% + p and shows
           * the slice above it. The two visible slices tile the box and never
           * overlap, so it reads as one strip rolling downward past a window
           * instead of two labels crossfading through each other.
           *
           * fromTo rather than to on all three: a paused timeline records its
           * start values on first render, which would make the resting state
           * depend on whenever the first click happened. Stating both ends
           * means reverse always lands back on exactly -100 / 0 / scale 0.
           */
          const stagger = reduced ? 0 : 0.03;

          tl.fromTo(menuChars, { yPercent: 0 }, { yPercent: 100, stagger }, 0)
            .fromTo(closeChars, { yPercent: -100 }, { yPercent: 0, stagger }, 0)
            // Position 0 and the shared defaults, so the fill arrives on the
            // same frames the roll does rather than trailing it.
            .fromTo(disc.current, { scale: 0 }, { scale: 1 }, 0);

          timeline.current = tl;

          // A media-query flip rebuilds this callback from scratch, and the
          // fresh timeline starts closed. If the menu was open at that moment,
          // jump it to the end so the label still matches `open`.
          if (openRef.current) tl.progress(1);

          return () => {
            timeline.current = null;
          };
        },
      );
    },
    { scope: container },
  );

  useEffect(() => {
    openRef.current = open;
    // play/reverse rather than restart: a click mid-flight turns the roll
    // around from wherever it currently is instead of snapping to an end.
    if (open) timeline.current?.play();
    else timeline.current?.reverse();
  }, [open]);

  return (
    /**
     * grid + place-items-center with both labels in cell 1/1 is what keeps the
     * pill from resizing on toggle: the column is sized by the wider of the
     * two words, so the button is always CLOSE-wide and MENU simply sits
     * centred in it.
     *
     * overflow-hidden is what turns the disc into a fill: the circle is wider
     * than the button by design, so the pill's own rounded rect is the shape
     * the reader actually watches fill in. It also lets the disc be sized in
     * round percentages instead of being measured.
     *
     * aria-label overrides the content for assistive tech, so the stacked
     * words are never read as "Menu Close".
     */
    <button
      ref={container}
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={open ? "Close menu" : "Open menu"}
      className={`relative grid cursor-pointer place-items-center overflow-hidden ${className ?? ""}`}
    >
      {/**
       * A centring wrapper, so the disc itself needs no offset at all — and
       * that is the whole point. Two earlier attempts put the circle's
       * *corner* on the button's centre and then tried to pull it back by half
       * its size: first with `inset-0 m-auto`, then with a -50% offset. Both
       * drifted, because the offset and the scale tween were competing for one
       * `transform` and the element's own size was in the middle of it.
       *
       * Flex centring resolves position from the parent instead, and the
       * default is unsafe centring — an item larger than its container
       * overflows both edges equally rather than being pushed off one — which
       * is exactly what an oversized disc needs. With no transform of its own,
       * the disc scales about its own centre, and its centre is already the
       * button's. GSAP owns `transform` outright and nothing has to agree with
       * anything.
       *
       * The wrapper is the one carrying `inset-0`; it has no size of its own
       * to reconcile, so the insets are unambiguous there.
       */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        {/**
         * shrink-0 is load-bearing: flex items default to shrinking, so a
         * 150%-wide item would quietly be squeezed back to the container's
         * width and stop being a circle.
         *
         * No Tailwind translate/scale utilities here, on purpose. Tailwind v4
         * compiles those to the standalone `translate` and `scale` CSS
         * properties, which the browser applies *alongside* `transform` — and
         * `transform` is where GSAP writes. A `scale-0` class would keep
         * multiplying against the tween and pin the disc shut for good.
         *
         * The resting state is an inline `transform` for the same reason it is
         * not a class: the markup has to start at the tween's initial value so
         * the disc is never briefly painted open before hydration, and this is
         * the exact property the tween then takes over.
         *
         * aspect-square + w-[150%] covers the pill without measuring anything.
         * The circle has to out-reach half the pill's diagonal from the
         * centre; at these proportions the diagonal is barely longer than the
         * width, so a radius of 75% of the width clears it with room to spare
         * — and it stays true as the fluid space tokens resize the padding.
         */}
        <span
          ref={disc}
          style={{ transform: "scale(0)" }}
          className="aspect-square w-[150%] shrink-0 rounded-full bg-foreground"
        />
      </span>

      {/* Positioned purely so they paint above the disc. An absolutely
          positioned sibling paints after in-flow content whatever the DOM
          order, so without this the circle would cover the very labels it is
          meant to sit behind. Two z-index:auto positioned boxes fall back to
          DOM order, which puts the labels on top. */}
      <span
        ref={menuLabel}
        aria-hidden="true"
        className="relative col-start-1 row-start-1"
      >
        Menu
      </span>
      <span
        ref={closeLabel}
        aria-hidden="true"
        className="relative col-start-1 row-start-1 opacity-0"
      >
        Close
      </span>
    </button>
  );
}
