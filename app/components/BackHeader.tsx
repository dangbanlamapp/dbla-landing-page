// No "use client", unlike Header. That directive is not decoration there — it
// exists because Header owns the single `open` state that MenuButton and
// MenuPanel both read, plus the Escape listener that closes it. With no menu
// there is no state, no handler and nothing to hydrate: this bar is static
// markup, and Logo says the same of itself.

import Link from "next/link";
import Logo from "./Logo";
import { BAR_ROW, BAR_SHELL, BAR_SURFACE } from "./bar";
import { PILL } from "./pill";

/**
 * The bar for routes that are not the homepage: the mark, and one way back.
 *
 * Deliberately not a prop on Header. The difference is not a hidden cell — the
 * menu is the reason Header is a client component at all, and the reason its
 * row is a three-column grid rather than two ends. Threading a `variant` through
 * would keep the state, the Escape listener and MenuPanel in the bundle of every
 * page that renders none of them.
 *
 * The surface is unconditional here for the same reason. Header drops its plate
 * while the panel is down; nothing can be down behind this one.
 */
export default function BackHeader() {
  return (
    <header className={BAR_SHELL}>
      <div className={`${BAR_ROW} ${BAR_SURFACE}`}>
        <Logo className="pointer-events-auto text-foreground" />

        {/*
          A `Link`, not the `<a href="#footer">` Header prints in this corner:
          that one is a same-page anchor, this is a route change, and next/link
          is what keeps it a client-side navigation rather than a full document
          load back to the homepage.

          Same pill as that CTA, down to the colour pair, so the two bars read as
          one component with one cell swapped — which is exactly what they are.
          It carries no `lg:hidden` counterpart either: Header can hide its CTA
          below lg because MenuPanel prints a copy at the foot of its nav, and
          there is no panel here to hold the fallback. This is the only way back,
          so it shows at every width.
        */}
        <Link
          href="/"
          className={`${PILL} pointer-events-auto bg-foreground text-background`}
        >
          Back to homepage
        </Link>
      </div>
    </header>
  );
}
