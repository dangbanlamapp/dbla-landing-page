/**
 * The site's main navigation, shared by MenuPanel and Footer so the two lists
 * cannot drift apart. Labels are keys in the `Nav` message namespace.
 *
 * Home is "/" rather than "#" now that the menu also renders on /projects: a
 * bare hash only means "the top of the homepage" while you are on it.
 */
export const NAV_LINKS = [
  { key: "home", href: "/" },
  // A route plus a hash, so it works from every page: TransitionLink scrolls
  // to the section on the homepage, and ScrollReset does after a route change.
  { key: "about", href: "/#our-team" },
  { key: "projects", href: "/projects" },
  { key: "contact", href: "/contact" },
] as const;

/** In-page hashes stay plain anchors so Lenis keeps owning the scroll (its
 *  `anchors: { offset: -80 }`); only real routes go through the router. */
export const isRoute = (href: string) => href.startsWith("/");
