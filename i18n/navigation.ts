import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware versions of Next's navigation helpers. `getPathname` is the one
 * the site leans on: TransitionLink runs every internal href through it, so
 * components keep writing `/contact` and the Vietnamese pages link to
 * `/vi/contact` without any of them knowing.
 */
export const { getPathname, usePathname } = createNavigation(routing);
