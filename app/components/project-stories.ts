/**
 * The shape of the long-form case study behind a project page. The stories
 * themselves are edited in Sanity (the project's "Case study" tab) and mapped
 * into these types by sanity/lib/content.ts. A project with no story still
 * gets a complete page — hero, wide image, the blurb as its overview — so
 * stories can land one project at a time.
 *
 * Plain strings throughout, no markup. Every section renders in the same
 * label / copy split, so the shape below is the whole layout vocabulary:
 * a large lead line, body paragraphs, an optional run of numbered points,
 * and a closing paragraph after them — then, optionally, pictures across the
 * full width under the section.
 */
import type { StaticImageData } from "next/image";

export type StoryPoint = { title: string; body: string };

export type StoryFigure = {
  caption?: string;
  /**
   * "photo" (the default) is a mockup shot: cropped to a 4:3 frame and free
   * to be scaled by the entrance. "sheet" is a spec — a design-system board,
   * a diagram — whose edges carry information, so it is shown whole at its
   * own aspect ratio on a white card and never cropped or zoomed. "slide" is
   * a finished presentation board with its own background and type baked in:
   * shown whole and never zoomed like a sheet, but with no card around it,
   * since it already is one.
   */
  kind?: "photo" | "sheet" | "slide";
  src: StaticImageData;
  alt: string;
};

export type StorySection = {
  /** Short label in the left column — "The challenge". */
  label: string;
  /** The section's one-sentence point, set large in the heading style. */
  lead: string;
  body?: string[];
  points?: StoryPoint[];
  /** Paragraphs after the points. */
  coda?: string[];
  /** Shown after the section, stacked one per row at full width. */
  figures?: StoryFigure[];
};

export type ProjectStory = {
  /**
   * The full-width picture under the hero, when it should be its own shot
   * rather than a second look at the card image. It gets real alt text,
   * unlike the default, which repeats the hero and so is marked decorative.
   */
  wide?: { src: StaticImageData; alt: string };
  /** Replaces the blurb as the overview's lead line. */
  headline: string;
  intro: string[];
  facts: { label: string; value: string }[];
  sections: StorySection[];
};
