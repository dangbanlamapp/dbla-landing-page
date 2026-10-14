import type { Metadata } from "next";
import { Familjen_Grotesk } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";
import Preloader from "@/app/components/Preloader";
import SmoothScroll from "@/app/components/SmoothScroll";
import { SiteSettingsProvider } from "@/app/components/SiteSettingsProvider";
import { getProjects, getSiteSettings } from "@/sanity/lib/content";
import { SanityLive } from "@/sanity/lib/live";

const grotesk = Familjen_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
});

const TITLE = "DBLA | Product studio for non-technical founders";

/** Used only while Site settings has no description of its own. */
const FALLBACK_DESCRIPTION =
  "We design and build websites, mobile apps and web apps for non-technical founders, from first sketch to launch.";

export async function generateMetadata(): Promise<Metadata> {
  // stega: false — this goes into <head>, where Visual Editing's invisible
  // markers would end up in search results and link previews.
  const { description = FALLBACK_DESCRIPTION } = await getSiteSettings({
    stega: false,
  });

  return {
    // `default` is the home page; the template lets a sub-route such as
    // /contact set a bare `title: "Contact"` and still get the brand suffix.
    title: { default: TITLE, template: "%s | DBLA" },
    description,
    openGraph: { title: TITLE, description, siteName: "DBLA", type: "website" },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Fetched here because the root layout is the one thing every route shares:
  // settings feed the menu and footer on whichever page renders them, and the
  // preloader flips through the project cards before any page is showing.
  // The homepage fetches the same project list again; Next dedupes the two
  // identical requests within one render.
  const [settings, projects] = await Promise.all([
    getSiteSettings(),
    getProjects(),
  ]);

  return (
    <html lang="en" className={`${grotesk.variable} h-full antialiased`}>
      <body className="relative">
        {/*
          Outermost, and only a context: it renders nothing of its own, so it
          changes nothing about the Preloader / SmoothScroll arrangement below.
        */}
        <SiteSettingsProvider value={settings}>
          {/*
            Outside SmoothScroll, which stays a pure Lenis config wrapper. Being
            the outer element is what lets ScrollLock — mounted inside the Lenis
            provider, because it needs useLenis — still read the reveal signal
            off this context, and what keeps the curtain from replaying on a
            client-side route change: the root layout persists across
            navigation, so this component never remounts.
          */}
          <Preloader mockups={projects.map((project) => project.src)}>
            <SmoothScroll>{children}</SmoothScroll>
          </Preloader>
        </SiteSettingsProvider>
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
