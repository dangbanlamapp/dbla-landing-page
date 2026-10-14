"use client";

import { useLocale, useTranslations } from "next-intl";
import { getPathname, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/** Each language named in itself, so a reader who cannot read the page they
 *  landed on can still find their own. */
const NAMES = { en: "English", vi: "Tiếng Việt" } as const;

/**
 * EN / VI, linking the page being read to the same page in the other language.
 *
 * Plain `<a>`, not TransitionLink, and so a full page load — deliberately.
 * The root layout lives under [locale], so a different locale is a different
 * layout whichever way you get there: the preloader curtain plays and Lenis
 * starts over. The page transition would only cover a wipe that the curtain
 * then replays; a straight load is the honest version of the same thing.
 *
 * `hrefLang` and `lang` on each link tell crawlers and screen readers what is
 * at the other end. The canonical cross-references between the two languages
 * are the hreflang tags in <head>; these are the human-facing ones.
 */
export default function LanguageSwitch({
  className = "",
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const current = useLocale();
  const common = useTranslations("Common");
  // The path without its locale — "/projects/rutine24" on either language.
  const pathname = usePathname();

  return (
    <ul
      aria-label={common("language")}
      className={`flex flex-row ${className}`}
    >
      {routing.locales.map((locale) => (
        <li key={locale}>
          <a
            href={getPathname({ href: pathname, locale })}
            hrefLang={locale}
            lang={locale}
            aria-label={NAMES[locale]}
            aria-current={locale === current ? "true" : undefined}
            onClick={onNavigate}
            className="uppercase hover:underline aria-current:font-bold"
          >
            {locale}
          </a>
        </li>
      ))}
    </ul>
  );
}
