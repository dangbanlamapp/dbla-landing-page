"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import DashedCircle from "./DashedCircle";

gsap.registerPlugin(useGSAP, ScrollTrigger);

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
            scale: 0.25,
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
              ~1.42vmax, so 1.5 always covers it. */}
          <div id="cross-lines" ref={crossLines} className="absolute inset-0">
            <div
              id="y-line"
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="h-[150vmax] w-px bg-black opacity-10"></div>
            </div>
            <div
              id="x-line"
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="h-px w-[150vmax] bg-black opacity-10"></div>
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
              className="h-px w-[150vmax] scale-x-0 bg-black opacity-10"
            ></div>
          </div>
          <DashedCircle
            dots="vertical"
            id="extra-circle"
            size="250vh"
            collapsed
          />
          <DashedCircle
            dots="vertical"
            id="outer-circle"
            size="180vh"
            growTo="250vh"
            collapsed
          />
          <DashedCircle
            dots="vertical"
            id="inner-circle"
            size="80vh"
            growTo="180vh"
            collapsed
          />
          <DashedCircle
            dots="vertical"
            id="seed-circle"
            size="0vh"
            growTo="80vh"
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
