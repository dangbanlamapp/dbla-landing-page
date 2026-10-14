"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLenis } from "lenis/react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MENU_EASE, MENU_LEAD } from "./menu-motion";
import { RevealContext, useRevealed } from "./Preloader";
import { holdScroll } from "./scroll-hold";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// Imitates the menu opening: a black layer leads and the accent layer chases
// it MENU_LEAD behind, on the menu's own curve. COVER is one disc growing from
// nothing to full-screen; UNCOVER is one hole growing through it. Each leg
// lasts its duration plus the lead, so with ~80ms for a prefetched route to
// commit in between the whole run is
//   (0.68 + 0.08) + 0.08 + (0.68 + 0.08) ≈ 1.6s.
const COVER = 1.2;
const UNCOVER = 1.2;

// The viewport's diagonal: the disc's diameter, and twice the radius the hole
// has to reach. Sized to land *exactly* on the corners, not past them, because
// that is what keeps the stagger visible. An oversized disc (it was 142vmax,
// enough for any aspect ratio) crosses the corners at ~83% scale, so the last
// stretch of the ease — the slow settle where the accent visibly catches up
// with the black — played off-screen, and the pair read as one simultaneous
// burst. Matched to the corners, the whole curve happens where it can be seen,
// as the menu's sheets do. Pure CSS, so a resize mid-run stays covered.
const DIAGONAL = "hypot(100vw, 100vh)";

// If the new route has not committed this long after the push — a slow or
// failed fetch, a redirect back to where we started — open the overlay anyway
// rather than leaving the reader staring at a blank screen.
const STALL_MS = 4000;

type NavigateOptions = { replace?: boolean; scroll?: boolean };

/**
 * Starts an animated route change. Returns true when it has taken the
 * navigation over (the caller must then cancel its own), false when the caller
 * should just navigate normally.
 */
type Navigate = (href: string, options?: NavigateOptions) => boolean;

// null outside the provider, where TransitionLink degrades to a plain Link.
const TransitionContext = createContext<Navigate | null>(null);

export const usePageTransition = () => useContext(TransitionContext);

/**
 * One colour of the overlay. Two separate mechanisms, because they are two
 * different shapes: the cover is a solid disc, so it is a plain `scale` on a
 * round box — a compositor-only tween. The reveal is a *hole* in that disc,
 * which no transform can make, so it is a radial-gradient mask on the layer
 * whose transparent centre grows with the layer's own `--hole` (the 1px soft
 * edge keeps the rim from stair-stepping). Each layer carries its own variable
 * so the two holes can open a beat apart.
 *
 * `--hole` is a unitless 0→1 progress rather than a length: the radius it
 * stands for is a `hypot()` expression, which GSAP cannot interpolate, so the
 * multiplication happens in CSS instead. The +1px at the far end opens the
 * hole a hair past the corners, so no antialiased rim is left in them.
 */
function Layer({
  layerRef,
  discRef,
  fill,
}: {
  layerRef: React.RefObject<HTMLDivElement | null>;
  discRef: React.RefObject<HTMLDivElement | null>;
  fill: string;
}) {
  return (
    <div
      ref={layerRef}
      style={
        {
          "--hole": 0,
          "--hole-r": `calc(var(--hole) * (${DIAGONAL} / 2 + 1px))`,
          maskImage:
            "radial-gradient(circle at 50% 50%, transparent var(--hole-r), #000 calc(var(--hole-r) + 1px))",
        } as React.CSSProperties
      }
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
    >
      <div
        ref={discRef}
        // Inline `transform`, not Tailwind's `scale-0`: v4 compiles that to
        // the separate CSS `scale` property, which multiplies with the
        // `transform` GSAP writes and would hold the disc at zero forever.
        style={{
          // +2px so its antialiased rim falls just outside the corners.
          width: `calc(${DIAGONAL} + 2px)`,
          height: `calc(${DIAGONAL} + 2px)`,
          transform: "scale(0)",
        }}
        className={`shrink-0 rounded-full ${fill}`}
      />
    </div>
  );
}

/**
 * Route-change transition, in the menu's image: a black disc grows from the
 * centre with an accent disc close behind it until both cover the outgoing
 * page; the route changes behind them; then a hole opens through the accent
 * from the centre, a hole through the black chases it, and the incoming page
 * shows through. The order mirrors the menu closing — the layer that arrived
 * last leaves first. Scrolling is held for the whole run.
 *
 * Opt-in. Nothing here listens for clicks: only `TransitionLink` calls in,
 * through context, so a plain `Link` or `<a>` (external links, anchors) keeps
 * its own instant behaviour. Back/forward are never covered either — popstate
 * cannot be held while something animates.
 *
 * Lives in the root layout via SmoothScroll — it needs `useLenis` — and so
 * persists across navigation, which is what lets one overlay outlive the page
 * that started it.
 */
