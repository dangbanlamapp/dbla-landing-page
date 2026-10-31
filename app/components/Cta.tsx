"use client";

import { useRef } from "react";
import TransitionLink from "./TransitionLink";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import DashedCircle from "./DashedCircle";
import ScopeBar from "./ScopeBar";
import { useTranslations } from "next-intl";

gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger);

/**
 * Share of the pin the text entrance occupies, from the top of the pin. What is
 * left over at the end is a held tail with nothing moving, so the finished
 * section sits still for half a screen before it scrolls off.
 */
const TEXT_IN = 0.5;

/**
 * Hero's ring stagger (HeaderBg's `i * 0.25` over a 2s growth), kept as the
 * same proportion of the rings' run here: each ring starts this share of the
 * run after the one inside it. The rotation is likewise 0.9 of the growth, as
 * HeaderBg's 1.8 against 2, so a ring stops turning just before it stops
 * growing.
 */
const RING_STAGGER = 0.125;
const RING_TURN = 0.9;

/**
 * How far into their run the rings hold back before opening, so they arrive
 * over dark rather than on the beige. The disc owns the first half of the run
 * and eases in (scale = progress²), so it is barely a quarter grown at the
 * midpoint of its own scrub; 0.35 waits until it is ~70% through its scroll,
 * about half its diameter, by which point the rings' burst lands on it.
 */
const RING_DELAY = 0.35;

/**
 * Where the copy under the heading starts, as a share of TEXT_IN: the heading's
 * lines lead and the body and button follow while the last line is still
 * landing, so the three read as one arrival rather than a queue.
 */
const FADE_AT = TEXT_IN * 0.4;

/**
 * The dark disc's diameter: the viewport diagonal, so at scale 1 its rim lands
 * exactly on the corners and the whole ease plays where it can be seen (same
 * reasoning as PageTransition's DIAGONAL). +2px pushes the antialiased edge
 * just past the corners. Pure CSS, so a resize stays covered.
 */
const DISC = "calc(hypot(100vw, 100vh) + 2px)";

/** The Studio's Homepage → Call to action. Each field missing falls back to
 *  messages/. */
export type CtaCopy = { title?: string; body?: string };

