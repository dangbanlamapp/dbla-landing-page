"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import NumberFlow from "@number-flow/react";
import Image from "next/image";
import ProjectBlock from "./ProjectBlock";
import ProjectLink from "./ProjectLink";
import ProgressRing from "./ProgressRing";
import type { Project } from "./project-data";
import { useTranslations } from "next-intl";
import { RICH, richHeading, type RichHeading } from "./rich";

gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger);

// How long the section stays pinned, in viewports of scrolling — 3 is the 300vh
// it holds for. Kept as a multiplier of window.innerHeight rather than a fixed
// pixel number so a resize (or a mobile URL bar collapsing) re-measures against
// the new viewport: the trigger's end is a function and invalidateOnRefresh is
// what makes ScrollTrigger call it again.
const PIN_VIEWPORTS = 5;

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
const ZOOM_SCALE = 1.2;

// Per-line offset, applied to entrance and exit alike. Small next to TEXT_ENTER
// on purpose: three lines should land as one gesture, not as a queue.
const TEXT_STAGGER = 0.06;

// Content drives the schedule. The projects split the pin evenly between them
// (see SLICE below), so adding a project in the Studio re-divides the same pin
// rather than needing a single position rewritten — the same contract the
// services have with the Services pin.
//
// DOM order is stacking order, and stacking order is scroll order: each image
// grows on top of the one before it, so the `projects` prop reads top-down as
// the sequence a reader scrolls through. The list comes from Sanity, in the
// order it is dragged into in the Studio, shared with the /projects routes.
//
// That is why everything below is a function of the count rather than a
// module constant: the count is only known once the list arrives as a prop.
// The names stay upper-case because inside the timeline they are still
// constants — fixed for the life of one mount, which is the life of one list
// (see the content key on <Projects> in app/page.tsx).
function schedule(count: number) {
  // The pin is cut into one slice per project PLUS a closing one, and that
  // "+ 1" is the whole reason this is a division rather than hand-placed
  // numbers: every position downstream is a multiple of SLICE, so buying the
  // section an exit costs one character here and re-times the entire sequence
  // to fit.
  //
  // At 5 viewports across 4 projects and a teardown that is 1 each.
  const SLICE = PIN_VIEWPORTS / (count + 1);

  // An image's slice is split in two: it is revealed over the first half,
  // then drifts over the second. REVEAL_HALF is that midpoint, and both halves
  // read from it, so the reveal and the drift cannot be retimed independently
  // and leave a gap or an overlap between them.
  const REVEAL_HALF = SLICE / 2;

  // The copy's share of a slice, in and out. The remainder is hold — at 0.35
  // and 0.25 the block stands still for the middle 40% of its project, which
  // is what keeps the column from reading as permanently in motion across
  // back-to-back slices. Fractions of SLICE rather than absolute times, so the
  // rhythm survives a change to PIN_VIEWPORTS or to the number of projects.
  const TEXT_ENTER = SLICE * 0.35;
  const TEXT_EXIT = SLICE * 0.25;

  // Where the projects end and the closing slice begins: the last image has
  // finished drifting, the ring has closed, and nothing is left to introduce.
  // Everything about the teardown hangs off this one position.
  const TEARDOWN_AT = count * SLICE;

  // When the section furniture leaves. Block i exits at i * SLICE + (SLICE -
  // TEXT_EXIT), so for the last i that is exactly this — the counter rides
  // out on the last project's beat and land precisely as the
  // teardown begins, leaving the closing slice to the circles alone.
  const OUTRO_AT = TEARDOWN_AT - TEXT_EXIT;

  return { SLICE, REVEAL_HALF, TEXT_ENTER, TEXT_EXIT, TEARDOWN_AT, OUTRO_AT };
}

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

