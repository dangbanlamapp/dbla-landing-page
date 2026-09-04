"use client";

import { useEffect, useRef } from "react";
import { useLenis } from "lenis/react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
// The same two constants the footer's legal row reads, so the routes and the
// copyright year cannot say one thing down there and another up here.
import { LEGAL_LINKS, YEAR } from "./legal";

gsap.registerPlugin(useGSAP, CustomEase, ScrollTrigger);

/**
 * The reference this is modelled on specified cubic-bezier(0.76, 0, 0.24, 1) —
 * a hard ease-in-out that leaves almost all the travel in the middle of the
 * tween, which is what makes the curve read as a sheet being pulled rather
 * than a box sliding. power4.inOut is close but not the same shape, and the
 * whole character of the drop lives in this curve, so it is stated exactly.
 * CustomEase ships in the same package as SplitText; no extra dependency.
 */
const EASE = CustomEase.create("menu", "M0,0 C0.76,0 0.24,1 1,1");

/**
 * The bend lives in a 0-100 viewBox stretched with preserveAspectRatio="none",
 * so nothing here has to know the viewport's width — the strip's own CSS size
 * does the scaling, and a resize needs no recalculation or ScrollTrigger
 * refresh. A quadratic's apex sits half way to its control point, so y=200
 * would bottom the curve out at exactly the strip's full height.
 *
 * This is past that on purpose. At 400 the apex wants y=200, twice the strip,
 * so the svg's own box crops the bottom off the arc — what shows is the wide
 * shoulder of the curve rather than its point, which reads as a sheet sagging
 * under its own weight instead of a teardrop. The crop is the effect; raising
 * it further only flattens the shoulder more.
 */
const CURVE_CONTROL = 200;

/**
 * Seconds the back sheet leads the front by, and equally the seconds it trails
 * on the way out.
 *
 * Small on purpose. The ease is a hard in-out that leaves most of the travel in
 * the middle of the tween, so a fraction of a second is enough to open a
 * visible band of the sheet behind. Much more does not read as "more layered",
 * it reads as two separate panels arriving one after the other — and it is
 * added to the length of every open, since the front sheet now waits this long
 * before it starts.
 */
const LEAD = 0.08;

/** Both ends of the tween are this same shape with a different control y. */
const path = (control: number) => `M0 0 L100 0 Q50 ${control} 0 0`;

/**
 * One layer of the menu: the solid 80vh body plus the curve strip that trails
 * off its bottom edge. Rendered twice — once in accent holding the content,
 * once in foreground behind it as the leading shadow.
 *
 * It is a component rather than markup written out twice because the stacked
 * look depends entirely on the two being the same shape. If the heights or the
 * viewBox ever drifted apart the back sheet would show through crooked, and a
 * single definition is what makes that impossible rather than merely unlikely.
 *
 * The refs come in as ordinary props, not through `ref`: the timeline needs a
 * handle on each shell and each path, and passing them down plainly avoids
 * dragging forwardRef in for two internal elements.
 *
 * Colour arrives as whole class strings so Tailwind's scanner can still see
 * literal names — `bg-${tone}` would be invisible to it and the utility would
 * never be generated.
 */
