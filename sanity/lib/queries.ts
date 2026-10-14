import { defineQuery } from "next-sanity";

/**
 * Every GROQ query the site runs. TypeGen (run from the Studio repo — see its
 * sanity.cli.ts) reads this file and writes a `<NAME>_RESULT` type per query
 * into sanity.types.ts, so names here must be unique across the codebase.
 *
 * Lists are sorted by `orderRank`, the field the Studio's drag-to-reorder
 * lists write. Order is meaningful everywhere it is read: scroll order on the
 * homepage, grid order on /projects, the "next project" hand-off.
 *
 * Images project their asset's dimensions and LQIP explicitly — neither comes
 * back unless asked for — plus `crop` and `hotspot` so the URL builder can
 * honour the editor's framing. The dimensions replace what StaticImageData
 * used to supply for free: sheets and slides are shown at their own aspect
 * ratio, and next/image needs a width and height for anything not `fill`.
 */

// Interpolated into the queries below. TypeGen resolves template literals
// built from constants in the same file.
const IMAGE = /* groq */ `
  asset->{
    _id,
    url,
    metadata { lqip, dimensions { width, height, aspectRatio } }
  },
  crop,
  hotspot
`;

export const SITE_SETTINGS_QUERY = defineQuery(`
  *[_id == "siteSettings"][0]{
    description,
    email,
    phone,
    socialLinks[]{ _key, label, href },
    legalLinks[]{ _key, label, href }
  }
`);

/** The card fields — what the homepage stack, the index and the preloader
 *  need. No case study: none of those has a use for it. `heroImage` comes
 *  along because the detail page's "next project" circle opens on the NEXT
 *  project's hero shot, and that page only fetches its own story. */
export const PROJECTS_QUERY = defineQuery(`
  *[_type == "project" && defined(slug.current)] | order(orderRank) {
    _id,
    name,
    "slug": slug.current,
    type,
    blurb,
    cardImage { ${IMAGE}, alt },
    heroImage { ${IMAGE} }
  }
`);

/** For generateStaticParams. */
export const PROJECT_SLUGS_QUERY = defineQuery(`
  *[_type == "project" && defined(slug.current)]{ "slug": slug.current }
`);

/** One project with its case study. `headline` is what marks a story as
 *  present — a project without one renders hero, wide image and blurb only. */
export const PROJECT_QUERY = defineQuery(`
  *[_type == "project" && slug.current == $slug][0]{
    _id,
    name,
    "slug": slug.current,
    type,
    blurb,
    cardImage { ${IMAGE}, alt },
    heroImage { ${IMAGE} },
    wideImage { ${IMAGE}, alt },
    headline,
    intro,
    facts[]{ _key, label, value },
    sections[]{
      _key,
      label,
      lead,
      body,
      points[]{ _key, title, body },
      coda,
      figures[]{
        _key,
        caption,
        kind,
        placeholder,
        image { ${IMAGE}, alt }
      }
    }
  }
`);

export const SERVICES_QUERY = defineQuery(`
  *[_type == "service"] | order(orderRank) {
    _id,
    label,
    title,
    blurb,
    items
  }
`);

export const TEAM_QUERY = defineQuery(`
  *[_type == "teamMember"] | order(orderRank) {
    _id,
    name,
    role,
    intro,
    expertise,
    skills[]{ _key, name, level },
    avatar
  }
`);

export const TESTIMONIALS_QUERY = defineQuery(`
  *[_type == "testimonial"] | order(orderRank) {
    _id,
    quote,
    name,
    role
  }
`);
