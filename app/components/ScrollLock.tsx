"use client";

import { useEffect, useRef } from "react";
import { useLenis } from "lenis/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// How long the document stays frozen after load. The hero entrance is the
// thing being protected: its headings run a 0.5s delay + 1.5s tween, and the
// supporting copy lands its last line at ~2.2s, so two seconds covers the part
// that reads as "the page arriving".
const LOCK_MS = 2000;

/**
 * Freezes scrolling for the first moments of a page load and guarantees the
 * reader starts at the top.
 *
 * Lives in its own component rather than inside SmoothScroll because `useLenis`
 * reads the context SmoothScroll itself provides, and because this is the one
 * place GSAP and Lenis are allowed to meet — SmoothScroll stays a pure config
 * wrapper.
 */
export default function ScrollLock() {
  const lenis = useLenis();

  // Absolute release time rather than a duration, so a Lenis instance swap
  // (ReactLenis rebuilds the instance whenever an option changes) or
  // StrictMode's double-mount re-locks for the time that is *left* instead of
  // restarting a fresh two seconds.
  const releaseAt = useRef<number | null>(null);

  // Runs before the provider's effect creates the Lenis instance — child
  // effects fire first — so Lenis initialises already reading an offset of 0.
  useEffect(() => {
    // The scroll restoration mode lives on the session history entry, and a
    // reload reuses that entry, so this survives into every later reload of
    // this tab: from the second load on the browser never restores an offset
    // and there is nothing to correct. On the very first load it is set too
    // late to stop a restore, which is what the scrollTo below is for.
    //
    // This has to be a client effect. A bare inline <script> would run at parse
    // time — early enough to beat the restore outright — but React warns that
    // scripts inside components never execute on a client render, and
    // next/script's `beforeInteractive` only queues inline code on
    // `self.__next_s` for the Next runtime to drain once its bundle has loaded,
    // which is later than this effect, not earlier.
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";

    // Reduced-motion readers get this too: starting at the top of the page is
    // not a motion preference, it is where a reload should land.
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    // undefined on the first pass: child effects run before the provider's,
    // so the instance only shows up on the render after it is created.
    if (!lenis) return;

    // Readers who asked for less motion get no forced wait. The lock exists to
    // protect an animation they are not being shown at full strength anyway,
    // and holding their input hostage is the worse end of the trade.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    releaseAt.current ??= performance.now() + LOCK_MS;
    const remaining = releaseAt.current - performance.now();
    if (remaining <= 0) return;

    // Order matters. `stop()` puts `overflow: clip` on <html> (the
    // `.lenis-stopped` rule in lenis.css) — that is what blocks the scrollbar,
    // arrow keys and space bar as well as the wheel. Landing at 0 first means
    // we never clip the document while it is parked mid-page with no way out.
    //
    // `force` because a re-run may find the instance already stopped, and
    // `scrollTo` ignores a stopped instance otherwise.
    lenis.scrollTo(0, { immediate: true, force: true });
    lenis.stop();

    const timer = window.setTimeout(() => {
      lenis.start();

      // A clipped <html> is not a scroll container, so it reports no scrollable
      // overflow. ScrollTrigger refreshes itself on the window "load" event,
      // which can easily land inside the lock on a page with background
      // imagery — anything it measured then saw a maxScroll of 0. Re-measure
      // now that the document scrolls again; it is a no-op if nothing refreshed.
      ScrollTrigger.refresh();
    }, remaining);

    return () => {
      window.clearTimeout(timer);
      // Never leave a destroyed-or-replaced instance holding the page clipped.
      lenis.start();
    };
  }, [lenis]);

  return null;
}
