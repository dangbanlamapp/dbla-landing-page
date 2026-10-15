import type { StaticImageData } from "next/image";
import type { ProjectCopy } from "./ProjectBlock";

/**
 * The shape of one project as the three places that list them read it: the
 * pinned stack on the homepage, the /projects index and the /projects/[slug]
 * detail route. The list itself lives in Sanity and is fetched by the routes
 * (see sanity/lib/content.ts), which hand it down as a prop — so the slug the
 * index links to and the slug the detail route generates are still the same
 * string by construction.
 *
 * Order is meaningful everywhere it is read, and is set by dragging in the
 * Studio. On the homepage it is stacking and scroll order (see Projects); on
 * the index it is grid order; on the detail route it decides the "next
 * project" each page hands off to.
 *
 * Images arrive as StaticImageData-shaped objects — a Sanity CDN URL plus the
 * asset's own dimensions — so every <Image src={…}> and `src.width` written
 * for static imports keeps working unchanged.
 *
 * A plain .ts module rather than a component file, so the server-rendered
 * routes can import it without pulling a "use client" boundary in with it.
 */
export type Project = ProjectCopy & {
  /** URL segment under /projects. Lowercase, no punctuation — "Ru:tine24"
   *  cannot be a path segment as written. */
  slug: string;
  /**
   * Whether the project has a page to open. Off for work whose page is not
   * ready: it is still listed everywhere, but its picture is not a link (see
   * ProjectLink), the hand-off skips it and its URL is a 404.
   */
  hasPage: boolean;
  src: StaticImageData;
  alt: string;
  /**
   * The detail page's hero circle, when it should open on a different shot
   * from the one the homepage and index use. Lives on the card rather than
   * the story because the "next project" hand-off shows the NEXT project's
   * hero, and that page only has its own story.
   */
  hero?: StaticImageData;
};

export const projectHref = (project: Project) => `/projects/${project.slug}`;

/** Two-digit position, 1-based — "01" … "04", the same format the homepage
 *  counter prints. */
export const projectNumber = (index: number) =>
  String(index + 1).padStart(2, "0");

/**
 * The four `--sweep-*` angles .quadrant-reveal reads (see globals.css), closed
 * and open. Every route that wipes an image in with the homepage's pinwheel
 * tweens between exactly these two objects, so they are spelled out once
 * rather than as four keys retyped per call site.
 *
 * 90deg is one quarter turn — four wedges of exactly that tile the circle with
 * nothing left over. See QUADRANT in Projects for why it is not the lever for
 * closing a seam.
 */
export const SWEEP_CLOSED = {
  "--sweep-0": "0deg",
  "--sweep-1": "0deg",
  "--sweep-2": "0deg",
  "--sweep-3": "0deg",
};
export const SWEEP_OPEN = {
  "--sweep-0": "90deg",
  "--sweep-1": "90deg",
  "--sweep-2": "90deg",
  "--sweep-3": "90deg",
};
