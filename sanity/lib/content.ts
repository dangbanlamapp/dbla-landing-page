import type { StaticImageData } from "next/image";
import { stegaClean, type StegaBranded } from "next-sanity";
import type {
  PROJECTS_QUERY_RESULT,
  PROJECT_QUERY_RESULT,
  SITE_SETTINGS_QUERY_RESULT,
  SanityImageCrop,
} from "@/sanity.types";
import type { TeamMember } from "@/app/components/OurTeam";
import type { Testimonial } from "@/app/components/WhyUs";
import type { Project } from "@/app/components/project-data";
import type {
  ProjectStory,
  StoryFigure,
} from "@/app/components/project-stories";
import type { Service } from "@/app/components/ServiceBlock";
import type { SiteLink, SiteSettings } from "@/app/components/site-settings";
import { urlFor } from "./image";
import { SANITY_TAG, sanityFetch } from "./live";
import {
  PROJECTS_QUERY,
  PROJECT_QUERY,
  PROJECT_SLUGS_QUERY,
  SERVICES_QUERY,
  SITE_SETTINGS_QUERY,
  TEAM_QUERY,
  TESTIMONIALS_QUERY,
} from "./queries";

/**
 * The one place Sanity's shapes meet the components'. Routes call these; the
 * components keep the plain types they were written against (Project,
 * ProjectStory, Service…) and never see a query result, an asset reference or
 * a null.
 *
 * That boundary is deliberate: the animation code is dense and was built
 * around those types, and keeping the CMS on this side of it meant moving the
 * data source without touching a single timeline.
 */

// ── Images ──────────────────────────────────────────────────────────────────

type QueriedImage = {
  asset: {
    _id: string;
    metadata: {
      lqip: string | null;
      dimensions: { width: number; height: number } | null;
    } | null;
  } | null;
  crop: SanityImageCrop | null;
  hotspot: unknown;
} | null;

/**
 * A queried image as the StaticImageData a static import used to produce —
 * the same shape next/image accepts as `src`, so every <Image src={…}> and
 * every `src.width` written for local files works unchanged.
 *
 * Width and height are the CROPPED size, computed with the same rounding the
 * URL builder uses for its `rect`, since that is the picture the URL returns.
 * Sheets and slides are shown at exactly this ratio and capped at this width,
 * so it has to describe the file as served, not the original upload.
 */
function toImage(image: QueriedImage): StaticImageData | undefined {
  const dimensions = image?.asset?.metadata?.dimensions;
  if (!image?.asset || !dimensions) return undefined;

  const { width: w, height: h } = dimensions;
  const { left = 0, right = 0, top = 0, bottom = 0 } = image.crop ?? {};
  const cropLeft = Math.round(left * w);
  const cropTop = Math.round(top * h);

  return {
    src: urlFor(image).url(),
    width: Math.round(w - right * w - cropLeft),
    height: Math.round(h - bottom * h - cropTop),
    blurDataURL: image.asset.metadata?.lqip ?? undefined,
  };
}

/** Sanity returns null for an empty array; the components test for absence. */
const list = <T>(items: T[] | null | undefined) =>
  items?.length ? items : undefined;

// ── Site settings ───────────────────────────────────────────────────────────

/** An empty href is a link whose page does not exist yet — "#" on the site,
 *  as it was when these lived in code. */
const links = (items: { label: string; href: string | null }[] | null) =>
  (items ?? []).map(({ label, href }): SiteLink => ({
    label,
    href: href || "#",
  }));

export function toSiteSettings(
  data: SITE_SETTINGS_QUERY_RESULT,
): SiteSettings & { description?: string } {
  return {
    description: data?.description ?? undefined,
    email: data?.email ?? "",
    phone: data?.phone ?? "",
    socialLinks: links(data?.socialLinks ?? null),
    legalLinks: links(data?.legalLinks ?? null),
  };
}

export async function getSiteSettings({ stega }: { stega?: false } = {}) {
  const { data } = await sanityFetch({
    query: SITE_SETTINGS_QUERY,
    stega,
    tags: [SANITY_TAG],
  });
  return toSiteSettings(data);
}

// ── Projects ────────────────────────────────────────────────────────────────

/**
 * Projects without a usable card image are left out rather than rendered
 * broken: every view of the list — the stack, the index, the hand-off —
 * is built around that picture.
 */
function toProjects(data: PROJECTS_QUERY_RESULT): Project[] {
  return data.flatMap((project) => {
    const src = toImage(project.cardImage);
    if (!src) return [];
    return [
      {
        // Clean: the slug becomes a URL, and in draft mode it would otherwise
        // carry Visual Editing's invisible markers into every href.
        slug: stegaClean(project.slug),
        name: project.name,
        type: project.type,
        blurb: project.blurb,
        src,
        alt: project.cardImage.alt,
        hero: toImage(project.heroImage),
      },
    ];
  });
}

