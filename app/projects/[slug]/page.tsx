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

/*
  Every project published at build time is prerendered from this list. Any
  other slug is rendered on demand rather than 404'd outright — dynamicParams
  is left at its default — so a project published in the Studio after a
  deploy gets its page without a rebuild. A slug that matches nothing still
  reaches notFound() below.
*/
export function generateStaticParams() {
  return getProjectSlugs();
}

export async function generateMetadata({
  params,
}: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectMeta(slug);
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
}: PageProps<"/projects/[slug]">) {
  const { slug } = await params;

  // The whole list, not just this project: the "01 / 04" counter and the
  // hand-off to the next project both read off this project's place in it.
  const [projects, story] = await Promise.all([
    getProjects(),
    getProjectStory(slug),
  ]);
  const index = projects.findIndex((p) => p.slug === slug);

  if (index === -1) notFound();

  return (
    <>
      <BackHeader href="/projects" label="All projects" />
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
