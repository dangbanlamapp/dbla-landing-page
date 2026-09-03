"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger);

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
      className="grid h-screen w-full grid-cols-2 grid-rows-2"
    >
      <div className="flex items-end justify-end p-space-2x">
        <h1
          data-split="up"
          className="text-right text-4xl leading-heading font-bold tracking-tighter uppercase"
        >
          We build <br /> <span className="text-accent">DIGITAL PRODUCTs</span>
        </h1>
      </div>
      <div className="col-start-2 row-start-2 flex flex-col items-start justify-start gap-space-base p-space-2x">
        <h1
          data-split="down"
          className="text-4xl leading-heading font-bold tracking-tighter uppercase"
        >
          THAT GROW your <br /> <span className="text-accent">business</span>
        </h1>
        <p data-fade className="max-w-[48ch] text-base leading-none">
          We are a product studio that helps non-technical founders go digital,
          with a focus on business outcomes
        </p>
        <a
          data-fade
          className="rounded-md bg-accent px-space-2x py-space--2x text-md font-bold tracking-tighter uppercase"
          href=""
        >
          Contact us
        </a>
      </div>
    </div>
  );
}
