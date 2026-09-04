"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import DashedCircle from "./DashedCircle";
import ScopeBar from "./ScopeBar";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Both wedges share an apex at the dead centre of the square below, which is
 * also that box's transform-origin — so `scale`/`rotate` stay available for
 * later without touching the clip path.
 *
 * The reveal itself does move the points: one base corner stays put while the
 * other sweeps the full 30%–70% span, so the wedge unfolds about a held edge
 * rather than spreading symmetrically about its axis — and the two sides hold
 * opposite edges, so they open into each other. A transform cannot express
 * that: `scaleY` would open both edges at once, and it could never reach FULL
 * below. This one genuinely wants a clip-path tween.
 *
 * GSAP interpolates the polygon point by point, so all three states must carry
 * the same point count — hence six points for what reads as a triangle. Each
 * BASE CORNER is written twice; the apex is the pinned pair at either end of
 * the list and never moves. That is what makes FULL expand from the bases: on
 * the way out, one copy of each base corner runs to the box corner while the
 * other travels along to the centre line, so the wedge unwraps around the
 * corners and the orange floods in from the outer edges. The centre stays
 * pinched at the apex until the last frame, where the apex ends up collinear
 * on the rectangle's inner edge.
 *
 * Doubling the base corners rather than the apex is the whole difference from
 * an apex-driven expansion, which would part the centre seam first instead.
 *
 * Traversal is apex -> upper base pair -> lower base pair -> apex throughout,
 * so every in-between frame is a simple, non-self-intersecting polygon.
 *
 * 30%/70% puts the open base corners 20% of the box either side of centre over
 * a 50% horizontal run, i.e. a half-angle of atan(0.4) ≈ 21.8°. FULL is in the
 * square's own coordinates, so its 0%/100% edges sit far outside the viewport
 * and the rectangle over-covers at any aspect ratio; only the x: 50% seam is
 * on screen, landing exactly on #y-line.
 */
const FAN = {
  left: {
    closed: "polygon(50% 50%, 0% 30%, 0% 30%, 0% 30%, 0% 30%, 50% 50%)",
    open: "polygon(50% 50%, 0% 30%, 0% 30%, 0% 70%, 0% 70%, 50% 50%)",
    full: "polygon(51% 50%, 51% 0%, 0% 0%, 0% 100%, 51% 100%, 51% 50%)",
  },
  right: {
    closed: "polygon(50% 50%, 100% 70%, 100% 70%, 100% 70%, 100% 70%, 50% 50%)",
    open: "polygon(50% 50%, 100% 30%, 100% 30%, 100% 70%, 100% 70%, 50% 50%)",
    full: "polygon(49% 50%, 49% 0%, 100% 0%, 100% 100%, 49% 100%, 49% 50%)",
  },
};

/**
 * Share of the pin each entrance occupies. Both start at the top of the pin and
 * overlap; whatever is left over at the end is a held tail with nothing moving.
 */
const FAN_REVEAL = 0.5;
const RING_GROW = 0.5;

/**
 * The expansion picks up where the entrance ends and runs to the end of the
 * pin, so the tail that used to be a dead hold is now the flood to full-bleed
 * orange. Starts at RING_GROW rather than a literal so retiming the entrance
 * drags the flood along with it.
 */
const FAN_EXPAND = 1 - RING_GROW;

