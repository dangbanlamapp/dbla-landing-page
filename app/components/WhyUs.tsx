"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger);

const navButton =
  "flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-foreground/20 transition-colors hover:border-accent hover:text-accent focus-visible:border-accent focus-visible:outline-none";

const TESTIMONIALS = [
  {
    quote:
      "Our developers have 15+ years building at some of the world's most respected tech companies. You get the caliber of talent.",
    name: "Kao Bui",
    role: "CEO of Company",
  },
  {
    quote:
      "They shipped in eight weeks what our last agency quoted six months for. The same people who scoped it were the ones writing the code.",
    name: "Marta Oyelaran",
    role: "Founder, Fieldnote",
  },
  {
    quote:
      "Design, build and launch came from one team, so nothing was lost in a handoff. Our conversion rate is up 40% since the rebuild.",
    name: "Daniel Reyes",
    role: "Head of Product, Kestrel",
  },
];

const SLIDE_SECONDS = 4;
const barTrack =
  "block h-[3px] w-full overflow-hidden rounded-full bg-foreground/15 transition-colors group-hover:bg-foreground/30 group-focus-visible:bg-foreground/30";
const barFill =
  "block h-full w-full origin-left scale-x-0 rounded-full bg-accent";

/**
 * One arrow, drawn pointing right. The previous control is this same glyph
 * rotated half a turn rather than a second path, so the two can never end up
 * different weights or lengths.
 *
 * aria-hidden because the label belongs on the button: a screen reader should
 * hear "Previous testimonial", not an unnamed graphic. currentColor is what
 * lets the hover on the button carry the icon with it.
 */
function NavArrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={`h-4 w-4 ${className ?? ""}`}
    >
      <path
        d="M4 12h16m0 0-6-6m6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function WhyUs() {
  const container = useRef<HTMLElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);

  // Which quote is showing. The single source of truth for all three of the
  // ways it can change — the timer running out, the arrows, and a bar being
  // clicked — so none of them needs to know about the others.
  const [index, setIndex] = useState(0);
  const slide = TESTIMONIALS[index];

  // The block that swaps, so the entrance tween has something to target that is
  // not the whole column (which the parallax below already owns).
  const quote = useRef<HTMLDivElement>(null);

  // The fills, in render order. Collected by ref rather than re-queried each
  // run because the progress tween needs the exact element for the active
  // slide, and a selector would depend on the row's DOM order staying the
  // array's order.
  const bars = useRef<(HTMLSpanElement | null)[]>([]);

  // The running progress tween, held outside the hook so the hover handlers can
  // reach it without re-running the hook — pausing through state would restart
  // the slide instead of holding it where it was.
  const progress = useRef<gsap.core.Tween | null>(null);
  const held = useRef(false);

  // The other reason the clock can be stopped: the section is not on screen.
  // Starts true because that is the safe guess — the section sits far below the
  // fold, and a carousel that waits one scroll too long is a great deal better
  // than one that has burned through every quote before anyone looks at it.
  const offscreen = useRef(true);

  // Same probe SmoothScroll uses, subscribed rather than read once so a reader
  // flipping the OS setting mid-visit stops the timer without a reload.
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Hold the timer while a pointer rests on the carousel or focus is somewhere
  // inside it — the reader is either reading the quote or aiming at a control,
  // and having it swap underneath them is the one thing an auto-advancing
  // carousel must not do. Pausing the tween rather than the index means the bar
  // keeps the progress it had and carries on from there.
  //
  // React's onFocus/onBlur are focusin/focusout, which bubble, so the arrows and
  // the three bar buttons inside are all covered by this one pair.
  const hold = () => {
    held.current = true;
    progress.current?.pause();
  };

  const release = () => {
    held.current = false;
    // Two independent reasons to be stopped, so releasing one must not restart
    // the clock while the other still holds.
    if (!offscreen.current) progress.current?.resume();
  };

  // The wrap. `+ TESTIMONIALS.length` before the modulo because JS `%` keeps
  // the sign of its left operand — a bare `-1 % 3` is `-1`, so stepping back
  // from the first slide would land on nothing rather than on the last.
  const go = (step: number) =>
    setIndex((i) => (i + step + TESTIMONIALS.length) % TESTIMONIALS.length);

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
              duration: 0.6,
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

      // The carousel's clock runs only while the section is on screen. Left
      // ungated, the three quotes cycle away in an empty viewport and a reader
      // arriving here finds the second bar already half spent — and a component
      // nobody is looking at re-renders every six seconds forever. The range is
      // the section's whole pass through the viewport, so "active" means "some
      // part of this is visible".
      //
      // It lives in this hook, not the carousel's: it must be created once, and
      // it reaches the current tween through the ref rather than through a
      // closure, which is exactly what that ref is for.
      const visibility = ScrollTrigger.create({
        trigger: container.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => {
          offscreen.current = !self.isActive;
          if (!self.isActive) progress.current?.pause();
          else if (!held.current) progress.current?.resume();
        },
      });

      // Read straight off the instance rather than waited for through onToggle:
      // a trigger that is already active when it initialises does not reliably
      // fire the callback, and this hook runs before the carousel's, so the
      // very first tween is created already knowing whether to start paused.
      offscreen.current = !visibility.isActive;
    },
    { scope: container },
  );

  // The carousel's clock, deliberately its own hook. It is the only animation
  // on this section that re-runs, and `dependencies` is what re-fires it on
  // every slide change; the entrance hook above must not be dragged along for
  // that ride, or its ScrollTriggers would be torn down and rebuilt six times
  // a minute.
  //
  // `revertOnUpdate` is load-bearing, not tidiness. @gsap/react defers its
  // cleanup to unmount whenever a dependency array is present (`deferCleanup`
  // in its source) — so without this flag the previous slide's tween would keep
  // running alongside the new one and fire its own onComplete, and the carousel
  // would advance faster with every turn until it flickered.
  useGSAP(
    () => {
      const active = bars.current[index];
      if (!active) return;

      // The whole row is redrawn from the index on every run rather than
      // nudged along: everything behind the active bar reads as spent,
      // everything ahead as untouched. That is what lets the back arrow and the
      // bar buttons jump to any slide — including backwards — without a
      // separate reset path for each. The set is registered in this hook's
      // context, so the revert above undoes it and this re-set happens in the
      // same layout effect: no paint sits between the two.
      bars.current.forEach((fill, i) => {
        if (fill) gsap.set(fill, { scaleX: i < index ? 1 : 0 });
      });

      // The swap itself. `from`, so the start value lands on init and there is
      // nothing to flash between React committing the new quote and the first
      // animated frame — the same reason the descriptions below use one.
      gsap.from(quote.current, {
        opacity: 0,
        y: 12,
        duration: 0.5,
        ease: "power2.out",
      });

      // Readers who asked for less motion get no timer and no crawling bar: the
      // active bar simply reads as full and the controls are the only way on.
      // An auto-advancing carousel is precisely the unrequested movement the
      // preference is about, so it is switched off rather than slowed down —
      // and unlike the scroll lock, nothing is withheld by doing so, every
      // quote is still reachable.
      if (reduced) {
        gsap.set(active, { scaleX: 1 });
        return;
      }

      // ease: "none" because the bar *is* the clock. Any curve and the fill
      // would misreport how much of the slide is left, which is the one job a
      // story bar has.
      const tween = gsap.to(active, {
        scaleX: 1,
        duration: SLIDE_SECONDS,
        ease: "none",
        // Functional update: this fires from GSAP's ticker, outside React's
        // render, so it reads the index it is handed rather than the one this
        // closure captured.
        onComplete: () => setIndex((i) => (i + 1) % TESTIMONIALS.length),
      });

      // Both flags survive the re-run; the tween they were paused on does not.
      // A pointer already resting on the block when the slide turned over would
      // otherwise find a live timer under it, and an advance that fires just as
      // the section leaves the viewport would restart the clock off screen.
      if (held.current || offscreen.current) tween.pause();

      progress.current = tween;
    },
    { scope: container, dependencies: [index, reduced], revertOnUpdate: true },
  );

  return (
    <section ref={container} id="why-us" className="relative">
      <div className="grid grid-cols-2 gap-space-4x py-[15vh] relative z-1">
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
          {/*
            The carousel: quote, progress row, arrows. They share a wrapper
            because the hold handlers belong to all three at once — a pointer on
            an arrow is as much "the reader is busy here" as one on the quote —
            and because the max-width lives here rather than on the paragraph,
            which is what makes the bars span exactly the column of text they
            are timing.
          */}
          <div
            role="group"
            aria-label="Testimonials"
            className="flex w-full max-w-[36ch] flex-col items-end text-lg"
            onMouseEnter={hold}
            onMouseLeave={release}
            onFocus={hold}
            onBlur={release}
          >
            {/*
              Only this block swaps, which is why the controls below sit outside
              it: nesting them here would replace them along with the slide they
              move. Keyed on the index so React rebuilds the paragraphs rather
              than patching new text into the old ones — that keeps the swap a
              clean remount under the entrance tween instead of a long quote and
              a short one sharing a half-updated DOM mid-tween.
            */}
            <div
              ref={quote}
              key={index}
              className="flex flex-col items-end py-space-2x"
            >
              <p className="pb-space-base text-right text-lg leading-body">
                {slide.quote}
              </p>
              <p className="heading-style text-md">{slide.name}</p>
              <p className="text-base text-foreground/50">{slide.role}</p>
            </div>

            {/*
              The story bars. Buttons, not decoration: they already say where
              the reader is, so letting them say where to go costs one onClick
              and gives the carousel a keyboard-reachable way to jump straight
              to a quote. flex-1 splits the row evenly, so the bars read as
              equal slices of the same clock.

              The fill is a child of the track rather than the track itself
              because the scaled element must not be the one drawing the empty
              state — scaling the track would take its background with it.
            */}
            <div className="flex w-1/2 items-center gap-space--2x pb-space-2x">
              {TESTIMONIALS.map((testimonial, i) => (
                <button
                  key={testimonial.name}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show testimonial ${i + 1} of ${TESTIMONIALS.length}`}
                  aria-current={i === index}
                  className="group flex-1 cursor-pointer py-space--3x focus-visible:outline-none"
                >
                  {/* The button's padding gives a 3px bar a hit target worth
                      aiming at; this span keeps that padding out of the bar's
                      own box. */}
                  <span className={barTrack}>
                    <span
                      ref={(el) => {
                        bars.current[i] = el;
                      }}
                      className={barFill}
                    />
                  </span>
                </button>
              ))}
            </div>

            {/* type="button" so these cannot submit if this ever lands inside a
                form. go() wraps in both directions, so neither arrow is ever a
                dead end. */}
            <div className="flex items-center gap-space--2x">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous testimonial"
                className={navButton}
              >
                <NavArrow className="rotate-180" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next testimonial"
                className={navButton}
              >
                <NavArrow />
              </button>
            </div>
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
      </div>
    </section>
  );
}