export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const overlay = useRef<HTMLDivElement>(null);
  // Back is the black layer, front the accent one over it — MenuPanel's names.
  const backLayer = useRef<HTMLDivElement>(null);
  const backDisc = useRef<HTMLDivElement>(null);
  const frontLayer = useRef<HTMLDivElement>(null);
  const frontDisc = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const lenis = useLenis();
  const revealed = useRevealed();

  // The path the overlay is covering, from the moment it is fully up until it
  // starts to open; null otherwise. Any *other* path is the incoming page: it
  // sees `revealed === false` through the context below and holds its entrance
  // exactly as it would behind the preloader, then plays it as the hole opens
  // instead of underneath the disc where nobody sees it. Keyed on the path
  // rather than a plain flag so the outgoing page never sees `revealed` flip —
  // it would revert every tween and pin it owns, for nothing, while covered.
  // Back/forward never set it, so those pages enter straight away.
  const [gatedFrom, setGatedFrom] = useState<string | null>(null);

  // `navigate` is handed out through context, so it should stay one stable
  // function; it reads anything that changes through refs instead.
  // ReactLenis swaps its instance whenever an option changes.
  const lenisRef = useRef(lenis);
  useEffect(() => {
    lenisRef.current = lenis;
  }, [lenis]);

  const phase = useRef<"idle" | "covering" | "covered" | "uncovering">("idle");
  // Both built inside useGSAP so their tweens belong to its context.
  const cover = useRef<(href: string, options: NavigateOptions) => void>(
    () => {},
  );
  const uncover = useRef(() => {});

  useGSAP(
    (_, contextSafe) => {
      const safe = contextSafe!;

      let release: (() => boolean) | null = null;
      let stall = 0;

      const layers = [backLayer.current, frontLayer.current];
      const discs = [backDisc.current, frontDisc.current];

      uncover.current = safe(() => {
        // No-op unless the discs are fully up and waiting on a route — which is
        // what makes it safe to call from both the stall timer and the effect.
        if (phase.current !== "covered") return;
        phase.current = "uncovering";
        window.clearTimeout(stall);

        gsap
          .timeline({
            defaults: { duration: UNCOVER, ease: MENU_EASE },
            // Lets the new page's entrance go as the first hole starts to
            // open; it is still behind the black until the second follows.
            onStart: () => setGatedFrom(null),
            onComplete: () => {
              // Back to rest. Visibility is what keeps the idle overlay from
              // eating clicks, so it goes with everything else.
              gsap.set(overlay.current, { visibility: "hidden" });
              gsap.set(layers, { "--hole": 0 });
              gsap.set(discs, { scale: 0 });
              phase.current = "idle";

              // The new page built its ScrollTriggers against a clipped
              // document — re-measure, unless another hold (the first-load
              // lock) is still clipping it, in which case the refresh is theirs.
              if (release?.()) ScrollTrigger.refresh();
              release = null;
            },
          })
          // Accent first, black chasing it: the menu closing, front sheet
          // leading the way back out.
          .to(frontLayer.current, { "--hole": 1 }, 0)
          .to(backLayer.current, { "--hole": 1 }, MENU_LEAD);
      });

      cover.current = safe((href: string, options: NavigateOptions) => {
        phase.current = "covering";

        // Held from the first frame, not from the route change: a wheel flick
        // during the cover would otherwise ease the old page around
        // underneath. ScrollReset's jump to the top passes `force`, so it
        // still lands while this is held.
        const current = lenisRef.current;
        release = current ? holdScroll(current) : null;

        // Next has usually prefetched it already (Links prefetch in view);
        // this covers anything that was not, while the disc is still growing.
        router.prefetch(href);

        gsap
          .timeline({
            onComplete: () => {
              phase.current = "covered";
              // Still the outgoing path here — the push has not committed.
              setGatedFrom(location.pathname);
              if (options.replace) router.replace(href, options);
              else router.push(href, options);
              stall = window.setTimeout(uncover.current, STALL_MS);
            },
          })
          .set(layers, { "--hole": 0 })
          .set(overlay.current, { visibility: "visible" })
          // Black first, accent close behind — the menu's back and front
          // sheets, with the same lead between them.
          .fromTo(
            backDisc.current,
            { scale: 0 },
            { scale: 1, duration: COVER, ease: MENU_EASE },
            0,
          )
          .fromTo(
            frontDisc.current,
            { scale: 0 },
            { scale: 1, duration: COVER, ease: MENU_EASE },
            MENU_LEAD,
          );
      });

      return () => {
        window.clearTimeout(stall);
        // Never leave the page frozen behind a torn-down transition
        // (StrictMode's dev double-mount lands here).
        release?.();
        release = null;
        phase.current = "idle";
      };
    },
    { scope: overlay },
  );

  const navigate = useCallback<Navigate>((href, options = {}) => {
    // Same page — the logo on the homepage, say. Nothing to cover; let the
    // Link do whatever it would have done.
    const url = new URL(href, location.href);
    if (url.pathname === location.pathname) return false;

    // One transition at a time. A second click while the disc is moving is
    // swallowed rather than queued — it would otherwise navigate instantly
    // underneath the overlay.
    if (phase.current !== "idle") return true;

    // Same deal as the rest of the site: readers who asked for less motion get
    // the plain instant route change.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return false;
    }

    cover.current(href, options);
    return true;
  }, []);

  // The new route has committed: open the hole. A no-op on first mount and on
  // back/forward, where nothing is covering.
  useEffect(() => {
    uncover.current();
  }, [pathname]);

  const gated = gatedFrom !== null && pathname !== gatedFrom;

  return (
    <TransitionContext.Provider value={navigate}>
      <RevealContext.Provider value={revealed && !gated}>
        {children}
      </RevealContext.Provider>
      {/*
        Starts `invisible` with both discs at scale 0, so nothing can flash
        before hydration. z-80 sits over the header and menu (z-40/50) and
        under the preloader (z-90); while visible it also eats clicks, so the
        old page cannot be poked mid-transition.
      */}
      <div ref={overlay} aria-hidden className="invisible fixed inset-0 z-80">
        <Layer layerRef={backLayer} discRef={backDisc} fill="bg-foreground" />
        <Layer layerRef={frontLayer} discRef={frontDisc} fill="bg-accent" />
      </div>
    </TransitionContext.Provider>
  );
}
