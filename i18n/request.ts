import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/**
 * The locale and UI strings for one request. CMS content is not here — that
 * is fetched per locale from Sanity; these are the words that live in code
 * (section headings, buttons, the menu), in messages/<locale>.json.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
