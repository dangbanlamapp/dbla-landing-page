export type ProjectCopy = {
  /** Discipline line — "mobile app", "website". Upper half. */
  type: string;
  /** Client or product name. Lower half. */
  name: string;
  blurb: string;
};

/**
 * One project's copy in the pinned Projects stack.
 *
 * Deliberately presentational — no `useGSAP`, no ScrollTrigger, not even a
 * timeline of its own, the same division ServiceBlock keeps. Every block is
 * absolutely stacked in the same column and has to hand off to the next on a
 * shared clock, so the choreography lives on the master timeline in `Projects`
 * in scroll order, and this file ships only the markup plus the *contract* that
 * timeline reads: `data-project-block` marks the block, `data-split` declares
 * which way each element's lines travel.
 *
 * `data-split` follows the Hero / Intro convention — "up" means the lines rise
 * into place from below their mask, "down" means they drop in from above. Here
 * the halves DIVERGE rather than converge: the type rises from below while the
 * name and blurb fall from above, so the two halves pass each other on the way
 * in and reverse it on the way out.
 *
 * Ships `invisible`, the markup half of the parent's `autoAlpha` crossfade —
 * without it the server-rendered column shows all four blocks piled on top of
 * one another until hydration.
 *
 * Light text at every size: the copy always sits inside the Projects backdrop
 * (the dark photo circle) — 96vw beside the frame on desktop, 90vh around the
 * stacked phone layout.
 *
 * Below lg the block spans the whole Projects section (its column is not
 * positioned there) and splits in two:
 * - the type goes to the top, under the counter: the counter's top
 *   (space-6x) + its one line (text-lg at leading-none) + a small gap.
 * - the name and blurb start a clear space-2x below the progress ring. The
 *   circle is centred, so that is 50% + the ring's radius, 1.15 / 2 = 0.575
 *   frame diameters. --frame-d is inherited from the section.
 */
export default function ProjectBlock({ type, name, blurb }: ProjectCopy) {
  return (
    <div
      data-project-block
      className="invisible absolute inset-0 flex flex-col items-center lg:items-start"
    >
      <div className="flex items-end justify-center p-space-base max-lg:absolute max-lg:inset-x-0 max-lg:top-[calc(var(--space-6x)+var(--text-lg)+var(--space--2x))] max-lg:py-0 lg:flex-1 lg:justify-end">
        <h3
          data-split="up"
          className="heading-style text-sm leading-heading text-off-white opacity-75 lg:text-base"
        >
          {type}
        </h3>
      </div>
      <div className="flex flex-1 flex-col items-center gap-space--1x p-space-base text-center max-lg:absolute max-lg:inset-x-0 max-lg:top-[calc(50%+var(--frame-d)*0.575+var(--space-2x))] max-lg:pt-0 lg:items-start lg:gap-space-base lg:text-left">
        <p
          data-split="down"
          className="heading-style text-lg text-white lg:text-xl"
        >
          {name}
        </p>
        <p
          data-split="down"
          className="max-w-[32ch] text-sm text-off-white lg:text-base"
        >
          {blurb}
        </p>
      </div>
    </div>
  );
}
