/**
 * The legal strip's data, shared by Footer and MenuPanel — the same row is
 * printed in both, and a list of routes that exists twice is a list that goes
 * out of date once.
 *
 * A plain module rather than exports from Footer.tsx, because MenuPanel is a
 * client component: importing a constant out of Footer would drag that whole
 * server component — circle masks, wordmark path and all — into the client
 * bundle for the sake of four strings.
 */

/**
 * Hard-coded rather than `new Date().getFullYear()`. On a fully static page a
 * computed year is evaluated once at build time and then frozen into the HTML
 * — it would be right today, go stale silently on the next 1 January, and only
 * unstick itself whenever the site next happens to be rebuilt. Computing it on
 * the client swaps that for a hydration mismatch, and now that MenuPanel reads
 * this too there is a client component in the picture, so that route is worse
 * here than it was when only Footer used it. An explicit constant at least
 * fails visibly.
 */
export const YEAR = 2026;

/** href is a placeholder — these routes do not exist yet. */
export const LEGAL_LINKS = [
  { label: "Terms of Service", href: "#" },
  { label: "Privacy Policy", href: "#" },
  { label: "Cookie Settings", href: "#" },
];
