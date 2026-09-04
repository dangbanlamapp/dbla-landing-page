"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger);

export default function Intro() {
  const container = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // One timeline owns the pin, the shape HeaderBg uses. A second
      // ScrollTrigger starting at "top top-=50vh" was measuring an offset
      // against an element that is itself pinned — legal, but its markers land
      // in the document at the start scroll position while the content is
      // frozen at the viewport top, so the two visibly drift apart by the pin
      // distance and there is no way to read whether the number is right.
      //
      // Every duration below is written so one timeline second == one viewport
      // of scroll. That is what splits the hold from the exit.
      const hold = gsap.timeline({
        scrollTrigger: {
          trigger: container.current,
          start: "top top",
          end: () => "+=" + window.innerHeight,
          scrub: true,
          pin: true,
          invalidateOnRefresh: true,
        },
      });

      // First half: a dead hold. Empty tween on a throwaway object, the same
      // trick HeaderBg uses to buy scroll distance with nothing to render.
      hold.to({}, { duration: 0.5 });

      // Second half: the content collapses to nothing. It scales the inner
      // wrapper rather than the section itself, for the same reason HeaderBg
      // rotates a child of its pin — ScrollTrigger puts `position: fixed` on
      // the pinned element and owns its transform.
      //
      // fromTo rather than to: invalidateOnRefresh re-records the start value
      // on every refresh, and a bare `to` re-reads it off the element, so a
      // refresh landing mid-exit would record a half-shrunk scale as full size.
      hold.fromTo(
        content.current,
        { scale: 1, opacity: 1, filter: "blur(0px)" },
        {
          scale: 0,
          opacity: 0,
          duration: 0.5,
          filter: "blur(12px)",
          ease: "power4.in",
        },
      );

      // Same contract as Hero: data-split declares which way the lines travel.
      const blocks = gsap.utils.toArray<HTMLElement>(
        "[data-split]",
        container.current,
      );

      blocks.forEach((block) => {
        const yPercent = block.dataset.split === "down" ? -150 : 150;

        // autoSplit re-splits on font load / resize, so onSplit holds the tween
        // and returning it lets GSAP clean up before each re-split.
        SplitText.create(block, {
          type: "lines",
          mask: "lines",
          // The tiny bottom padding keeps the mask from clipping descenders.
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent,
              duration: 1.5,
              ease: "power3.out",
              stagger: 0.12,
              // This section starts below the fold, so each block waits until
              // it scrolls into view rather than firing on load, and rewinds
              // once it leaves back off the bottom.
              scrollTrigger: {
                trigger: block,
                start: "top 75%",
                toggleActions: "play none none reverse",
              },
            }),
        });
      });
    },
    { scope: container },
  );

  return (
    <section id="intro" ref={container} className="h-screen overflow-hidden">
      {/* Scaled by the exit tween — nothing else may write to its transform. */}
      <div
        ref={content}
        className="grid h-full w-full grid-rows-2 flex-col items-center justify-center gap-space-4x"
      >
        <div className="flex h-full flex-col items-center justify-end">
          <p data-split="up" className="text-sm text-secondary uppercase">
            our mission
          </p>
          <p
            data-split="up"
            className="heading-style max-w-[32ch] text-center text-3xl"
          >
            Every business deserves to compete in the digital world, not just
            the ones with a tech team.{" "}
          </p>
        </div>
        <div className="flex h-full items-start justify-center">
          <p
            data-split="up"
            className="heading-style max-w-[32ch] text-center text-3xl text-accent"
          >
            That&apos;s the gap we close.
          </p>
        </div>
      </div>
    </section>
  );
}
