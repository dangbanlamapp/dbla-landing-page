/**
 * The studio's own details, edited in the Studio's "Site settings" singleton
 * and fetched once by the root layout. MenuPanel, Footer and the contact page
 * all print them, and an email address that exists in one place is one that
 * cannot go out of date in another.
 *
 * A plain module, not a component: this is data. ContactInfo is the markup,
 * SiteSettingsProvider hands it to the client components that need it.
 */
export type SiteLink = { label: string; href: string };

export type SiteSettings = {
  email: string;
  phone: string;
  /** href is "#" for a link whose page or profile does not exist yet. */
  socialLinks: SiteLink[];
  /** The legal strip, printed in both Footer and MenuPanel. */
  legalLinks: SiteLink[];
};
