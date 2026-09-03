"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import NumberFlow from "@number-flow/react";
import Image, { type StaticImageData } from "next/image";
import egguApp from "@/public/eggu-app.jpg";
import rutineMockup from "@/public/rutine-mockup.jpg";
import tgfMockup from "@/public/tgf-mockup.jpg";
import adminlessMockup from "@/public/adminless-mockup.jpg";
import ProjectBlock, { type ProjectCopy } from "./ProjectBlock";
import DashedCircle from "./DashedCircle";
import ProgressRing from "./ProgressRing";

gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger);

// How long the section stays pinned, in viewports of scrolling — 3 is the 300vh
// it holds for. Kept as a multiplier of window.innerHeight rather than a fixed
// pixel number so a resize (or a mobile URL bar collapsing) re-measures against
// the new viewport: the trigger's end is a function and invalidateOnRefresh is
// what makes ScrollTrigger call it again.
const PIN_VIEWPORTS = 3;

// Content drives the schedule. The projects split the pin evenly between them
// (see SLICE below), so adding a fifth entry here re-divides the same 300vh
// rather than needing a single position rewritten — the same contract SERVICES
// has with the Services pin.
//
// DOM order is stacking order, and stacking order is scroll order: each image
// grows on top of the one before it, so the array reads top-down as the
// sequence a reader scrolls through.
type Project = ProjectCopy & {
  src: StaticImageData;
  alt: string;
};

const PROJECTS: Project[] = [
  {
    name: "Ru:tine24",
    type: "mobile app",
    blurb: "A mobile app that bring experiences to coffee shop chain",
    src: rutineMockup,
    alt: "Ru:tine24 app screens",
  },
  {
    name: "Eggu",
    type: "mobile app",
    blurb: "PLACEHOLDER — what Eggu is and who it was built for",
    src: egguApp,
    alt: "The Eggu app running on a phone",
  },
  {
    name: "TGF",
    type: "website",
    blurb: "PLACEHOLDER — what TGF is and who it was built for",
    src: tgfMockup,
    alt: "The TGF site on a laptop",
  },
  {
    name: "Adminless",
    type: "web app",
    blurb: "PLACEHOLDER — what Adminless is and who it was built for",
    src: adminlessMockup,
    alt: "The Adminless dashboard on a laptop",
  },
];

// The pin is cut into one slice per project PLUS a closing one, and that "+ 1"
// is the whole reason this is a division rather than four hand-placed numbers:
// every position downstream is a multiple of SLICE, so buying the section an
// exit costs one character here and re-times the entire sequence to fit.
//
// At 3 viewports across 4 projects and a teardown that is 0.6 each.
const SLICE = PIN_VIEWPORTS / (PROJECTS.length + 1);

// An image's slice is split in two: it is revealed over the first half, then
// drifts over the second. REVEAL_HALF is that midpoint, and both halves read
// from it, so the reveal and the drift cannot be retimed independently and
// leave a gap or an overlap between them.
const REVEAL_HALF = SLICE / 2;

// How far each of the four wedges travels. One quarter turn, and the number the
// whole reveal is built around — four wedges of exactly 90deg, opening at once
// from the four axes, tile the circle with nothing left over.
//
// It is not the lever for closing a seam between corners. The mask already
// overlaps its neighbour by --sweep-feather for exactly that reason (see
// .quadrant-reveal), so a wedge that ends short of a clean boundary is a
// feather problem; raising this instead would have every corner reveal a slice
// of the next one's territory a full beat early.
const QUADRANT = 90;

// How far past its resting size the PICTURE creeps while it waits to be
// covered. It is the <Image> inside the mask that moves, not the masked layer:
// the reveal has to end on a circle that stays put, so the frame and the four
// wedge boundaries are fixed and only the content behind them drifts. Small on
// purpose — the frame clips at the circle, so anything past this is spent
// outside the visible area, and the point is a sense of the image still being
// alive rather than a second entrance.
const ZOOM_SCALE = 1.1;

// The copy's share of a slice, in and out. The remainder is hold — at 0.35 and
// 0.25 the block stands still for the middle 40% of its project, which is what
// keeps the column from reading as permanently in motion across four
// back-to-back slices. Fractions of SLICE rather than absolute times, so the
// rhythm survives a change to PIN_VIEWPORTS or to the number of projects.
const TEXT_ENTER = SLICE * 0.35;
const TEXT_EXIT = SLICE * 0.25;

