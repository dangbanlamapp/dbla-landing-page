import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * Maps every page URL onto the `[locale]` segment: `/projects` is served from
 * `/en/projects` without a redirect, `/vi/projects` as is, and `/en/…` is
 * redirected to its bare form so English has exactly one URL per page.
 */
export default createMiddleware(routing);

export const config = {
  // Pages only: not the revalidate webhook, Next's own assets, or anything
  // with a file extension (favicon, icons, manifest, public/ images).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
