// "use client" now, where it deliberately was not before. The bar itself is
// still static markup — what moved in is the single source of truth for
// whether the menu is open. MenuButton animates its label to match it and
// MenuPanel drops to match it, and neither can own a value the other reads.
// Splitting MenuButton out is still what keeps that state next to the markup
// it belongs to rather than in a provider three files away.
"use client";

import { useEffect, useState } from "react";
import Logo from "./Logo";
import MenuButton from "./MenuButton";
import MenuPanel from "./MenuPanel";
const PILL =
  "heading-style rounded-md px-space-2x py-space--2x text-base transition-opacity hover:opacity-80";
const BAR_SURFACE = "rounded-md bg-background/15 backdrop-blur-2xl";
export default function Header() {
  const [open, setOpen] = useState(false);

  // Escape closes it. Bound only while open, so the page carries no keyboard
  // listener the rest of the time. Note this is the whole of the focus story
  // for now — the panel is not a focus trap and does not move focus into
  // itself, so a keyboard reader still tabs through the page behind it.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      {/* Before the bar in the DOM but behind it on screen, by z-index rather
          than by order — the bar has to stay clickable over the open panel. */}
      <MenuPanel open={open} onNavigate={() => setOpen(false)} />

      {/**
       * The bar is fixed and full-bleed, so it spans a strip across the top of
       * the page that is mostly empty — and an empty strip that still eats
       * clicks would sit on top of HeaderBg for the whole scroll. pointer-events
       * are switched off on the shell and back on for each of the three cells,
       * which is what keeps the gaps between them transparent to the mouse.
       *
       * z-50 puts it above every section (HeaderBg's backdrop pins at -z-1)
       * and above the menu panel at z-40, while staying under the halftone wash
       * on body::after at z-index 99, so the texture passes over the bar like
       * it does everything else. That overlay ignores pointer events itself, so
       * nothing here is shadowed by it.
       *
       * inset-x-0 + mx-auto rather than `left-1/2 -translate-x-1/2`: a transform
       * on an ancestor turns any descendant's `position: fixed` into an
       * absolute, and MenuPanel is exactly that kind of descendant.
       */}
      <header className="pointer-events-none fixed inset-x-0 top-space--1x z-50">
        {/* w-[90vw] is the site's gutter — the footer's rows and the panel's
            own nav use the same measure, so the logo lines up with the menu
            links below it and with the copyright line far down the page.

            The columns are [1fr auto 1fr] and not `grid-cols-3`: three equal
            fractions are minmax(auto, 1fr), so a long enough CTA label grows
            its own column and quietly pushes the middle one off-centre.
            Pinning the centre cell to `auto` and letting the two sides split
            what is left keeps Menu dead centre on the viewport no matter what
            flanks it. */}
        <div
          className={`mx-auto grid w-[92vw] grid-cols-[1fr_auto_1fr] items-center px-[1vw] py-space--2x ${
            open ? "" : BAR_SURFACE
          }`}
        >
          <Logo className="pointer-events-auto justify-self-start text-foreground" />

          <MenuButton
            open={open}
            onToggle={() => setOpen((wasOpen) => !wasOpen)}
            className={`${PILL} pointer-events-auto justify-self-center bg-accent text-background`}
          />

      
          <a
            href="#footer"
            className={`${PILL} pointer-events-auto justify-self-end bg-foreground text-background`}
          >
            Get in touch
          </a>
        </div>
      </header>
    </>
  );
}