// Per-line offset, applied to entrance and exit alike. Small next to TEXT_ENTER
// on purpose: three lines should land as one gesture, not as a queue.
const TEXT_STAGGER = 0.06;

// Where the projects end and the closing slice begins: the last image has
// finished drifting, the ring has closed, and nothing is left to introduce.
// Everything about the teardown hangs off this one position.
const TEARDOWN_AT = PROJECTS.length * SLICE;

// When the section furniture leaves. Block i exits at i * SLICE + (SLICE -
// TEXT_EXIT), so for the last i that is exactly this — the heading and the
// counter ride out on the last project's beat and land precisely as the
// teardown begins, leaving the closing slice to the circles alone.
const OUTRO_AT = TEARDOWN_AT - TEXT_EXIT;

// What the frame collapses to over the closing slice. Not zero: the circle is
// the thing the whole section is built around, so it draws back rather than
// disappearing, and the rings going to nothing around it read as the section
// closing in on its subject. Drawing back is also what BUYS the row below — at
// full size four circles could never sit side by side.
//
// A ceiling rather than the final value; see rowScale().
const FRAME_EXIT_SCALE = 0.5;

// Centre-to-centre spacing of the closing row, as a percentage of one circle's
// diameter. 100 would have neighbours meeting at a single point; the extra 10
// is the gap, and expressing it in diameters rather than pixels is what keeps
// that gap proportional when rowScale() shrinks the circles on a narrow window.
const ROW_STEP = 110;

// The row's share of the viewport width. The remainder is the margin the outer
// two circles keep from the edges — they are the section's last frame, so they
// should not look wedged in.
const ROW_FIT = 0.9;

// The frame's height as a fraction of the viewport, mirroring the h-[75vh] in
// the markup. Written down here because rowScale() has to know how wide a
// circle is to know whether four of them fit.
const FRAME_VH = 0.75;

/**
 * How far the frame draws back during the teardown — FRAME_EXIT_SCALE, unless
 * the row of circles it produces would not fit across the viewport.
 *
 * The row is PROJECTS.length * ROW_STEP diameters wide, and a diameter is
 * FRAME_VH viewport heights, so its width is driven entirely by the window's
 * aspect ratio. At 0.5 that is 165vh of row: comfortable at 16:9, flush at 3:2,
 * over the edge at 4:3. Rather than pick a scale small enough for the worst
 * case and leave widescreen looking timid, the fit is solved per viewport.
 *
 * Called as a function-based tween value so invalidateOnRefresh re-runs it on
 * resize, the same contract the pin's `end` has — the same reason neither is a
 * fixed number.
 */
const rowScale = () =>
  Math.min(
    FRAME_EXIT_SCALE,
    (window.innerWidth * ROW_FIT) /
      (window.innerHeight * FRAME_VH * PROJECTS.length * (ROW_STEP / 100)),
  );

// How far into a project's slice the counter ticks over to it, as a fraction of
// the slice. The number names the image ARRIVING, not the one that has landed,
// so this sits near the top of the slice rather than at the entrance's end.
//
// It has to stay above 0. At exactly 0 the step for project 0 falls on timeline
// position 0, so the counter would already read "01" the instant the pin
// engages and "00" would never be seen; a small offset keeps that first state
// real without making the tick feel late.
const STEP_AT = 0.15;

// NumberFlow's own clock, and the reason the count reads as late out of the
// box: it ships a 900ms transform on a spring-shaped linear() ramp, which is a
// long tail to hang off a scroll position that has already moved on. These
// bring it to about the length of a UI transition and put the movement at the
// FRONT of it — cubic-bezier(0.16, 1, 0.3, 1) covers most of the distance in
// the first third, so the digit reads as arrived well before it fully settles.
//
// Unlike every other number in this section these are wall-clock milliseconds,
// not timeline units: NumberFlow animates off a prop change, so once started
// the slide runs on its own clock and does not stretch with PIN_VIEWPORTS.
const COUNTER_TRANSFORM: EffectTiming = {
  duration: 400,
  easing: "cubic-bezier(0.16, 1, 0.3, 1)",
};
const COUNTER_OPACITY: EffectTiming = { duration: 250, easing: "ease-out" };

