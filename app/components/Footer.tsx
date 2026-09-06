"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import DashedCircle from "./DashedCircle";
import LocalTime from "./LocalTime";
// Shared with MenuPanel, which prints the same legal row inside the open menu.
import { LEGAL_LINKS, YEAR } from "./legal";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * The wordmark is inlined rather than pulled from public/DBLA.svg through
 * next/image, because the exported file paints its single path in #E1DCD1 —
 * literally --color-beige, i.e. the page background — so it rendered as a
 * beige shape on a beige ground and read as invisible, not transparent.
 *
 * Hard-coding a different hex in the .svg would fix the symptom and put a
 * colour outside the token system, where nothing about a theme change can
 * reach it. Inline + `fill="currentColor"` hands the colour back to Tailwind,
 * so it is set below with a real token class.
 *
 * It is a component and not a constant because the footer renders it twice, in
 * two different colours, and `currentColor` is what makes one markup serve
 * both — see the stack in Footer.
 *
 * width/height stay on the element alongside viewBox: that is what the browser
 * derives the intrinsic aspect ratio from, so `h-auto` has a ratio to resolve
 * against once `w-[90vw]` takes over the width — same no-reflow guarantee the
 * static next/image import gave.
 */
function Wordmark({ className }: { className?: string }) {
  return (
    <svg
      width="1264"
      height="344"
      viewBox="0 0 1264 344"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="DBLA"
      className={className}
    >
      <path
        d="M148 -1.16825e-05C268.333 -1.16825e-05 328.5 57.3333 328.5 172C328.5 286.667 268.333 344 148 344H-1V-1.16825e-05H148ZM109.5 261.5H146C192.333 261.5 215.5 236.667 215.5 187V157C215.5 107.333 192.333 82.5 146 82.5H109.5V261.5ZM552.16 -1.16825e-05C569.494 -1.16825e-05 585.327 3.66666 599.66 11C614.327 18 625.827 28 634.16 41C642.827 54 647.16 68.5 647.16 84.5C647.16 126.833 627.994 153.5 589.66 164.5V166.5C633.327 176.5 655.16 205.167 655.16 252.5C655.16 270.5 650.66 286.5 641.66 300.5C632.994 314.167 620.994 324.833 605.66 332.5C590.327 340.167 573.494 344 555.16 344H323.16V-1.16825e-05H552.16ZM433.66 134H509.66C516.993 134 522.993 131.5 527.66 126.5C532.66 121.167 535.16 114.667 535.16 107V102C535.16 94.6666 532.66 88.5 527.66 83.5C522.66 78.1667 516.66 75.5 509.66 75.5H433.66V134ZM433.66 264H517.66C524.993 264 530.993 261.5 535.66 256.5C540.66 251.167 543.16 244.667 543.16 237V232C543.16 224.333 540.66 218 535.66 213C530.993 207.667 524.993 205 517.66 205H433.66V264ZM647.32 -1.16825e-05H757.82V256H934.32V344H647.32V-1.16825e-05ZM1146.32 344L1131.82 295.5H1011.32L996.816 344H883.816L1009.32 -1.16825e-05H1137.82L1263.32 344H1146.32ZM1034.32 218.5H1108.82L1072.82 96H1070.82L1034.32 218.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * One wordmark, painted twice, with a circle deciding which one you see where:
 * orange underneath, beige on top clipped to the disc. Not two shapes butted
 * together — the beige copy is the *same* path at the *same* size and place,
 * so the letterforms can never drift apart and the colour change lands exactly
 * on the circle's edge, mid-glyph.
 *
 * Masking the top copy rather than knocking a hole in the orange one is what
 * keeps that true: an inverted mask on the base would put the seam under two
 * independent clips that both have to agree, instead of one.
 *
 * These are the only knobs, and the disc, the mask and the dashed rings all
 * read them, so nothing can fall out of register with the shape it is tracing.
 *
 * --circle-cy is the disc's CENTRE, measured up from the section's bottom
 * edge, and that is a deliberate re-anchoring. The knob used to be how far the
 * disc hung *below* the bottom edge, which can only describe a disc that does
 * hang below. A centred one does not, so in those terms it is a negative
 * number — and the note that used to sit here was explicitly about keeping
 * every operand positive so no `+ -10vh` had to be trusted to parse. Naming
 * the centre keeps both layouts positive and leaves the two derived offsets
 * reading as what they are: the disc's top is cy + r, its bottom cy - r.
 *
 * The two layouts:
 *
 *   lg and up   d 140vh, cy 30vh — the tuned desktop composition, untouched.
 *               30vh is exactly the old r - y (70vh - 40vh), so the disc, the
 *               mask and the rings all land on the pixel they always did.
 *
 *   below lg    d 100vh, cy 40vh — the same idea as the desktop, scaled to a
 *               tall screen: the disc hangs cy - r = 10vh past the bottom
 *               edge, just enough to read as anchored there rather than
 *               floating, and crowns at cy + r = 90vh, so it covers all but a
 *               sliver of the footer.
 *
 * A vh diameter is much wider than a portrait screen — 100vh is 932px against
 * a 430px phone — so the disc reads as a full-bleed band with a curved crown
 * rather than as a circle. That is what makes it cover, and it is also why the
 * two-tone wordmark does not survive down here: the seam exists because the
 * disc is NARROWER than the mark at the mark's own height, leaving the ends
 * orange, and a disc this wide is 279px of half-width where the mark has 258.
 * The mark therefore falls entirely inside the disc and renders solid beige.
 *
 * That is a real trade, not an oversight. Coverage and the seam pull in
 * opposite directions: hanging the disc lower widens it at the mark's band and
 * swallows the mark, and the arithmetic only reverses once the hang drops
 * under ~4vh, by which point the overhang is a few pixels and invisible
 * anyway. Coverage wins here; the lever if the seam is ever wanted back is a
 * SMALLER diameter (78vw put the disc at 324px against the mark's 387px), at
 * the cost of the disc no longer filling the footer.
 *
 * --wordmark-y is a PERCENTAGE, which fixes a genuine bug rather than a taste
 * call. The shift crops the bottom of the mark, the mark's height comes from
 * its own width (× 344/1264), and 10vh against that is only a sane crop while
 * the viewport is landscape: on an iPhone 10vh was 93px of a 105px-tall mark,
 * so 88% of the wordmark was cropped away and the logo had all but vanished.
 * A percentage resolves against the element's own box, so 23% is 23% of the
 * mark at every viewport — and at 1920x1080 it is 108px, the same pixel the
 * old 10vh produced.
 *
 * They live in a class string rather than a style object because the diameter
 * and the centre both need a breakpoint, and an inline style cannot carry one.
 */
const FOOTER_VARS =
  "[--circle-d:100vh] [--circle-r:calc(var(--circle-d)/2)] [--circle-cy:40vh] [--wordmark-y:23%] lg:[--circle-d:140vh] lg:[--circle-cy:30vh]";

/**
 * The masked layer is `inset-0`, i.e. the whole section, so `100%` here is the
 * section's height. The gradient is placed from the TOP and the disc from the
 * bottom, so `100% - cy` is the single conversion between the two — with the
 * centre named outright there is nothing left to derive.
 *
 * The stops are a hair apart rather than hard at 100% because a single-stop
 * radial edge aliases into a staircase; half a percent of the radius reads as
 * a clean curve without visibly softening the seam.
 */
const CIRCLE_MASK =
  "radial-gradient(circle var(--circle-r) at 50% calc(100% - var(--circle-cy)), #000 99.5%, transparent 100%)";

/**
 * Identical on both copies on purpose — same box, same alignment, so "same
 * size and exact position" is structural rather than two sets of numbers that
 * happen to match today. items-end is what sits them on the bottom edge now
 * that the layer is full-height.
 */
const LAYER = "absolute flex-col inset-0 flex items-center justify-end";

/**
 * The downward shift rides on the svg, not on LAYER, and that distinction is
 * load-bearing: a mask is resolved against its own element's box, so
 * translating the masked *layer* would carry the gradient down with it and
 * slide the seam off the disc, which does not move. Shifting the child leaves
 * every masking box where it was.
 *
 * `block` matters for the same reason it always did: an inline svg sits on the
 * text baseline and would add a descender's worth of gap under the mark.
 *
 * 120vw below lg is wider than the viewport ON PURPOSE — the mark is meant to
 * run off both edges rather than sit inside a margin the way the desktop's
 * 90vw does. It stays centred while doing so only because LAYER centres with
 * flex: `justify-center`/`items-center` split the overflow evenly, where auto
 * margins would hit the over-constrained case and pin the whole 120vw against
 * the left edge. The section's overflow-hidden is what turns the two ends into
 * a crop instead of horizontal scroll.
 */
const WORDMARK =
  "block h-auto w-[120vw] translate-y-[var(--wordmark-y)] lg:w-[90vw]";

/**
 * How far the footer sits below its resting place at the start of the reveal,
 * as a share of its own height, so it drifts up into place while main slides
 * off it. Percent rather than vh so it stays tied to the element GSAP is
 * moving.
 *
 * Safe up to 100 without opening a gap under main: at reveal progress p, main's
 * bottom edge is at (1 - p) * 100vh and the footer's top edge is at
 * SHIFT * (1 - p) vh, so the footer's top stays above the exposed strip for any
 * SHIFT below 100. It is the strip that would show the beige canvas otherwise.
 */
const REVEAL_SHIFT = 15;

export default function Footer() {
  const container = useRef<HTMLElement>(null);
  const runway = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      /**
       * A fixed element has no scroll position of its own — but ScrollTrigger
       * never needed one. The trigger and the thing being animated are
       * separate arguments, and only the *trigger* has to scroll. So the
       * runway, the one block whose scroll-through IS the reveal, drives a
       * tween on the fixed section.
       *
       * start/end are the same instants as triggering off the previous section
       * with "bottom bottom" / "bottom top": the runway's top edge and main's
       * bottom edge are the same line, since they are adjacent with no margin
       * between them. The runway is the safer handle of the two — Cta, the
       * last section in main, is pinned, so its own bottom is measured inside a
       * pin-spacer that moves whenever the pin re-measures. The runway is plain
       * static layout that cannot drift.
       *
       * So: start when the runway's top reaches the viewport bottom — main's
       * last pixel, the reveal begins — and end when it reaches the viewport
       * top, which is the document's maximum scroll and the moment main has
       * fully cleared. The tween spans exactly the reveal, no more.
       *
       * NO START VALUE IN THE MARKUP, and that is deliberate — it is the one
       * place this component departs from the house rule, because obeying the
       * rule here actively broke the tween.
       *
       * GSAP does not store a transform as the string you wrote. It reads the
       * *computed* matrix and decomposes it, and a matrix has no memory of
       * having been a percentage: `translateY(15%)` on an 824px-tall box comes
       * back as 123.667px, so GSAP records that as `y`, with `yPercent` still
       * 0. The tween's `from: { yPercent: 15 }` then stacks its own 15% on top
       * of that recorded y, and tweening yPercent to 0 only unwinds the half
       * GSAP considers its own — leaving the 123.667px baked in forever. The
       * symptom is a footer that finishes the reveal still sitting exactly
       * REVEAL_SHIFT low, permanently hiding the legal row behind the bottom
       * edge.
       *
       * A pre-hydration start value buys nothing here anyway: at load the
       * footer is a full viewport below the fold with main's opaque background
       * over it, and ScrollLock has forced the scroll to 0, so there is no
       * frame in which an un-tweened footer is visible. `fromTo` sets progress
       * 0 on its own the moment it is built.
       *
       * If a start value ever IS needed on this element, it has to be one GSAP
       * will read back as the same channel it tweens — `gsap.set(el, {
       * yPercent: REVEAL_SHIFT })` inside the useGSAP callback, not CSS. And
       * not a Tailwind class either: v4 compiles translate utilities to the
       * standalone `translate` property, which the spec applies BEFORE
       * `transform`, so it would stack rather than be overridden. (That trap
       * is live on the wordmarks' translate-y-[var(--wordmark-y)] — GSAP's own
       * output writes `translate: none` to clear it.)
       */
      gsap.fromTo(
        container.current,
        { yPercent: REVEAL_SHIFT },
        {
          yPercent: 0,
          // Linear, and scrubbed 1:1 rather than the eased `scrub: 1` used
          // elsewhere in the project. This one is chasing an edge — main's
          // bottom — that tracks the scrollbar exactly, and any smoothing puts
          // the footer's drift out of step with the thing uncovering it.
          ease: "none",
          scrollTrigger: {
            trigger: runway.current,
            start: "top bottom",
            end: "top top",
            scrub: true,
            invalidateOnRefresh: true,
          },
        },
      );
    },
    { scope: container },
  );

  return (
    <>
      {/*
        The runway. The footer below is fixed, so it is out of flow and adds
        nothing to the document height — without this block the page would end
        at main's last pixel and there would be no scroll left to perform the
        reveal with. This is the scroll distance the reveal takes, so it
        matches the footer's own h-screen: main clears the viewport exactly as
        the last of the footer comes out.

        It has to live outside main and stay transparent — that is the window
        the footer is seen through. Anything opaque here, or moving this inside
        main, and it is main's background sliding past a hidden footer.

        aria-hidden on an empty box is belt and braces, but it is a real
        landmark-sized hole in the page otherwise.
      */}
      <div ref={runway} aria-hidden className="h-screen" />

      {/*
        Fixed, not scrolled: the footer never moves. main slides up off it and
        uncovers it from the bottom edge upward, so what reads as the footer
        rising into view is really the sheet above it being pulled away.

        -z-1 puts it under main (which carries `relative z-1` and the opaque
        background that does the covering). Same idiom HeaderBg's backdrop
        uses. Nothing paints over it from below: html has no background of its
        own, so body's beige is propagated to the canvas, which is painted
        before any negative-z-index content.

        This survives Lenis only because SmoothScroll runs it in `root` mode,
        where it drives a genuine native window scroll. A transform-based
        smooth-scroll rig moves the content in a wrapper instead, and every
        `position: fixed` child of it silently becomes a scrolling one — the
        footer would ride up with the page and the effect would vanish. Worth
        remembering if the Lenis config is ever revisited.

        overflow-hidden earns its keep four times over now — it clips the disc
        wherever it runs past an edge (below the bottom at lg, where cy - r is
        -40vh; past both sides below it, where an 80vh diameter is wider than a
        portrait screen), trims the wordmark now that it is a full 100vw,
        turns the --wordmark-y overhang into a crop, and keeps a fixed,
        viewport-sized box from contributing scrollable overflow of its own.
      */}
      <section
        id="footer"
        ref={container}
        className={`${FOOTER_VARS} fixed bottom-0 left-0 -z-1 h-screen w-full overflow-hidden`}
      >
        <div
          id="footer-circle"
          style={{
            width: "var(--circle-d)",
            height: "var(--circle-d)",
            bottom: "calc(var(--circle-cy) - var(--circle-r))",
          }}
          className="absolute left-1/2 -translate-x-1/2 rounded-full bg-accent"
        />

        <div className={LAYER}>
          <Wordmark className={`${WORDMARK} text-accent`} />
        </div>
        {/* mask-repeat defaults to `repeat`, and the gradient is sized to this
        box — so once the shifted svg pokes out below, the tile underneath
        would paint a second circle's worth of beige into the overhang. The
        section's clip hides it today; no-repeat means it is not waiting for
        someone to raise --wordmark-y past the crop. */}
        <div
          className={LAYER}
          style={{
            WebkitMaskImage: CIRCLE_MASK,
            maskImage: CIRCLE_MASK,
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
          }}
        >
          {/*
            A zero-height line rather than a 200vh box, holding the rings'
            shared centre. It sits exactly r above the disc's own centre — the
            relationship the old `inset-0 top-[-100vh]` expressed as a viewport
            unit that only happened to equal it while the disc was 140vh at
            30vh (30 + 70 = 100vh, the section's top edge). Written against the
            disc, it survives both the diameter and the centre moving at lg.

            The children are `absolute inset-0 flex items-center justify-center`,
            so a zero-height parent centres each ring on the line and lets it
            overflow evenly both ways — the same property that centres an
            oversized box where auto margins cannot.

            3/7, 6/7 and 9/7 of the diameter are the 60vh, 120vh and 180vh this
            used to name, exactly, at a 140vh disc.
          */}
          <div
            style={{ bottom: "calc(var(--circle-cy) + var(--circle-r))" }}
            className="absolute inset-x-0 h-0"
          >
            <DashedCircle
              dots="vertical"
              spin={0}
              size="calc(var(--circle-d)*3/7)"
            />
            <DashedCircle
              dots="vertical"
              spin={0}
              size="calc(var(--circle-d)*6/7)"
            />
            <DashedCircle
              dots="vertical"
              spin={0}
              size="calc(var(--circle-d)*9/7)"
            />
          </div>

          <div id="cross-lines" className="absolute inset-0">
            <div
              id="y-line"

              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="h-screen w-px bg-black opacity-10"></div>
            </div>
          </div>

          <Wordmark className={`${WORDMARK} text-background`} />
        </div>

        <div className="absolute inset-x-0 bottom-0 m-auto flex w-[90vw] items-end justify-between gap-space--2x py-space--2x text-xs text-black lg:gap-space-2x lg:py-space-base lg:text-sm">
          {/* Not <p>: this is a lone piece of metadata, not prose. */}
          <span className="flex-1 text-left">&copy; {YEAR} DBLA</span>
          <p className="flex-1 text-center">
            Site by{" "}
            <a className="hover:underline" href="www.kaobui.com">
              Kaobui
            </a>
          </p>
          <nav aria-label="Legal" className="flex-1">
            <ul className="flex flex-col items-end gap-space--3x lg:flex-row lg:justify-end lg:gap-space-2x">
              {LEGAL_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <a href={href} className="hover:underline">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="relative m-auto flex h-full w-[90vw] flex-col justify-center gap-space-4x py-space-4x pb-space-6x lg:justify-start lg:gap-[16vh] lg:py-space-6x">
          <div className="flex w-full flex-col items-center gap-space--1x text-center text-black lg:flex-row lg:items-start lg:gap-0">
            <p className="heading-style text-sm lg:flex-1 lg:text-left lg:text-base">
              Hochiminh City, Vietnam <br />
              <LocalTime timeZone="Asia/Ho_Chi_Minh" className="opacity-50" />
            </p>
            <p className="heading-style text-sm lg:flex-1 lg:text-base">
              Working Worldwide.
            </p>
            <p className="heading-style text-sm lg:flex-1 lg:text-right lg:text-base">
              Paris, France <br />
              <LocalTime timeZone="Europe/Paris" className="opacity-50" />
            </p>{" "}
          </div>
          <div className="flex w-full flex-col items-center gap-space-3x lg:flex-row lg:items-end lg:gap-0">
            <nav className="text-base font-medium uppercase lg:flex-1 lg:text-md">
              <ul className="text-center lg:text-left">
                <li>home</li>
                <li>about</li>
                <li>services</li>
                <li>contact</li>
              </ul>
            </nav>
            <div className="flex flex-col items-center gap-space--1x">
              <p className="heading-style text-center text-xl lg:text-3xl">
                bring your ideas to life
              </p>
              <a
                className="rounded-md bg-background px-space-2x py-space--2x text-base font-bold tracking-tighter uppercase lg:text-md"
                href=""
              >
                get in touch
              </a>
              <a className="text-base text-black lg:text-md" href="">
                contact@dbla.com
              </a>
            </div>
            <ul className="text-center text-base font-medium uppercase lg:flex-1 lg:text-right lg:text-md">
              <li>instagram</li>
              <li>tiktok</li>
              <li>linkedIn</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
