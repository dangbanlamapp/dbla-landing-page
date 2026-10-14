import type { Metadata } from "next";
import BackHeader from "@/app/components/BackHeader";
import Contact from "@/app/components/Contact";
import { getSiteSettings } from "@/sanity/lib/content";
import { getTranslations } from "next-intl/server";
import { pageLocale } from "@/i18n/locale";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    // Bare, like /projects: the root layout's template adds " | DBLA". This
    // used to say "Contact — DBLA" and so printed the brand twice.
    title: t("contactTitle"),
    description: t("contactDescription"),
  };
}

export default async function ContactPage({
  params,
}: PageProps<"/[locale]/contact">) {
  // The same settings the root layout fetched — Next dedupes the request —
  // read here and passed down so ContactInfo can stay a server component.
  const settings = await getSiteSettings(await pageLocale(params));

  /*
    No Footer here, unlike page.tsx, and that removes a whole mechanism rather
    than one component: the footer is `fixed` at -z-1 and is revealed by main
    sliding off it, which needs main to carry an opaque `bg-background` and a
    `relative z-1` to win the paint order, plus the h-screen runway the footer
    renders ahead of itself to buy the scroll distance. None of that has any
    work to do now, so main is left plain — the beige comes from body's
    background propagating to the canvas, as it did before main ever needed to
    be a sheet.

    BackHeader in place of Header, which drops the menu and everything holding
    it up — the `open` state, the Escape listener and MenuPanel itself, i.e. all
    of the client JavaScript this route was shipping. Nothing on this page is
    interactive yet, so it now hydrates nothing at all.

    Contact is exactly one viewport tall, so this route does not scroll.
  */
  return (
    <>
      <BackHeader />
      <main>
        <Contact settings={settings} />
      </main>
    </>
  );
}
