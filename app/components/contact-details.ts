/**
 * The studio's own details, in one place for the same reason `legal.ts` holds
 * the legal row: MenuPanel and the contact page both print them now, and an
 * email address that exists twice is one that goes out of date once — silently,
 * since the two are never on screen together to be compared.
 *
 * A plain module, not a component: this is data. ContactInfo is the markup.
 */
export const EMAIL = "contact@dbla.com";
export const PHONE = "(+94) 123 456 789";

/** href is a placeholder — the real profile URLs are not wired up yet. */
export const SOCIAL_LINKS = [
  { label: "linkedIn", href: "#" },
  { label: "instagram", href: "#" },
  { label: "tiktok", href: "#" },
];
