"use client";

import { useRef } from "react";
import TransitionLink from "./TransitionLink";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRevealed } from "./Preloader";
import { useTranslations } from "next-intl";
import { RICH, richHeading, type RichHeading } from "./rich";

gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger);

ScrollTrigger.config({ ignoreMobileResize: true });

/** The Studio's Homepage → Hero. Each field missing falls back to messages/. */
export type HeroCopy = {
  titleStart?: RichHeading;
  titleEnd?: RichHeading;
  body?: string;
};

export default function Hero({ copy: words = {} }: { copy?: HeroCopy }) {
  const t = useTranslations("Hero");
  const common = useTranslations("Common");
  const container = useRef<HTMLDivElement>(null);
  const revealed = useRevealed();

  useGSAP(
    () => {
      // Nothing in this section exists until the preloader lifts.
      //
      // An early return rather than tweens built `paused: true`. With a
      // dependency array and no `revertOnUpdate`, useGSAP defers cleanup to
      // unmount and *adds* the callback to the same context on every change
      // instead of reverting it — so this first pass contributes nothing and
      // the whole section is built exactly once, at the reveal. Parking
      // entrances instead would mean standing up the SplitText instances, the
      // matchMedia pin and both triggers up front, then teaching `onSplit` —
      // which also runs on every resize and font load, long after the reveal —
      // when to park a tween and when to let it play.
      //
      // It also keeps every measurement out of the window where ScrollLock
      // holds <html> at `overflow: clip`, which reports no scrollable overflow
      // at all.
      if (!revealed) return;

      // Absolute scroll position where the hero starts leaving — the pin keeps
      // the hero's top at the viewport top, so element-relative starts never
      // advance and a number is the only reliable measure. As a function it is
      // re-read on every refresh, so it survives resizes.
      const exitStart = () => window.innerHeight * 0.2;

      // Hold the hero against the top for one viewport of scrolling, which is
      // the room the exit tween needs before Intro slides up over it.
      //
      // Desktop only. Pinning costs a phone more than it buys it: the pin puts
      // `position: fixed` on the hero, and a fixed element is the one thing a
      // mobile browser cannot scroll — which is what keeps the URL bar from
      // collapsing and makes the gesture feel dead for a full viewport at the
      // top of the page. Below lg the hero simply scrolls away.
      //
      // The pin is the whole reason this trigger exists, so below lg it is not
      // created at all rather than built with `pin: false` and left doing
      // nothing. Nothing else goes with it: the exit tweens hang off their own
      // trigger further down, keyed to an absolute scroll position, so they
      // still play — the hero now animates out while it travels rather than
      // while it is held. pinSpacing was already false, so the document height
      // is identical either way.
      //
      // gsap.matchMedia rather than a one-shot innerWidth test, for the reason
      // spelled out in OurMotto: it reverts what it built the instant the query
      // stops matching, so crossing lg — or rotating a tablet — unpins cleanly
      // instead of stranding the hero fixed. Its constructor registers on the
      // enclosing gsap.context(), so useGSAP's cleanup still owns it.
      //

      const mm = gsap.matchMedia();

      mm.add("(min-width: 64rem)", () => {
        ScrollTrigger.create({
          trigger: container.current,
          start: "top top",
          end: "+=100%",
          pin: true,
          pinSpacing: false,
        });
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
              // Measured from the reveal, which fires as the curtain STARTS
              // opening rather than after it has gone, so this is the one
              // number that places the whole entrance against the preloader.
              // HeaderBg's intro carries the same value — move them together or
              // the backdrop and the type stop arriving as one thing.
              //
              // The window is narrow at both ends. The clip closes from the
              // outside in and both headings straddle the centre, so they are
              // the last thing uncovered — at about 0.83 — and the curtain is
              // visually finished around 1.0 even though it does not formally
              // end until 1.225. Later than ~0.85 and the lines sit visibly
              // empty in their masks first, which is what 1.0 did: the entrance
              // read as starting after the preloader rather than under it.
              // Earlier than ~0.5 and it is most of the way through before
              // anything is uncovered.
              //
              // 0.7 puts the lines 24% into their travel at the moment they
              // become visible and 73% by the formal end, so the movement is
              // already underway when the orange clears.
              delay: 0.7,
            });
          },
        });
      });

      // Both headings run in parallel and each holds two lines, so the last one
      // starts at 0.7 + 0.12 and lands at ~2.32s. This delay puts the copy's
      // own last step (1.7 + 0.1 + 0.5) on the same beat — it tracks the
      // heading delay a second behind, so move the two together or the copy
      // stops landing with the lines.
      gsap.from("[data-fade]", {
        autoAlpha: 0,
        y: 16,
        duration: 0.5,
        ease: "power2.out",
        stagger: 0.1,
        delay: 1.7,
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
    { scope: container, dependencies: [revealed] },
  );

  return (
    <div
      id="hero"
      ref={container}
      /**
       * svh, not vh/dvh. On mobile `100vh` is the LARGE viewport — the height
       * the page only gets once the URL bar has scrolled away — so at load the
       * bottom row (paragraph + CTA) sits under the browser chrome, and
       * ScrollLock's 2.3s freeze means the reader cannot scroll it into view.
       * dvh would fix that but re-lays out the pinned hero every time the bar
       * collapses; svh always fits and never moves. The pin's `end: "+=100%"`
       * is measured off this element, so it follows whatever svh resolves to.
       *
       * One column until lg, where the two headings finally have room to sit
       * diagonally opposite each other. Stacked, the rows keep the same
       * bottom-right / top-left pairing, so the diagonal reading order
       * survives the collapse.
       */
      className="grid h-svh w-full grid-cols-1 grid-rows-2 gap-space-2x lg:grid-cols-2 lg:gap-0"
    >
      <div className="flex items-end justify-center p-space-base sm:p-space-2x lg:justify-end">
        {/* The type steps down the modular scale rather than taking an
            arbitrary value — the steps *are* the design token. text-4xl is
            ~61px at base and grows fluid past 1536px, which no phone can hold
            "DIGITAL PRODUCTs" at; it only comes back at xl, where the column
            is wide enough for it again.

            `max-sm:vi:text-3xl` on both: Vietnamese headings need 1.25
            leading to keep their stacked accents (see :root:lang(vi) in
            globals.css), and at text-4xl that pushed the paragraph and CTA
            below the fold of the svh row on a phone. One step down fits both
            rows exactly at 390x844. */}
        <h1
          data-split="up"
          className="text-center text-4xl leading-heading font-bold tracking-tighter uppercase lg:text-right lg:text-3xl xl:text-4xl max-sm:vi:text-3xl"
        >
          {words.titleStart
            ? richHeading(words.titleStart)
            : t.rich("titleStart", RICH)}
        </h1>
      </div>

      <div className="row-start-2 flex flex-col items-center justify-start gap-space-2x p-space-base sm:p-space-2x lg:col-start-2 lg:items-start lg:gap-space-base">
        <h1
          data-split="down"
          className="text-center text-4xl leading-heading font-bold tracking-tighter uppercase sm:text-2xl lg:text-left lg:text-3xl xl:text-4xl max-sm:vi:text-3xl"
        >
          {words.titleEnd
            ? richHeading(words.titleEnd)
            : t.rich("titleEnd", RICH)}
        </h1>
        {/* leading-none is a desktop luxury: at text-base on a phone the copy
            wraps to four or five lines and needs the body leading to stay
            readable. */}
        <p
          data-fade
          className="max-w-[48ch] text-center text-base leading-body sm:text-md sm:leading-none lg:text-left"
        >
          {words.body ?? t("body")}
        </p>
        <TransitionLink
          data-fade
          className="rounded-md bg-accent px-space-2x py-space--2x text-base font-bold tracking-tighter uppercase sm:text-md"
          href="/contact"
        >
          {common("contactUs")}
        </TransitionLink>
      </div>
    </div>
  );
}