function Sheet({
  shellRef,
  curveRef,
  body,
  curve,
  children,
}: {
  shellRef: React.RefObject<HTMLDivElement | null>;
  curveRef: React.RefObject<SVGPathElement | null>;
  body: string;
  curve: string;
  children?: React.ReactNode;
}) {
  return (
    /**
     * The curve strip is a sibling *inside* this box, not a layer hanging below
     * it, and that is what makes `yPercent: -100` a complete hide: the shell is
     * 80vh + the strip tall, so parking it a full height up puts the bulge above
     * the viewport too. Hang the strip outside the box and its resting bend
     * paints across the top of the page on load.
     */
    <div ref={shellRef} className="absolute inset-x-0 top-0">
      <div className={`flex h-[80vh] w-full flex-col justify-end ${body}`}>
        {children}
      </div>

      {/**
       * viewBox 0-100 in both axes with preserveAspectRatio="none": the strip
       * stretches to whatever 100vw and 15vh currently are, and the quadratic
       * stays a quadratic under a non-uniform scale, so the bend is smooth at
       * any window size with nothing measured in JS.
       *
       * `block` because an inline svg would sit on the text baseline and open a
       * descender's worth of gap above the strip; -mt-px overlaps the body by a
       * pixel so no hairline seam shows through where the two meet.
       *
       * The markup's `d` is the fully bent path — the tween's initial value,
       * per the no-SSR-flash rule — which is safe to paint because the whole
       * container is opacity-0 until the effect parks both sheets off-screen.
       *
       * The colour tracks the body's fill: the strip is the same sheet, just
       * its leading edge, and `fill="currentColor"` keeps that one token
       * decision in one place.
       */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        className={`-mt-px block h-[15vh] w-full ${curve}`}
      >
        <path ref={curveRef} d={path(CURVE_CONTROL)} fill="currentColor" />
      </svg>
    </div>
  );
}

/** href is a placeholder — these routes do not exist yet, same as the footer's. */
const NAV_LINKS = [
  { label: "Home", href: "#" },
  { label: "About", href: "#" },
  { label: "Services", href: "#" },
  { label: "Contact", href: "#footer" },
];

export default function MenuPanel({
  open,
  onNavigate,
}: {
  open: boolean;
  onNavigate: () => void;
}) {
  // The outer box positions; it is never transformed. Each sheet inside owns
  // its own yPercent, which is what lets them travel a beat apart.
  const container = useRef<HTMLDivElement>(null);

  const frontShell = useRef<HTMLDivElement>(null);
  const frontCurve = useRef<SVGPathElement>(null);
  const backShell = useRef<HTMLDivElement>(null);
  const backCurve = useRef<SVGPathElement>(null);

  // Reads the context SmoothScroll provides. This component renders inside it
  // — page.tsx sits under <ReactLenis> — which is the same reason ScrollLock
  // is its own component rather than living in SmoothScroll itself.
  const lenis = useLenis();

  // Built once, then only played and reversed, so it has to outlive renders.
  const timeline = useRef<gsap.core.Timeline | null>(null);
  // useGSAP runs with an empty dependency list, so the matchMedia closure below
  // can never see a later `open`; it reads this instead.
  const openRef = useRef(false);

  useGSAP(
    () => {
      /**
       * Only opacity here — the resting yPercent is the timeline's job, and
       * that division is load-bearing rather than tidiness.
       *
       * A `gsap.set(..., { yPercent: -100 })` on this line writes a resolved
       * matrix to the element. The timeline below is built inside a matchMedia
       * context, i.e. a *different* gsap context, so when its fromTo first
       * touches the element it re-parses that matrix from the computed style —
       * and a matrix cannot say which of its pixels came from a percentage, so
       * the -100% is banked as a literal `y: -764px` and the tween's own
       * yPercent then stacks on top of it. The panel rests at -200% and
       * "opens" to -100%, i.e. never enters the viewport.
       *
       * A fromTo renders its from-state the moment it is created, so leaving
       * the parking to the timeline gives the transform exactly one owner and
       * still lands before the browser paints — useGSAP runs in a layout
       * effect and mm.add runs its callback synchronously.
       *
       * The markup hides the panel with `opacity-0` in the meantime, which is
       * why this set is still needed: it is a channel nothing else animates,
       * so it cannot collide the same way.
       */
      gsap.set(container.current, { opacity: 1 });

      /**
       * Reduced motion keeps the menu and drops the choreography: duration 0
       * means it is simply there or not, with no sheet-pull and no bend.
       *
       * Both conditions are listed because gsap.matchMedia only runs the
       * callback when at least one matches — with only the `reduce` query
       * there would be no timeline at all for everyone else.
       */
      const mm = gsap.matchMedia();

      mm.add(
        {
          reduced: "(prefers-reduced-motion: reduce)",
          motion: "(prefers-reduced-motion: no-preference)",
        },
        (ctx) => {
          const { reduced } = ctx.conditions as { reduced: boolean };

          const tl = gsap.timeline({
            paused: true,
            defaults: { duration: reduced ? 0 : 0.9, ease: EASE },
          });

          /**
           * One sheet's worth of motion — the slide and the bend that goes
           * with it — added at position `at`.
           *
           * Both sheets go through this same function rather than being spelled
           * out twice, because the illusion only holds while their geometry is
           * identical: same travel, same duration, same ease, same bend. Two
           * hand-written copies would be two things to keep in step, and any
           * drift shows up directly as the back sheet's edge crossing the
           * front's.
           *
           * The bend is tweened as a plain number on a proxy object and written
           * back as a `d` string, rather than tweening the attribute itself.
           * GSAP can interpolate two path strings when their commands line up,
           * but that quietly depends on both strings keeping the same shape
           * forever; one number is a thing that cannot fall out of sync. Each
           * sheet gets its own proxy — they are at different points in the
           * bend at any given moment, which is the whole effect.
           *
           * Slide and bend share a position and a duration, so a sheet is flat
           * at exactly the frame it lands — the "and then it is a rectangle"
           * part.
           */
          const addSheet = (
            shell: HTMLDivElement | null,
            curve: SVGPathElement | null,
            at: number,
          ) => {
            const bend = { control: CURVE_CONTROL };

            tl.fromTo(shell, { yPercent: -100 }, { yPercent: 0 }, at).fromTo(
              bend,
              { control: CURVE_CONTROL },
              {
                control: 0,
                onUpdate: () => curve?.setAttribute("d", path(bend.control)),
              },
              at,
            );
          };

          /**
           * The back sheet goes first and the front follows a beat later, and
           * a reversed timeline inverts that for free: playing backwards, the
           * front is the last tween to have started so it is the first to move,
           * and the back trails out behind it. One offset buys the lead on the
           * way in and the lag on the way out.
           *
           * The front sheet's own motion is untouched by this — same duration,
           * same ease, same bend it always had. What changed is only that it
           * now begins LEAD seconds after the click rather than on it, which is
           * unavoidable: a timeline has no room before position 0, so the only
           * way to put a sheet *ahead* of the front one is to move the front
           * one back.
           */
          addSheet(backShell.current, backCurve.current, 0);
          addSheet(frontShell.current, frontCurve.current, reduced ? 0 : LEAD);

          timeline.current = tl;

          // A media-query flip rebuilds this from scratch, and the fresh
          // timeline starts closed. If the menu was open, jump it to the end.
          if (openRef.current) tl.progress(1);

          return () => {
            timeline.current = null;
          };
        },
      );
    },
    { scope: container },
  );

  useEffect(() => {
    openRef.current = open;
    // play/reverse rather than restart, so a click mid-drop turns the sheet
    // around from where it is instead of snapping to an end.
    if (open) timeline.current?.play();
    else timeline.current?.reverse();
  }, [open]);

  useEffect(() => {
    // undefined on the first pass: child effects run before the provider's, so
    // the instance only appears on the render after it is created.
    if (!lenis || !open) return;

    /**
     * `stop()` rather than swallowing wheel events, for the reason ScrollLock
     * gives: lenis.css turns `.lenis-stopped` into `overflow: clip` on <html>,
     * which takes the scrollbar, the arrow keys and the space bar with it. A
     * wheel handler would leave every one of those still scrolling the page
     * behind the panel.
     *
     * Losing the scrollbar normally widens the viewport and reflows the page,
     * but globals.css already hides the document scrollbar precisely so that
     * clip costs nothing — the gutter is not there to lose.
     *
     * No reduced-motion exemption here, unlike ScrollLock. That lock protects
     * an entrance animation, so skipping it for readers who are not shown the
     * animation is the right trade; this one stops the page moving underneath
     * a sheet that covers it, which is true whatever anyone's motion
     * preference is.
     */
    lenis.stop();

    return () => {
      // Runs on close, on unmount, and in between the two halves of a Lenis
      // instance swap — ReactLenis rebuilds the instance whenever an option
      // changes, and `open` re-runs this effect against the new one, so the
      // page is never left clipped by an instance that no longer exists.
      lenis.start();

      // Mirrors ScrollLock's release for the same reason: a clipped <html> is
      // not a scroll container and reports no scrollable overflow, so anything
      // that made ScrollTrigger re-measure while the menu was open — a window
      // resize is the easy one — recorded a maxScroll of 0. Cheap, and a no-op
      // when nothing refreshed.
      ScrollTrigger.refresh();
    };
  }, [lenis, open]);

  return (
    /**
     * A positioning box only — it is never transformed, and both sheets sit
     * inside it as absolutely positioned siblings. That is what gives each
     * sheet its own yPercent to travel on, and it means the stacking order is
     * plain DOM order: the back sheet is written first, so the front paints
     * over it with no z-index between them to keep in sync.
     *
     * z-40 sits under the header's z-50, so the logo, the menu button and the
     * CTA stay visible and clickable on top of the open panel — that is what
     * lets the same button close it. It is over every section, since
     * HeaderBg's backdrop pins at -z-1.
     *
     * pointer-events are off here so the invisible flattened strips never eat
     * clicks along the panel's bottom edge, and back on for the front sheet's
     * body alone — the back sheet is decoration and should never take a click.
     *
     * opacity-0 covers both sheets before hydration with a single channel, and
     * one nothing else animates, so it cannot collide with the transforms the
     * timeline owns.
     */
    <div
      ref={container}
      aria-hidden={!open}
      className="pointer-events-none fixed inset-x-0 top-0 z-40 opacity-0"
    >
      {/* Purely the shadow of the sheet in front of it: no content, nothing
          focusable, nothing for a screen reader. It exists to be seen for the
          fraction of a second it is ahead of the accent sheet. */}
      <Sheet
        shellRef={backShell}
        curveRef={backCurve}
        body="bg-foreground"
        curve="text-foreground"
      />

      <Sheet
        shellRef={frontShell}
        curveRef={frontCurve}
        body="pointer-events-auto bg-accent text-background"
        curve="text-accent"
      >
        <div className="mx-auto flex w-[90vw] justify-between pb-space-2x">
          <nav aria-label="Main" className="">
            <ul className="flex flex-col">
              {NAV_LINKS.map(({ label, href }) => (
                <li key={label}>
                  {/* hover goes to foreground, not accent: accent is the sheet
                    itself now, so the usual accent hover would erase the word
                    it was meant to pick out. Dark on orange is the same pair
                    the pills in Hero and Cta already use.

                    Closing on click is required, not a nicety: the scroll lock
                    below stops Lenis, so without this the sheet stays down
                    over a page the reader cannot move.

                    It is not yet enough to make the anchors *navigate*, and
                    that is a known gap rather than an oversight. Lenis handles
                    the anchor click synchronously, while the instance is still
                    stopped, so the scrollTo is dropped; React only closes the
                    menu and restarts Lenis afterwards. Separately, #footer is
                    a poor target regardless — the footer is pinned, so it
                    reports position: fixed and offsetTop 0. Both belong to the
                    same follow-up. */}
                  <a
                    href={href}
                    onClick={onNavigate}
                    className="heading-style block text-5xl transition-colors hover:text-foreground"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex flex-col items-end justify-end gap-space-base">
            <div className="flex flex-col items-end">
              <p>email</p>
              <p className="heading-style text-md font-normal text-white">
                contact@dbla.com
              </p>
            </div>
            <div className="flex flex-col items-end">
              <p>phone</p>
              <p className="heading-style text-md font-normal text-white">
                (+94) 123 456 789
              </p>
            </div>
            <div className="flex flex-col items-end">
              <p>socials</p>
              <p className="heading-style text-md font-normal text-white">
                linkedIn
              </p>
              <p className="heading-style text-md font-normal text-white">
                instagram
              </p>
              <p className="heading-style text-md font-normal text-white">
                tiktok
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto flex w-[90vw] items-end justify-between gap-space-2x py-space-base text-sm text-background">
          <span className="flex-1 text-left">&copy; {YEAR} DBLA</span>
          <p className="flex-1 text-center">
            Site by{" "}
            <a
              className="hover:underline"
              href="https://www.kaobui.com"
              target="_blank"
              rel="noreferrer"
            >
              Kaobui
            </a>
          </p>
          <nav aria-label="Legal" className="flex-1">
            <ul className="flex justify-end gap-space-2x">
              {LEGAL_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    onClick={onNavigate}
                    className="hover:underline"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </Sheet>
    </div>
  );
}
