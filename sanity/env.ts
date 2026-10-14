/**
 * The Sanity project the site reads from. Kept in env rather than inlined so a
 * preview deployment can point at another dataset without a code change.
 *
 * Each value is read as a literal `process.env.NEXT_PUBLIC_…` member access on
 * purpose: Next inlines public env vars at build time only when it can see the
 * whole expression, so a dynamic `process.env[name]` lookup would come back
 * undefined in the browser.
 */
export const projectId = required(
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  "NEXT_PUBLIC_SANITY_PROJECT_ID",
);

export const dataset = required(
  process.env.NEXT_PUBLIC_SANITY_DATASET,
  "NEXT_PUBLIC_SANITY_DATASET",
);

/**
 * The GROQ API version, pinned to a date so a Sanity release cannot change
 * what a query returns. Bump it deliberately, not as a side effect.
 */
export const apiVersion = "2026-10-01";

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}