export async function getProjects() {
  const { data } = await sanityFetch({
    query: PROJECTS_QUERY,
    tags: [SANITY_TAG],
  });
  return toProjects(data);
}

/** The story as `sanityFetch` returns it: every string branded as possibly
 *  carrying stega, so the literal `kind` has to be cleaned before it can be
 *  the component's "photo" | "sheet" | "slide". */
type QueriedStory = StegaBranded<PROJECT_QUERY_RESULT>;

type QueriedFigure = NonNullable<
  NonNullable<NonNullable<QueriedStory>["sections"]>[number]["figures"]
>[number];

function toFigure(figure: QueriedFigure): StoryFigure | undefined {
  // Clean: `kind` decides the layout, and is compared against literals.
  const kind = stegaClean(figure.kind);
  const caption = figure.caption ?? undefined;
  const src = toImage(figure.image);

  if (src && figure.image) {
    return { kind, caption, src, alt: figure.image.alt };
  }
  if (figure.placeholder) {
    return { kind, caption, placeholder: figure.placeholder };
  }
  return undefined;
}

/** A project has a story when it has a headline — the Studio's own rule. */
function toStory(data: QueriedStory): ProjectStory | undefined {
  if (!data?.headline) return undefined;

  const wide = toImage(data.wideImage);

  return {
    wide:
      wide && data.wideImage
        ? { src: wide, alt: data.wideImage.alt }
        : undefined,
    headline: data.headline,
    intro: data.intro ?? [],
    facts: (data.facts ?? []).map(({ label, value }) => ({ label, value })),
    sections: (data.sections ?? []).map((section) => ({
      label: section.label,
      lead: section.lead,
      body: list(section.body),
      points: list(section.points)?.map(({ title, body }) => ({ title, body })),
      coda: list(section.coda),
      figures: list(
        (section.figures ?? []).flatMap((figure) => toFigure(figure) ?? []),
      ),
    })),
  };
}

export async function getProjectStory(slug: string) {
  const { data } = await sanityFetch({
    query: PROJECT_QUERY,
    params: { slug },
    tags: [SANITY_TAG],
  });
  return toStory(data);
}

/** Name and blurb for `generateMetadata`. Stega off: these go into <head>. */
export async function getProjectMeta(slug: string) {
  const { data } = await sanityFetch({
    query: PROJECT_QUERY,
    params: { slug },
    stega: false,
    tags: [SANITY_TAG],
  });
  return data ? { name: data.name, blurb: data.blurb } : undefined;
}

// ── Homepage sections ───────────────────────────────────────────────────────

export async function getServices(): Promise<Service[]> {
  const { data } = await sanityFetch({
    query: SERVICES_QUERY,
    tags: [SANITY_TAG],
  });
  return data.map(({ label, title, blurb, items }) => ({
    label,
    title,
    blurb,
    items,
  }));
}

export async function getTeam(): Promise<TeamMember[]> {
  const { data } = await sanityFetch({
    query: TEAM_QUERY,
    tags: [SANITY_TAG],
  });
  return data.map((member) => ({
    name: member.name,
    role: member.role,
    intro: member.intro,
    expertise: member.expertise ?? [],
    skills: (member.skills ?? []).map(({ name, level }) => ({ name, level })),
    // Spread onto <Avatar>, which treats a missing option as "use the
    // default" — so the empty ones are dropped, not passed as undefined over
    // the top of it. Clean: every option is compared against a part name.
    avatar: Object.fromEntries(
      Object.entries(member.avatar ?? {})
        .filter(([, value]) => value != null)
        .map(([key, value]) => [key, stegaClean(value)]),
    ),
  }));
}

export async function getTestimonials(): Promise<Testimonial[]> {
  const { data } = await sanityFetch({
    query: TESTIMONIALS_QUERY,
    tags: [SANITY_TAG],
  });
  return data.map(({ quote, name, role }) => ({ quote, name, role }));
}

/** For generateStaticParams. Published only, stega off: these are URL
 *  segments, not content. */
export async function getProjectSlugs() {
  const { data } = await sanityFetch({
    query: PROJECT_SLUGS_QUERY,
    perspective: "published",
    stega: false,
    tags: [SANITY_TAG],
  });
  return data.map(({ slug }) => ({ slug: stegaClean(slug) }));
}

// ── Live updates ────────────────────────────────────────────────────────────

/**
 * A short fingerprint of a section's content, used as its React `key`.
 *
 * When an editor publishes, <SanityLive /> refreshes the page and the new
 * content arrives as new props. The animated sections cannot take new text in
 * place: SplitText has already replaced their text nodes with line wrappers,
 * so React would patch nodes that are no longer in the document, and every
 * timeline was built for the old count. Keying on the content remounts the
 * section instead — its GSAP context reverts and rebuilds from scratch, which
 * is exactly what a first load does. Unchanged content keeps its key, so a
 * publish elsewhere does not disturb it.
 */
export function contentKey(value: unknown) {
  const text = JSON.stringify(value);
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}