export default function Cta() {
  const container = useRef<HTMLElement>(null);
  const ringRotator = useRef<HTMLDivElement>(null);
  const yLine = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const scroll = gsap.timeline({
        scrollTrigger: {
          trigger: container.current,
          start: "top top",
          end: () => "+=" + window.innerHeight,
          scrub: 1,
          pin: true,
          invalidateOnRefresh: true,
        },
      });

      // One timeline second == one viewport of scroll, same convention as
      // HeaderBg — that is what lets the constants above read directly as
      // fractions of the pin. This empty tween on a throwaway object is what
      // holds that mapping: it fixes the timeline at exactly one viewport no
      // matter what the tweens below are worth, so adding a longer entrance
      // later cannot silently stretch the scrub. Nothing renders here.
      scroll.to({}, { duration: 1 }, 0);

      // fromTo, not to: ScrollTrigger re-renders progress 0 on every refresh,
      // and a plain `to` would have latched its start value from whatever the
      // element read at build time. Pinning down both ends keeps a refresh
      // mid-scroll from baking a half-open wedge in as the start state.
      (["left", "right"] as const).forEach((side) => {
        scroll.fromTo(
          `[data-fan="${side}"]`,
          { clipPath: FAN[side].closed },
          {
            clipPath: FAN[side].open,
            duration: FAN_REVEAL,
            ease: "power2.inOut",
          },
          0,
        );

        // immediateRender: false is load-bearing. A fromTo renders its start
        // value the moment it is built, no matter where it sits on the
        // timeline — so without this the OPEN wedge would be stamped in at
        // build time and the section would arrive already revealed, undoing
        // the CLOSED markup above it.
        scroll.fromTo(
          `[data-fan="${side}"]`,
          { clipPath: FAN[side].open },
          {
            clipPath: FAN[side].full,
            duration: FAN_EXPAND,
            ease: "power2.inOut",
            immediateRender: false,
          },
          RING_GROW,
        );
      });

      // The centre line has nothing left to mark once the wedges close over it,
      // so it retracts on the flood's beat — same position, same duration, same
      // ease, so the two read as one move rather than two that nearly agree.
      //
      // scaleY collapses it about its own centre, so the line withdraws to the
      // apex the wedges are still pinched at instead of sliding off an edge —
      // and it stays a compositor transform, unlike tweening its height.
      //
      // A ref, not "#y-line": HeaderBg renders that same id, and leaning on the
      // useGSAP scope to disambiguate a genuinely duplicated id is a trap for
      // whoever moves this markup next.
      // scroll.fromTo(
      //   yLine.current,
      //   { scaleY: 1 },
      //   {
      //     scaleY: 0,
      //     duration: FAN_EXPAND,
      //     ease: "power2.inOut",
      //     immediateRender: false,
      //   },
      //   RING_GROW,
      // );

      // Each ring carries its own target diameter in data-size, so the tween
      // always lands on the unit the markup declares (keeps it responsive).
      // Height rather than scale: the ring is a square box held round by
      // aspect-square, and scaling would smear the dashed border stroke.
      const rings = gsap.utils.toArray<HTMLElement>(
        "[data-ring]",
        container.current,
      );

      rings.forEach((ring) => {
        const size = ring.dataset.size;
        if (!size || !parseFloat(size)) return;

        scroll.fromTo(
          ring,
          { height: 0 },
          { height: size, duration: RING_GROW, ease: "power4.inOut" },
          0,
        );
      });

      // Turned on the rings' shared parent rather than on each ring: those are
      // mid-height-tween, and stacking a transform on the same element would
      // put a compositor animation and a layout animation on one box. The
      // parent keeps them apart, and one turn holds the pair in register.
      // Shares RING_GROW so it runs exactly with the growth, not merely near it.
      // scroll.fromTo(
      //   ringRotator.current,
      //   { rotate: 0 },
      //   { rotate: 90, duration: RING_GROW, ease: "power2.out" },
      //   0,
      // );
    },
    { scope: container },
  );

  return (
    <>
      <section
        id="cta"
        ref={container}
        className="relative h-screen overflow-hidden"
      >
        {/* First in the stack: the rings, scope bar and cross lines all read on
          top of the orange. */}
        <div id="fans" className="absolute inset-0">
          {/* A square box, not the viewport, because the clip-path percentages
            are resolved against the element — against `inset-0` the vertical
            ones would be a share of viewport *height*, so the fan angle would
            drift with the aspect ratio. 150vmax squares that away and still
            overshoots every corner at any rotation. */}
          <div className="absolute top-1/2 left-1/2 h-[150vmax] w-[150vmax] -translate-x-1/2 -translate-y-1/2">
            {/* Rendered closed so the server markup already sits at the tween's
              start value and no full wedge flashes before hydration. */}
            <div
              data-fan="left"
              style={{ clipPath: FAN.left.closed }}
              className="absolute inset-0 bg-accent"
            ></div>
            <div
              data-fan="right"
              style={{ clipPath: FAN.right.closed }}
              className="absolute inset-0 bg-accent"
            ></div>
          </div>
        </div>
        <div ref={ringRotator} className="absolute inset-0">
          <DashedCircle
            dots="horizontal"
            id="innie"
            size="80vh"
            growTo="250vh"
            collapsed
          />
          <DashedCircle
            dots="horizontal"
            id="outie"
            size="80vw"
            growTo="250vh"
            collapsed
          />
          {/* <ScopeBar id="scope-bar" /> */}
        </div>
        <div id="cross-lines" className="absolute inset-0">
          <div
            id="y-line"
            ref={yLine}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="h-screen w-px bg-black opacity-10"></div>
          </div>
          <div
            id="x-line"
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="h-px w-screen bg-black opacity-10"></div>
          </div>
        </div>
        {/* `relative` only to enter the positioned paint order: the absolute
          layers above would otherwise paint over this static block whatever the
          DOM order says, and the fans are solid. */}
        <div
          id="cta-content"
          className="relative flex h-full flex-col gap-space-2x"
        >
          <div className="flex h-1/2 flex-col items-center justify-end pb-space-4x">
            <h2 className="heading-style max-w-[13ch] text-center text-4xl leading-heading">
              Your next step into digital starts here.
            </h2>
          </div>
          <div className="flex flex-col items-center justify-start gap-space-base">
            <p className="max-w-[36ch] text-center text-base">
              Book a free call and let's talk through your goals, your
              challenges, and how we can help your business thrive.
            </p>
            <a
              className="rounded-md bg-accent px-space-2x py-space--2x text-md font-bold tracking-tighter uppercase"
              href=""
            >
              Contact us
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
