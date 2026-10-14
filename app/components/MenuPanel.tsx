"use client";

import { useEffect, useRef } from "react";
import TransitionLink from "./TransitionLink";
import { useLenis } from "lenis/react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { YEAR } from "./legal";
import { useSiteSettings } from "./SiteSettingsProvider";
import { PILL } from "./pill";
import ContactInfo from "./ContactInfo";
import LanguageSwitch from "./LanguageSwitch";
import { MENU_EASE as EASE, MENU_LEAD as LEAD } from "./menu-motion";
import { holdScroll } from "./scroll-hold";
import { useTranslations } from "next-intl";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const CURVE_CONTROL = 200;

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

// Home is "/" rather than "#" now that the menu also renders on /projects: a
// bare hash only means "the top of the homepage" while you are on it.
const NAV_LINKS = [
  { key: "home", href: "/" },
  { key: "about", href: "#" },
  { key: "projects", href: "/projects" },
  { key: "contact", href: "/contact" },
] as const;

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
  const t = useTranslations("Nav");
  const common = useTranslations("Common");
  const settings = useSiteSettings();

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

    // A shared hold, not a bare stop/start: a nav link closes the menu on the
    // same click that starts the route-change wipe, and a plain `start()` here
    // would free the page mid-wipe. Refresh only if this was the last hold —
    // otherwise whoever still holds it refreshes on their own release.
    const release = holdScroll(lenis);

    return () => {
      if (release()) ScrollTrigger.refresh();
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
            <nav aria-label={t("main")}>
              <ul className="flex flex-col">
                {NAV_LINKS.map(({ key, href }) => {
                  // Same element and styles either way — TransitionLink only when the
                  // href leaves the page, so the route change is client-side.
                  const Tag = isRoute(href) ? TransitionLink : "a";

                  return (
                    <li key={key}>
                      <Tag
                        href={href}
                        onClick={onNavigate}
                        className="heading-style block text-2xl transition-colors hover:text-foreground lg:text-5xl"
                      >
                        {t(key)}
                      </Tag>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <TransitionLink
              href="/contact"
              onClick={onNavigate}
              className={`${PILL} bg-foreground text-background lg:hidden`}
            >
              {common("getInTouch")}
            </TransitionLink>
          </div>
          <ContactInfo
            settings={settings}
            align="items-start lg:items-end"
            link="text-white hover:text-foreground focus-visible:text-foreground"
            onNavigate={onNavigate}
          />
        </div>

        <div className="mx-auto flex w-[90vw] flex-col items-start gap-space--3x py-space--2x text-xs text-background lg:flex-row lg:items-end lg:gap-space-2x lg:py-space-base lg:text-sm">
          <span className="text-left lg:flex-1">&copy; {YEAR} DBLA</span>
          <p className="lg:flex-1 lg:text-center">
            {common("siteBy")}{" "}
            <a
              className="hover:underline"
              href="https://www.kaobui.com"
              target="_blank"
              rel="noreferrer"
            >
              Kaobui
            </a>
          </p>
          {/* The language switch rides at the end of the legal row: the one
              strip printed on every route that has the menu. */}
          <div className="flex flex-row gap-space-base lg:flex-1 lg:justify-end lg:gap-space-2x">
            <nav aria-label={common("legal")}>
              <ul className="flex flex-row gap-space--3x whitespace-nowrap lg:gap-space-2x">
                {settings.legalLinks.map(({ label, href }) => (
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
            <LanguageSwitch className="gap-space--3x" onNavigate={onNavigate} />
          </div>
        </div>
      </Sheet>
    </div>
  );
}
