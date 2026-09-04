// No "use client": the bar is static markup and every interactive piece in it
// is either a plain link or MenuButton, which owns its own client state when
// it eventually gets some. Keeping the directive off here is the point of
// splitting MenuButton out.

import Logo from "./Logo";
import MenuButton from "./MenuButton";

/**
 * The shape recipe, declared once and handed to both pills, so the menu button
 * and the CTA cannot drift apart into two sets of numbers that happen to match
 * today. The padding is the same pair the CTA buttons in Hero and Cta already
 * use, which is what makes all four read as one control family.
 *
 * `heading-style` brings uppercase/bold/tight *and* leading-none — the last of
 * those is load-bearing here: it takes the font's line box out of the height
 * calculation, so both pills are sized purely by the padding and end up
 * identical regardless of their label.
 */
const PILL =
  "heading-style rounded-md px-space-2x py-space--2x text-base transition-opacity hover:opacity-80";

export default function Header() {
  return (
    /**
     * The bar is fixed and full-bleed, so it spans a strip across the top of
     * the page that is mostly empty — and an empty strip that still eats
     * clicks would sit on top of HeaderBg for the whole scroll. pointer-events
     * are switched off on the shell and back on for each of the three cells,
     * which is what keeps the gaps between them transparent to the mouse.
     *
     * z-50 puts it above every section (HeaderBg's backdrop pins at -z-1)
     * while staying under the halftone wash on body::after at z-index 99, so
     * the texture passes over the bar like it does everything else. That
     * overlay ignores pointer events itself, so nothing here is shadowed by it.
     *
     * inset-x-0 + mx-auto rather than `left-1/2 -translate-x-1/2`: a transform
     * on an ancestor turns any descendant's `position: fixed` into an
     * absolute, and this is exactly the kind of shell someone would later hang
     * a fixed menu panel inside. Same centring, no trap.
     */
    <header className="pointer-events-none fixed inset-x-0 top-space--2x z-50">
      {/* w-[90vw] is the site's gutter — the footer's rows use the same
          measure, so the logo lines up with the copyright line far below it.

          The columns are [1fr auto 1fr] and not `grid-cols-3`: three equal
          fractions are minmax(auto, 1fr), so a long enough CTA label grows its
          own column and quietly pushes the middle one off-centre. Pinning the
          centre cell to `auto` and letting the two sides split what is left
          keeps Menu dead centre on the viewport no matter what flanks it. */}
      <div className="mx-auto grid w-[92vw] grid-cols-[1fr_auto_1fr] items-center bg-white/5 backdrop-blur-xl py-space--1x rounded-md px-[1vw]">
        <Logo className="pointer-events-auto justify-self-start " />

        <MenuButton
          className={`${PILL} pointer-events-auto justify-self-center bg-accent text-background`}
        />

        {/* #footer is a real target — the footer section carries that id — and
            Lenis is configured with `anchors: { offset: -80 }`, so the jump is
            smooth and lands clear of this bar rather than under it. */}
        <a
          href="#footer"
          className={`${PILL} pointer-events-auto justify-self-end bg-foreground text-background`}
        >
          Get in touch
        </a>
      </div>
    </header>
  );
}
