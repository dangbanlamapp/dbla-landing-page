"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { getPathname } from "@/i18n/navigation";
import { usePageTransition } from "./PageTransition";

type Props = Omit<React.ComponentProps<typeof Link>, "href"> & {
  /** A string, not a UrlObject — it is handed straight to router.push. */
  href: string;
};

/**
 * A `next/link` that plays the route-change transition. Use it for links
 * between pages of this site; keep plain `Link` / `<a>` for anything that
 * should not animate (external links, `#anchors`, mailto/tel).
 *
 * Hooks Link's `onNavigate` rather than `onClick`, because Link has already
 * done the filtering by the time it calls that: it only fires for a plain
 * left-click on a local URL — not with a modifier key held, not on a
 * `download` link, not for an external href. Cancelling it there leaves
 * everything else about Link (prefetching, the caller's `onClick`, which is
 * how the menu closes itself) exactly as it was.
 *
 * Outside PageTransition's provider it is just a Link.
 *
 * `href` is written without a language — "/contact", "/projects/rutine24" —
 * and comes out in the current one: unchanged on an English page, "/vi/contact"
 * on a Vietnamese one. Every internal link on the site goes through here, so
 * this is the one place a Vietnamese reader is kept in Vietnamese. The
 * localized href is the one PageTransition gets too, so its same-page check
 * compares like with like against `location.pathname`.
 */
export default function TransitionLink({
  href,
  replace,
  scroll,
  onNavigate,
  ...props
}: Props) {
  const navigate = usePageTransition();
  const localized = getPathname({ href, locale: useLocale() });

  return (
    <Link
      href={localized}
      replace={replace}
      scroll={scroll}
      onNavigate={(e) => {
        onNavigate?.(e);
        if (navigate?.(localized, { replace, scroll })) e.preventDefault();
      }}
      {...props}
    />
  );
}
