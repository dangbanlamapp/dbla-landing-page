"use client";

import { Fragment, useRef, type ReactNode } from "react";
import TransitionLink from "./TransitionLink";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import DashedCircle from "./DashedCircle";
import { useRevealed } from "./Preloader";
import { PILL } from "./pill";
import ProjectLink from "./ProjectLink";
import {
  type Project,
  SWEEP_CLOSED,
  SWEEP_OPEN,
  projectNumber,
} from "./project-data";
import type { ProjectStory, StoryFigure } from "./project-stories";
import { useTranslations } from "next-intl";

gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger);

/** Ring diameter as a multiple of the frame — the homepage's 1.3, so the ring
 *  sits the same distance outside the circle on every page it appears. */
const RING_RATIO = 1.3;

/**
 * Masked line reveal for any `[data-split]` inside `root`, either timed off a
 * delay (the hero, which is on screen at load) or off a ScrollTrigger (the
 * sections below it). The same direction contract as everywhere else: "up"
 * rises into its mask, "down" drops in from above.
 *
 * The tween is returned from onSplit so autoSplit kills it — and the trigger
 * built with it — before every re-split.
 */
const splitLines = (
  root: Element,
  vars: { delay?: number; scrollTrigger?: ScrollTrigger.Vars },
) => {
  gsap.utils.toArray<HTMLElement>("[data-split]", root).forEach((el) => {
    const yPercent = el.dataset.split === "down" ? -150 : 150;

    SplitText.create(el, {
      type: "lines",
      mask: "lines",
      // Keeps the mask off the caps and descenders at leading-heading (0.75).
      linesClass: "pb-[0.15em]",
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent,
          duration: 1.4,
          ease: "power3.out",
          stagger: 0.1,
          ...vars,
        }),
    });
  });
};

/** Running text in the story column. Capped at a reading measure, since the
 *  column itself is half the viewport at lg. */
const BODY = "mt-space-base max-w-[60ch] text-base leading-body";

/**
 * Same two-column split as Contact — label right-aligned against the divider
 * at lg, copy on the other side of it. Every story section is one of these,
 * and `data-story` is what the entrance code finds them by.
 *
 * The label is sticky at lg, so on a long section it stays beside the copy it
 * names instead of scrolling off above it.
 */
function StorySplit({
  id,
  label,
  children,
}: {
  id?: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      data-story
      className="mt-space-5x grid grid-cols-1 gap-space-2x border-t border-black/15 pt-space-3x lg:mt-space-6x lg:grid-cols-2"
    >
      <div className="lg:pr-space-2x lg:text-right">
        <h2
          data-split="up"
          className="heading-style text-sm text-secondary opacity-75 lg:sticky lg:top-[calc(4rem+var(--space-3x))] lg:text-base"
        >
          {label}
        </h2>
      </div>
      <div className="lg:border-l lg:border-black/15 lg:pl-space-2x">
        {children}
      </div>
    </div>
  );
}

/**
 * The pictures under a story section, across the full 92vw the wide image
 * uses — one per row, stacked, so every figure gets the whole width.
 *
 * `data-figure-frame` and `data-photo` are the entrance's hooks — the same
 * open-out-and-settle as the wide image, scrubbed per frame. Sheets and slides
 * carry no `data-photo`, so they are uncovered but never zoomed (see
 * StoryFigure).
 */
