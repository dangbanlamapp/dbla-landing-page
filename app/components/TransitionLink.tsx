"use client";

import Link from "next/link";
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
 */
export default function TransitionLink({
  href,
  replace,
  scroll,
  onNavigate,
  ...props
}: Props) {
  const navigate = usePageTransition();

  return (
    <Link
      href={href}
      replace={replace}
      scroll={scroll}
      onNavigate={(e) => {
        onNavigate?.(e);
        if (navigate?.(href, { replace, scroll })) e.preventDefault();
      }}
      {...props}
    />
  );
}
