import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BackHeader from "@/app/components/BackHeader";
import ProjectDetail from "@/app/components/ProjectDetail";
import {
  contentKey,
  getProjectMeta,
  getProjectSlugs,
  getProjectStory,
  getProjects,
} from "@/sanity/lib/content";
import { getTranslations } from "next-intl/server";
import { pageLocale } from "@/i18n/locale";

/*
  Every project published at build time is prerendered from this list. Any
  other slug is rendered on demand rather than 404'd outright — dynamicParams
  is left at its default — so a project published in the Studio after a
  deploy gets its page without a rebuild. A slug that matches nothing still
  reaches notFound() below.
*/
export function generateStaticParams() {
  // Slugs only: the [locale] layout above supplies the languages, and Next
  // renders every slug once for each of them.
  return getProjectSlugs();
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectMeta(slug, await pageLocale(params));
  if (!project) return {};

  return {
    title: project.name,
    description: project.blurb,
    openGraph: {
      title: `${project.name} | DBLA`,
      description: project.blurb,
    },
  };
}

export default async function ProjectPage({
  params,
}: PageProps<"/[locale]/projects/[slug]">) {
  const { slug } = await params;
  const locale = await pageLocale(params);
  const common = await getTranslations({ locale, namespace: "Common" });

  // The whole list, not just this project: the "01 / 04" counter and the
  // hand-off to the next project both read off this project's place in it.
  const [projects, story] = await Promise.all([
    getProjects(locale),
    getProjectStory(slug, locale),
  ]);
  const index = projects.findIndex((p) => p.slug === slug);

  // A project with its page switched off in the Studio is still in the list —
  // it is listed everywhere, just not linked — so it has to be turned away
  // here, as if it did not exist. It was never prerendered either (see
  // getProjectSlugs), so this is what a typed-in or bookmarked URL meets.
  if (index === -1 || !projects[index].hasPage) notFound();

  return (
    <>
      <BackHeader href="/projects" label={common("allProjects")} />
      <main>
        {/*
          Keyed on the slug so going from one project to the next — the
          hand-off at the foot of every page — mounts a fresh ProjectDetail.
          Its entrances, SplitText instances and ScrollTriggers are all built
          once per mount, and a reused instance would carry the previous
          project's open circles and finished lines straight into the new one.
          The content goes into the key too, so a live publish remounts it for
          the same reason (see contentKey).
        */}
        <ProjectDetail
          key={`${slug}-${contentKey({ projects, story })}`}
          projects={projects}
          index={index}
          story={story}
        />
      </main>
    </>
  );
}