function StoryFigures({ figures }: { figures: StoryFigure[] }) {
  return (
    <div className="mt-space-4x flex flex-col gap-space-2x lg:mt-space-5x">
      {figures.map((figure, i) => (
        <figure key={i}>
          <FigureFrame figure={figure} />
          {figure.caption && (
            <figcaption
              // Centred under anything shown whole, which is capped at its
              // file's width and so may sit narrower than the row.
              className={`heading-style mt-space--1x text-xs text-secondary opacity-75 lg:text-sm ${figure.kind === "sheet" || figure.kind === "slide" ? "text-center" : ""}`}
            >
              {figure.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}

function FigureFrame({ figure }: { figure: StoryFigure }) {
  const { kind = "photo", src, alt } = figure;
  const whole = kind === "sheet" || kind === "slide";

  // Shown whole: the frame takes the file's own ratio, since cropping a spec
  // board or a presentation slide cuts off the labels it exists to show. A
  // sheet sits inside a white card; a slide brings its own background and
  // needs none. Capped at the file's own width so it is never upscaled into a
  // blur — which can leave it narrower than the row, hence mx-auto.
  if (whole) {
    return (
      <div
        data-figure-frame
        className={`relative mx-auto w-full overflow-hidden rounded-md ${kind === "sheet" ? "bg-white p-space-base lg:p-space-3x" : ""}`}
        style={{ maxWidth: src.width }}
      >
        <Image
          src={src}
          alt={alt}
          sizes={`(min-width: ${src.width}px) ${src.width}px, 92vw`}
          className="h-auto w-full"
        />
      </div>
    );
  }

  return (
    <div
      data-figure-frame
      className="relative aspect-4/3 w-full overflow-hidden rounded-md"
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="92vw"
        data-photo
        className="object-cover"
      />
    </div>
  );
}

/** The picture a project opens on: its story's hero shot when it has one,
 *  otherwise the card image the homepage and index use. Read for the next
 *  project too, so the circle a reader clicks is the circle they land on. */
const heroSrc = (project: Project) => project.hero ?? project.src;

/**
 * One project's page. Three beats, each a full composition of its own: the
 * project arriving as the homepage's circle, the picture opened out to full
 * width and the story told under it, then a hand-off to the next project with
 * a page — which loops, so the last one leads back to the first and a reader
 * can walk the whole set without going back to the index.
 *
 * The story is optional (see project-stories): without one, the overview
 * falls back to the blurb and the page is the same three beats.
 *
 * Takes the whole list and an index rather than a project so the "next"
 * lookup and the "01 / 04" counter both read off the same number the route
 * resolved. Only this project's story comes along — the next one is shown
 * by its card alone.
 */
export default function ProjectDetail({
  projects,
  index,
  story,
}: {
  projects: Project[];
  index: number;
  story?: ProjectStory;
}) {
  const t = useTranslations("Projects");
  const common = useTranslations("Common");
  const container = useRef<HTMLElement>(null);
  const revealed = useRevealed();

  const project = projects[index];
  // The next project that has a page, looping, so the hand-off never opens on
  // a dead end. When this is the only one, it falls back to the plain next
  // project, which ProjectLink then renders as an unclickable picture — the
  // section keeps its composition and its timeline keeps its targets.
  const following = Array.from(
    { length: projects.length - 1 },
    (_, step) => projects[(index + 1 + step) % projects.length],
  );
  const next =
    following.find((p) => p.hasPage) ??
    projects[(index + 1) % projects.length];

  useGSAP(
    () => {
      // Same preloader gate as Hero — see the comment there.
      if (!revealed) return;

      const mm = gsap.matchMedia();

      mm.add(
        {
          reduced: "(prefers-reduced-motion: reduce)",
          motion: "(prefers-reduced-motion: no-preference)",
        },
        (ctx) => {
          const { reduced } = ctx.conditions as { reduced: boolean };

          // Everything that ships closed — both circles and the ring — has to
          // be opened for a reduced-motion reader, or they get two orange
          // discs and no pictures. Done instantly, and nothing else runs.
          if (reduced) {
            gsap.set("[data-sweep]", SWEEP_OPEN);
            gsap.set("[data-ring]", {
              height: (_i: number, el: HTMLElement) => el.dataset.size ?? "0",
            });
            return;
          }

          // ── The hero ─────────────────────────────────────────────────────
          // One timeline, because the four parts are one entrance: the ring
          // opens, the picture wipes in inside it, and the name rises under
          // it as the wipe closes. Positions are absolute, so each beat can be
          // read against the others without adding up durations.
          const hero = gsap.timeline({ delay: 0.2 });

          hero
            .to(
              "#project-hero [data-ring]",
              {
                height: (_i: number, el: HTMLElement) => el.dataset.size ?? "0",
                rotate: 90,
                duration: 2,
                ease: "power4.inOut",
              },
              0,
            )
            .fromTo(
              "#project-hero [data-sweep]",
              SWEEP_CLOSED,
              { ...SWEEP_OPEN, duration: 1.6, ease: "power4.inOut" },
              0.2,
            )
            // The homepage drift in reverse: the photo settles down to rest
            // inside a mask that has stopped moving.
            .fromTo(
              "#project-hero [data-photo]",
              { scale: 1.3 },
              { scale: 1, duration: 2.4, ease: "power3.out" },
              0.2,
            )
            .from(
              "#project-hero [data-fade]",
              {
                autoAlpha: 0,
                y: 16,
                duration: 0.5,
                ease: "power2.out",
                stagger: 0.1,
              },
              1.2,
            );

          // Lines are split outside the timeline — autoSplit has to be able to
          // kill and rebuild them on its own — so their delay mirrors the
          // timeline's 0.2 start plus the 0.6 at which the wipe is half open.
          const heroEl = container.current?.querySelector("#project-hero");
          if (heroEl) splitLines(heroEl, { delay: 0.8 });

          // ── The wide image ───────────────────────────────────────────────
          // Scrubbed, so it tracks the scrollbar: the picture opens from an
          // inset card to the full gutter as it climbs the viewport, and the
          // photo inside settles against that. ease "none" for the reason
          // Projects gives — any curve on a scrub reads as lag.
          //
          // fromTo, so a refresh landing mid-scroll never records a half-open
          // inset as the start value.
          const wideTrigger = {
            trigger: "#project-wide",
            start: "top bottom",
            end: "center center",
            scrub: true,
          };

          gsap.fromTo(
            "#project-wide [data-wide-frame]",
            { clipPath: "inset(12% 12% 12% 12% round 24px)" },
            {
              clipPath: "inset(0% 0% 0% 0% round 6px)",
              ease: "none",
              scrollTrigger: wideTrigger,
            },
          );
          // Through the frame, not the section: the story's own figures sit
          // inside #project-wide too and run on their own triggers below.
          gsap.fromTo(
            "#project-wide [data-wide-frame] [data-photo]",
            { scale: 1.25 },
            { scale: 1, ease: "none", scrollTrigger: wideTrigger },
          );

          // ── The story's figures ──────────────────────────────────────────
          // The wide image's move at a smaller inset, one trigger per frame
          // so each opens as it climbs the viewport rather than all of them
          // off the first. A sheet has no data-photo, so only its frame moves.
          gsap.utils
            .toArray<HTMLElement>("[data-figure-frame]", container.current)
            .forEach((frame) => {
              const trigger = {
                trigger: frame,
                start: "top bottom",
                end: "center center",
                scrub: true,
              };

              gsap.fromTo(
                frame,
                { clipPath: "inset(8% 8% 8% 8% round 24px)" },
                {
                  clipPath: "inset(0% 0% 0% 0% round 6px)",
                  ease: "none",
                  scrollTrigger: trigger,
                },
              );

              const photo = frame.querySelector("[data-photo]");
              if (photo) {
                gsap.fromTo(
                  photo,
                  { scale: 1.2 },
                  { scale: 1, ease: "none", scrollTrigger: trigger },
                );
              }
            });

          // ── The story ────────────────────────────────────────────────────
          // Each section is its own trigger, so a long case study reveals as
          // it is read rather than all at once off the first one. Label and
          // lead are split into lines; body copy, facts and points only fade
          // up — line-masking paragraphs of running text reads as a gimmick
          // and builds a SplitText instance per paragraph for nothing.
          gsap.utils
            .toArray<HTMLElement>("[data-story]", container.current)
            .forEach((section) => {
              const trigger = {
                trigger: section,
                start: "top 80%",
                toggleActions: "play none none reverse",
              };

              splitLines(section, { scrollTrigger: trigger });

              const fades = section.querySelectorAll("[data-fade]");
              if (fades.length) {
                gsap.from(fades, {
                  autoAlpha: 0,
                  y: 16,
                  duration: 0.8,
                  ease: "power2.out",
                  stagger: 0.08,
                  delay: 0.3,
                  scrollTrigger: trigger,
                });
              }
            });

          // ── The next project ─────────────────────────────────────────────
          // The index card's entrance, on its own trigger. Played once and
          // left open: this circle is a link, and closing it again on the way
          // back up would hide the thing the section exists to offer.
          const nextEl = container.current?.querySelector("#project-next");
          if (nextEl) {
            const nextTrigger = {
              trigger: nextEl,
              start: "top 60%",
              toggleActions: "play none none none",
            };

            gsap.fromTo("#project-next [data-sweep]", SWEEP_CLOSED, {
              ...SWEEP_OPEN,
              duration: 1.4,
              ease: "power4.inOut",
              scrollTrigger: nextTrigger,
            });
            gsap.fromTo(
              "#project-next [data-photo]",
              { scale: 1.25 },
              {
                scale: 1,
                duration: 2,
                ease: "power3.out",
                scrollTrigger: nextTrigger,
              },
            );
            splitLines(nextEl, { delay: 0.3, scrollTrigger: nextTrigger });
          }
        },
      );
    },
    { scope: container, dependencies: [revealed] },
  );

  return (
    <article ref={container}>
      {/*
        The hero. h-svh and justify-center-safe for the reasons Contact spells
        out: the small viewport is the one guaranteed at load, and `safe` lets
        a too-short screen scroll to the top of the type instead of pushing it
        off the top edge.

        --frame-d is the one diameter, declared once so the circle and the ring
        are derived from it rather than kept in agreement by hand. min() takes
        whichever axis binds — width on a portrait phone, height everywhere
        else — and leaves room for the name and blurb under it.
      */}
      <section
        id="project-hero"
        className="relative flex h-svh flex-col items-center justify-center-safe overflow-hidden px-space-base pt-[calc(4rem+2vh)] pb-[4vh] text-center [--frame-d:min(80vw,42vh)] lg:[--frame-d:52vh]"
      >
        {/* Centre crosshair — page furniture, as on Contact. */}
        <div aria-hidden className="absolute inset-0">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-full w-px bg-black opacity-10"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-px w-full bg-black opacity-10"></div>
          </div>
        </div>

        <div
          data-fade
          className="heading-style relative mb-space-2x flex w-full max-w-[calc(var(--frame-d)*1.3)] items-end justify-between text-sm text-secondary opacity-75 lg:text-base"
        >
          <span>
            {projectNumber(index)} / {projectNumber(projects.length - 1)}
          </span>
          <span>{project.type}</span>
        </div>

        <div className="relative flex shrink-0 items-center justify-center">
          <div className="relative aspect-square h-[var(--frame-d)] rounded-full">
            {/* The zero state: every wedge closed, so this is what the server
                renders and what shows before the wipe. */}
            <div className="absolute inset-0 rounded-full bg-accent" />
            <div
              data-sweep
              className="quadrant-reveal absolute inset-0 overflow-hidden rounded-full"
            >
              <Image
                src={heroSrc(project)}
                alt={project.alt}
                fill
                // The page's LCP element, so it is fetched up front rather
                // than lazily once the layout has been worked out. Not
                // `priority` (deprecated in 16) or `preload`: the docs steer
                // to these two, and a <head> preload goes unused on a
                // client-side navigation, which is how most readers get here.
                loading="eager"
                fetchPriority="high"
                sizes="(min-width: 64rem) 52vh, 80vw"
                data-photo
                className="object-cover"
              />
            </div>
          </div>
          {/* Collapsed, opened by the hero timeline — the no-SSR-flash pairing
              HeaderBg uses for its rings. */}
          <DashedCircle
            size={`calc(var(--frame-d)*${RING_RATIO})`}
            dots="horizontal"
            collapsed
          />
        </div>

        {/*
          The name overlaps the foot of the circle, Contact's heading-over-panel
          move: a negative top margin in the heading's own em, so the overlap
          holds its proportion at every step of the type scale, and z-1 so it
          paints over the picture rather than under it.
        */}
        <h1
          data-split="up"
          className="heading-style relative z-1 -mt-[0.3em] text-6xl leading-heading lg:text-8xl"
        >
          {project.name}
        </h1>
        <p
          data-fade
          className="relative mt-space-2x max-w-[46ch] text-base leading-body"
        >
          {project.blurb}
        </p>
      </section>

      {/*
        The picture at full width. 4:3 below lg, which is the mockups' own
        ratio, so nothing is cropped on a phone; from lg the box is held to
        90vh instead, because 4:3 at 92vw is taller than a laptop screen and
        the reader would never see the whole frame at once.

        A story can swap in its own shot here (`wide`). Without one it is the
        hero's picture again, and alt="" keeps a screen reader from announcing
        the same image twice.
      */}
      <section id="project-wide" className="mx-auto w-[92vw] py-space-6x">
        <div
          data-wide-frame
          className="relative aspect-[4/3] w-full overflow-hidden rounded-md lg:aspect-auto lg:h-[90vh]"
        >
          <Image
            src={story?.wide?.src ?? project.src}
            alt={story?.wide?.alt ?? ""}
            fill
            sizes="92vw"
            data-photo
            className="object-cover"
          />
        </div>

        <StorySplit id="project-overview" label={t("overview")}>
          <p
            data-split="up"
            className="heading-style max-w-[32ch] text-lg leading-body lg:text-xl"
          >
            {story?.headline ?? project.blurb}
          </p>
          {story?.intro.map((text) => (
            <p key={text} data-fade className={BODY}>
              {text}
            </p>
          ))}
          {story && (
            <dl className="mt-space-3x grid grid-cols-1 gap-x-space-2x gap-y-space-base sm:grid-cols-2">
              {story.facts.map(({ label, value }) => (
                <div
                  key={label}
                  data-fade
                  className="border-t border-black/15 pt-space--2x"
                >
                  <dt className="heading-style text-xs text-secondary opacity-75 lg:text-sm">
                    {label}
                  </dt>
                  <dd className="mt-space--3x text-base leading-body">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </StorySplit>

        {story?.sections.map((section) => (
          <Fragment key={section.label}>
            <StorySplit label={section.label}>
              <p
                data-split="up"
                className="heading-style max-w-[32ch] text-lg leading-body lg:text-xl"
              >
                {section.lead}
              </p>
              {section.body?.map((text) => (
                <p key={text} data-fade className={BODY}>
                  {text}
                </p>
              ))}
              {section.points && (
                <ol className="mt-space-3x flex max-w-[60ch] flex-col gap-space-2x">
                  {section.points.map(({ title, body }, i) => (
                    <li
                      key={title}
                      data-fade
                      className="grid grid-cols-[2.5em_1fr] gap-x-space-base border-t border-black/15 pt-space-base"
                    >
                      <span className="heading-style text-sm text-accent lg:text-base">
                        {projectNumber(i)}
                      </span>
                      <div>
                        <h3 className="heading-style text-base lg:text-md">
                          {title}
                        </h3>
                        <p className="mt-space--2x text-base leading-body text-secondary">
                          {body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              {/* Pushed off the list by the same rhythm the points keep
                between themselves, or it reads as part of the last one. */}
              {section.coda && (
                <div className="mt-space-base">
                  {section.coda.map((text) => (
                    <p key={text} data-fade className={BODY}>
                      {text}
                    </p>
                  ))}
                </div>
              )}
            </StorySplit>
            {section.figures && <StoryFigures figures={section.figures} />}
          </Fragment>
        ))}
      </section>

      {/* The hand-off. Same circle, same click-to-open as the index card. */}
      <section
        id="project-next"
        className="relative flex min-h-svh flex-col items-center justify-center gap-space-2x overflow-hidden px-space-base py-space-6x text-center [--frame-d:min(70vw,40vh)]"
      >
        <div aria-hidden className="absolute inset-0">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-full w-px bg-black opacity-10"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-px w-full bg-black opacity-10"></div>
          </div>
        </div>

        <p
          data-split="up"
          className="heading-style relative text-sm text-secondary opacity-75 lg:text-base"
        >
          {t("next", { number: projectNumber(projects.indexOf(next)) })}
        </p>

        <ProjectLink
          project={next}
          className="relative aspect-square h-[var(--frame-d)] rounded-full outline-offset-8 outline-accent focus-visible:outline-2"
        >
          <div className="absolute inset-0 rounded-full bg-accent" />
          <div
            data-sweep
            className="quadrant-reveal absolute inset-0 overflow-hidden rounded-full"
          >
            {/* Hover zoom on a wrapper, entrance settle on the photo — two
                elements so the CSS transition and the tween never write the
                same transform. See ProjectsIndex. */}
            <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-110 group-focus-visible:scale-110">
              <Image
                src={heroSrc(next)}
                alt={next.alt}
                fill
                sizes="(min-width: 64rem) 40vh, 70vw"
                data-photo
                className="object-cover"
              />
            </div>
          </div>
        </ProjectLink>

        <h2
          data-split="down"
          className="heading-style relative text-5xl leading-heading lg:text-7xl"
        >
          {next.name}
        </h2>

        <TransitionLink
          href="/projects"
          className={`${PILL} relative mt-space-base bg-foreground text-background`}
        >
          {common("allProjects")}
        </TransitionLink>
      </section>
    </article>
  );
}
