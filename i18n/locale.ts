import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { type Locale, routing } from "./routing";

/**
 * The locale of the page being rendered, from its `[locale]` param. Every
 * layout, page and generateMetadata under app/[locale] starts with this.
 *
 * - The proxy only ever sends "en" or "vi", but a direct hit on /xx/projects
 *   reaches the segment with "xx": that is a 404, not a page in a language
 *   the site does not have.
 * - `setRequestLocale` lets next-intl read the locale from here rather than
 *   from the request headers, which would opt every page out of static
 *   rendering. It has to run in each layout and page, not just the root one.
 */
export async function pageLocale(
  params: Promise<{ locale: string }>,
): Promise<Locale> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return locale;
}
