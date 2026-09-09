"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useLenis } from "lenis/react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { LEGAL_LINKS, YEAR } from "./legal";
import { PILL } from "./pill";
import ContactInfo from "./ContactInfo";

gsap.registerPlugin(useGSAP, CustomEase, ScrollTrigger);

const EASE = CustomEase.create("menu", "M0,0 C0.76,0 0.24,1 1,1");

const CURVE_CONTROL = 200;

const LEAD = 0.08;

/** Both ends of the tween are this same shape with a different control y. */
const path = (control: number) => `M0 0 L100 0 Q50 ${control} 0 0`;

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
        className={`flex h-dvh w-full flex-col justify-end lg:h-[80vh] ${body}`}
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
  { label: "Contact", href: "/contact" },
];

/** In-page hashes stay plain anchors so Lenis keeps owning the scroll (its
 *  `anchors: { offset: -80 }`); only real routes go through the router. */
const isRoute = (href: string) => href.startsWith("/");

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
    if (open) timeline.current?.play();
    else timeline.current?.reverse();
  }, [open]);

  useEffect(() => {
    if (!lenis || !open) return;

    lenis.stop();

    return () => {
      lenis.start();

      ScrollTrigger.refresh();
    };
  }, [lenis, open]);

  return (
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
                {NAV_LINKS.map(({ label, href }) => {
                  // Same element and styles either way — Link only when the
                  // href leaves the page, so the route change is client-side.
                  const Tag = isRoute(href) ? Link : "a";

                  return (
                    <li key={label}>
                      <Tag
                        href={href}
                        onClick={onNavigate}
                        className="heading-style block text-2xl transition-colors hover:text-foreground lg:text-5xl"
                      >
                        {label}
                      </Tag>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <Link
              href="/contact"
              onClick={onNavigate}
              className={`${PILL} bg-foreground text-background lg:hidden`}
            >
              Get in touch
            </Link>
          </div>
          {/* Shared with the contact page — see ContactInfo. The sheet under
              this is `bg-accent text-background`, so the labels come out beige
              on orange for free and only the interactive text needs a pair
              stated: white, resolving to the dark foreground on hover. */}
          <ContactInfo
            align="items-start lg:items-end"
            link="text-white hover:text-foreground focus-visible:text-foreground"
            onNavigate={onNavigate}
          />
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
