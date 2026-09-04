"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger);

ScrollTrigger.config({ ignoreMobileResize: true });

export default function Hero() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Absolute scroll position where the hero starts leaving — the pin keeps
      // the hero's top at the viewport top, so element-relative starts never
      // advance and a number is the only reliable measure. As a function it is
      // re-read on every refresh, so it survives resizes.
      const exitStart = () => window.innerHeight * 0.2;

      // Hold the hero against the top for one viewport of scrolling, which is
      // the room the exit tween needs before Intro slides up over it.
      ScrollTrigger.create({
        trigger: container.current,
        start: "top top",
        end: "+=100%",
        pin: true,
        pinSpacing: false,
      });

      // Each heading declares which way its lines travel in data-split, so the
      // two h1s can slide in from opposite edges of their masks.
      const headings = gsap.utils.toArray<HTMLElement>(
        "[data-split]",
        container.current,
      );

      // Every exit is built paused and parked here, then played by the single
      // ScrollTrigger below. A paused tween never renders, so it cannot touch
      // the elements — or overwrite the entrance — before the page scrolls.
      const exits: (gsap.core.Tween | undefined)[] = [];

      headings.forEach((heading, i) => {
        const yPercent = heading.dataset.split === "down" ? -150 : 150;

        // autoSplit re-splits on font load / resize, so onSplit holds the tween
        // and returning it lets GSAP clean up before each re-split.
        SplitText.create(heading, {
          type: "lines",
          mask: "lines",
          // The tiny bottom padding keeps the mask from clipping caps at
          // leading-heading (0.75) — drop it if the crop looks fine.
          linesClass: "pb-[0.1em]",
          autoSplit: true,
          onSplit: (self) => {
            // A re-split builds fresh line elements, so retire the exit still
            // pointing at the discarded ones.
            exits[i]?.kill();

            // Exit retraces the entrance in the opposite direction: the "up"
            // heading leaves through the top of its mask, the "down" one
            // through the bottom.
            exits[i] = gsap.to(self.lines, {
              yPercent: -yPercent,
              duration: 1,
              ease: "power3.inOut",
              stagger: 0.12,
              paused: true,
              // Only fires when the tween first renders, i.e. on play, so it
              // takes yPercent over from an entrance still in flight.
              overwrite: "auto",
            });

            return gsap.from(self.lines, {
              yPercent,
              duration: 1.5,
              ease: "power3.out",
              stagger: 0.12,
              delay: 0.5,
            });
          },
        });
      });

      // Both headings run in parallel: 1s tween + one 0.12s stagger step, so
      // the supporting copy waits for the last line to land.
      gsap.from("[data-fade]", {
        autoAlpha: 0,
        y: 16,
        duration: 0.5,
        ease: "power2.out",
        stagger: 0.1,
        delay: 1.5,
      });

      // Exit undoes that entrance — back down and out.
      const fadeExit = gsap.to("[data-fade]", {
        autoAlpha: 0,
        y: 16,
        duration: 0.8,
        ease: "power2.inOut",
        stagger: 0.1,
        paused: true,
        overwrite: "auto",
      });

      // One trigger drives every exit, so the whole hero leaves together and
      // comes back when you scroll to the top again.
      ScrollTrigger.create({
        start: exitStart,
        end: "+=1",
        onEnter: () => [...exits, fadeExit].forEach((exit) => exit?.play()),
        onLeaveBack: () =>
          [...exits, fadeExit].forEach((exit) => exit?.reverse()),
      });
    },
    { scope: container },
  );

  return (
    <div
      id="hero"
      ref={container}
      /**
       * svh, not vh/dvh. On mobile `100vh` is the LARGE viewport — the height
       * the page only gets once the URL bar has scrolled away — so at load the
       * bottom row (paragraph + CTA) sits under the browser chrome, and
       * ScrollLock's 2s freeze means the reader cannot scroll it into view.
       * dvh would fix that but re-lays out the pinned hero every time the bar
       * collapses; svh always fits and never moves. The pin's `end: "+=100%"`
       * is measured off this element, so it follows whatever svh resolves to.
       *
       * One column until lg, where the two headings finally have room to sit
       * diagonally opposite each other. Stacked, the rows keep the same
       * bottom-right / top-left pairing, so the diagonal reading order
       * survives the collapse.
       */
      className="grid h-svh w-full grid-cols-1 grid-rows-2 lg:grid-cols-2"
    >
      <div className="flex items-end justify-end p-space-base sm:p-space-2x">
        {/* The type steps down the modular scale rather than taking an
            arbitrary value — the steps *are* the design token. text-4xl is
            ~61px at base and grows fluid past 1536px, which no phone can hold
            "DIGITAL PRODUCTs" at; it only comes back at xl, where the column
            is wide enough for it again. */}
        <h1
          data-split="up"
          className="text-right text-xl leading-heading font-bold tracking-tighter uppercase sm:text-2xl lg:text-3xl xl:text-4xl"
        >
          We build <br /> <span className="text-accent">DIGITAL PRODUCTs</span>
        </h1>
      </div>
      {/* row-start-2 holds in both layouts; only the column moves, so this
          block is the bottom half when stacked and the bottom-right quadrant
          once the grid splits. */}
      <div className="row-start-2 flex flex-col items-start justify-start gap-space-base p-space-base sm:p-space-2x lg:col-start-2">
        <h1
          data-split="down"
          className="text-xl leading-heading font-bold tracking-tighter uppercase sm:text-2xl lg:text-3xl xl:text-4xl"
        >
          THAT GROW your <br /> <span className="text-accent">business</span>
        </h1>
        {/* leading-none is a desktop luxury: at text-base on a phone the copy
            wraps to four or five lines and needs the body leading to stay
            readable. */}
        <p
          data-fade
          className="max-w-[48ch] text-base leading-body sm:text-md sm:leading-none"
        >
          We are a product studio that helps non-technical founders go digital,
          with a focus on business outcomes
        </p>
        <a
          data-fade
          className="rounded-md bg-accent px-space-2x py-space--2x text-base font-bold tracking-tighter uppercase sm:text-md"
          href=""
        >
          Contact us
        </a>
      </div>
    </div>
  );
}
