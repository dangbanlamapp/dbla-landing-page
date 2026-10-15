"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import DashedCircle from "./DashedCircle";
import { useRevealed } from "./Preloader";
import ProjectLink from "./ProjectLink";
import {
  SWEEP_CLOSED,
  SWEEP_OPEN,
  projectNumber,
  type Project,
} from "./project-data";
import { useTranslations } from "next-intl";
import { RICH } from "./rich";

gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger);

/**
 * The /projects index: a heading, then every project as a circle you can click
 * into.
 *
 * The circle is the homepage stack's frame, kept on purpose — the reader has
 * just watched these four images wipe in as circles on the way here, so the
 * index re-uses the same shape and the same quadrant wipe rather than
 * introducing a card. What changes is the clock: the homepage scrubs one pin,
 * this page has no pin at all and gives each card its own trigger, because the
 * cards are laid out in normal flow and arrive one at a time anyway.
 */
export default function ProjectsIndex({ projects }: { projects: Project[] }) {
  const t = useTranslations("Projects");
  const container = useRef<HTMLElement>(null);
  const revealed = useRevealed();

  useGSAP(
    () => {
      // Same gate as Hero: a direct load on this route still plays the
      // preloader, and nothing here should start under the curtain or measure
      // while ScrollLock holds <html> clipped. A client-side navigation from
      // the homepage arrives with `revealed` already true, so this is a no-op
      // there.
      if (!revealed) return;

      const mm = gsap.matchMedia();

      mm.add(
        {
          reduced: "(prefers-reduced-motion: reduce)",
          motion: "(prefers-reduced-motion: no-preference)",
        },
        (ctx) => {
          const { reduced } = ctx.conditions as { reduced: boolean };

          const images = gsap.utils.toArray<HTMLElement>(
            "[data-card-image]",
            container.current,
          );

          // The images ship closed (see .quadrant-reveal), so a reader who has
          // asked for less motion still needs them opened — instantly, and with
          // none of the line reveals below. Leaving this out would leave every
          // circle as bare orange for them. The ring ships `collapsed` for the
          // same reason and needs the same treatment.
          if (reduced) {
            gsap.set(images, SWEEP_OPEN);
            gsap.set("#projects-index-ring [data-ring]", {
              height: (_i: number, el: HTMLElement) => el.dataset.size ?? "0",
            });
            return;
          }

          // ── The heading ──────────────────────────────────────────────────
          // Hero's contract: data-split declares the direction. Scoped to
          // #projects-index-heading for the reason Projects scopes its own —
          // every card below carries data-split too, and an unscoped query
          // would play their lines here, on load, before they are on screen.
          gsap.utils
            .toArray<HTMLElement>(
              "#projects-index-heading [data-split]",
              container.current,
            )
            .forEach((heading) => {
              const yPercent = heading.dataset.split === "down" ? -150 : 150;

              SplitText.create(heading, {
                type: "lines",
                mask: "lines",
                // Keeps the mask off the caps at leading-heading (0.75).
                linesClass: "pb-[0.1em]",
                autoSplit: true,
                onSplit: (self) =>
                  gsap.from(self.lines, {
                    yPercent,
                    duration: 1.5,
                    ease: "power3.out",
                    stagger: 0.12,
                    // Shorter than Hero's 0.7: that number is tuned to the
                    // curtain uncovering the centre of the screen, and most
                    // arrivals here are client-side navigations with no
                    // curtain at all, where 0.7s of empty masks reads as lag.
                    delay: 0.3,
                  }),
              });
            });

          gsap.from("#projects-index-heading [data-fade]", {
            autoAlpha: 0,
            y: 16,
            duration: 0.5,
            ease: "power2.out",
            stagger: 0.1,
            delay: 1,
          });

          // The ring opens out of nothing, the markup half being `collapsed`
          // — same pairing HeaderBg uses, so no full-size ring flashes before
          // hydration.
          gsap.to("#projects-index-ring [data-ring]", {
            height: (_i: number, el: HTMLElement) => el.dataset.size ?? "0",
            rotate: 90,
            duration: 2,
            ease: "power4.inOut",
            delay: 0.2,
          });

          // ── The cards ────────────────────────────────────────────────────
          // One trigger per card rather than a shared timeline: the grid is
          // ordinary flow, so the card IS the measure of when it is on screen
          // and there is no pin whose clock they would need to share.
          gsap.utils
            .toArray<HTMLElement>("[data-card]", container.current)
            .forEach((card) => {
              const trigger = {
                trigger: card,
                start: "top 80%",
                // Played once and left. Reversing on the way back up — the
                // site's usual habit — would close the circles again exactly
                // when the reader is scrolling back to pick one to click.
                toggleActions: "play none none none",
              };

              // The homepage's pinwheel, as a timed tween rather than a scrub.
              // fromTo for the same reason Projects gives: the layer ships
              // closed, and a `from` would read that as the end state.
              gsap.fromTo(
                card.querySelector("[data-card-image]"),
                SWEEP_CLOSED,
                {
                  ...SWEEP_OPEN,
                  duration: 1.4,
                  ease: "power4.inOut",
                  scrollTrigger: trigger,
                },
              );

              // Same picture-behind-the-mask drift as the homepage: the frame
              // stands still once open and the photo inside settles, so the
              // circle lands on something still moving. Here it settles DOWN
              // to rest rather than creeping past it, so the card ends at the
              // resting size the hover scale is measured from.
              gsap.fromTo(
                card.querySelector("[data-card-photo]"),
                { scale: 1.25 },
                {
                  scale: 1,
                  duration: 2,
                  ease: "power3.out",
                  scrollTrigger: trigger,
                },
              );

              gsap.utils
                .toArray<HTMLElement>("[data-split]", card)
                .forEach((el) => {
                  const yPercent = el.dataset.split === "down" ? -150 : 150;

                  SplitText.create(el, {
                    type: "lines",
                    mask: "lines",
                    linesClass: "pb-[0.15em]",
                    autoSplit: true,
                    // Returned so GSAP kills it — and its ScrollTrigger —
                    // before each re-split.
                    onSplit: (self) =>
                      gsap.from(self.lines, {
                        yPercent,
                        duration: 1.2,
                        ease: "power3.out",
                        stagger: 0.08,
                        // Starts as the wipe is half open, so the name reads
                        // as arriving with its picture rather than ahead of it.
                        delay: 0.4,
                        scrollTrigger: trigger,
                      }),
                  });
                });
            });
        },
      );
    },
    { scope: container, dependencies: [revealed] },
  );

  return (
    <section id="projects-index" ref={container} className="relative">
      {/*
        The page's vertical rule, hung off the section rather than the hero so
        it runs the full length of the page — through the heading, down the
        gutter between the two grid columns, to the last card. `inset-y-0` on
        a `relative` section is what makes it track the page's real height,
        however many projects the list grows to.

        -z-1, the same trick HeaderBg uses for its backdrop: it drops the line
        under every card's circle and copy instead of drawing over them where
        the single-column phone layout puts it straight down their middle.
        Nothing between here and the canvas paints a background, so it still
        shows on the beige.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 -z-1 w-px -translate-x-1/2 bg-black opacity-10"
      />
      {/*
        Heading block. h-svh for the same reason Contact gives — the small
        viewport is the one that is guaranteed, so the composition never moves
        when a mobile URL bar collapses.

        Clipped on x ONLY. The ring is max(70vw, 70vh), which on any landscape
        screen is taller than this block, and a full overflow-hidden used to
        slice its bottom arc off flat along the hero's edge. overflow-x-clip
        still trims the sideways spill on a portrait phone (where 70vh is wider
        than the screen) but lets the ring hang below the hero — the grid's top
        margin then makes room for exactly that overhang. `clip` rather than
        `hidden` because overflow-x: hidden would force the y axis to `auto`
        and clip it anyway.
      */}
      <div
        id="projects-index-heading"
        className="relative flex h-svh flex-col items-center justify-center overflow-x-clip px-space-base pt-[calc(4rem+2vh)] text-center"
      >
        {/* Drawn layer — page furniture, not content. */}
        <div aria-hidden className="absolute inset-0">
          {/* The size is repeated in the grid's top margin below — change
              one and change the other, or the list cuts into the ring again. */}
          <DashedCircle
            id="projects-index-ring"
            size="max(70vw, 70vh)"
            dots="horizontal"
            collapsed
          />
          {/* Horizontal rule only — the vertical one runs the whole page
              and lives on the section. */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-px w-full bg-black opacity-10"></div>
          </div>
        </div>

        <div className="relative flex flex-col items-center gap-space-2x">
          <p
            data-fade
            className="heading-style text-sm text-secondary opacity-75 lg:text-base"
          >
            ({projectNumber(projects.length - 1)})
          </p>
          <h1
            data-split="up"
            className="heading-style text-6xl leading-heading lg:text-8xl"
          >
            {t.rich("title", RICH)}
          </h1>
          <p data-fade className="max-w-[36ch] text-base leading-body">
            {t("intro")}
          </p>
        </div>
      </div>

      {/*
        The grid. Two columns from md, with the right-hand column dropped by
        20vh — the stagger is what keeps four equal circles from reading as a
        spreadsheet, and it makes the eye zig-zag down the page in the same
        order the homepage scrolled through them.

        w-[92vw] is the site's gutter (see bar.ts), so the circles line up
        under the logo and the back link.

        The top margin is the ring's overhang below the hero plus a space-3x
        of air: the ring is centred on a 100svh block, so it spills
        (diameter - 100svh) / 2 past the bottom edge. Wrapped in max(0px, …)
        so that where the ring fits — a portrait phone, where 70vh is the
        smaller side of the screen — the margin is simply zero rather than
        negative and the list does not ride up into the hero.
      */}
      <ul className="mx-auto mt-[max(0px,calc((max(70vw,70vh)-100svh)/2+var(--space-3x)))] grid w-[92vw] grid-cols-1 gap-x-space-6x gap-y-space-6x pb-space-6x md:grid-cols-2">
        {projects.map((project, i) => (
          <li
            key={project.slug}
            data-card
            className="flex flex-col gap-space-2x md:even:mt-[20vh]"
          >
            {/* The ruled line the number and discipline sit on — the same
                black/15 stroke as Contact's divider. */}
            <div className="heading-style flex items-end justify-between border-b border-black/15 pb-space--2x text-sm text-secondary lg:text-base">
              <span>{projectNumber(i)}</span>
              <span>{project.type}</span>
            </div>

            {/*
              The image IS the link, which is the whole interaction this page
              asks for. aria-label because the picture's alt describes the
              mockup ("The Eggu app running on a phone"), which is the wrong
              name for a link whose job is to open the case study.

              max-w caps the circle against the viewport HEIGHT: at full column
              width a 1440px screen would print a 660px circle, taller than a
              laptop's viewport, and the name below it would never share the
              screen with its picture.

              A project without a page gets the same circle as a plain
              picture — no link, no zoom, no pill (see ProjectLink).
            */}
            <ProjectLink
              project={project}
              className="relative mx-auto aspect-square w-full max-w-[70vh] rounded-full outline-offset-8 outline-accent focus-visible:outline-2"
            >
              {/* The zero state, as on the homepage: before the wipe every
                  wedge is closed and this orange disc is what shows. */}
              <div className="absolute inset-0 rounded-full bg-accent" />

              <div
                data-card-image
                className="quadrant-reveal absolute inset-0 overflow-hidden rounded-full"
              >
                {/*
                  Two layers of scale, kept on two elements so they never fight
                  over one transform: GSAP owns the photo's entrance settle,
                  and the CSS hover zoom lives on this wrapper. Tweening and
                  transitioning the same `scale` would have the hover snap to
                  wherever the tween last wrote it.
                */}
                <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-110 group-focus-visible:scale-110">
                  <Image
                    src={project.src}
                    alt={project.alt}
                    fill
                    sizes="(min-width: 48rem) 46vw, 92vw"
                    data-card-photo
                    className="object-cover"
                  />
                </div>
              </div>
            </ProjectLink>

            {/* Name drops in from above, blurb follows — the ProjectBlock
                direction, so a project's copy moves the same way on every
                page it appears. Centred on the circle above, so name and
                picture read as one column rather than the copy hanging off
                its left edge. */}
            <div className="flex flex-col items-center gap-space--1x text-center lg:gap-space-base">
              <h2
                data-split="down"
                className="heading-style text-xl leading-heading lg:text-3xl"
              >
                {project.name}
              </h2>
              <p
                data-split="down"
                className="max-w-[40ch] text-sm leading-body lg:text-base"
              >
                {project.blurb}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
