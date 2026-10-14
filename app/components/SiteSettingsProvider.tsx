"use client";

import { createContext, useContext } from "react";
import type { SiteSettings } from "./site-settings";

/**
 * Site settings for the client components that print them — MenuPanel (via
 * Header, on two routes) and Footer. A context rather than props because the
 * settings are fetched once in the root layout, and threading them through
 * every page and then Header → MenuPanel → ContactInfo would make each route
 * re-fetch something none of them owns.
 *
 * Server components do not read this: the contact page fetches the same
 * (request-deduplicated) settings itself and passes them to ContactInfo as
 * props, which is what keeps that page from hydrating anything it does not
 * need to.
 */
const SiteSettingsContext = createContext<SiteSettings | null>(null);

export function SiteSettingsProvider({
  value,
  children,
}: {
  value: SiteSettings;
  children: React.ReactNode;
}) {
  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings(): SiteSettings {
  const settings = useContext(SiteSettingsContext);
  if (!settings) {
    throw new Error("useSiteSettings needs a SiteSettingsProvider above it");
  }
  return settings;
}
