"use client";

import { useEffect, useRef } from "react";
import { useLenis } from "lenis/react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { LEGAL_LINKS, YEAR } from "./legal";
import { PILL } from "./pill";
import CopyButton from "./CopyButton";

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
    <div ref={shellRef} className="absolute inset-x-0 top-0">
      <div
        className={`flex h-dvh w-full flex-col justify-end pb-space-6x lg:h-[80vh] lg:pb-0 ${body}`}
      >
        {children}
      </div>
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

const NAV_LINKS = [
  { label: "Home", href: "#" },
  { label: "About", href: "#" },
  { label: "Services", href: "#" },
  { label: "Contact", href: "#footer" },
];

/**
 * Named rather than written straight into the markup because each one is now
 * needed twice — once as the text on screen and once as the string the copy
 * button puts on the clipboard. Two literals is two chances for the displayed
 * address and the copied address to drift apart, which is the one bug a copy
 * button can have that nobody notices until a mail bounces.
 */
const EMAIL = "contact@dbla.com";
const PHONE = "(+94) 123 456 789";

/** href is a placeholder — the real profile URLs are not wired up yet. */
const SOCIAL_LINKS = [
  { label: "linkedIn", href: "#" },
  { label: "instagram", href: "#" },
  { label: "tiktok", href: "#" },
];

/**
 * A labelled contact line whose value is itself the copy button.
 *
 * The icon swaps sides with the breakpoint, and that is the fiddly part: the
 * "copied" confirmation appears beside the icon and widens the row, so the
 * icon has to sit on whichever end the column is NOT aligned to, or the value
 * gets shoved sideways for two seconds every time it is copied. Right-aligned
 * at lg, so the icon leads and the row grows leftward; left-aligned below it,
 * so flex-row-reverse trails the icon and the row grows right instead. Either
 * way the address itself never moves.
 */
function ContactDetail({
  label,
  value,
  copyLabel,
}: {
  label: string;
  value: string;
  copyLabel: string;
}) {
  return (
    <div className="flex flex-col items-start lg:items-end">
      <p>{label}</p>
      <CopyButton
        value={value}
        label={copyLabel}
        className="flex-row-reverse lg:flex-row"
      >
        <span className="heading-style text-md font-normal">{value}</span>
      </CopyButton>
    </div>
  );
}

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
      gsap.set(container.current, { opacity: 1 });

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
        <div className="mx-auto flex w-full flex-col gap-space-3x px-space-base pb-space-2x lg:w-[90vw] lg:flex-row lg:justify-between lg:gap-0 lg:px-0">
          <div className="flex flex-col items-start gap-space-base">
            <nav aria-label="Main">
              <ul className="flex flex-col">
                {NAV_LINKS.map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      onClick={onNavigate}
                      className="heading-style block text-2xl transition-colors hover:text-foreground lg:text-5xl"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <a
              href="#footer"
              onClick={onNavigate}
              className={`${PILL} bg-foreground text-background lg:hidden`}
            >
              Get in touch
            </a>
          </div>
          <div className="flex flex-col items-start justify-end gap-space-base lg:items-end">
            <ContactDetail
              label="email"
              value={EMAIL}
              copyLabel="email address"
            />
            <ContactDetail
              label="phone"
              value={PHONE}
              copyLabel="phone number"
            />
            <div className="flex flex-col items-start lg:items-end">
              <p>socials</p>
              <nav aria-label="Social">
                <ul className="flex flex-col items-start lg:items-end">
                  {SOCIAL_LINKS.map(({ label, href }) => (
                    <li key={label}>
                      <a
                        href={href}
                        onClick={onNavigate}
                        className="heading-style block text-md font-normal text-white transition-colors hover:text-foreground"
                      >
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </div>
        </div>

        <div className="mx-auto flex w-[90vw] flex-col items-start gap-space--3x py-space--2x text-xs text-background lg:flex-row lg:items-end lg:gap-space-2x lg:py-space-base lg:text-sm">
          <span className="text-left lg:flex-1">&copy; {YEAR} DBLA</span>
          <p className="lg:flex-1 lg:text-center">
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
          <nav aria-label="Legal" className="lg:flex-1">
            <ul className="flex flex-row gap-space--3x lg:justify-end lg:gap-space-2x">
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
