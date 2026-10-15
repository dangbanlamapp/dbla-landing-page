"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslations } from "next-intl";

gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger);

export default function Intro() {
  const t = useTranslations("Intro");
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
          // travel. Scrubbed on both layouts, same recipe as OurTeam / Cta.
          const blocks = gsap.utils.toArray<HTMLElement>(
            "[data-split]",
            container.current,
          );

          // Seconds the lines take to catch up with the scrollbar. Not the
          // range (that sets *where* they land, which is right) but the
          // follow: with scrub: true they were locked to every pixel and
          // stopped dead the moment the wheel did. A number makes ScrollTrigger
          // chase the scroll position with a power3.out tween instead, so a
          // line jumps most of the way at once and then settles slowly — the
          // ease-out feel, without putting a curve on the scroll mapping
          // itself (see the note on `ease` below).
          const SCRUB_LAG = 1.5;

          blocks.forEach((block) => {
            const yPercent = block.dataset.split === "down" ? -150 : 150;

            SplitText.create(block, {
              type: "lines",
              mask: "lines",
              // Keeps the mask off the caps at leading-heading (0.75).
              linesClass: "pb-[0.1em]",
              autoSplit: true,
              // fromTo rather than from, so both ends are written out and
              // nothing is ever read back off a half-travelled line.
              //
              // Deliberately NO invalidateOnRefresh. With a stagger, every
              // ScrollTrigger.refresh() (ScrollLock and HeaderBg both fire
              // one after load) invalidates the tween and re-renders it at
              // progress 0 — and only the first line's slot starts at 0, so
              // every later line kept its resting yPercent: 0 and sat fully
              // visible until the scrub reached it, then dropped behind the
              // mask and rose again. The yPercent values never depend on
              // layout, so there is nothing for invalidation to re-measure;
              // the scroll positions are refreshed regardless.
              onSplit: (self) =>
                gsap.fromTo(
                  self.lines,
                  { yPercent },
                  {
                    yPercent: 0,
                    // Linear, not power3.out. On a scrub the ease maps scroll
                    // to travel, and a strong ease-out front-loads it: with
                    // power3.out the lines covered half their distance in the
                    // first ~50px past the start, so they popped into place
                    // rather than rising. Linear keeps every pixel of scroll
                    // worth the same movement; Lenis already softens the edges.
                    ease: "none",
                    stagger: 0.12,
                    // Desktop: the section pins at top top, so the block's own
                    // position stops moving there — drive the entrance off the
                    // section's approach instead. Mobile is unpinned, so the
                    // block itself is a fine trigger.
                    //
                    // Hero is pinned and Intro slides up over it from scroll
                    // 0, with Hero's exit firing at 0.2vh. The section's
                    // lg:mt-[40vh] holds it back, so "top 60%" now lands at
                    // ~0.8vh of scroll — the hero title is long gone and the
                    // reader scrolls through a beat of empty backdrop first.
                    // The range runs on into the pin (end is relative to
                    // start, so it survives the pin spacer) and lands at
                    // ~1.5vh, well before the exit below begins at ~1.9vh.
                    scrollTrigger: desktop
                      ? {
                          trigger: container.current,
                          start: "top 60%",
                          end: () => "+=" + window.innerHeight * 0.7,
                          scrub: SCRUB_LAG,
                        }
                      : {
                          trigger: block,
                          start: "top 90%",
                          end: "top 50%",
                          scrub: SCRUB_LAG,
                        },
                  },
                ),
            });
          });
        },
      );
    },
    { scope: container },
  );

  return (
    // lg:mt-[40vh] is scroll distance, not layout: it pushes the section's
    // arrival — and so every trigger keyed off it — further down the page,
    // so the entrance starts later. A margin rather than padding because the
    // section pins at top top: padding would sit inside the pinned frame and
    // shift the heading off its resting place, while ScrollTrigger moves a
    // pinned element's margin onto its pin-spacer.
    <section
      id="intro"
      ref={container}
      className="overflow-hidden lg:mt-[10vh] lg:h-screen"
    >
      <div
        ref={content}
        className="grid h-full w-full grid-rows-2 flex-col items-center justify-center gap-space-4x px-space-base"
      >
        <div className="flex h-full flex-col items-center justify-end">
          <p data-split="up" className="text-sm text-secondary uppercase">
            {t("label")}
          </p>
          <p
            data-split="up"
            className="heading-style max-w-[32ch] text-center text-xl lg:text-3xl"
          >
            {t("statement")}
          </p>
        </div>
        <div className="flex h-full items-start justify-center">
          <p
            data-split="up"
            className="heading-style max-w-[32ch] text-center text-xl text-accent lg:text-3xl"
          >
            {t("gap")}
          </p>
        </div>
      </div>
    </section>
  );
}
