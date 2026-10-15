"use client";

import { useTranslations } from "next-intl";
import TransitionLink from "./TransitionLink";
import { PILL } from "./pill";
import { projectHref, type Project } from "./project-data";

/**
 * A project's picture circle, as a link to its page when it has one and as a
 * plain picture when it does not (`hasPage` off in the Studio). Shared by the
 * three places that open a project — the homepage stack, the /projects index
 * and the detail page's hand-off — so a project without a page is unclickable
 * in all of them at once.
 *
 * The linked version owns everything that says "this opens": the `group` the
 * hover zoom keys off, the accessible name, and the "View project" pill. The
 * plain one drops all three, so the circle neither zooms nor offers a button.
 * The caller's `group-hover:` classes underneath it simply never fire.
 *
 * Every other prop — the circle's own classes and the `data-*` handles the
 * GSAP timelines select by — lands on whichever element renders, so the
 * entrances and the homepage teardown run the same either way.
 */
export default function ProjectLink({
  project,
  className = "",
  tabIndex,
  children,
  ...props
}: {
  project: Project;
  className?: string;
  /** Only for the link: a plain picture is never in the tab order anyway. */
  tabIndex?: number;
  children: React.ReactNode;
} & Record<`data-${string}`, unknown>) {
  const common = useTranslations("Common");

  if (!project.hasPage) {
    return (
      <div className={className} {...props}>
        {children}
      </div>
    );
  }

  return (
    <TransitionLink
      href={projectHref(project)}
      aria-label={common("openProject", { name: project.name })}
      tabIndex={tabIndex}
      className={`group ${className}`}
      {...props}
    >
      {children}
      {/* The affordance. Hidden until hover so the circles stay clean
          pictures at rest; on touch there is no hover, but the whole circle
          is still the target, so nothing is lost. */}
      <span
        aria-hidden
        className={`${PILL} pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent text-background opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100`}
      >
        {common("viewProject")}
      </span>
    </TransitionLink>
  );
}
