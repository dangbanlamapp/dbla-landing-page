import type { Metadata } from "next";
import { Familjen_Grotesk } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import "lenis/dist/lenis.css";
import "../globals.css";
import Preloader from "@/app/components/Preloader";
import SmoothScroll from "@/app/components/SmoothScroll";
import { SiteSettingsProvider } from "@/app/components/SiteSettingsProvider";
import { getProjects, getSiteSettings } from "@/sanity/lib/content";
import { SanityLive } from "@/sanity/lib/live";
import { pageLocale } from "@/i18n/locale";
import { routing } from "@/i18n/routing";

const grotesk = Familjen_Grotesk({
  variable: "--font-grotesk",
  // "vietnamese" carries the stacked diacritics (ữ, ộ, ể…). Without it those
  // glyphs fall back to a system font mid-word on every Vietnamese page.
  subsets: ["latin", "vietnamese"],
});

/**
 * Both locales are prerendered. With the root layout inside [locale], every
 * page under it inherits this list, so a page only has to name its own params
 * (the project slugs) and Next renders each one once per language.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const title = t("title");

  // stega: false — this goes into <head>, where Visual Editing's invisible
  // markers would end up in search results and link previews.
  // The messages description is used only while Site settings has none.
  const { description = t("description") } = await getSiteSettings(locale, {
    stega: false,
  });

  return {
    // `default` is the home page; the template lets a sub-route such as
    // /contact set a bare `title: "Contact"` and still get the brand suffix.
    title: { default: title, template: "%s | DBLA" },
    description,
    openGraph: { title, description, siteName: "DBLA", type: "website" },
  };
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const locale = await pageLocale(params);

  // Fetched here because the root layout is the one thing every route shares:
  // settings feed the menu and footer on whichever page renders them, and the
  // preloader flips through the project cards before any page is showing.
  // The homepage fetches the same project list again; Next dedupes the two
  // identical requests within one render.
  const [settings, projects] = await Promise.all([
    getSiteSettings(locale),
    getProjects(locale),
  ]);

  return (
    <html lang={locale} className={`${grotesk.variable} h-full antialiased`}>
      <body className="relative">
        {/*
          The locale (and, once there are any, the UI strings) for client
          components — TransitionLink reads it to keep every internal link in
          the current language. A context like the one below it, so it renders
          nothing and changes nothing about the arrangement under it.
        */}
        <NextIntlClientProvider>
          {/*
            Outermost, and only a context: it renders nothing of its own, so it
            changes nothing about the Preloader / SmoothScroll arrangement below.
          */}
          <SiteSettingsProvider value={settings}>
            {/*
              Outside SmoothScroll, which stays a pure Lenis config wrapper.
              Being the outer element is what lets ScrollLock — mounted inside
              the Lenis provider, because it needs useLenis — still read the
              reveal signal off this context, and what keeps the curtain from
              replaying on a client-side route change: the root layout persists
              across navigation, so this component never remounts.

              The one exception is switching language. This layout sits under
              [locale], so a new locale is a new layout: the curtain plays again
              and Lenis starts fresh. LanguageSwitch makes that a full page load
              on purpose rather than pretending otherwise.
            */}
            <Preloader mockups={projects.map((project) => project.src)}>
              <SmoothScroll>{children}</SmoothScroll>
            </Preloader>
          </SiteSettingsProvider>
        </NextIntlClientProvider>
        {/*
          Renders nothing. It holds the Live Content API connection open and,
          when content is published, revalidates the cache tags of every
          `sanityFetch` on the page. Outside Preloader because it has nothing
          to do with the curtain, and in the root layout so it never remounts
          on navigation.
        */}
        <SanityLive />
      </body>
    </html>
  );
}
