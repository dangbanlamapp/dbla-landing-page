"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import DashedCircle from "./DashedCircle";
import ScopeBar from "./ScopeBar";
import ServiceBlock, { type Service } from "./ServiceBlock";

gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger);

// Content drives the pin length: one service is one viewport of scrolling, so
// adding an entry here grows the pin by 100vh and slots its block into the
// sequence without a single position needing to be rewritten below.
const SERVICES: Service[] = [
  {
    label: "website",
    title: "Web app",
    blurb:
      "We build beautiful and performant website, a founding block of any succesful business",
    items: ["CMS Website", "landing page", "WEB ANIMATION"],
  },
  {
    label: "mobile",
    title: "Mobile app",
    blurb:
      "Native-feeling apps that put your product in the pocket of every customer, on every device they own",
    items: ["iOS & ANDROID", "cross-platform", "APP STORE LAUNCH"],
  },
  {
    label: "design",
    title: "Product design",
    blurb:
      "Interfaces designed around what your users are trying to do, not around what is easy to build",
    items: ["UI/UX DESIGN", "design systems", "PROTOTYPING"],
  },
  {
    label: "growth",
    title: "Growth",
    blurb:
      "The measurement and automation work that turns a launched product into a compounding one",
    items: ["SEO & ANALYTICS", "automation", "A/B TESTING"],
  },
];

