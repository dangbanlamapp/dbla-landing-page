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
      const mm = gsap.matchMedia();

      mm.add(
        {
          desktop: "(min-width: 64rem)",
          mobile: "(max-width: 63.999rem)",
        },
        (ctx) => {
          const { desktop } = ctx.conditions as { desktop: boolean };

          const hold = gsap.timeline({
            scrollTrigger: {
              trigger: container.current,
              start: "top top",
              end: () => "+=" + window.innerHeight,
              scrub: true,
              pin: desktop,
              invalidateOnRefresh: true,
            },
          });

          hold.to({}, { duration: 0.5 });

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

          // Same contract as Hero: data-split declares which way the lines
          // travel.
          const blocks = gsap.utils.toArray<HTMLElement>(
            "[data-split]",
            container.current,
          );

          blocks.forEach((block) => {
            const yPercent = block.dataset.split === "down" ? -150 : 150;

            SplitText.create(block, {
              type: "lines",
              mask: "lines",

              autoSplit: true,
              onSplit: (self) =>
                gsap.from(self.lines, {
                  yPercent,
                  duration: 1.5,
                  ease: "power3.out",
                  stagger: 0.12,
                  scrollTrigger: desktop
                    ? {
                        trigger: block,
                        start: "top 75%",
                        toggleActions: "play none none reverse",
                      }
                    : {
                        trigger: block,
                        start: "top 90%",
                        end: "top 50%",
                        scrub: true,
                      },
                }),
            });
          });
        },
      );
    },
    { scope: container },
  );

  return (
    <section id="intro" ref={container} className="overflow-hidden lg:h-screen">
      <div
        ref={content}
        className="grid h-full w-full grid-rows-2 flex-col items-center justify-center gap-space-4x px-space-base"
      >
        <div className="flex h-full flex-col items-center justify-end">
          <p data-split="up" className="text-sm text-secondary uppercase">
            our mission
          </p>
          <p
            data-split="up"
            className="heading-style max-w-[32ch] text-center text-xl lg:text-3xl"
          >
            Every business deserves to compete in the digital world, not just
            the ones with a tech team.{" "}
          </p>
        </div>
        <div className="flex h-full items-start justify-center">
          <p
            data-split="up"
            className="heading-style max-w-[32ch] text-center text-xl text-accent lg:text-3xl"
          >
            That&apos;s the gap we close.
          </p>
        </div>
      </div>
    </section>
  );
}
