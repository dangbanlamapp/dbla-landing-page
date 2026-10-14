import { defineRouting } from "next-intl/routing";

/**
 * English at the bare paths it has always had — `/`, `/projects/rutine24` —
 * and Vietnamese under `/vi`. `as-needed` keeps every English URL already in
 * search results exactly where it was, so the switch costs no redirects.
 *
 * `localeDetection: false` on purpose. With it on, `/` would redirect by
 * Accept-Language or a cookie, and Googlebot — which crawls without either —
 * would only ever see one language. Each URL serves one language to everyone;
 * readers change it with the switcher, crawlers find the other one through
 * the hreflang links.
 */
export const routing = defineRouting({
  locales: ["en", "vi"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