export default function Services() {
  const container = useRef<HTMLElement>(null);
  const accentCircle = useRef<HTMLDivElement>(null);
  const foregroundCircle = useRef<HTMLDivElement>(null);
  const centerCross = useRef<HTMLDivElement>(null);
  const ringsContainer = useRef<HTMLDivElement>(null);
  const yLine = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // ── The master timeline ────────────────────────────────────────────────
      // One ScrollTrigger drives the whole section: it pins, and it scrubs this
      // timeline. Everything else is a tween *added to the timeline* rather than
      // its own trigger, so there is a single set of start/end measurements to
      // refresh and pieces are positioned relative to each other instead of
      // each re-deriving absolute scroll maths.
      //
      // Unlike Hero and Intro this pin keeps pin spacing (the default): it is
      // the last section, so nothing follows to supply the scroll distance the
      // pin has to consume.
      // The whole copy timeline hangs off TEXT_AT, so this one number slides
      // the section heading, all four service blocks AND the pin length
      // together — nothing downstream is written as an absolute viewport.
      //
      // The circle and the scope rule open over viewport 0 -> 1 regardless;
      // TEXT_AT is how long the section then holds on that image, wordless,
      // before the first line of copy arrives.
      const TEXT_AT = 0.5;

      // A viewport for the heading to arrive in, then one per service. Derived
      // rather than a literal so content and pin length cannot drift apart.
      const HEADING_DUR = 1;
      const VIEWPORTS = TEXT_AT + HEADING_DUR + SERVICES.length;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container.current,
          start: "top top",
          end: () => "+=" + window.innerHeight * VIEWPORTS,
          pin: true,
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      // The timeline's own unit of time is one viewport of scrolling: total
      // duration VIEWPORTS, so position 0 is the moment the pin engages and
      // position 1 is 100vh later. This empty spacer tween nails the duration to
      // exactly VIEWPORTS no matter what is added or removed — without it the
      // timeline is only as long as its longest child, so every viewport-to-time
      // mapping below would silently rescale when content changes (and it does
      // change: autoSplit removes and re-adds the heading tween on every
      // re-split).
      tl.to({}, { duration: VIEWPORTS }, 0);

      // Everything below animates over the FIRST viewport of the pin — position
      // 0 to 1 — rather than on the way in. That is what keeps the circle
      // growing from the centre of the screen: while the section is pinned it
      // does not move, so the circle — centred in the section — is centred in
      // the viewport for the whole tween and only ever scales. Run any earlier
      // and the section is still travelling upward, and the circle rides up the
      // screen as it grows. The copy lands on top of the circle while it is
      // still opening rather than being overtaken by it.

      tl.fromTo(
        accentCircle.current,
        { scale: 0 },
        { scale: 1, duration: 1, ease: "power4.inOut" },
        0,
      )
        .to(centerCross.current, { scale: 1, duration: 1, ease: "none" }, "<")
        .to(
          ringsContainer.current,
          {
            scale: 1,
            ease: "none",
            duration: 1,
          },
          "<",
        )
        .to(
          yLine.current,
          {
            scaleY: 1,
            ease: "power4.inOut",
            duration: 1,
          },
          "<",
        )
        .to(
          foregroundCircle.current,
          {
            scale: 1,
            duration: 1,
            ease: "power4.inOut",
          },
          ">",
        )

        .to(
          accentCircle.current,
          {
            scale: 1.5,
            duration: 1,
            ease: "power4.inOut",
          },
          "<",
        );

      // When the intro chain above finishes and the foreground circle is
      // finally sitting at its resting scale. Read back off the timeline rather
      // than written as a literal 2, because the chain positions its steps
      // relatively (">" / "<"): add or lengthen a step and the circle settles
      // later, and anything keyed to a hardcoded 2 would start writing `scale`
      // on top of a tween still running. Two animations driving one property is
      // not an error GSAP reports — it just lets whichever renders last win,
      // which shows up as jitter that flips with scrub direction.
      // recent() is typed to include a plain callback, which a timeline can
      // also hold as a child, so narrow it out before asking for a time.
      const introStep = tl.recent();
      const introTail = typeof introStep === "function" ? null : introStep;
      const CIRCLE_SETTLES = introTail?.endTime() ?? 0;

      // The rings open on the beat that step *starts*, so they read as one
      // gesture with the accent circle rather than as a reply to it.
      const RINGS_AT = introTail?.startTime() ?? 0;

      // ── The dashed rings ───────────────────────────────────────────────────
      // A conveyor. STOPS are fixed diameters, and on every beat each ring
      // advances one slot outward while a new one is born at the centre behind
      // it — so "take the sibling's place" is not written per ring, it falls
      // out of the indexing: ring i sits at STOPS[beat - i]. Every ring runs
      // the identical schedule, offset by one beat, and adding a stop is
      // inherited by all of them.
      //
      //   beat 0        ring0
      //   beat 1        ring1 → ring0
      //   beat 2        ring2 → ring1 → ring0
      //
      // height, not a transform, and deliberately so — this is the one place
      // the project's transform-first rule is the wrong call. scaleY on a ring
      // would stretch the dashes into ovals and thin the border along with them.
      const STOPS = ["80vh", "120vh", "160vh", "200vh", "240vh"];

      // Beat 0 is the entrance, which keeps its own longer, softer timing; every
      // later beat rides a pulse, so the rings surge outward on exactly the
      // scroll positions the scope rule and the foreground circle beat on.
      const RING_DUR = 1;
      const RING_STEP_DUR = 0.8; // settles before the next beat lands
      const RING_EASE = "expo.inOut";

      // Degrees added on every growth, so a ring's angle is simply how many
      // times it has grown. Written as an absolute target per beat rather than
      // a relative "+=45": a relative value resolves against whatever the
      // element happened to be at when the tween first rendered, which under a
      // scrub is a function of how the reader got there. Absolute keeps every
      // beat a pure function of timeline position, like everything else here.
      const RING_SPIN = 90;

      // How many of a ring's growths carry a turn: only its first two, the
      // birth out of nothing and the step off 80vh. Past that it is a settled
      // ring that only widens, so it keeps whatever angle the second turn
      // parked it at. Counted per ring rather than per beat, so every ring gets
      // the same two turns no matter which beat it was born on.
      const RING_TURNS = 2;
      const beatAt = (beat: number) =>
        beat === 0 ? RINGS_AT : CIRCLE_SETTLES + beat - 1;

      // Clamped to the pulses actually available: the schedule is driven by two
      // independent things (how many stops are declared, how long the pin runs)
      // and this is where they are reconciled, rather than letting a long STOPS
      // list quietly place tweens past the end of the timeline.
      const LAST_BEAT = Math.min(STOPS.length - 1, VIEWPORTS - CIRCLE_SETTLES);

      // Fraction of a birth that passes before the label starts fading in. It
      // cannot simply start with its ring: the label is a child of the ring box,
      // so at height 0 its two lines of text collapse onto the same point and
      // would be caught stacked. By 70% the ring is wide enough to hold them
      // apart, and the fade lands exactly as the ring does.
      const LABEL_AT = 0.7;

      const rings = gsap.utils.toArray<HTMLElement>(
        "[data-ring]",
        container.current,
      );

      rings.forEach((ring, i) => {
        const label = ring.querySelector<HTMLElement>("[data-ring-label]");

        // Ring i does nothing until beat i — the markup ships it collapsed, and
        // no tween touches it before, so it simply is not there yet.
        for (let beat = i; beat <= LAST_BEAT; beat++) {
          const height = STOPS[beat - i];
          if (!height) break;

          const born = beat === i;
          const duration = born && i === 0 ? RING_DUR : RING_STEP_DUR;
          const ease = born && i === 0 ? "power3.out" : RING_EASE;

          // Turn count, not turn delta: beat - i is how many beats this ring
          // has been alive, so +1 is the growth happening right now.
          const growth = beat - i + 1;
          const turn = growth * RING_SPIN;

          // The first ring's entrance is the one tween here that is a fromTo:
          // it is the only ring whose opening is a deliberate reveal rather
          // than part of the wave, so it keeps the softer power3.out over a
          // full unit. Every other growth is a plain `to`, which reads its
          // start from wherever the previous beat left the ring — the property
          // that lets one loop express both a birth and a step.
          if (born && i === 0) {
            tl.fromTo(
              ring,
              { height: 0 },
              { height, duration, ease },
              beatAt(beat),
            );
          } else {
            tl.to(ring, { height, duration, ease }, beatAt(beat));
          }

          // Concurrent with the growth rather than after it, matching HeaderBg:
          // the ring swells and turns as one move.
          //
          // One tween turns the whole ring, label included: the label lives
          // INSIDE the ring box — the same nesting that welds it to the
          // diameter — so it inherits the rotation for free and the words ride
          // round with the dashes and dots. Nothing here counters it.
          //
          // Once a ring is past its turning growths no tween is added at all,
          // rather than one that rotates it to the angle it already holds. A
          // no-op tween would still write `rotation` on every frame of the
          // scrub, and it would be the thing GSAP resolves last on that
          // property — cheaper and clearer to leave the angle alone.
          if (growth <= RING_TURNS) {
            tl.to(ring, { rotation: turn, duration, ease }, beatAt(beat));
          }

          if (born && label) {
            tl.fromTo(
              label,
              { autoAlpha: 0 },
              {
                autoAlpha: 1,
                duration: duration * (1 - LABEL_AT),
                ease: "power2.out",
              },
              beatAt(beat) + duration * LABEL_AT,
            );
          }
        }
      });

      // The scope rule draws itself outward from the centre line, so the
      // graduations spread ahead of the circle's edge. fromTo, not from: the
      // markup ships collapsed (see ScopeBar's `collapsed` prop) and a plain
      // `from` would take that as the end state and animate 0 -> 0. The stagger
      // is expressed as a total `amount` rather than per-tick `each` so adding
      // or removing ticks changes the density, not the duration.
      tl.fromTo(
        "[data-tick]",
        { scaleY: 0 },
        {
          scaleY: 1,
          duration: 0.4,
          ease: "power4.inOut",
          stagger: { amount: 0.6, from: "center" },
        },
        0,
      );

      // ── The pulse ──────────────────────────────────────────────────────────
      // Once the rule has drawn itself, it pulses once per viewport for the
      // rest of the pin: a crest starts at the centre line and runs out to both
      // edges, each tick stretching past its resting height and dropping
      // straight back as the wave passes over it.
      //
      // repeat/yoyo live INSIDE the stagger object, and that placement is the
      // whole animation. At tween level they apply to the staggered tween as a
      // unit: GSAP plays the entire outward stagger, then replays all of it
      // backwards — so an early tick stays stretched until the reverse pass
      // reaches it and the bar swells as one mass. Inside the stagger they
      // apply to each element's own sub-tween, so every tick does its own
      // out-and-back and only the crest is ever raised.
      const PULSE_SCALE = 2.4;
      const PULSE_SPAN = 1; // one full viewport, start to rest
      const PULSE_LEG = 0.06; // one leg; yoyo doubles it to the per-tick 0.12

      // The foreground circle thumps on the same beat, and the amplitude is not
      // a typo next to the ticks' 2.4: those are 6px lines, this is 80vh across,
      // so a few percent is already a large movement.
      const CIRCLE_PULSE = 1.04;

      // Derived, not hand-tuned: a tick starts as late as PULSE_SPREAD and then
      // needs both legs, so this is what makes the cycle land back at resting
      // height exactly on the viewport boundary — change PULSE_LEG and the
      // spread absorbs it instead of the wave spilling into the next pulse.
      const PULSE_SPREAD = PULSE_SPAN - PULSE_LEG * 2;

      // Positions 1..VIEWPORTS-1: the first crest leaves the centre the instant
      // the intro finishes at 1, and each one rests exactly as the next departs.
      //
      // One loop emits both the wave and the circle's thump at the same
      // position. Keeping them in a single loop rather than two is what makes
      // "parallel" structural — there is no second sequence that could be
      // retimed on its own and drift out of step.
      for (let viewport = 1; viewport < VIEWPORTS; viewport++) {
        tl.to(
          "[data-tick]",
          {
            scaleY: PULSE_SCALE,
            duration: PULSE_LEG,
            // Symmetric, so the yoyo'd return leg mirrors the rise.
            ease: "power4.out",
            stagger: {
              amount: PULSE_SPREAD,
              from: "center",
              repeat: 1,
              yoyo: true,
            },
          },
          viewport,
        );

        // The circle beats with the CENTRE ticks — same PULSE_LEG, same
        // position — so the crest reads as leaving a circle that just thumped,
        // rather than as two things that happen to move at once.
        //
        // repeat/yoyo sit at tween level here, and that is correct: the trap
        // they fell into on the rule above was specifically an interaction with
        // `stagger`, and there is no stagger on a single element. The yoyo also
        // makes the return self-correcting — a `to` tween records its start on
        // first render, so this lands back on whatever resting scale the intro
        // chain actually left behind, with no second value to keep in sync.
        //
        // Skipped until the intro has settled: before CIRCLE_SETTLES the growth
        // tween owns `scale`, and the circle is at scale 0 there anyway, so the
        // beat would be invisible as well as destructive.
        if (viewport >= CIRCLE_SETTLES) {
          tl.to(
            foregroundCircle.current,
            {
              scale: CIRCLE_PULSE,
              duration: 0.5,
              repeat: 1,
              yoyo: true,
              ease: "power2.in",
            },
            viewport,
          );
        }
      }

      // ── Shared timing for the service stack ────────────────────────────────
      // Blocks are ENTER long on the way in, EXIT long on the way out, and each
      // one starts OVERLAP early so its entrance runs on top of the previous
      // block's exit — the crossfade. Because every block starts OVERLAP early,
      // consecutive starts are still exactly 1 apart: each service keeps its
      // own 100vh, and the last block's exit lands precisely on VIEWPORTS, so
      // the master duration stays nailed to its spacer.
      const ENTER = 0.35;
      const EXIT = 0.35;
      const OVERLAP = 0.12;
      const BLOCK_DUR = 1 + OVERLAP;
      const serviceStart = (i: number) => TEXT_AT + HEADING_DUR + i - OVERLAP;

      // Nothing below is played by a callback — no onEnter, no paused tween
      // waiting to be started the way Hero's exits are. Every value is a pure
      // function of timeline position, so a scrub that jumps half the section
      // in a single frame still lands on exactly the state that position
      // describes. Same reason there is no `overwrite` anywhere below:
      // overlapping tweens only ever touch different blocks, and an overwrite
      // fired during a fast scrub would kill a tween that scrolling back up
      // still needs.

      // Same contract as Hero and Intro: data-split declares which way the
      // lines travel, data-fade marks supporting copy. Scoped to
      // #services-intro because the service blocks carry the very same
      // attributes — an unscoped query would sweep all four of them into the
      // section heading's tween.
      const introScope = "#services-intro ";

      /**
       * A masked line reveal plus its mirrored exit, as one unit.
       *
       * The pair has to be built inside onSplit and returned together: autoSplit
       * re-splits on font load and resize, and GSAP kills whatever onSplit
       * returned before doing so. Returning a timeline rather than a tween is
       * what lets the exit be cleaned up too — killing it also lifts it out of
       * its parent, and the next onSplit adds a replacement at the same
       * position. Return only the entrance and the exit is left pointing at line
       * elements that no longer exist.
       */
      const splitInOut = (
        el: HTMLElement,
        parent: gsap.core.Timeline,
        at: number,
        exitAt: number,
      ) => {
        const yPercent = el.dataset.split === "down" ? -150 : 150;

        SplitText.create(el, {
          type: "lines",
          mask: "lines",
          // Matches Hero: keeps the mask off the caps at leading-heading (0.75).
          // linesClass: "pb-[0.1em]",
          autoSplit: true,
          onSplit: (self) => {
            const lines = gsap.timeline();

            lines.from(
              self.lines,
              { yPercent, duration: ENTER, ease: "power3.out", stagger: 0.08 },
              0,
            );

            // The mirror: the same yPercent, so each line retreats through the
            // edge of the mask it arrived from rather than continuing past.
            // from: "end" reverses the stagger order too, so the exit reads as
            // the entrance rewound.
            lines.to(
              self.lines,
              {
                yPercent,
                duration: EXIT,
                ease: "power3.in",
                stagger: { each: 0.08, from: "end" },
              },
              exitAt - at,
            );

            parent.add(lines, at);
            return lines;
          },
        });
      };

      // ── Section heading ────────────────────────────────────────────────────
      // Arrives at TEXT_AT — after the circle and rule have opened and held —
      // then clears out as the first service arrives: it sits in the same band
      // of the screen the service copy occupies, so it cannot just stay put for
      // the whole pin.
      const introHeading = container.current?.querySelector<HTMLElement>(
        introScope + "[data-split]",
      );

      if (introHeading) {
        splitInOut(introHeading, tl, TEXT_AT, serviceStart(0));
      }

      // The plain fade-and-rise Hero gives its supporting copy, scrubbed here
      // rather than played on a delay, and mirrored back out on the same beat
      // as the heading above.
      tl.from(
        introScope + "[data-fade]",
        { autoAlpha: 0, y: 16, duration: HEADING_DUR, ease: "power2.out" },
        TEXT_AT,
      );
      tl.to(
        introScope + "[data-fade]",
        { autoAlpha: 0, y: 16, duration: EXIT, ease: "power2.in" },
        serviceStart(0),
      );

      // ── The service stack ──────────────────────────────────────────────────
      // Each block gets its own nested timeline placed on the master, so the
      // internal rhythm is written once and the master only decides *when*.
      gsap.utils
        .toArray<HTMLElement>("[data-service]", container.current)
        .forEach((block, i) => {
          const btl = gsap.timeline();

          // The same spacer as the master, for the same reason: autoSplit
          // removes and re-adds the line tweens below, and without a fixed
          // length the block would rescale under itself and drift out of its
          // 100vh slot.
          btl.to({}, { duration: BLOCK_DUR }, 0);

          // The crossfade itself. fromTo, not from — the block ships invisible
          // so the four of them do not pile up before hydration, and a plain
          // `from` would read that as the end state and animate 0 -> 0.
          // autoAlpha rather than opacity: it parks visibility: hidden at zero,
          // which keeps the three inactive blocks out of hit-testing and out of
          // the accessibility tree instead of leaving them stacked invisibly on
          // top of the live one.
          btl.fromTo(
            block,
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: ENTER, ease: "power2.out" },
            0,
          );
          btl.to(
            block,
            { autoAlpha: 0, duration: EXIT, ease: "power2.in" },
            BLOCK_DUR - EXIT,
          );

          // Upper half "up", lower half "down" — see ServiceBlock.
          gsap.utils
            .toArray<HTMLElement>("[data-split]", block)
            .forEach((el) => splitInOut(el, btl, 0, BLOCK_DUR - EXIT));

          tl.add(btl, serviceStart(i));
        });
    },
    { scope: container },
  );

  return (
    <section
      id="services"
      ref={container}
      className="relative mt-[-150vh] h-screen overflow-hidden"
    >
      <div
        id="accent-circle"
        ref={accentCircle}
        className="absolute inset-0 m-auto aspect-square w-[100vw] scale-0 rounded-full bg-accent"
      ></div>
      <div className="relative flex h-full w-full flex-col">
        <div
          id="services-intro"
          className="flex h-1/2 flex-col items-center justify-end pb-space-2x"
        >
          <p data-fade className="text-sm text-white/75 uppercase">
            our services
          </p>
          <h2 data-split="up" className="heading-style text-4xl text-white">
            What we do
          </h2>
        </div>
      </div>
      <div
        ref={foregroundCircle}
        className="absolute inset-0 m-auto aspect-square h-[80vh] scale-0 rounded-full bg-background"
      ></div>
      <ScopeBar id="scope-bar" collapsed />
      <div
        ref={centerCross}
        id="center-cross"
        className="absolute inset-0 flex scale-0 flex-col items-center justify-center"
      >
        <div className="relative flex h-5 w-5 items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="h-px w-full bg-black"></div>
          </div>
          <div className="absolute inset-0 flex justify-center">
            <div className="h-full w-px bg-black"></div>
          </div>
        </div>
      </div>
      <div
        id="y-line"
        className="absolute inset-0 flex items-center justify-center"
      >
        <div
          ref={yLine}
          className="h-full w-px scale-y-0 bg-black opacity-10"
        ></div>
      </div>
      {/*
        The stack. Every block occupies the same absolutely-positioned space and
        only one is fully visible at a time; DOM order is scroll order, which is
        what the [data-service] query above relies on.
      */}
      {SERVICES.map((service) => (
        <ServiceBlock key={service.title} {...service} />
      ))}
      {/*
        One ring per service, all identical: every one ships collapsed at 0 and
        is placed entirely by the conveyor above, which reads them in DOM order.
        No per-ring diameters here — a ring's whole life is STOPS plus its index.
      */}
      <div
        ref={ringsContainer}
        className="absolute inset-0 h-full w-full scale-0"
      >
        {SERVICES.map((service, i) => (
          <DashedCircle
            key={service.title}
            id={`ring-${i + 1}`}
            dots="horizontal"
            size="0vh"
            label={service.label}
            collapsed
          />
        ))}
      </div>
    </section>
  );
}
