/**
 * The shared shape of the site's pill buttons — the Menu toggle, the header's
 * "Get in touch", and the copy of that CTA the menu panel shows in its place
 * below `lg`. Colour is deliberately *not* in here: the same shape is painted
 * accent-on-background in one spot and foreground-on-background in another,
 * so each caller appends its own pair.
 *
 * A plain module for the same reason `legal.ts` is one: Header and MenuPanel
 * are separate client components, and the header CTA is now printed in both.
 * A class string that exists twice is a class string that goes out of date
 * once — and here the drift would be silent, since the two are never on
 * screen together to be compared.
 */
export const PILL =
  "heading-style rounded-md px-space-2x py-space--2x text-base transition-opacity hover:opacity-80";
