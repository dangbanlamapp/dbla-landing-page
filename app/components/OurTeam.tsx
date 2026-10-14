"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Avatar, { type AvatarProps } from "./Avatar";
import { useTranslations } from "next-intl";
import { RICH } from "./rich";

gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger);

// The roster is edited in the Studio (Team) and fetched by the homepage, in
// the order it is dragged into there. Each `avatar` is spread straight onto
// <Avatar>, so every option it documents can be set per person; anything left
// out falls back to Avatar's default. The blink/look timings differ on purpose
// so the row never moves in unison.
// `level` is a 0–100 proficiency: it is both the percentage printed beside the
// skill and the width its meter fills to.
type Skill = { name: string; level: number };

export type TeamMember = {
  name: string;
  role: string;
  intro: string;
  expertise: string[];
  skills: Skill[];
  avatar: AvatarProps;
};

// Wrap any part of an `intro` in **double asterisks** to render it in the
// accent colour — e.g. "**Ten years** turning fuzzy briefs…". Splitting on a
// capturing group puts every highlighted run at an odd index, so no regex
// matching is needed in the render.
function Highlighted({ text }: { text: string }) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 ? (
      <span key={i} className="text-accent">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export default function OurTeam({ team }: { team: TeamMember[] }) {
  const t = useTranslations("Team");
  const container = useRef<HTMLElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  // One card open at a time: opening another folds the first back, so the row
  // never ends up with several panels competing for the same eye.
  const [open, setOpen] = useState<number | null>(null);
  const cardTls = useRef<gsap.core.Timeline[]>([]);

  useGSAP(
    () => {
      // ── Heading ────────────────────────────────────────────────────────────
      // The same scrubbed recipe as WhyUs' copy column, on the same data-split
      // contract: the markup says which way the lines travel. One trigger for
      // the label and the heading together — the block that holds them — so
      // they read as a single entrance however the text reflows.
      //
      // fromTo rather than from for the reason spelled out in WhyUs, and no
      // invalidateOnRefresh for the reason spelled out there too: with a
      // stagger it left "the work" sitting visible before the entrance.
      gsap.utils
        .toArray<HTMLElement>("[data-split]", copy.current)
        .forEach((block) => {
          const yPercent = block.dataset.split === "down" ? -150 : 150;

          SplitText.create(block, {
            type: "lines",
            mask: "lines",
            // Keeps the mask off the caps at leading-heading (0.75).
            linesClass: "pb-[0.1em]",
            autoSplit: true,
            onSplit: (self) =>
              gsap.fromTo(
                self.lines,
                { yPercent },
                {
                  yPercent: 0,
                  ease: "power3.out",
                  stagger: 0.12,
                  scrollTrigger: {
                    trigger: copy.current,
                    start: "top bottom",
                    end: "center center",
                    scrub: true,
                  },
                },
              ),
          });
        });

      // Supporting copy under the heading: plain fade, no split. Shipped
      // without an opacity class, as everywhere else data-fade is used — from()
      // stamps the start value on init, and the text stays readable without JS.
      gsap.from(gsap.utils.toArray("[data-fade]", copy.current), {
        opacity: 0,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: copy.current,
          start: "top 75%",
          toggleActions: "play none none reverse",
        },
      });

      // ── Cards ──────────────────────────────────────────────────────────────
      // Each portrait rises out of its own frame: the frame is overflow-hidden
      // and the tile inside starts a full height below it. That start value is
      // already in the markup (`translate-y-full`), so the server-rendered
      // frame is empty rather than flashing a finished tile before GSAP
      // hydrates — the same bargain as the z-line's scale-x-0.
      //
      // yPercent, not clip-path or height, so the reveal stays on the
      // compositor. fromTo writes both ends out because the class sets the
      // start, and a bare `to` would be the only thing standing between the
      // tile and staying hidden if the class ever changed.
      //
      // `y: 0` on both ends is load-bearing. Tailwind v4's translate-y-full
      // writes the standalone CSS `translate` property, and GSAP folds that
      // into its own *pixel* `y` when it first touches the element — then
      // animates yPercent on top. Without zeroing y the tween lands at
      // yPercent 0 with the full-height pixel offset still applied, and the
      // portrait never comes up out of its frame.
      //
      // Played, not scrubbed: a grid of four that each scrub on their own would
      // drift in and out of step with every wheel tick. One trigger on the grid
      // with a stagger is what makes the row read left-to-right as a single
      // gesture; below lg the two rows simply arrive together, which is fine.
      const tiles = gsap.utils.toArray<HTMLElement>(
        "[data-tile]",
        grid.current,
      );

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: grid.current,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      });

      tl.fromTo(
        tiles,
        { y: 0, yPercent: 100 },
        { y: 0, yPercent: 0, duration: 1, ease: "power3.out", stagger: 0.1 },
      );

      // ── Explore panels ─────────────────────────────────────────────────────
      // One paused timeline per card, driven by `open` below: play opens it,
      // reverse folds it back along the same path. Only the avatar scales —
      // about its top edge, which pushes it up and frees the middle of the
      // card; the number and name stay put. The details fade in once there is
      // room, and the meters fill last so the eye lands on them as they move.
      //
      // Reduced motion collapses the durations to 0 rather than skipping the
      // timeline, so the panel still opens — it just doesn't travel. Read once
      // at build time, like the rest of this file's entrances.
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const d = (s: number) => (reduced ? 0 : s);

      cardTls.current = gsap.utils
        .toArray<HTMLElement>("[data-card]", grid.current)
        .map((card) => {
          const q = gsap.utils.selector(card);
          return gsap
            .timeline({ paused: true, defaults: { ease: "power3.out" } })
            .to(q("[data-avatar]"), { scale: 0.4, duration: d(0.7) })
            .to(q("[data-details]"), { autoAlpha: 1, duration: d(0.4) }, 0.25)
            .fromTo(
              q("[data-meter]"),
              { scaleX: 0 },
              {
                scaleX: (_i: number, el: HTMLElement) =>
                  Number(el.dataset.level),
                duration: d(0.9),
                ease: "power2.out",
                stagger: 0.1,
              },
              0.35,
            );
        });
    },
    { scope: container },
  );

  useEffect(() => {
    cardTls.current.forEach((tl, i) => (i === open ? tl.play() : tl.reverse()));
  }, [open]);

  return (
    <section ref={container} id="our-team" className="relative">
      <div className="relative z-1 flex flex-col gap-space-6x py-[15vh]">
        <div
          ref={copy}
          className="flex flex-col items-center gap-space-2x px-space-base text-center"
        >
          <div className="flex flex-col items-center">
            <p
              data-split="up"
              className="text-xs text-foreground/75 uppercase lg:text-sm"
            >
              {t("label")}
            </p>
            <h2
              data-split="up"
              className="heading-style text-2xl leading-heading lg:text-4xl"
            >
              {t.rich("title", RICH)}
            </h2>
          </div>
          <p
            data-fade
            className="max-w-[48ch] text-sm leading-body lg:text-base"
          >
            {t("body")}
          </p>
        </div>

        <div
          ref={grid}
          className="grid grid-cols-1 gap-space-base px-space-base sm:grid-cols-2 lg:grid-cols-4"
        >
          {team.map((member, i) => {
            const isOpen = open === i;
            return (
              <article
                key={member.name}
                data-card
                className="aspect-4/5 overflow-hidden rounded-md lg:aspect-3/4"
              >
                {/* The article is the mask; the tile is what moves. Keeping
                    them separate is what lets the frame hold the card's shape
                    in the layout while its contents are still below the edge. */}
                <div
                  data-tile
                  className="relative h-full w-full translate-y-full bg-foreground/5"
                >
                  {/* Number and name hold the top and bottom of the card and
                      never move. The middle slot is what opening reshapes:
                      the avatar wrapper fills it, so the avatar sits dead
                      centre while closed, and scaling that wrapper about its
                      top edge (origin-top) is what pushes the avatar up and
                      leaves the lower part of the slot for the details. */}
                  <div className="absolute inset-x-0 top-0 bottom-14 flex flex-col items-center justify-between gap-space--2x p-space-2x">
                    <span className="text-sm leading-none font-semibold tracking-tighter opacity-50 lg:text-lg">
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    <div className="relative min-h-0 w-full flex-1">
                      <div
                        data-avatar
                        className="absolute inset-0 flex origin-top items-center justify-center"
                      >
                        <Avatar {...member.avatar} className="w-3/5" />
                      </div>

                      {/* Starts invisible in the markup (the autoAlpha
                          tween's initial value) so a closed card has nothing
                          readable or focusable here — `invisible` also pulls
                          it out of the tab order and the accessibility tree. */}
                      <div
                        id={`team-details-${i}`}
                        data-details
                        className="invisible absolute inset-x-0 top-[38%] bottom-0 flex flex-col justify-center gap-space--1x opacity-0"
                      >
                        <p className="text-center text-xs leading-body lg:text-sm 2xl:text-base 3xl:text-md">
                          <Highlighted text={member.intro} />
                        </p>
                        <ul className="flex flex-wrap justify-center gap-space--2x">
                          {member.expertise.map((tag) => (
                            <li
                              key={tag}
                              className="rounded-full border border-foreground/20 px-space--1x py-0.5 text-xs lg:text-sm 2xl:text-base 3xl:text-md"
                            >
                              {tag}
                            </li>
                          ))}
                        </ul>
                        <ul className="flex flex-col gap-space--2x">
                          {member.skills.map((skill) => (
                            <li
                              key={skill.name}
                              className="flex flex-col gap-1"
                            >
                              <div className="flex justify-between text-xs leading-none lg:text-base 3xl:text-base">
                                <span>{skill.name}</span>
                                <span className="text-foreground/50">
                                  {skill.level}%
                                </span>
                              </div>
                              <div className="h-1 rounded-full bg-foreground/10">
                                <div
                                  data-meter
                                  data-level={skill.level / 100}
                                  className="h-full origin-left scale-x-0 rounded-full bg-accent"
                                />
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="flex flex-col items-center text-center">
                      <h3 className="heading-style text-md lg:text-lg">
                        {member.name}
                      </h3>
                      <p className="text-sm text-foreground/50 lg:text-md">
                        {member.role}
                      </p>
                    </div>
                  </div>

                  <div className="absolute inset-x-0 bottom-space--1x flex justify-center">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`team-details-${i}`}
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="rounded-full border border-foreground px-space-base py-space--2x text-xs uppercase transition-colors hover:bg-foreground hover:text-background focus-visible:bg-foreground focus-visible:text-background lg:text-sm"
                    >
                      {isOpen ? "Close" : "Explore"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div id="cross-lines" className="absolute inset-0 hidden lg:block">
        <div
          id="x-line"
          className="absolute inset-x-0 top-0 flex justify-center"
        >
          <div className="h-px w-full bg-black opacity-10"></div>
        </div>
      </div>
    </section>
  );
}
