import type { Metadata } from "next";
import Header from "@/app/components/Header";
import ProjectsIndex from "@/app/components/ProjectsIndex";
import { contentKey, getProjects } from "@/sanity/lib/content";
import { getTranslations } from "next-intl/server";
import { pageLocale } from "@/i18n/locale";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/projects">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    // Bare, so the root layout's "%s | DBLA" template supplies the suffix.
    title: t("projectsTitle"),
    description: t("projectsDescription"),
  };
}

export default async function ProjectsPage({
  params,
}: PageProps<"/[locale]/projects">) {
  const projects = await getProjects(await pageLocale(params));

  /*
    The homepage's Header, menu and all, rather than BackHeader. This is a
    top-level destination the menu itself links to, not a dead end off the
    homepage, so it gets the same way around the site — and the menu's Home
    link is the way back that BackHeader's pill used to be. It does mean this
    route hydrates the menu's state and MenuPanel, which Contact avoids.

    No Footer, like Contact, so main needs none of the opaque-sheet / z-1
    machinery the homepage uses to slide off it.

    Unlike Contact this route does scroll — the grid runs well past one
    viewport — which Lenis handles from the root layout with nothing to set up
    here.
  */
  return (
    <>
      <Header />
      <main>
        {/* Keyed on its content for the same reason as the homepage
            sections — see contentKey. */}
        <ProjectsIndex key={contentKey(projects)} projects={projects} />
      </main>
    </>
  );
}
