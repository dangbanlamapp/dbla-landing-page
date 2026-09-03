"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import DashedCircle from "./DashedCircle";

gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger);

export default function OurMotto() {
  const container = useRef<HTMLElement>(null);
  const copy = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // ── Slide-in ───────────────────────────────────────────────────────────
      // The section's layout position keeps the full -100vh overlap; what
      // animates is a transform on top of it, starting half a viewport lower and
      // easing to nothing. Same motion as shifting the margin to -50vh and
      // moving the section up, but it resolves to y: 0 rather than to a
      // permanent -50vh: the visual box and the layout box agree again at rest,
      // so nothing downstream (Projects sits directly after this in the flow)
      // inherits a half-viewport gap to paper over.
      //
      // Half the viewport is expressed as a function of innerHeight rather than
      // yPercent, because the number that has to be matched is the vh-based
      // margin above, not a share of this section's own height. Function-based
      // values are re-run by invalidateOnRefresh, so a resize re-measures.
      //
      // The whole section moves, not an inner layer: the section owns the
      // background and the overflow-hidden, so translating a child would slide
      // the contents inside a box that stayed put and clip them on the way in.
      //
      // Ends at "top top" — the settle finishes exactly as the section takes
      // over the screen — and power2.inOut is what makes it lag out of the
      // bottom and coast into place instead of tracking the wheel one-to-one.
      gsap.fromTo(
        container.current,
        { y: 0 },
        {
          y: "-25vh",
          ease: "power4.inOut",
          scrollTrigger: {
            trigger: container.current,
            start: "top bottom",
            end: "top 50%",
            scrub: true,
            invalidateOnRefresh: true,
          },
        },
      );

      // One timeline owns the whole entrance, scrubbed between two different
      // elements: it starts when the copy block's own top crosses 75% of the
      // screen — keyed to the words themselves rather than to a section top that
      // sits a good third of a viewport above them — and endTrigger hands the
      // finish back to the section, so it is still done the moment the section
      // tops out.
      //
      // Scrubbed rather than played, so scrolling back up rewinds it frame for
      // frame — no toggleActions needed, and none would be honoured anyway:
      // scrub owns playback and ignores them.
      //
      // invalidateOnRefresh re-records the tweens' start values on refresh,
      // which matters here because the copy is animated with `from`: without it
      // a refresh landing mid-scrub would bank a half-risen line as the resting
      // position.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: copy.current,
          start: "top bottom",
          end: "center center",
          // pin: true,
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      // ── Copy ───────────────────────────────────────────────────────────────
      // Timeline seconds are just a proportion of the scrub range now, not real
      // time. Nothing is held back any more: the sequence opens at position 0,
      // so the first line is already moving the instant the start is crossed.
      const ENTER = 0.8;

      // The label first: the plain fade-and-rise Hero and Services give their
      // supporting copy. autoAlpha rather than opacity so it is visibility-
      // hidden at 0 and cannot be read out or hit-tested before it arrives.
      //
      // ease "none" throughout, because this is scrubbed: the copy tracks the
      // scrollbar exactly, and an eased curve reads as the scroll lagging.
      tl.from("[data-fade]", {
        autoAlpha: 0,
        y: 16,
        duration: 1,
        ease: "power2.inOut",
      });

      // Same contract as Hero and Intro: data-split declares which way the
      // lines travel, so the direction sits in the markup next to the copy.
      const blocks = gsap.utils.toArray<HTMLElement>(
        "[data-split]",
        container.current,
      );

      blocks.forEach((block, i) => {
        const yPercent = block.dataset.split === "down" ? -150 : 150;

        SplitText.create(block, {
          type: "lines",
          mask: "lines",
          // The mask is cut to the line box, which at leading-heading (0.75)
          // stops above the descenders — the "j" in "just" and the "y" in
          // "your" get shaved. Padding the line grows the box the mask follows.
          // linesClass: "pb-[0.15em]",
          autoSplit: true,
          onSplit: (self) => {
            // Built inside onSplit and added to the shared timeline from here,
            // the shape Services uses: autoSplit re-splits on font load and
            // resize, and GSAP kills whatever onSplit returned before doing so —
            // killing it also lifts it out of tl, and the next onSplit drops a
            // replacement in at the same position.
            const lines = gsap.timeline();

            lines.from(
              self.lines,
              { yPercent, duration: ENTER, ease: "power2.inOut", stagger: 0.1 },
              0,
            );

            // One beat between the two blocks, so the second reads as an answer
            // to the first rather than arriving on top of it.
            tl.add(lines, i * 0.15);
            return lines;
          },
        });
      });

      // ── Drift ──────────────────────────────────────────────────────────────
      // The copy block slides down half its own height, starting that far high
      // to counter it, so it arrives dead centre instead of being left sitting
      // low. yPercent, not y: a share of the block's own height, so it holds its
      // proportion at any type scale or viewport.
      //
      // The whole block moves, not the lines: SplitText tears its line elements
      // down and rebuilds them on every re-split, and the section itself is off
      // limits because ScrollTrigger owns that transform whenever the pin is on.
      //
      // Its own trigger, not tl: the drift runs the entire time the section is
      // on screen — from its top entering at the bottom edge to its bottom
      // leaving past the top — which is several times the range the copy
      // entrance occupies. Sharing tl would have squeezed the whole slide into
      // that short window; a separate ScrollTrigger is what lets the two live at
      // different scales over the same element.
      gsap.fromTo(
        copy.current,
        { yPercent: 0 },
        {
          yPercent: 200,
          ease: "none",
          scrollTrigger: {
            trigger: container.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
            invalidateOnRefresh: true,
          },
        },
      );

      // Unhide the block here, last, once every `from` above has stamped its
      // start value on. That is the flash: the server-rendered copy paints at
      // full opacity in its resting position and is only pushed back into its
      // start state when GSAP hydrates, so the finished text is visible for a
      // beat before the entrance runs. Shipping it `invisible` and lifting that
      // here closes the gap — useGSAP fires in a layout effect, so the reveal
      // lands in the same frame and nothing half-built is ever painted.
      //
      // The cost is the usual one for this pattern: the copy needs JS to appear
      // at all, the same bargain DashedCircle's `collapsed` prop makes.
      gsap.set(copy.current, { autoAlpha: 1 });
    },
    { scope: container },
  );

  return (
    // The negative top margin pulls this section up into the tail of the pin
    // spacer Services leaves behind, so the motto is already in place under the
    // pinned layer as the last services viewport scrolls past. It is deliberately
    // coupled to that pin length: change Services' VIEWPORTS and this offset has
    // to move with it. ScrollTrigger copies the margin onto its own pin spacer,
    // so the overlap survives pinning.
    //
    // The inset class matches the tween's start value so the server-rendered
    // frame is already closed — no flash of a full-height section before GSAP
    // runs. Keep the two in step: they are the same shape written twice.
    <section
      ref={container}
      id="our-motto"
      className="relative mt-[-75vh] flex h-[101vh] flex-col items-center justify-start bg-background pt-space-4x"
    >
      <div className="absolute inset-0">
        <DashedCircle dots="vertical" id="right-outie" spin={0} size="58vh" />
      </div>

      <div id="cross-lines" className="absolute inset-0">
        <div
          id="y-line"
          className="absolute inset-0 top-[50vh] flex items-center justify-center"
        >
          <div className="h-[150vh] w-px bg-black opacity-10"></div>
        </div>
      </div>
      {/* Ships hidden and is unhidden by a gsap.set once the entrance has been
          built — see that line for why. Note this has to stay `invisible`
          (visibility), not `opacity-0`: SplitText measures line boxes when it
          splits, and a display- or layout-affecting hide would give it nothing
          to measure. */}
      <div
        ref={copy}
        className="invisible flex flex-col items-center justify-center"
      >
        <p
          data-fade
          className="p-space--1x text-sm text-foreground/75 uppercase"
        >
          our motto
        </p>
        <p data-split="up" className="heading-style text-4xl">
          More than just products
        </p>{" "}
        <h2 data-split="up" className="heading-style text-center text-4xl">
          we build <span className="text-accent">results</span> that <br />{" "}
          matter to your business.
        </h2>
      </div>
    </section>
  );
}
