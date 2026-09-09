// "use client" now, where it deliberately was not before. The bar itself is
// still static markup — what moved in is the single source of truth for
// whether the menu is open. MenuButton animates its label to match it and
// MenuPanel drops to match it, and neither can own a value the other reads.
// Splitting MenuButton out is still what keeps that state next to the markup
// it belongs to rather than in a provider three files away.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "./Logo";
import MenuButton from "./MenuButton";
import MenuPanel from "./MenuPanel";
import { BAR_ROW, BAR_SHELL, BAR_SURFACE } from "./bar";
import { PILL } from "./pill";

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

      {/* Shell, row and plate are shared with BackHeader — see bar.ts for why
          each of the three is written where it is. */}
      <header className={BAR_SHELL}>
        {/* The columns are this bar's own, and they are [1fr auto 1fr] rather
            than `grid-cols-3`: three equal fractions are minmax(auto, 1fr), so
            a long enough CTA label grows its own column and quietly pushes the
            middle one off-centre. Pinning the centre cell to `auto` and letting
            the two sides split what is left keeps Menu dead centre on the
            viewport no matter what flanks it. BAR_ROW's `flex … justify-between`
            is what this falls back to below lg, where there is no CTA to centre
            the toggle against.

            The plate is dropped while the panel is down: it is opaque, and a
            translucent blur over a solid sheet reads as a smudge. */}
        <div
          className={`${BAR_ROW} grid-cols-[1fr_auto_1fr] lg:grid ${
            open ? "" : BAR_SURFACE
          }`}
        >
          {/* Same closer the panel's own links get — the logo is reachable
              over the open panel, and routing to `/` client-side would
              otherwise leave this Header mounted with `open` still true. */}
          <Logo
            onNavigate={() => setOpen(false)}
            className="pointer-events-auto justify-self-start text-foreground"
          />

          <MenuButton
            open={open}
            onToggle={() => setOpen((wasOpen) => !wasOpen)}
            className={`${PILL} pointer-events-auto justify-self-center bg-accent text-background`}
          />

          {/* Gone below `lg`, where the bar has only the width for the logo
              and the Menu toggle. It is not dropped for those readers, only
              moved: MenuPanel prints the same CTA at the foot of its nav
              column behind a matching `lg:hidden`, so exactly one copy is
              ever reachable and the small-screen route to it is a tap deeper
              rather than missing. The two breakpoints are a pair — move one and
              the CTA either doubles up or vanishes. So is the href: this and
              the panel's copy have to point at the same place. */}
          <Link
            href="/contact"
            className={`${PILL} pointer-events-auto hidden justify-self-end bg-foreground text-background lg:block`}
          >
            Get in touch
          </Link>
        </div>
      </header>
    </>
  );
}
