"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useLenis } from "lenis/react";
import { scrollToAnchor, whenFree } from "./scroll-hold";

/**
 * Lands every client-side route change at the top of the new page.
 *
 * Next's App Router does try to do this itself, and Lenis is why it does not
 * stick. In `root` mode Lenis keeps its own record of where the page is —
 * `targetScroll` / `animatedScroll` — and with lerp at 0.05 it is very often
 * still easing toward that target when a link is clicked. Next's native jump
 * to 0 then lasts exactly one frame before Lenis carries on writing the old
 * page's offset onto the new document. Next also only scrolls when the new
 * segment is out of view, and decides that against a document still carrying
 * the homepage's pin spacers. Going through `lenis.scrollTo` resets Lenis's
 * record and the native position together, so nothing is left to drag it back.
 *
 * A layout effect, and rendered BEFORE `{children}` in SmoothScroll, on
 * purpose. React runs layout effects in tree order, so this one runs ahead of
 * the incoming page's `useGSAP` (itself a layout effect). Every ScrollTrigger
 * the new page builds is therefore created at scroll 0; reset any later and a
 * page entered from deep in the homepage would build its triggers at that old
 * offset, and the one-shot entrances (the /projects card wipes, the next-
 * project circle) would fire at once, off-screen, before the reader got there.
 * The outgoing page's triggers are already gone by then — unmount cleanup runs
 * before any layout effect in the same commit.
 *
 * The first load is skipped: that is ScrollLock's job, which also has to cope
 * with the browser's own scroll restoration and the preloader's lock.
 *
 * Pathname only. A query-string change on the same page is not a new page, and
 * in-page `#anchor` links never change the pathname, so Lenis's `anchors`
 * option (and TransitionLink) keeps handling those.
 *
 * A cross-page link to `/page#anchor` — the nav's About, "/#our-team" — still
 * lands at the top first, for the trigger reason above, and then eases to the
 * anchor once the page is free to scroll: after the wipe's hold lifts and its
 * ScrollTrigger.refresh() has re-measured the pins. The hash is read at that
 * point, not now, so it never depends on when Next writes the new URL.
 */
export default function ScrollReset() {
  const pathname = usePathname();
  const lenis = useLenis();

  const previous = useRef(pathname);

  useLayoutEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;

    // `force` because the instance is usually stopped here: PageTransition
    // holds scrolling for the whole wipe, so every animated route change
    // commits while Lenis is stopped (and navigating from the open menu adds
    // the menu's own hold on top). `immediate` because an eased
    // scroll across a route change would show the reader the new page sliding
    // up from wherever the old one was. No Lenis yet (it is created in the
    // provider's effect) — the native call is then the whole job.
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo(0, 0);

    if (lenis) whenFree(lenis, () => scrollToAnchor(lenis, location.hash));
  }, [pathname, lenis]);

  return null;
}
