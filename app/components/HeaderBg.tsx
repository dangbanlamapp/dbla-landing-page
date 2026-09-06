"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import DashedCircle from "./DashedCircle";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * The scale the whole backdrop settles at once the scroll wave is over.
 *
 * It has to be solved for rather than written down, because the cross lines are
 * `150vmax` — a length pinned to the viewport's *long* axis, since that is the
 * only thing that guarantees they still reach past the corners at any rotation.
 * Every other piece in here is sized off the *short* axis. One hard-coded scale
 * therefore reads differently on every aspect ratio: the 0.25 that leaves a
 * discreet crosshair on a 16:9 desktop leaves a near edge-to-edge cross on a
 * portrait phone, where vmax is the height rather than the width. Measured, that
 * was 37% of the screen's width on desktop against 81% on a 390x844 phone.
 *
 * So state the intent — the cross comes to rest spanning two thirds of the short
 * axis — and let the scale fall out of it:
 *
 *   scale * 1.5vmax = (2/3) * vmin   ->   scale = 4/9 * (vmin / vmax)
 *
 * At 16:9 that is (4/9) * (9/16) = 0.25 exactly, i.e. the literal this replaced,
 * so the desktop composition is untouched to the pixel and only narrower or
 * wider viewports move. Ultrawides get the same correction in the other
 * direction, which the old literal also got wrong.
 *
 * Handed to GSAP as a function, not a number, so `invalidateOnRefresh` on the
 * ScrollTrigger below re-solves it on resize and on an orientation flip — which
 * swaps vmin and vmax outright and is the one case a static value cannot survive.
 */
const restScale = () => {
  const { innerWidth: w, innerHeight: h } = window;
  return (4 / 9) * (Math.min(w, h) / Math.max(w, h));
};

