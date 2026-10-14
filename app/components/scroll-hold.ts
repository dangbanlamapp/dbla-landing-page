import type Lenis from "lenis";

/**
 * Shared scroll freeze. Several things stop the page independently — the
 * first-load lock (ScrollLock), the open menu (MenuPanel) and the route
 * transition overlay (PageTransition) — and they overlap. A bare
 * `lenis.stop()` / `lenis.start()` pair cannot express that: clicking a menu
 * link closes the menu, and its cleanup's `start()` would release the page in
 * the middle of the transition that same click began. Counting holds per
 * instance means scrolling only comes back when the last holder lets go.
 *
 * Keyed by instance because ReactLenis replaces the instance whenever an option
 * changes. Holds on a replaced instance die with it — `destroy()` strips the
 * `.lenis-stopped` class — so a WeakMap lets them go without bookkeeping.
 */
const holds = new WeakMap<Lenis, number>();

/**
 * Stops `lenis` and returns the matching release. The release is idempotent,
 * so it is safe to call from both a timer and an effect cleanup, and it
 * reports whether it was the one that actually resumed scrolling — callers use
 * that to decide whether a `ScrollTrigger.refresh()` is theirs to run. (A
 * stopped Lenis clips <html>, and a clipped document measures no scrollable
 * overflow, so whatever measured during the hold needs measuring again.)
 */
export function holdScroll(lenis: Lenis): () => boolean {
  holds.set(lenis, (holds.get(lenis) ?? 0) + 1);
  lenis.stop();

  let released = false;
  return () => {
    if (released) return false;
    released = true;

    const left = Math.max((holds.get(lenis) ?? 1) - 1, 0);
    holds.set(lenis, left);
    if (left > 0) return false;

    lenis.start();
    return true;
  };
}
