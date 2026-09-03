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
 */
export default function ProjectBlock({ type, name, blurb }: ProjectCopy) {
  return (
    <div
      data-project-block
      className="invisible absolute inset-0 flex flex-col items-start"
    >
      <div className="flex flex-1 items-end justify-end p-space-base">
        <h3
          data-split="up"
          className="heading-style text-base leading-heading text-secondary opacity-75"
        >
          {type}
        </h3>
      </div>
      <div className="flex flex-1 flex-col gap-space-base p-space-base">
        <p data-split="down" className="heading-style text-xl">
          {name}
        </p>
        <p data-split="down" className="max-w-[32ch] text-base">
          {blurb}
        </p>
      </div>
    </div>
  );
}
