import type { routing } from "@/i18n/routing";
import type messages from "./messages/en.json";

/**
 * Types next-intl against this site: `useLocale()` returns "en" | "vi" rather
 * than string, and every `t("…")` key is checked against messages/en.json —
 * a typo or a key that was renamed fails the build instead of printing the
 * key itself on the page. en.json is the reference; vi.json must mirror it.
 */
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