export default function Cta({ copy: words = {} }: { copy?: CtaCopy }) {
  const t = useTranslations("Cta");
  const common = useTranslations("Common");
  const container = useRef<HTMLElement>(null);
  const yLine = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const scroll = gsap.timeline({
        scrollTrigger: {
          trigger: container.current,
          start: "top top",
          end: () => "+=" + window.innerHeight,
          scrub: 1,
          pin: true,
          invalidateOnRefresh: true,
        },
      });

      // The dark disc grows over the last half-screen before the pin: from the
      // section's top reaching the viewport's middle to it reaching the top,
      // so it covers the screen on the frame the pin takes hold. Its centre is
      // the section's, which sits on the viewport's bottom edge at the start —
      // so the disc rises into view from below as it grows, and is centred by
      // the time it is full.
      //
      // Scrubbed and on its own trigger rather than in the pinned timeline:
      // it has to finish *before* the pin, where the text starts. fromTo so a
      // refresh mid-scroll can never latch a half-grown start value.
      gsap.fromTo(
        "[data-disc]",
        { scale: 0 },
        {
          scale: 1,
          ease: "power2.in",
          scrollTrigger: {
            trigger: container.current,
            start: "top center",
            end: "top top",
            scrub: true,
          },
        },
      );

      // One timeline second == one viewport of scroll, same convention as
      // HeaderBg — that is what lets the constants above read directly as
      // fractions of the pin. This empty tween on a throwaway object is what
      // holds that mapping: it fixes the timeline at exactly one viewport no
      // matter what the tweens below are worth, so adding a longer entrance
      // later cannot silently stretch the scrub. Nothing renders here.
      scroll.to({}, { duration: 1 }, 0);

      // Same contract as Hero and Intro: data-split declares which way the
      // heading's lines travel. Linear rather than an ease, like every other
      // scrubbed line reveal on the site: the stagger already gives the lines
      // their rhythm, and an ease on a scrub reads as the text lagging the
      // scroll. The lines' tween is built in onSplit and returned, so an
      // autoSplit re-split kills it — which also lifts it out of `scroll` —
      // and the next onSplit places a fresh one at the same position.
      gsap.utils
        .toArray<HTMLElement>("[data-split]", container.current)
        .forEach((el) => {
          const yPercent = el.dataset.split === "down" ? -150 : 150;

          SplitText.create(el, {
            type: "lines",
            mask: "lines",
            // Keeps the mask off the caps at leading-heading (0.75), as Hero.
            linesClass: "pb-[0.1em]",
            autoSplit: true,
            onSplit: (self) => {
              // fromTo for the same refresh reason as the disc. The stagger is
              // carved out of TEXT_IN rather than added on top, so the last
              // line lands exactly at TEXT_IN whatever the line count.
              const stagger = TEXT_IN / 4 / Math.max(self.lines.length - 1, 1);
              const lines = gsap.fromTo(
                self.lines,
                { yPercent },
                {
                  yPercent: 0,
                  duration: TEXT_IN - stagger * (self.lines.length - 1),
                  ease: "none",
                  stagger,
                },
              );
              scroll.add(lines, 0);
              return lines;
            },
          });
        });

      // The body and button: Hero's fade-and-rise for supporting copy,
      // staggered so the button lands last, and finishing on TEXT_IN with the
      // heading. autoAlpha so the hidden button cannot be clicked or tabbed to
      // before it has arrived.
      scroll.fromTo(
        "[data-fade]",
        { autoAlpha: 0, y: 16 },
        {
          autoAlpha: 1,
          y: 0,
          duration: (TEXT_IN - FADE_AT) * 0.75,
          ease: "power2.out",
          stagger: (TEXT_IN - FADE_AT) * 0.25,
        },
        FADE_AT,
      );

      // ── The rings ──────────────────────────────────────────────────────────
      // They span both of the triggers above: they start with the disc, as the
      // section's top crosses the viewport's middle, and finish with the text,
      // TEXT_IN into the pin. Neither existing trigger covers that, so they get
      // their own. Its end is measured from its start — half a screen to the
      // pin plus TEXT_IN of the pin — and the pin spacer only pushes what comes
      // after the pin, so the end lands on the text's last frame.
      //
      // scrub: 1 to match the pinned timeline, so the rings and the text
      // trail the scroll by the same amount and really do land together.
      // Timeline units are a share of this run, 0 to 1.
      const orbit = gsap.timeline({
        scrollTrigger: {
          trigger: container.current,
          start: "top center",
          end: () => "+=" + window.innerHeight * (0.5 + TEXT_IN),
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });

      // Each ring carries its own target diameter in data-size, so the tween
      // always lands on the unit the markup declares (keeps it responsive).
      // Height rather than scale: the ring is a square box held round by
      // aspect-square, and scaling would smear the dashed border stroke.
      const rings = gsap.utils.toArray<HTMLElement>(
        "[data-ring]",
        container.current,
      );

      // The delay and stagger are carved out of the run rather than added on
      // top, so the last ring still lands exactly on the end whatever the ring
      // count.
      const grow = 1 - RING_DELAY - RING_STAGGER * (rings.length - 1);

      rings.forEach((ring, i) => {
        const size = ring.dataset.size;
        if (!size || !parseFloat(size)) return;

        // Hero's entrance, scrubbed: power3.out on both, so the ring bursts
        // open and turns fast at first, then eases into place.
        orbit.fromTo(
          ring,
          { height: 0 },
          { height: size, duration: grow, ease: "power3.out" },
          RING_DELAY + i * RING_STAGGER,
        );

        // Turned on the ring's centering layer rather than the ring itself:
        // the ring is mid-height-tween, and stacking a transform on the same
        // element would put a compositor animation and a layout animation on
        // one box. The layer is full-bleed and centred on the ring, so it
        // pivots about the ring's centre all the same.
        const spin = parseFloat(ring.dataset.spin ?? "");
        if (!spin || !ring.parentElement) return;

        orbit.fromTo(
          ring.parentElement,
          { rotate: 0 },
          { rotate: spin, duration: grow * RING_TURN, ease: "power3.out" },
          RING_DELAY + i * RING_STAGGER,
        );
      });

      // ── The pulse ──────────────────────────────────────────────────────────
      // One crest runs out from the centre line to both edges while the text
      // arrives, each tick stretching past its resting height and dropping
      // straight back as the wave passes — Services' pulse, played once. As
      // there, repeat/yoyo live INSIDE the stagger so every tick does its own
      // out-and-back and only the crest is raised; at tween level the whole
      // bar would swell as one mass. A `to` is safe here: the bar ships
      // uncollapsed, so the start it records is always the resting scale.
      //
      // The spread is derived so the last tick is back at rest exactly on
      // TEXT_IN — the bar settles on the beat the text lands.
      const PULSE_SCALE = 2.4;
      const PULSE_LEG = 0.06; // one leg; yoyo doubles it per tick

      scroll.to(
        "[data-tick]",
        {
          scaleY: PULSE_SCALE,
          duration: PULSE_LEG,
          ease: "power4.out",
          stagger: {
            amount: TEXT_IN - PULSE_LEG * 2,
            from: "center",
            repeat: 1,
            yoyo: true,
          },
        },
        0,
      );
    },
    { scope: container },
  );

  return (
    <>
      <section
        id="cta"
        ref={container}
        className="relative h-screen overflow-hidden"
      >
        {/* Bottom of the stack: everything else reads on top of the dark. */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            data-disc
            // Inline `transform`, not Tailwind's `scale-0`: v4 compiles that to
            // the separate CSS `scale` property, which multiplies with the
            // `transform` GSAP writes and would hold the disc at zero forever.
            // Starting at zero in the markup also means no full disc flashes
            // before hydration.
            style={{ width: DISC, height: DISC, transform: "scale(0)" }}
            className="shrink-0 rounded-full bg-foreground"
          />
        </div>
        {/* Both start with their dots vertical, as Hero's rings do, and turn a
          quarter so every dot comes to rest on the x axis. */}
        <div className="absolute inset-0">
          <DashedCircle
            dots="vertical"
            id="innie"
            size="80vh"
            growTo="250vh"
            collapsed
            spin={90}
            tone="light"
          />
          <DashedCircle
            dots="vertical"
            id="outie"
            size="80vw"
            growTo="250vh"
            collapsed
            spin={90}
            tone="light"
          />
        </div>
        {/* Light on the dark disc: the y-line at the same 10% the page's black
          lines use over the beige. The scope bar stands in for the x-line, with
          Services' mobile thinning so the ticks don't crowd a phone. */}
        <div id="cross-lines" className="absolute inset-0">
          <div
            id="y-line"
            ref={yLine}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="h-screen w-px bg-background opacity-10"></div>
          </div>
          <ScopeBar id="cta-scope-bar" mobileEvery={2} tone="light" />
        </div>
        {/* `relative` only to enter the positioned paint order: the absolute
          layers above would otherwise paint over this static block whatever the
          DOM order says, and the disc is solid. text-background because it all
          reads on the dark disc. */}
        <div
          id="cta-content"
          className="relative flex h-full flex-col gap-space-2x text-background"
        >
          <div className="flex h-1/2 flex-col items-center justify-end pb-space-4x">
            <h2
              data-split="up"
              className="heading-style max-w-[13ch] text-center text-4xl leading-heading 3xl:text-5xl"
            >
              {words.title ?? t("title")}
            </h2>
          </div>
          <div className="flex flex-col items-center justify-start gap-space-base">
            <p data-fade className="max-w-[36ch] text-center text-base">
              {words.body ?? t("body")}
            </p>
            <TransitionLink
              data-fade
              className="rounded-md bg-accent px-space-2x py-space--2x text-md font-bold tracking-tighter uppercase"
              href="/contact"
            >
              {common("contactUs")}
            </TransitionLink>
          </div>
        </div>
      </section>
    </>
  );
}
