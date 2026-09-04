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
  const list = useRef<HTMLDivElement>(null);

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
        copy.current,
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

      // The copy column drifts down as the section scrolls, so it travels
      // slower than the numbered list beside it and the two read as different
      // depths. yPercent, not y: the shift is half the column's own height, so
      // it stays proportional when the copy reflows instead of being a pixel
      // number tuned against one breakpoint.
      //
      // ease: "none" — the scroll is the timing function; any curve here would
      // make the column speed up and slow down against a list moving linearly,
      // which reads as a glitch rather than as depth.
      //
      // The tween moves its own trigger element, which is only safe because of
      // invalidateOnRefresh: ScrollTrigger reverts the animation before it
      // measures start/end, so the column is back at yPercent 0 whenever the
      // positions are read. Without it, a refresh mid-scroll would measure the
      // already-shifted column and bake the offset into its own range. Writing
      // both ends out as a fromTo is what keeps that revert-and-re-init cycle
      // landing on the same two numbers every time.
      gsap.fromTo(
        copy.current,
        { yPercent: 0 },
        {
          yPercent: 50,
          ease: "none",
          scrollTrigger: {
            trigger: copy.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
            invalidateOnRefresh: true,
          },
        },
      );

      // The card headings run the same SplitText recipe on the same data-split
      // contract, but they are their own entrance rather than part of the
      // column's: each one waits for its own box to come up the screen, so the
      // three fire one after another as the list scrolls rather than together.
      // That is the whole reason the two loops read from different roots
      // instead of one [data-split] sweep over the section — the selector root
      // is what keeps each group on the trigger that belongs to it.
      //
      // data-split="down" is the direction flip the design asks for: -150
      // starts each line above its mask, so these drop in from the top while
      // the section heading rises from the bottom.
      const cards = gsap.utils.toArray<HTMLElement>(
        "[data-split]",
        list.current,
      );

      cards.forEach((card) => {
        const yPercent = card.dataset.split === "down" ? -150 : 150;

        SplitText.create(card, {
          type: "lines",
          mask: "lines",
          linesClass: "pb-[0.1em]",
          autoSplit: true,
          // Not scrubbed: an entrance with no end position runs on its own
          // clock, the shape Intro uses. toggleActions plays it on the way
          // down and rewinds it if the reader scrolls back off the bottom, so
          // the heading is never left half-arrived. A plain from() is safe here
          // precisely because there is no invalidateOnRefresh to re-read the
          // end value off a line that is still moving.
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent,
              duration: 1,
              ease: "power3.out",
              stagger: 0.12,
              scrollTrigger: {
                trigger: card,
                start: "top 90%",
                toggleActions: "play none none reverse",
              },
            }),
        });
      });

      // The descriptions get the plain version: no split, no travel, just
      // transparent to opaque. data-fade is the marker Hero already uses for
      // supporting copy, and as there it ships without an opacity class —
      // from() applies its start value on init, so there is nothing to flash,
      // and the text stays readable if JS never runs.
      //
      // Each paragraph triggers on itself at the same 85% line as the heading
      // above it. Because it sits lower in the box it crosses that line a
      // moment later, so the pair arrives as a heading-then-body cascade
      // without either delay being written down.
      gsap.utils
        .toArray<HTMLElement>("[data-fade]", list.current)
        .forEach((description) => {
          gsap.from(description, {
            opacity: 0,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: description,
              start: "top 85%",
              toggleActions: "play none none reverse",
            },
          });
        });
    },
    { scope: container },
  );

  return (
    <section ref={container} id="why-us" className="relative">
      <div className="grid grid-cols-2 gap-space-4x py-[15vh]">
        <div
          ref={copy}
          className="flex h-fit flex-col items-end justify-center gap-[5vh] px-space-base"
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
            <p className="max-w-[36ch] pb-space-base text-right text-lg leading-body">
              Our developers have 15+ years building at some of the world&apos;s
              most respected tech companies. You get the caliber of talent.
            </p>
            <p className="heading-style text-md">Kao Bui</p>
            <p className="text-base text-foreground/50">CEO of Company</p>
          </div>
        </div>
        <div
          ref={list}
          className="flex flex-col gap-space-4x px-space-base pt-[50vh]"
        >
          <div className="flex flex-col">
            <p className="text-md leading-none tracking-tighter uppercase opacity-50">
              01
            </p>
            <h3
              data-split="down"
              className="heading-style pb-space--1x text-2xl font-medium text-accent"
            >
              Senior Expertise
            </h3>
            <p data-fade className="max-w-[48ch] text-base leading-body">
              Our developers bring 15+ years building at some of the
              world&apos;s most respected tech companies.
            </p>
          </div>
          <div className="flex flex-col">
            <p className="text-md leading-none tracking-tighter uppercase opacity-50">
              02
            </p>
            <h3
              data-split="down"
              className="heading-style pb-space--1x text-2xl font-medium text-accent"
            >
              One team fullstack
            </h3>
            <p data-fade className="max-w-[48ch] text-base leading-body">
              Design, development, launch, even marketing — all under one roof.
              The people you talk to are the people who build your product, so
              nothing gets lost in a handoff.
            </p>
          </div>
          <div className="flex flex-col">
            <p className="text-md leading-none tracking-tighter uppercase opacity-50">
              03
            </p>
            <h3
              data-split="down"
              className="heading-style pb-space--1x text-2xl font-medium text-accent"
            >
              Driven by results
            </h3>
            <p data-fade className="max-w-[48ch] text-base leading-body">
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