export default function Projects() {
  const container = useRef<HTMLElement>(null);

  // How many project entrances have completed — 0 through PROJECTS.length, so
  // "00" is a real state and not a placeholder. This is the one thing in the
  // section that has to cross from the timeline back into React, because
  // NumberFlow animates off a prop change rather than off a scrub position.
  const [landed, setLanded] = useState(0);

  // The last value actually written to state. See the guard in onUpdate.
  const shown = useRef(0);

  useGSAP(
    () => {
      // ── The pin ────────────────────────────────────────────────────────────
      // One trigger both pins the section and scrubs this timeline, following
      // Services: a single set of start/end measurements to refresh, and
      // anything added later is positioned against the same clock instead of
      // re-deriving absolute scroll maths of its own.
      //
      // It stays separate from the entrance below — the two cover different
      // runs of scroll (the entrance ends exactly where this starts), and the
      // entrance is rebuilt from scratch on every autoSplit re-split, which
      // would take the pin down with it.
      //
      // Pin spacing stays on (the default) — this is the last section, so
      // nothing below can supply the scroll distance the pin consumes and the
      // spacer has to.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container.current,
          start: "top top",
          end: () => "+=" + window.innerHeight * PIN_VIEWPORTS,
          pin: true,
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      // The timeline's unit of time is one viewport of scrolling, so position 0
      // is the moment the pin engages and PIN_VIEWPORTS is the moment it
      // releases. This empty spacer nails the duration there no matter what is
      // added later — without it the timeline is only as long as its longest
      // child, and every viewport-to-time mapping would silently rescale the
      // next time a tween is added or removed.
      tl.to({}, { duration: PIN_VIEWPORTS }, 0);

      // ── The progress ring ──────────────────────────────────────────────────
      // It spans the project slices from position 0, so the drawn fraction IS
      // the fraction of the PROJECTS scrolled — the ring measures the sequence
      // it sits beside, not the pin. It closes exactly on TEARDOWN_AT, which is
      // what lets the closing slice scale it away without ever shrinking an
      // unfinished dial.
      //
      // ease "none", for the same reason Services scrubs linearly — any other
      // curve makes the ring run ahead of or behind the scrollbar, which reads
      // as lag rather than as easing.
      tl.to(
        "[data-progress-arc]",
        { strokeDashoffset: 0, duration: TEARDOWN_AT, ease: "none" },
        0,
      );

      // ── The project images ─────────────────────────────────────────────────
      // A stack: every image occupies the same circular frame, at rest and at
      // full size the whole time, and is WIPED IN over its own slice on top of
      // whatever is already there. There is no exit tween anywhere below, and
      // that is the mechanism rather than an omission — an image is never
      // dismissed, it is simply covered by the next one, so the stack only ever
      // gains layers. A finished wipe is a fully opaque circle, which is what
      // lets the next one cover it as completely as a scale-up used to.
      //
      // Read in DOM order, which the markup keys to PROJECTS order, so index i
      // is both the stacking level and the slice number. That is what keeps
      // "the next one starts where the last one ended" out of the code: it
      // falls out of i * SLICE.
      //
      // The reveal is a conic wipe cut into quadrants — see .quadrant-reveal in
      // globals.css for the mask itself. Four wedges, one per corner, all
      // opening clockwise from their own axis at the same moment, so the circle
      // closes as a four-armed pinwheel rather than as one hand going round.
      // Four separate properties rather than one shared angle: they happen to
      // be given identical timing today, and holding them apart is what lets a
      // corner be staggered or eased on its own later without touching the mask.
      //
      // ease "none" is the point of the whole beat. This is angular travel, and
      // a clock hand that speeds up or slows down does not read as easing — it
      // reads as the hand slipping. (The old scale entrance used expoScale for
      // exactly the opposite reason: scale IS perceptually non-linear and needs
      // the correction. Angle does not.)
      //
      // Two beats per slice, and the second is the drift: the mask is finished,
      // so the frame and the four wedge boundaries stand still, and it is the
      // picture BEHIND them that keeps creeping on power3.out. That is why the
      // zoom targets [data-project-photo] and not the masked layer — scaling
      // the layer would drag the revealed circle with it. It reads as a hold
      // that has not quite stopped, so the next image's wipe lands against
      // something still moving rather than against a frozen frame.
      //
      // fromTo on both, not from or to: the layer ships unrevealed and the
      // photo unscaled (the no-SSR-flash rule), so a plain `from` would read
      // those resting values as the END state and animate 0 -> 0. A plain `to`
      // would be worse here than it was for the old drift — invalidateOnRefresh
      // re-records a `to` tween's start from wherever the section happens to be
      // sitting, and a refresh landing mid-pin would bake a half-open wedge in
      // as the start of the sweep.
      gsap.utils
        .toArray<HTMLElement>("[data-project-image]", container.current)
        .forEach((layer, i) => {
          const at = i * SLICE;
          const open = QUADRANT + "deg";

          tl.fromTo(
            layer,
            {
              "--sweep-0": "0deg",
              "--sweep-1": "0deg",
              "--sweep-2": "0deg",
              "--sweep-3": "0deg",
            },
            {
              "--sweep-0": open,
              "--sweep-1": open,
              "--sweep-2": open,
              "--sweep-3": open,
              duration: REVEAL_HALF,
              ease: "power4.inOut",
            },
            at,
          ).fromTo(
            layer.querySelector("[data-project-photo]"),
            { scale: 1 },
            { scale: ZOOM_SCALE, duration: SLICE, ease: "power3.out" },
            at,
          );
        });

      // ── The project counter ────────────────────────────────────────────────
      // The number names the image ARRIVING, so it ticks at (i + STEP_AT) *
      // SLICE — just inside the top of that project's slice, while its image is
      // still growing. Ticking at the end of the entrance instead reads as
      // late: by then the image has already announced the change, and the digit
      // is only confirming something the reader watched happen.
      //
      // Built from SLICE, so the count stays welded to the stack it is counting
      // and the two re-divide together when PIN_VIEWPORTS or PROJECTS changes.
      //
      // Derived from tl.time() on every update rather than incremented by a
      // callback per step. A scrubbed timeline can cross half the pin in a
      // single frame and runs backwards as readily as forwards, so anything
      // counting events would drop steps or double-count; this is a pure
      // function of timeline position, like everything else in the section —
      // whatever frame you land on, the number is right for it.
      const clampIndex = gsap.utils.clamp(0, PROJECTS.length);

      tl.eventCallback("onUpdate", () => {
        const next = clampIndex(Math.floor(tl.time() / SLICE - STEP_AT) + 1);

        // NumberFlow starts an animation on every value change, and React only
        // bails out of a same-value setState after re-entering the component —
        // at scrub rates that is sixty wasted renders a second. Holding the
        // last written value in a ref means state is touched only on an actual
        // step.
        if (next !== shown.current) {
          shown.current = next;
          setLanded(next);
        }
      });

      // The counter leaves with the last project, in the same direction the
      // heading's lines take (positive yPercent is downward, matching a
      // data-split="up" element retreating through the mask edge it arrived
      // from). It moves as a whole rather than as split lines: NumberFlow owns
      // a shadow DOM of its own and runs its own vertical digit animation, so
      // splitting it — or clipping it in a mask tight enough to read as one —
      // would cut into the roll it does on every step.
      //
      // A plain `to`, so it records its start from wherever the layout leaves
      // it and no resting value is written down twice.
      tl.to(
        "[data-counter]",
        {
          yPercent: 100,
          autoAlpha: 0,
          duration: TEXT_EXIT,
          ease: "power3.in",
        },
        OUTRO_AT,
      );

      // ── The teardown ───────────────────────────────────────────────────────
      // The closing slice, and the only stretch of the pin with no project in
      // it. The rings collapse to nothing while the frame draws back and the
      // stack fans out into a row, so the section reads as one movement that
      // resolves into a contact sheet of everything just shown, rather than as
      // four things independently leaving.
      //
      // One duration and one ease across all of it, from one position: this is
      // a single gesture, and giving each part its own timing is how a gesture
      // turns into several animations that happen to overlap. power3.inOut so
      // the collapse eases out of the hold that precedes it and settles rather
      // than slamming into the end of the pin.
      //
      // Plain `to` tweens: each records its start from wherever the section
      // actually is when the teardown begins, so the resting values — including
      // the last photo's ZOOM_SCALE — are never written down a second time.
      tl.to(
        ["#projects-rings", "#projects-progress"],
        { scale: 0, duration: SLICE, ease: "power3.inOut" },
        TEARDOWN_AT,
      )
        .to(
          "[data-project-frame]",
          {
            scale: rowScale,
            duration: SLICE,
            ease: "power3.inOut",
          },
          TEARDOWN_AT,
        )
        // ── The row ──────────────────────────────────────────────────────────
        // The three finished images have been sitting under the fourth this
        // whole time, each a completed circle — nothing is created here, the
        // stack is simply dealt out. They are below the last project in DOM
        // order, so they slide out from BEHIND it rather than across it.
        //
        // xPercent, not x, and that is what keeps the pixel maths out of this:
        // a percentage is of the layer's own width, the layer is the frame's
        // box, and the frame is square — so 100 is exactly one diameter, at any
        // viewport, and it rides the frame's own scale down for free. All the
        // responsive work is already done inside rowScale().
        //
        // The offsets are centred on the middle of the row rather than on any
        // one image, so the group lands on the same centre line as the crosshair
        // and the rings it replaces. With four projects that is -165, -55, +55,
        // +165 — the last image included, shifting half a step right, because a
        // row of four has no middle to hold.
        //
        // No stagger. Equal duration over unequal distance already means the
        // outer circles travel faster and all four arrive together, which reads
        // as one hand dealing them out; staggering would turn it into a queue.
        .to(
          "[data-project-image]",
          {
            xPercent: (i: number) => (i - (PROJECTS.length - 1) / 2) * ROW_STEP,
            duration: SLICE,
            ease: "power3.inOut",
          },
          TEARDOWN_AT,
        )
        // The orange goes with them. It is the zero state and has no job left
        // by now, and once the circles spread there is a lens of bare frame
        // showing between the middle two — the point where they come closest
        // without meeting. Fading the fill rather than the frame is the whole
        // reason it is a node of its own: autoAlpha on [data-project-frame]
        // would take the four images with it.
        .to(
          "[data-frame-fill]",
          { autoAlpha: 0, duration: SLICE, ease: "power3.inOut" },
          TEARDOWN_AT,
        );

      // ── The project copy ───────────────────────────────────────────────────
      /**
       * A masked line reveal plus its mirrored exit, as one unit — the same
       * helper Services uses, and for the same reason.
       *
       * The pair has to be built inside onSplit and returned together:
       * autoSplit re-splits on font load and on resize, and GSAP kills whatever
       * onSplit returned before doing so. Returning a timeline rather than a
       * tween is what lets the exit be cleaned up too — killing it lifts it out
       * of its parent, and the next onSplit adds a replacement at the same
       * position. Return only the entrance and the exit is left pointing at
       * line elements that no longer exist.
       */
      const splitInOut = (
        el: HTMLElement,
        parent: gsap.core.Timeline,
        at: number,
        exitAt: number,
      ) => {
        const yPercent = el.dataset.split === "down" ? -150 : 150;

        SplitText.create(el, {
          type: "lines",
          mask: "lines",
          // Same descender fix as the section heading below.
          linesClass: "pb-[0.15em]",
          autoSplit: true,
          onSplit: (self) => {
            const lines = gsap.timeline();

            lines.from(
              self.lines,
              {
                yPercent,
                duration: TEXT_ENTER,
                ease: "power3.out",
                stagger: TEXT_STAGGER,
              },
              0,
            );

            // The mirror: the SAME yPercent, so each line retreats through the
            // edge of the mask it arrived from rather than carrying on past it.
            // from: "end" reverses the stagger order too, so the exit reads as
            // the entrance rewound.
            lines.to(
              self.lines,
              {
                yPercent,
                duration: TEXT_EXIT,
                ease: "power3.in",
                stagger: { each: TEXT_STAGGER, from: "end" },
              },
              exitAt - at,
            );

            parent.add(lines, at);
            return lines;
          },
        });
      };

      // One nested timeline per block, placed on the master at its slice. The
      // internal rhythm is written once here and the master only decides WHEN,
      // so a block cannot be retimed into its neighbour's slice by accident.
      //
      // Block i covers exactly slice i — it enters as its image starts growing
      // and is gone by the moment the next image begins, so the copy turns over
      // on the same beat as the picture. The first block sits at position 0,
      // which is what leaves the column empty until the first image arrives.
      gsap.utils
        .toArray<HTMLElement>("[data-project-block]", container.current)
        .forEach((block, i) => {
          const btl = gsap.timeline();

          // The same spacer as the master, for the same reason: autoSplit
          // removes and re-adds the line tweens above, and without a fixed
          // length the block would rescale under itself and drift out of its
          // slice.
          btl.to({}, { duration: SLICE }, 0);

          const exitAt = SLICE - TEXT_EXIT;

          // fromTo, not from — the block ships invisible so the four do not
          // pile up before hydration, and a plain from would read that as the
          // end state and animate 0 -> 0. autoAlpha rather than opacity: it
          // parks visibility: hidden at zero, keeping the three inactive blocks
          // out of hit-testing and out of the accessibility tree instead of
          // leaving them stacked invisibly over the live one.
          btl.fromTo(
            block,
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: TEXT_ENTER, ease: "power2.out" },
            0,
          );
          btl.to(
            block,
            { autoAlpha: 0, duration: TEXT_EXIT, ease: "power2.in" },
            exitAt,
          );

          // Type "up", name and blurb "down" — see ProjectBlock.
          gsap.utils
            .toArray<HTMLElement>("[data-split]", block)
            .forEach((el) => splitInOut(el, btl, 0, exitAt));

          tl.add(btl, i * SLICE);
        });

      // ── The section heading ────────────────────────────────────────────────
      // Same contract as Hero and Intro: data-split declares which way the
      // lines travel, so the direction lives in the markup next to the copy.
      //
      // Scoped to #projects-heading, because the project blocks above carry the
      // very same attribute — an unscoped query would sweep all four of them
      // into the heading's entrance and animate them a second time.
      const blocks = gsap.utils.toArray<HTMLElement>(
        "#projects-heading [data-split]",
        container.current,
      );

      blocks.forEach((block) => {
        const yPercent = block.dataset.split === "down" ? -150 : 150;

        // The heading is the one element in the section whose entrance and exit
        // are driven by DIFFERENT clocks: it arrives on its own pre-pin trigger
        // (below) and leaves on the master pin timeline at OUTRO_AT. That rules
        // out the splitInOut pattern used for the project blocks, where both
        // halves share one returned timeline.
        //
        // SplitText keeps exactly one animation per split — whatever onSplit
        // returns — and reverts it before re-splitting. The entrance claims that
        // slot because it owns a ScrollTrigger that has to go down with it, so
        // the exit is held here and killed from onRevert instead. Killing it
        // also lifts it out of the master timeline, and the next onSplit adds a
        // replacement at the same position.
        let exit: gsap.core.Timeline | undefined;

        // autoSplit re-splits on font load / resize, so onSplit holds the tween
        // and returning it lets GSAP kill it — and the ScrollTrigger built with
        // it — before each re-split.
        SplitText.create(block, {
          type: "lines",
          mask: "lines",
          // The mask is sized to the line box, and at leading-heading (0.75)
          // that box stops above the descenders — the "j" in "projects" gets
          // shaved off. Padding the line, not the h2, is what fixes it: the
          // padding grows the box the mask is cut from. In em so it tracks the
          // font size through the type scale.
          linesClass: "pb-[0.15em]",
          autoSplit: true,
          onRevert: () => {
            exit?.kill();
            exit = undefined;
          },
          onSplit: (self) => {
            // The mirror of the entrance below: the SAME yPercent, so the lines
            // retreat through the edge of the mask they arrived from rather
            // than carrying on past it, and from: "end" reverses the stagger so
            // the exit reads as the entrance rewound. Same shape as splitInOut,
            // just parented to the master by hand.
            exit = gsap.timeline();
            exit.to(self.lines, {
              yPercent,
              duration: TEXT_EXIT,
              ease: "power3.in",
              stagger: { each: TEXT_STAGGER, from: "end" },
            });
            tl.add(exit, OUTRO_AT);

            return gsap.from(self.lines, {
              yPercent,
              ease: "none",
              stagger: 0.12,
              // The section itself is the trigger, not the heading: the lines
              // arrive as the section climbs the last half of the viewport,
              // which is a fixed run of scroll no matter where in the layout
              // the h2 happens to sit.
              //
              // ease "none" because this is scrubbed — the lines track the
              // scrollbar exactly, and any other curve reads as scroll lag.
              scrollTrigger: {
                trigger: container.current,
                start: "top 50%",
                end: "top top",
                scrub: true,
              },
            });
          },
        });
      });
    },
    { scope: container },
  );

  return (
    // overflow-hidden is load-bearing now, not tidiness: the teardown throws
    // the four layers well outside the centre column, and a pinned section is
    // position: fixed — transformed children hanging off it can extend the
    // document's horizontal scroll area. It is also what the crosshair below
    // has always assumed was trimming its oversized vmax rules.
    <section id="projects" ref={container} className="relative h-screen">
      <div className="flex h-full justify-center gap-space-base">
        <div className="flex flex-1 flex-col items-end">
          <div
            id="projects-heading"
            className="flex flex-1 items-end justify-end p-space-base"
          >
            <h2
              data-split="up"
              className="heading-style text-right text-4xl leading-heading"
            >
              our <br /> projects
            </h2>
          </div>
          <div className="flex-1 p-space-base">
            {/*
              minimumIntegerDigits pads to "00".."04", which keeps the digit
              count — and so the width — fixed for every value the counter can
              hold, so the slide never shoves the column around.

              `trend` is left at its default, which reads the direction off the
              value change: the digits roll up on the way down the page and back
              down on the way up, matching the scrub instead of always spinning
              one way. respectMotionPreference is on by default too, so this is
              the one piece of the section that does quiet itself down.

              The two timings override NumberFlow's 900ms default — see the
              constants for why.
            */}
            <p
              data-counter
              className="heading-style text-xl text-secondary opacity-75"
            >
              <NumberFlow
                value={landed}
                format={{ minimumIntegerDigits: 2 }}
                transformTiming={COUNTER_TRANSFORM}
                opacityTiming={COUNTER_OPACITY}
              />
            </p>
          </div>
        </div>
        <div className="relative flex items-center">
          {/*
            The frame. Deliberately NOT overflow-hidden: it sizes and positions
            the stack, and the teardown then slides the four layers clean out of
            its box into a row, which a clip here would cut off. Each layer
            carries its own circle instead — see below.
          */}
          <div
            data-project-frame
            className="relative aspect-square h-[75vh] rounded-full"
          >
            {/*
              The accent fill, and the zero state made literal: before the first
              slice every layer's four sweeps sit at 0deg, so every mask paints
              nothing and this bare orange circle is what shows — which is also
              the server-rendered frame.

              It is a node rather than a bg-accent on the frame purely so the
              teardown can fade it on its own. See the tween.
            */}
            <div
              data-frame-fill
              className="absolute inset-0 rounded-full bg-accent"
            />
            {PROJECTS.map((project) => (
              // Each layer carries the circular clip, because each one has to
              // survive being translated out of the frame's box during the
              // teardown and still read as a circle on its own. It is also what
              // trims the photo's drift.
              //
              // .quadrant-reveal declares the four-wedge conic mask AND the
              // four --sweep-* angles it reads, all at 0deg. That resting
              // declaration is the markup half of the no-SSR-flash rule: it
              // matches the tween's start value, so nothing flashes fully
              // revealed before GSAP runs and the pre-pin frame is correct
              // without JS.
              <div
                key={project.name}
                data-project-image
                className="quadrant-reveal absolute inset-0 overflow-hidden rounded-full"
              >
                <Image
                  src={project.src}
                  alt={project.alt}
                  fill
                  sizes="75vh"
                  // The drift's target, and the reason it is tagged on the
                  // picture rather than tweened through the layer: the mask
                  // lives on the layer, so scaling the layer would scale the
                  // revealed circle too. This scales inside a mask that holds
                  // still.
                  data-project-photo
                  className="object-cover"
                />
              </div>
            ))}
          </div>
          {/*
            Both carry an id purely as an animation handle for the teardown —
            the same job DashedCircle's `id` does for the ring conveyor in
            Services. Scaling the centering layer rather than the ring inside it
            means one transform takes the circle and its dots together.
          */}
          <DashedCircle id="projects-rings" dots="horizontal" size="90vw" />
          <ProgressRing id="projects-progress" size="80vh" />
        </div>
        {/*
          The copy stack, the mirror of the image stack opposite: every block
          occupies this column in full and only one is visible at a time. The
          column is relative purely to be their containing block; DOM order is
          scroll order, which the [data-project-block] query relies on.
        */}
        <div className="relative flex-1">
          {PROJECTS.map((project) => (
            <ProjectBlock
              key={project.name}
              type={project.type}
              name={project.name}
              blurb={project.blurb}
            />
          ))}
        </div>
      </div>
      {/* Centre crosshair: both rules are sized in vmax so they overshoot the
          viewport on either axis and stay full-bleed through any resize —
          the section's overflow-hidden does the trimming. */}
      <div id="cross-lines" className="absolute inset-0">
        <div
          id="y-line"
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="h-screen w-px bg-black opacity-10"></div>
        </div>
        <div
          id="x-line"
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="h-px w-screen bg-black opacity-10"></div>
        </div>
      </div>
    </section>
  );
}