export default function HeaderBg() {
  const container = useRef<HTMLElement>(null);
  const pinLayer = useRef<HTMLDivElement>(null);
  const rotator = useRef<HTMLDivElement>(null);
  const crossLines = useRef<HTMLDivElement>(null);
  const zLine = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Each ring carries its own target diameter in data-size, so the tween
      // always lands on the unit the markup declares (keeps it responsive).
      const rings = gsap.utils.toArray<HTMLElement>(
        "[data-ring]",
        container.current,
      );

      const intro = gsap.timeline();

      rings.forEach((ring, i) => {
        const size = ring.dataset.size;
        // The seed ring rests at 0 — it belongs to the scroll wave, not the intro.
        if (!size || !parseFloat(size)) return;

        // Absolute position keeps the per-ring stagger that separate
        // timelines gave us, now that they share one.
        intro
          .fromTo(
            ring,
            { height: 0 },
            { height: size, duration: 2, ease: "power3.out" },
            i * 0.25,
          )
          .fromTo(
            ring,
            { rotate: 0 },
            { rotate: 90, duration: 1.8, ease: "power3.out" },
            "<",
          );
      });

      intro.fromTo(
        crossLines.current,
        { rotate: 0 },
        { rotate: -90, duration: 1.8, ease: "power3.out" },
        0,
      );

      // scaleX rather than width: visually identical for a solid bar, but it
      // stays on the compositor instead of relaying out a 150vmax box each frame.
      intro.fromTo(
        zLine.current,
        { scaleX: 0 },
        { scaleX: 1, duration: 1, ease: "power4.inOut" },
        0.8,
      );

      // Hold the backdrop in place for two viewports of scrolling: the first
      // scrubs the rotation and the ring wave, the second is a dead hold that
      // keeps the finished backdrop parked while content scrolls over it. One
      // timeline owns the pin so everything scrubs off a single ScrollTrigger —
      // a second trigger pinning the same element would fight this one.
      //
      // Every duration below is written so one timeline second == one viewport
      // of scroll. That is what splits the animated half from the held half.
      const scroll = gsap.timeline({
        scrollTrigger: {
          trigger: container.current,
          start: "top top",
          end: () => "+=" + window.innerHeight * 2,
          scrub: 1,
          pin: pinLayer.current,
          pinSpacing: false,
          invalidateOnRefresh: true,
        },
      });

      // The rotation lives on an inner wrapper so it never fights the
      // `position: fixed` ScrollTrigger applies to the pin.
      scroll
        .to(
          rotator.current,
          { rotation: 180, duration: 1, ease: "power4.inOut" },
          0,
        )
        .to({}, { duration: 0.5 })
        .to(rotator.current, {
          rotation: 360,
          duration: 0.5,
          ease: "power4.in",
        })
        .to(
          zLine.current,
          {
            scaleX: 0,
            duration: 0.5,
          },
          "<",
        )
        .to(
          rotator.current,
          {
            scale: restScale,
            duration: 0.25,
            ease: "power4.in",
          },
          "<0.25",
        );

      // Empty tween on a throwaway object — its only job is to extend the
      // timeline past its last real tween, giving the scrub a second viewport
      // of travel with nothing to render. Pad0.25ding the timeline rather than
      // splitting the pin off keeps everything on one ScrollTrigger.
      // scroll.to({}, { duration: 1 }, 1);

      // Each ring grows into the next one's resting diameter while a seed ring
      // opens from nothing at the center, so the set reads as one outward wave.
      //
      // These join the scroll timeline only once the intro has finished. Built
      // any earlier they'd render at progress 0 during ScrollTrigger's initial
      // refresh and stamp a height onto rings the entrance is still animating.
      intro.eventCallback("onComplete", () => {
        rings.forEach((ring) => {
          const { size, grow } = ring.dataset;
          if (!size || !grow) return;

          scroll.fromTo(
            ring,
            { height: size },
            { height: grow, duration: 1, ease: "none", immediateRender: false },
            0,
          );
        });

        // The timeline gained children after the trigger was built.
        ScrollTrigger.refresh();
      });
    },
    { scope: container },
  );

  return (
    <section id="header-bg" ref={container}>
      <div
        ref={pinLayer}
        className="absolute top-0 -z-1 h-screen w-full overflow-hidden"
      >
        <div ref={rotator} className="relative h-full w-full">
          {/* Lines run 150vmax rather than 100% so they still reach past every
              corner at any rotation — the viewport diagonal maxes out at
              ~1.42vmax, so 1.5 always covers it.

              vmax here is deliberate, and deliberately *not* what the rings
              below use. Coverage is a question about the long axis, so this
              length has to follow it; apparent size is a question about the
              short axis, which is why every ring is vmin. The price of that
              split is that the length these come to rest at no longer follows
              from this number alone — `restScale` above is what closes the
              gap, and the two are a pair: change 150 here and the two-thirds
              in that derivation has to move with it. */}
          {/* shrink-0 on every bar is load-bearing, not housekeeping. Each is
              a flex item, and flex-shrink defaults to 1, so a `w-[150vmax]`
              bar in a 100vw row starts with negative free space — and since an
              empty div's min-content width is 0, `min-width: auto` never
              clamps the shrink. It collapsed to exactly 100vw, silently.

              The y-line was never affected: its 150vmax is a *height*, which
              is the cross axis in a row, and the cross axis is not shrunk.
              That is the whole asymmetry — one arm of the cross was 150vmax
              and the other was 100vw.

              It hid on desktop because a 100vw bar still reaches both edges
              there, so nothing looked wrong until `cross-lines` rotates -90deg
              and stands that arm upright: in a 390x844 portrait viewport it
              then spanned 390px of an 844px height, i.e. 46%, and stopped mid
              screen. Landscape 16:9 rotated it into 1920px of a 1080px height
              and still covered, which is why it survived this long. */}
          <div id="cross-lines" ref={crossLines} className="absolute inset-0">
            <div
              id="y-line"
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="h-[150vmax] w-px shrink-0 bg-black opacity-10"></div>
            </div>
            <div
              id="x-line"
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="h-px w-[150vmax] shrink-0 bg-black opacity-10"></div>
            </div>
          </div>
          <div
            id="z-line"
            className="absolute inset-0 flex rotate-135 items-center justify-center"
          >
            {/* scale-x-0 matches the tween's start so the server-rendered
                line doesn't flash at full width before hydration. */}
            <div
              ref={zLine}
              className="h-px w-[150vmax] shrink-0 scale-x-0 bg-black opacity-10"
            ></div>
          </div>
          {/* vmin, not vh: the rings take their diameter from the viewport's
              short axis so the set keeps its proportions when that axis flips.
              On a landscape desktop vmin *is* vh, so these are the same
              diameters that were here before and nothing about that layout
              changes. Only portrait moves — there 80vh used to resolve to 173%
              of a phone's width, shoving the whole wave off both sides. */}
          {/* The outermost ring is desktop-only. Below `lg` it is not merely
              redundant, it is unreachable: at 250vmin its radius is 1.25x the
              short axis, while the farthest corner of a portrait phone sits at
              roughly 1.19x — the stroke closes outside the viewport entirely
              and never lands on a pixel at rest.

              It is not dead weight though, which is why this is a hide and not
              a delete. The ring opens from zero in the intro, so it sweeps
              through visible diameters on its way out, and `restScale` shrinks
              the whole rotator at the end of the scroll, which brings it back
              as the outer edge of the settled mark. Those two moments are what
              this removes: on a small screen they read as clutter around type
              that has far less room to breathe.

              The wave is unaffected. `outer-circle` still grows to 250vmin, so
              it simply becomes the outermost ring the reader actually sees
              instead of handing off to one behind it. */}
          <DashedCircle
            dots="vertical"
            id="extra-circle"
            size="250vmin"
            className="max-lg:hidden"
            collapsed
          />
          <DashedCircle
            dots="vertical"
            id="outer-circle"
            size="180vmin"
            growTo="250vmin"
            collapsed
          />
          <DashedCircle
            dots="vertical"
            id="inner-circle"
            size="80vmin"
            growTo="180vmin"
            collapsed
          />
          <DashedCircle
            dots="vertical"
            id="seed-circle"
            size="0vmin"
            growTo="80vmin"
          />

          <div
            id="center-cross"
            className="absolute inset-0 flex flex-col items-center justify-center"
          >
            <div className="relative flex h-5 w-5 items-center justify-center">
              <div className="h-1.75 w-1.75 rounded-full bg-black"></div>
              <div className="absolute inset-0 flex items-center">
                <div className="h-px w-full bg-black"></div>
              </div>
              <div className="absolute inset-0 flex justify-center">
                <div className="h-full w-px bg-black"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
