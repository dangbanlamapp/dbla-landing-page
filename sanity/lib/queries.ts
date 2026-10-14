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
 *
 * Every query takes `$locale` ("en" | "vi"), and every translated field goes
 * through `loc` — see there.
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

/**
 * A translated field, resolved for `$locale` and projected under its plain
 * name. The Studio stores Vietnamese as a `_vi` twin beside the English field
 * (`blurb` / `blurb_vi`); on a Vietnamese page an empty twin falls back to the
 * English, so a half-translated document still renders whole rather than with
 * holes in it. The result keeps the English field's type, which is what lets
 * content.ts and every component stay exactly as they were.
 *
 * Generic and `as const` so it returns a literal type rather than `string`.
 * sanityFetch picks its result type by matching the query's exact text
 * against the map TypeGen writes, and one plain `string` in the template
 * would widen the whole query to `string` and every result to `unknown`.
 */
const loc = <F extends string>(field: F) =>
  /* groq */ `"${field}": select($locale == "vi" => coalesce(${field}_vi, ${field}), ${field})` as const;

export const SITE_SETTINGS_QUERY = defineQuery(`
  *[_id == "siteSettings"][0]{
    ${loc("description")},
    email,
    phone,
    socialLinks[]{ _key, ${loc("label")}, href },
    legalLinks[]{ _key, ${loc("label")}, href }
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
    ${loc("type")},
    ${loc("blurb")},
    cardImage { ${IMAGE}, ${loc("alt")} },
    heroImage { ${IMAGE} }
  }
`);

/** For generateStaticParams. Slugs are shared by both languages. */
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
    ${loc("type")},
    ${loc("blurb")},
    cardImage { ${IMAGE}, ${loc("alt")} },
    heroImage { ${IMAGE} },
    wideImage { ${IMAGE}, ${loc("alt")} },
    ${loc("headline")},
    ${loc("intro")},
    facts[]{ _key, ${loc("label")}, ${loc("value")} },
    sections[]{
      _key,
      ${loc("label")},
      ${loc("lead")},
      ${loc("body")},
      points[]{ _key, ${loc("title")}, ${loc("body")} },
      ${loc("coda")},
      figures[]{
        _key,
        ${loc("caption")},
        kind,
        ${loc("placeholder")},
        image { ${IMAGE}, ${loc("alt")} }
      }
    }
  }
`);

export const SERVICES_QUERY = defineQuery(`
  *[_type == "service"] | order(orderRank) {
    _id,
    ${loc("label")},
    ${loc("title")},
    ${loc("blurb")},
    ${loc("items")}
  }
`);

export const TEAM_QUERY = defineQuery(`
  *[_type == "teamMember"] | order(orderRank) {
    _id,
    name,
    ${loc("role")},
    ${loc("intro")},
    ${loc("expertise")},
    skills[]{ _key, ${loc("name")}, level },
    avatar
  }
`);

export const TESTIMONIALS_QUERY = defineQuery(`
  *[_type == "testimonial"] | order(orderRank) {
    _id,
    ${loc("quote")},
    name,
    ${loc("role")}
  }
`);
