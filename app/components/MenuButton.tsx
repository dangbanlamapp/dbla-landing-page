// No "use client": the button is static markup with no handler yet — there is
// no menu for it to open. Add the directive (and the useGSAP/scope shape the
// other sections use) at the same time as the panel it will toggle, so the
// open state and the animation land together rather than a `useState` sitting
// here doing nothing.

/**
 * Thin on purpose. It is a separate file rather than markup inlined into
 * Header because this is the one element in the bar that will need client
 * state — the open/closed toggle and its aria-expanded — and keeping it apart
 * is what lets Header stay a Server Component when that day comes.
 *
 * The look is passed in, not owned here: Header defines the pill recipe once
 * and hands the same one to this and to the CTA, so the two can't drift.
 */
export default function MenuButton({ className }: { className?: string }) {
  return (
    <button type="button" aria-label="Open menu" className={className}>
      Menu
    </button>
  );
}