/**
 * How far the frame draws back during the teardown — FRAME_EXIT_SCALE, unless
 * the row of circles it produces would not fit across the viewport.
 *
 * The row is count * ROW_STEP diameters wide, so whether it fits is
 * driven entirely by the diameter against the window width. At 0.5 and the
 * desktop 60vh frame that is 132vh of row: comfortable at 16:9 and 3:2, over
 * the edge at 4:3. Rather than pick a scale small enough for the worst
 * case and leave widescreen looking timid, the fit is solved per viewport.
 *
 * The diameter is MEASURED off the frame rather than recomputed from a
 * viewport fraction, and that is what lets --frame-d change at a breakpoint
 * without a matching constant here quietly going stale. GSAP hands a
 * function-based value its own target as the second argument, and this tween's
 * target IS the frame, so the measurement costs nothing extra. offsetWidth is a
 * layout box and ignores the transform the teardown is in the middle of
 * writing, so it reads the resting diameter at any point in the scrub.
 *
 * Called as a function-based tween value so invalidateOnRefresh re-runs it on
 * resize, the same contract the pin's `end` has — the same reason neither is a
 * fixed number.
 */
const rowScale = (count: number) => (_index: number, frame: HTMLElement) =>
  Math.min(
    FRAME_EXIT_SCALE,
    (window.innerWidth * ROW_FIT) /
      (frame.offsetWidth * count * (ROW_STEP / 100)),
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

// Phones, tablets and anything narrow enough to get the stacked layout. They
// get a lighter build of the same timeline: the images scale in rather than
// wiping in through the conic mask, the photo drift is dropped, and the scrub
// trails the scroll slightly. See the `touch` branches below, and the matching
// CSS under .quadrant-reveal and body::after in globals.css — the string has to
// stay identical in all three places.
//
// (pointer: coarse) as well as the width, because the expensive part is not the
// layout: a touch scroll runs on the browser's compositor thread, ahead of the
// JS that scrubs this timeline, and a large iPad in landscape has that problem
// at desktop width.
const TOUCH_QUERY = "(max-width: 1023px), (pointer: coarse)";

// How far the scrub trails the scroll on touch, in seconds. `true` sets the
// timeline to the scroll position once per JS frame, which on a phone is often
// a frame behind the compositor's own scroll — the section visibly shakes.
// A short catch-up absorbs that mismatch; long enough to hide it, short enough
// that the stack still reads as attached to the finger.
const TOUCH_SCRUB = 0.4;

/** The Studio's Homepage → Projects. A missing heading falls back to messages/. */
export type ProjectsCopy = { title?: RichHeading };

export default function Projects({
  projects,
  copy: words = {},
}: {
  projects: Project[];
  copy?: ProjectsCopy;
}) {
  const t = useTranslations("Projects");
  const container = useRef<HTMLElement>(null);

  // How many project entrances have completed — 0 through projects.length, so
  // "00" is a real state and not a placeholder. This is the one thing in the
  // section that has to cross from the timeline back into React, because
  // NumberFlow animates off a prop change rather than off a scrub position.
  const [landed, setLanded] = useState(0);

  // The last value actually written to state. See the guard in onUpdate.
  const shown = useRef(0);

  // Whether the teardown has begun, i.e. the stack is being dealt out into the
  // row. Second piece of timeline state React needs, for the same reason as
  // `landed`: it decides which layers take clicks (see `isLive`), and that is
  // markup, not a tween. Same ref guard, so it is written once per crossing.
  const [dealt, setDealt] = useState(false);
  const dealtShown = useRef(false);

  /**
   * Which image layers accept a click. All four sit in the same box at once,
   * and a CSS mask does not take part in hit-testing — so without this every
   * click on the circle would land on the TOP layer, Adminless, whichever
   * project the reader is actually looking at.
   *
   * While stacked, only the project the counter names is live: the counter
   * ticks to an image as it starts arriving, so the circle opens whatever is
   * being drawn on top. Once the teardown starts the four separate into a row
   * with no overlap, and every one of them is live.
   */
  const isLive = (i: number) => dealt || i === landed - 1;

  useGSAP(
    () => {
      // Built once per side of TOUCH_QUERY. matchMedia reverts the whole
      // context when the query flips — every tween, ScrollTrigger and split
      // inside — so crossing the breakpoint rebuilds the section from scratch
      // instead of leaving a desktop timeline driving layers the touch CSS has
      // already hidden. The always-true `any` condition is only there so the
      // function also runs when `touch` does NOT match. The matchMedia is
      // created inside useGSAP's context, so unmounting reverts it too.
      const mm = gsap.matchMedia();

      mm.add(
        { touch: TOUCH_QUERY, any: "all" },
        (ctx) => {
          const touch = Boolean(ctx.conditions?.touch);
          const scrub = touch ? TOUCH_SCRUB : true;

          const {
            SLICE,
            REVEAL_HALF,
            TEXT_ENTER,
            TEXT_EXIT,
            TEARDOWN_AT,
            OUTRO_AT,
          } = schedule(projects.length);

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
              scrub,
              // Touch scrolling runs ahead of JS, so by the time ScrollTrigger
              // swaps the section to position: fixed it has already scrolled a
              // little past the start and snaps back. anticipatePin applies the
              // pin slightly early to swallow that jump.
              anticipatePin: touch ? 1 : 0,
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
          // the fraction of the projects scrolled — the ring measures the sequence
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
          // Read in DOM order, which the markup keys to the list's order, so index i
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

              // Touch: the same stack and the same slices, but each image grows in
              // from the centre on `scale` — a compositor-only property, on a layer
              // the touch CSS has already promoted — instead of the conic mask,
              // which repaints at full size every frame. The layers ship hidden
              // there (see globals.css); the set below shows them in the same tick
              // the fromTo parks them at scale 0, and matchMedia reverts it if the
              // query flips. No drift either: a second transform animating under a
              // rounded clip is the next most expensive thing per frame, and on a
              // phone-sized circle it was barely visible.
              //
              // power2.inOut rather than the wipe's power4: scale is perceptually
              // front-loaded (area grows with its square), so a softer curve keeps
              // the growth from reading as a sudden pop at the end.
              if (touch) {
                gsap.set(layer, { visibility: "visible" });
                tl.fromTo(
                  layer,
                  { scale: 0 },
                  { scale: 1, duration: REVEAL_HALF, ease: "power2.inOut" },
                  at,
                );
                return;
              }

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

          // ── The backdrop ───────────────────────────────────────────────────────
          // The big circle behind the frame echoes whichever project the frame is
          // showing. Same stack rule as the images above — each photo fades in on
          // top of the last over the first half of its own slice and nothing ever
          // fades out — so at any scroll position the backdrop and the frame agree
          // on which project is up, scrubbing backwards included.
          //
          // A crossfade rather than a second pinwheel: under an 80% black overlay
          // the wipe's edges would barely read, and opacity is compositor-only, so
          // the touch build can run the very same tween — no `touch` branch.
          // fromTo for the same reason as the wipe: the photos ship at opacity 0.
          //
          // The overlay rides in with the FIRST photo, on the same tween timing,
          // so before the first project the backdrop is not there at all — the
          // section opens on the bare page — and photo and darkening land as one.
          // It never leaves; the teardown's scale takes it away with the rest.
          tl.fromTo(
            "[data-backdrop-overlay]",
            { opacity: 0 },
            { opacity: 1, duration: REVEAL_HALF, ease: "power2.inOut" },
            0,
          );
          gsap.utils
            .toArray<HTMLElement>("[data-backdrop-photo]", container.current)
            .forEach((photo, i) => {
              tl.fromTo(
                photo,
                { opacity: 0 },
                { opacity: 1, duration: REVEAL_HALF, ease: "power2.inOut" },
                i * SLICE,
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
          // and the two re-divide together when PIN_VIEWPORTS or the list changes.
          //
          // Derived from tl.time() on every update rather than incremented by a
          // callback per step. A scrubbed timeline can cross half the pin in a
          // single frame and runs backwards as readily as forwards, so anything
          // counting events would drop steps or double-count; this is a pure
          // function of timeline position, like everything else in the section —
          // whatever frame you land on, the number is right for it.
          const clampIndex = gsap.utils.clamp(0, projects.length);

          tl.eventCallback("onUpdate", () => {
            const next = clampIndex(
              Math.floor(tl.time() / SLICE - STEP_AT) + 1,
            );

            // NumberFlow starts an animation on every value change, and React only
            // bails out of a same-value setState after re-entering the component —
            // at scrub rates that is sixty wasted renders a second. Holding the
            // last written value in a ref means state is touched only on an actual
            // step.
            if (next !== shown.current) {
              shown.current = next;
              setLanded(next);
            }

            const nextDealt = tl.time() >= TEARDOWN_AT;
            if (nextDealt !== dealtShown.current) {
              dealtShown.current = nextDealt;
              setDealt(nextDealt);
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
          //
          // The backdrop collapses with the dial but does not spin: it carries a
          // photo now, and a half turn would read as the picture tumbling rather
          // than as a ring closing.
          tl.to(
            "#projects-progress",
            {
              scale: 0,
              rotate: "180deg",
              duration: SLICE / 2,
              ease: "power3.inOut",
            },
            TEARDOWN_AT,
          )
            .to(
              "#projects-backdrop",
              { scale: 0, duration: SLICE / 2, ease: "power3.inOut" },
              TEARDOWN_AT,
            )
            .to(
              "[data-project-frame]",
              {
                scale: rowScale(projects.length),
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
                xPercent: (i: number) =>
                  (i - (projects.length - 1) / 2) * ROW_STEP,
                duration: SLICE,
                ease: "power4.inOut",
              },
              TEARDOWN_AT,
            )
            .to(
              "[data-frame-fill]",
              { autoAlpha: 0, duration: 0, ease: "none" },
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

            // No exit animation: the heading sits inside the frame, under the
            // image layers, so the first project's wipe is what takes it away.
            // See the hide on the master timeline below.
            //
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
              onSplit: (self) =>
                gsap.from(self.lines, {
                  yPercent,
                  ease: "none",
                  stagger: 0.12,
                  // The section itself is the trigger, not the heading: the lines
                  // arrive as the section climbs from 80% to 30% of the viewport,
                  // which is a fixed run of scroll no matter where in the layout
                  // the h2 happens to sit. Done well before the pin engages, so the
                  // title has a beat to sit on the orange before the first wipe.
                  //
                  // ease "none" because this is scrubbed — the lines track the
                  // scrollbar exactly, and any other curve reads as scroll lag.
                  scrollTrigger: {
                    trigger: container.current,
                    start: "top 80%",
                    end: "top 30%",
                    scrub,
                  },
                }),
            });
          });

          // Covering is not quite enough on its own: the teardown hides the
          // fill and deals the layers out into a row, which would uncover the
          // heading again. So it is switched off — instantly, not animated — at
          // REVEAL_HALF, the moment the first wipe has closed over it, when the
          // switch cannot be seen. A zero-length tween on the timeline rather
          // than a set, so scrubbing back past it brings the heading back.
          tl.to(
            "#projects-heading",
            { autoAlpha: 0, duration: 0, ease: "none" },
            REVEAL_HALF,
          );
        },
        // matchMedia keeps its own context, so it needs the scope passed
        // again or the selector strings above would query the whole page.
        container.current ?? undefined,
      );
    },
    { scope: container },
  );

  return (
    // overflow-x-clip is load-bearing, not tidiness: the teardown throws the
    // four layers well outside the centre column, and a pinned section is
    // position: fixed — transformed children hanging off it can extend the
    // document's horizontal scroll area. It also trims the x-line below and,
    // on a phone, the backdrop circle, which at 1.3 frame diameters is
    // deliberately wider than a portrait viewport.
    //
    // Horizontal only, NOT overflow-hidden: on desktop the backdrop is 96vw,
    // i.e. taller than the h-screen section on any landscape screen, and a
    // vertical clip would slice its top and bottom arcs off flat. Letting it
    // spill up over the motto is the intended look. `clip` on one axis with
    // `visible` on the other is the one overflow pairing CSS honours as
    // written — `hidden` would promote the other axis to `auto` and make this
    // a scroll container.
    //
    // `isolate` makes the section its own stacking context, so the backdrop's
    // negative z-index puts it behind the heading and copy without dropping it
    // out of the section and behind HeaderBg's -z-1 layer.
    //
    // --frame-d is declared here, at the top, rather than on the circle's box:
    // below lg the project copy is positioned against the whole section and
    // places itself off the frame's diameter (see ProjectBlock), so the number
    // has to be inherited by more than the circle. See the circle's box for
    // the values themselves.
    <section
      id="projects"
      ref={container}
      className="relative isolate h-screen overflow-x-clip [--frame-d:min(80vw,40vh)] lg:[--frame-d:min(60vh,45vw)]"
    >
      {/*
        Three tracks — heading/counter, the circle, the copy — laid out as ROWS
        on a phone and as the original columns from lg up. Only the direction
        changes: the outer two tracks keep flex-1 and so keep splitting whatever
        the circle leaves over, which in column mode is height instead of width.
        That is the whole reason the switch is one class rather than a second
        layout — the sizing was already expressed as "the circle takes what it
        needs, the copy shares the rest".

        The gap steps up a spacing token per breakpoint from lg, where the
        tracks sit side by side and the gap is the air between the circle and
        the copy. The tokens are already fluid above 1280px, so between steps it
        keeps growing with the window rather than jumping and then holding. It
        comes out of the flex-1 copy tracks, never the circle (shrink-0).
      */}
      <div className="flex h-full flex-col justify-end gap-space-base lg:flex-row lg:justify-center lg:gap-space-3x xl:gap-space-5x 2xl:gap-space-6x">
        <div className="flex flex-1 flex-col items-center lg:items-end">
          {/* Where the heading used to sit, now inside the frame. Kept as an
              empty flex-1 so the counter holds its place just below the centre
              line on desktop.

              Below lg the counter leaves the flow for the top of the section,
              with the project type stacked under it (see ProjectBlock), so the
              screen reads label above / circle / copy below instead of all of
              it crowding the progress ring. top-space-6x clears the fixed top
              bar. This track stays as an empty flex-1 there too — it is the
              mirror of the copy track that keeps the circle dead centre. */}
          <div className="flex-1" />
          <div className="text-center max-lg:absolute max-lg:inset-x-0 max-lg:top-space-6x lg:flex-1 lg:p-space-base lg:text-left">
            <p
              data-counter
              className="heading-style text-lg text-off-white opacity-75 lg:text-xl"
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
        {/*
          --frame-d is the section's one diameter, declared on the section so
          the frame, the progress ring and the phone copy's placement are all
          derived from a single number instead of several that have to be kept
          in agreement across a breakpoint.

          min(80vw, 40vh) is what makes the stacked layout fit: the frame has to
          clear the width of a phone AND leave room above and below for the two
          copy tracks, and those are different constraints on different axes, so
          neither alone is enough. min() takes whichever binds — 80vw on a
          portrait phone, 40vh on a short landscape one — with no breakpoint
          needed between the two.

          From lg up the same idea in column mode: 60vh on any landscape
          screen, so the circle grows with the display instead of stopping at
          a pixel size, but capped at 45vw so a tall lg window (a portrait iPad
          Pro, a half-width browser on a big monitor) cannot push it into the
          two copy columns either side.

          shrink-0 because the frame's width comes from aspect-square and cannot
          respond to the track being squeezed: without it a tight viewport
          shrinks this box and the circle simply overflows it instead of the
          flex-1 tracks giving way, which is what should happen.
        */}
        <div className="relative flex shrink-0 items-center justify-center [--dash-d:90vh] lg:[--dash-d:96vw]">
          {/*
            The backdrop: a circle the size the dashed ring used to be (still
            --dash-d), showing the same project as the frame under an 80% black
            overlay, so the light copy around the frame has something dark to
            sit on. 96vw on desktop; 90vh below lg, where the copy is stacked
            above and below the frame and only a circle about the height of the
            screen reaches it — which is what lets the copy be light there too.

            Its own stack of photos rather than a reference to the frame's: the
            frame's layers are masked, scaled and later dealt out into a row,
            and none of that should reach the backdrop. They ship at opacity 0,
            the tween's start value.

            -z-10 against the section's `isolate`; see the section. The id is
            the teardown's handle, on the centering layer so one transform takes
            the whole circle. aria-hidden and alt="" because the frame already
            carries each project's real alt text. shrink-0 because the circle is
            wider than this flex box and would otherwise be squeezed to fit.
          */}
          {/*
            The overlay ships at opacity 0 too, so the server frame and
            everything before the first project show no backdrop at all — see
            the overlay tween.
          */}
          <div
            id="projects-backdrop"
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center"
          >
            <div className="relative aspect-square h-[var(--dash-d)] shrink-0 overflow-hidden rounded-full">
              {projects.map((project) => (
                <Image
                  key={project.slug}
                  src={project.src}
                  alt=""
                  fill
                  sizes="(min-width: 64rem) 96vw, 90vh"
                  data-backdrop-photo
                  className="object-cover opacity-0"
                />
              ))}
              <div
                data-backdrop-overlay
                className="absolute inset-0 bg-black/80 opacity-0"
              />
            </div>
          </div>
          {/*
            The frame. Deliberately NOT overflow-hidden: it sizes and positions
            the stack, and the teardown then slides the four layers clean out of
            its box into a row, which a clip here would cut off. Each layer
            carries its own circle instead — see below.
          */}
          <div
            data-project-frame
            className="relative aspect-square h-[var(--frame-d)] rounded-full"
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
            {/*
              The section heading, centred on the orange. Between the fill and
              the image layers in DOM order, so the first project's wipe covers
              it the way each image covers the last — no exit animation of its
              own. It is switched off once fully covered, because the teardown
              hides the fill and deals the layers out, which would uncover it.
            */}
            <div
              id="projects-heading"
              className="absolute inset-0 flex items-center justify-center p-space-base"
            >
              <h2
                data-split="up"
                className="heading-style text-center text-2xl leading-heading text-white lg:text-4xl"
              >
                {words.title ? richHeading(words.title) : t.rich("title", RICH)}
              </h2>
            </div>
            {projects.map((project, i) => (
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
              //
              // The layer IS the link to the project's page, so the click
              // target is exactly the circle the reader sees, and in the row
              // each circle opens its own project. Layers that are not live
              // (see isLive) drop out of hit-testing AND out of the tab order,
              // so neither a click nor a Tab lands on a picture that is buried
              // under another one. A project without a page renders the same
              // layer as a plain picture (see ProjectLink).
              //
              // The "View project" pill ProjectLink adds is inside the layer,
              // so it is masked by the wipe and rides the teardown with its
              // own circle.
              <ProjectLink
                key={project.slug}
                project={project}
                tabIndex={isLive(i) ? undefined : -1}
                data-project-image
                className={`quadrant-reveal absolute inset-0 overflow-hidden rounded-full ${
                  isLive(i) ? "" : "pointer-events-none"
                }`}
              >
                {/* Hover zoom on a wrapper, never on the photo: GSAP owns the
                    photo's scale for the drift, and a CSS transition on the
                    same transform would snap to wherever the scrub last wrote
                    it. Small, because it compounds with ZOOM_SCALE. */}
                <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105 group-focus-visible:scale-105">
                  <Image
                    src={project.src}
                    alt={project.alt}
                    fill
                    sizes="(min-width: 64rem) min(60vh, 45vw), 80vw"
                    // The drift's target, and the reason it is tagged on the
                    // picture rather than tweened through the layer: the mask
                    // lives on the layer, so scaling the layer would scale the
                    // revealed circle too. This scales inside a mask that holds
                    // still.
                    data-project-photo
                    className="object-cover"
                  />
                </div>
              </ProjectLink>
            ))}
          </div>
          {/*
            1.15 frame diameters: a clear ring of air (7.5% of the radius)
            between the dial and the image circle rather than the hair it used
            to sit at (16/15). A multiple of --frame-d, so that proportion holds
            at every diameter and breakpoint from the one expression.
          */}
          <ProgressRing
            id="projects-progress"
            size="calc(var(--frame-d)*1.15)"
          />
        </div>
        {/*
          The copy stack, the mirror of the image stack opposite: every block
          occupies this column in full and only one is visible at a time. The
          column is relative purely to be their containing block; DOM order is
          scroll order, which the [data-project-block] query relies on.

          pointer-events-none because being `relative` and later in the DOM
          puts this column above the image layers in hit-testing, and the
          teardown deals the last circle out into exactly the space it covers —
          it was eating every click on that one. Nothing in here is
          interactive, so nothing is lost.
        */}
        {/* relative from lg only: below it the blocks span the whole section
            (it is the next positioned ancestor) so each can put its type at the
            top and its name and blurb under the circle. The column still holds
            its flex-1 share, keeping the circle centred. */}
        <div className="pointer-events-none flex-1 lg:relative">
          {projects.map((project) => (
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
          the section's overflow-x-clip does the trimming (the y-line is
          exactly h-screen, so the vertical axis needs none).

          -z-5 tucks it behind the image circle (and the copy) while keeping
          it above the backdrop's -z-10, so the lines run across the dark
          circle but stop at the frame's edge — both against the section's
          `isolate`. pointer-events-none still, as a guard: it covers the whole
          section, and any later change to the stacking would otherwise let it
          catch the clicks meant for the project images. */}
      <div
        id="cross-lines"
        className="pointer-events-none absolute inset-0 -z-5"
      >
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
