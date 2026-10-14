/**
 * The copyright year on the legal strip, shared by Footer and MenuPanel. The
 * links beside it are content and live in Sanity's Site settings; the year is
 * not, so it stays here.
 *
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
