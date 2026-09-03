"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger);

export default function WhyUs() {
  const container = useRef<HTMLElement>(null);
  const copy = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Label and heading share one trigger element — the column that holds
      // them — so they read as a single entrance no matter how the row reflows.
      // The range is the one the design asks for: that column's top touching
      // the bottom of the viewport through to the two centres meeting.
      //
      // Scrubbed, because a range with an explicit end is only meaningful if
      // the scroll drives the progress; with toggleActions the end would just
      // be a line where onLeave fires and the lines would land long before it.
      const blocks = gsap.utils.toArray<HTMLElement>(
        "[data-split]",
        container.current,
      );

      blocks.forEach((block) => {
        // Same contract as Hero and Intro: the markup declares which way the
        // lines travel, so direction lives next to the text it applies to.
        const yPercent = block.dataset.split === "down" ? -150 : 150;

        // autoSplit re-splits on font load / resize, so onSplit holds the tween
        // and returning it lets GSAP clean up before each re-split — including
        // the ScrollTrigger attached to it.
        SplitText.create(block, {
          type: "lines",
          mask: "lines",
          // Keeps the mask off the caps at leading-heading (0.75), the same
          // crop Hero needs.
          linesClass: "pb-[0.1em]",
          autoSplit: true,
          onSplit: (self) =>
            // fromTo, not from: a scrub re-renders this tween at every progress
            // and a refresh re-reads a bare `from`'s end value off the element,
            // so a refresh landing mid-scrub would record a half-travelled line
            // as home. Both ends written out cannot drift.
            gsap.fromTo(
              self.lines,
              { yPercent },
              {
                yPercent: 0,
                ease: "power3.out",
                stagger: 0.12,
                scrollTrigger: {
                  trigger: copy.current,
                  start: "top bottom",
                  end: "center center",
                  scrub: true,
                  invalidateOnRefresh: true,
                },
              },
            ),
        });
      });

      // The copy column then holds still while the numbered list scrolls past
      // it. The pin picks up exactly where the entrance above ends — both are
      // measured off the same element at "center center" — so the lines land
      // and the column locks in the same frame, with no gap to scroll through.
      //
      // endTrigger moves the finish line onto the section: the column is short
      // and its own bottom passes long before the list is done, so the release
      // has to be measured against the whole section reaching the viewport
      // bottom.
      //
      // pinSpacing is off because the pin's distance is already inside the
      // section's natural height — the list below is what fills it — so adding
      // a spacer would push the rest of the page down by that distance twice.
      // ScrollTrigger would default it to false here anyway (a flex parent
      // opts out, see its pinSpacing normalisation), but leaving it implicit
      // means the layout quietly depends on the parent staying display: flex.
      //
      // The slot in the flex row is safe either way: pinning always wraps the
      // element in a pin-spacer that inherits its flex-basis and measured
      // width, so the right column cannot expand into the space while the
      // column is position: fixed.
      ScrollTrigger.create({
        trigger: copy.current,
        start: "center center",
        endTrigger: container.current,
        end: "bottom bottom",
        pin: copy.current,
        pinSpacing: false,
        invalidateOnRefresh: true,
      });

      // Each numbered block fades up as it crosses the viewport and back down
      // as it leaves, so only the one nearest the middle reads as active.
      //
      // The range is the block's whole passage across the screen — top edge
      // entering at the bottom through to bottom edge leaving at the top — so
      // the midpoint of the scrub is exactly the moment the block's centre
      // meets the viewport centre. That is what puts full opacity in the
      // middle without any of it being written as a scroll offset.
      const boxes = gsap.utils.toArray<HTMLElement>(
        "[data-box]",
        container.current,
      );

      boxes.forEach((box) => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: box,
            start: "bottom bottom",
            end: "top top",
            scrub: true,
            invalidateOnRefresh: true,
          },
        });

        // The timeline totals 1, so each duration below is a straight fraction
        // of the range: 0.4 in, 0.2 held, 0.4 out. Read the numbers as the
        // shape of the fade rather than as seconds — the scrub maps them onto
        // scroll distance, and only their ratio survives.
        //
        // ease: "none" because the scroll is already the timing function
        // here; anything else would double up with it and pull the fully-lit
        // window off the centre.
        tl.fromTo(
          box,
          { opacity: 0.05 },
          { opacity: 1, duration: 0.4, ease: "none" },
        )
          // A dead hold — empty tween on a throwaway object, the same way Intro
          // buys scroll distance with nothing to render.
          .to({}, { duration: 0.2 })
          .to(box, { opacity: 0.05, duration: 0.4, ease: "none" });
      });
    },
    { scope: container },
  );

  return (
    <section ref={container} id="why-us" className="relative">
      <div className="grid grid-cols-2 gap-space-4x py-[15vh]">
        <div
          ref={copy}
          className="flex h-fit flex-col gap-[5vh] items-end justify-center px-space-base"
        >
          <div className="flex flex-col items-end">
            <p
              data-split="up"
              className="pr-space-4x text-sm text-foreground/75 uppercase"
            >
              why us
            </p>
            <h2
              data-split="up"
              className="heading-style text-right text-4xl leading-heading"
            >
              the team you can <br />{" "}
              <span className="text-accent"> count on</span>
            </h2>
          </div>
          <div className="flex flex-col items-end py-space-2x">
            <p className="max-w-[36ch] pb-space-base text-right text-md leading-body">
              Our developers have 15+ years building at some of the world's most
              respected tech companies. You get the caliber of talent.
            </p>
            <p className="heading-style text-md">Kao Bui</p>
            <p className="text-base text-foreground/50">CEO of Company</p>
          </div>
        </div>
        <div className="flex flex-col gap-space-base px-space-base pt-[50vh]">
          <div data-box className="flex flex-col gap-space--2x opacity-15">
            <p className="text-3xl leading-none tracking-tighter uppercase opacity-5">
              01
            </p>
            <h3 className="heading-style text-lg font-medium text-accent">
              Senior Expertise
            </h3>
            <p className="max-w-[48ch] text-base leading-body">
              Our developers bring 15+ years building at some of the
              world&apos;s most respected tech companies.
            </p>
          </div>
          <div data-box className="flex flex-col gap-space--2x opacity-15">
            <p className="text-3xl leading-none tracking-tighter uppercase opacity-5">
              02
            </p>
            <h3 className="heading-style text-lg font-medium text-accent">
              One team fullstack
            </h3>
            <p className="max-w-[48ch] text-base leading-body">
              Design, development, launch, even marketing — all under one roof.
              The people you talk to are the people who build your product, so
              nothing gets lost in a handoff.
            </p>
          </div>
          <div data-box className="flex flex-col gap-space--2x opacity-15">
            <p className="text-3xl leading-none tracking-tighter uppercase opacity-5">
              03
            </p>
            <h3 className="heading-style text-lg font-medium text-accent">
              Driven by results
            </h3>
            <p className="max-w-[48ch] text-base leading-body">
              We measure our success by yours. Every decision comes back to one
              question: does this move your business forward?
            </p>
          </div>
        </div>
      </div>
      <div id="cross-lines" className="absolute inset-0">
        <div
          id="y-line"
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="h-full w-px bg-black opacity-10"></div>
        </div>
        {/*
          The same centre line as the y-line above, drawn as graduations.

          ScopeBar is authored as a horizontal rule — a full-bleed flex row of
          ticks pinned to its parent's vertical middle — so running it down the
          centre means rotating a wrapper a quarter turn rather than forking the
          component into a second axis.

          After the rotation the wrapper's *width* is what becomes the bar's
          vertical length, so that width has to equal the section's height to
          match the y-line's h-full. Container query units are what make that
          expressible in CSS: container-type: size on this layer publishes its
          own box as the query container, and 100cqh reads its height back on
          the other axis. The containment is safe here precisely because the
          layer is absolute inset-0 — its size comes from the inset box, so
          size containment has nothing to collapse. Do not move container-type
          onto the section itself, which is sized by its content.

          Height is zero on the rotated box because ScopeBar sits at its
          top-1/2 and rotation happens about the box centre: at h-0 those are
          the same line, so the ticks mirror about exactly the axis the y-line
          draws. It also means the box's rotated footprint is 0 wide, so the
          pre-rotation overhang never reaches the document.
        */}
      </div>
    </section>
  );
}
