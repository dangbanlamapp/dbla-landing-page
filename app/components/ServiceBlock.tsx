export type Service = {
  /** Frame label, printed up one edge of the block and down the other. */
  label: string;
  title: string;
  blurb: string;
  /** Deliverables list in the lower half. */
  items: string[];
};

/**
 * One service panel in the pinned Services stack.
 *
 * Deliberately presentational — no `useGSAP`, no ScrollTrigger, not even a
 * timeline of its own. Every block is absolutely stacked in the same space and
 * has to hand off to the next one on a shared clock, so all of the
 * choreography lives on the master timeline in `Services`, in scroll order,
 * and this file only ships the markup plus the animation *contract* the parent
 * reads: `data-service` marks the block, `data-split` declares which way each
 * text element's lines travel.
 *
 * `data-split` follows the same convention as Hero and Intro: "up" means the
 * lines rise into place from below their mask, "down" means they drop in from
 * above. The upper half is "up" and the lower half is "down", so the two halves
 * converge on entrance and — the exit being a mirror — part again on the way
 * out.
 *
 * Ships `invisible`, which is the markup half of the parent's `autoAlpha`
 * crossfade: the server-rendered stack would otherwise show all four blocks
 * piled on top of each other until hydration.
 */
export default function ServiceBlock({ label, title, blurb, items }: Service) {
  return (
    <div
      data-service
      className="invisible absolute inset-0 m-auto flex h-[80vh] w-full flex-col"
    >
      <div className="heading-style absolute inset-0 m-auto flex aspect-square h-full flex-col items-center justify-between py-space--1x text-xs opacity-50">
        {/* <p>{label}</p>
        <p className="rotate-180">{label}</p> */}
      </div>
      <div className="flex h-1/2 flex-col items-center justify-end gap-space-base pb-space-4x">
        <h3 data-split="up" className="heading-style text-2xl text-accent">
          {title}
        </h3>
        <p data-split="up" className="max-w-[36ch] text-center text-base">
          {blurb}
        </p>
      </div>
      <div className="flex h-1/2 flex-col items-center justify-start gap-space-base pt-space-4x">
        <ul
          data-split="down"
          className="heading-style text-center text-md leading-body"
        >
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
