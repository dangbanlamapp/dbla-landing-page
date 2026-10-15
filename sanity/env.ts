/**
 * The Sanity project the site reads from. Kept in env rather than inlined so a
 * preview deployment can point at another dataset without a code change.
 *
 * Each value is read as a literal `process.env.NEXT_PUBLIC_…` member access on
 * purpose: Next inlines public env vars at build time only when it can see the
 * whole expression, so a dynamic `process.env[name]` lookup would come back
 * undefined in the browser.
 *
 * TEMPORARY: the fallbacks below let Vercel build before these vars are set in
 * its project settings. Both values are public (they ship in the browser
 * bundle). Once the vars are set on Vercel, drop the fallbacks and restore a
 * check that throws when either is missing.
 */
export const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "ob6q59v5";

export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";

/**
 * The GROQ API version, pinned to a date so a Sanity release cannot change
 * what a query returns. Bump it deliberately, not as a side effect.
 */
export const apiVersion = "2026-10-01";
