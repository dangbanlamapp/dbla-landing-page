/**
 * The shared shell of the top bar, split out for the same reason `pill.ts` and
 * `legal.ts` were: two headers now print it — the homepage's, with its centred
 * Menu toggle, and BackHeader on the routes that have no menu — and a class
 * string that exists twice is a class string that goes out of date once. The
 * drift would be silent here, since the two are never on screen together to be
 * compared.
 *
 * What is NOT in here is the column definition. Header lays its three cells out
 * on a grid so the Menu toggle can sit dead centre; BackHeader has two cells and
 * wants them at the ends. That is a real difference between the bars, not shared
 * shape, so each appends its own — BAR_ROW stays `flex … justify-between`, which
 * is already what Header falls back to below `lg`.
 */

/**
 * pointer-events are switched off here and back on for each cell, which is what
 * keeps the mostly-empty strip across the top of the page transparent to the
 * mouse — an invisible bar that still ate clicks would sit over the whole page
 * for the length of every scroll.
 *
 * z-50 puts it above every section (HeaderBg's backdrop pins at -z-1) and above
 * MenuPanel at z-40, while staying under the halftone wash on body::after at
 * z-index 99, so the texture passes over the bar like it does everything else.
 * That overlay ignores pointer events itself, so nothing here is shadowed by it.
 *
 * inset-x-0 + mx-auto on the row rather than `left-1/2 -translate-x-1/2`: a
 * transform on an ancestor turns any descendant's `position: fixed` into an
 * absolute, and MenuPanel is exactly that kind of descendant.
 */
export const BAR_SHELL =
  "pointer-events-none fixed inset-x-0 top-space--2x lg:top-space--1x z-50";

/**
 * w-[92vw] is the site's gutter — the footer's rows and the menu panel's own
 * nav use the same measure, so the logo lines up with the menu links below it
 * and with the copyright line far down the page.
 */
export const BAR_ROW =
  "mx-auto flex w-full items-center justify-between px-space-base py-space--2x lg:w-[92vw] lg:px-[1vw]";

/**
 * The bar's own plate. Header drops it while the menu is open — the panel
 * behind it is opaque, and a translucent blur over a solid sheet reads as a
 * smudge — so it is applied by the caller rather than baked into BAR_ROW.
 */
export const BAR_SURFACE = "rounded-md bg-background/15 backdrop-blur-2xl";
