"use client";

import { useId, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// ── Options ─────────────────────────────────────────────────────────────────
// Every part is chosen by hand through props — nothing here is random, so a
// face only changes when someone edits it. The unions are exported so a
// roster (see OurTeam) can be typed against them and a typo is a compile
// error rather than a silently missing eye.

export type AvatarEyes = "dot" | "oval" | "line" | "happy" | "wide";
export type AvatarMouth = "smile" | "grin" | "open" | "flat";
export type AvatarHair = "none" | "fringe" | "cap" | "long" | "headphones";
export type AvatarPalette = "orange" | "dark" | "grey" | "inverse";

export type AvatarColors = {
  /** The container disc. */
  bg: string;
  face: string;
  /** Eyes and mouth. */
  ink: string;
  hair: string;
  /** The hover flush. */
  cheek: string;
};

// Every colour is a token, read through var() so the avatars follow
// globals.css rather than hard-coding a second copy of the brand. `hair` is
// kept apart from `ink` so it can contrast with the face while the features
// stay the same dark everywhere they sit on beige; `cheek` exists because an
// orange flush disappears on the one palette whose face is orange.
//
// Nothing here uses --background as a container fill: the cards sit on that
// beige, and a beige disc would simply vanish into them.
const PALETTES: Record<AvatarPalette, AvatarColors> = {
  orange: {
    bg: "var(--color-orange)",
    face: "var(--color-beige)",
    ink: "var(--foreground)",
    hair: "var(--foreground)",
    cheek: "var(--color-orange)",
  },
  dark: {
    bg: "var(--foreground)",
    face: "var(--color-orange)",
    ink: "var(--foreground)",
    hair: "var(--color-beige)",
    cheek: "var(--color-beige)",
  },
  grey: {
    bg: "var(--secondary)",
    face: "var(--color-beige)",
    ink: "var(--foreground)",
    hair: "var(--color-orange)",
    cheek: "var(--color-orange)",
  },
  inverse: {
    bg: "var(--color-orange)",
    face: "var(--foreground)",
    ink: "var(--color-beige)",
    hair: "var(--color-beige)",
    cheek: "var(--color-orange)",
  },
};

export type AvatarProps = {
  /** Resting eyes. */
  eyes?: AvatarEyes;
  /** Eyes swapped in on hover. Leave out to keep the resting eyes. */
  eyesHover?: AvatarEyes;
  /** Resting mouth. */
  mouth?: AvatarMouth;
  /** Mouth swapped in on hover. Leave out to keep the resting mouth. */
  mouthHover?: AvatarMouth;
  hair?: AvatarHair;
  /** A preset colour set built from the site tokens. */
  palette?: AvatarPalette;
  /**
   * Overrides for individual colour slots on top of `palette`, as any CSS
   * colour — prefer tokens, e.g. `{ hair: "var(--secondary)" }`.
   */
  colors?: Partial<AvatarColors>;
  /**
   * Where the face sits inside the container, in units of a 100-wide box:
   * `x` left/right, `y` down. The face reads best sitting low and a little
   * off-centre so the container crops it — that crop is what turns two
   * circles into a portrait rather than a target. Roughly -8…8 for `x` and
   * 6…14 for `y` keeps the face in frame.
   */
  x?: number;
  y?: number;
  /** Degrees the head leans, roughly -12…12. */
  tilt?: number;
  /**
   * Seconds between blinks and between glances. Give each avatar in a row a
   * slightly different pair so they never blink in unison.
   */
  blinkEvery?: number;
  lookEvery?: number;
  className?: string;
};

// ── Parts ────────────────────────────────────────────────────────────────────
// All drawn in a 100×100 box around the face's own centre at (50, 50), before
// the head's offset/tilt is applied — so each part is written once, upright,
// and the placement lives in one transform rather than baked into every path.

function Eye({ kind, cx, ink }: { kind: AvatarEyes; cx: number; ink: string }) {
  if (kind === "line")
    return (
      <rect
        data-eye
        x={cx - 4}
        y={45}
        width={8}
        height={2.5}
        rx={1.25}
        fill={ink}
      />
    );
  if (kind === "oval")
    return <ellipse data-eye cx={cx} cy={46} rx={2.6} ry={4} fill={ink} />;
  // An upturned arc — the closed, smiling eye of a laugh.
  if (kind === "happy")
    return (
      <path
        data-eye
        d={`M${cx - 4} 48q4-6 8 0`}
        fill="none"
        stroke={ink}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    );
  if (kind === "wide")
    return <circle data-eye cx={cx} cy={46} r={4.5} fill={ink} />;
  return <circle data-eye cx={cx} cy={46} r={3} fill={ink} />;
}

function Mouth({ kind, ink }: { kind: AvatarMouth; ink: string }) {
  if (kind === "open")
    return <ellipse cx={50} cy={60} rx={4} ry={3.5} fill={ink} />;
  if (kind === "flat")
    return <rect x={44} y={59} width={12} height={2.5} rx={1.25} fill={ink} />;
  if (kind === "grin") return <path d="M42 57h16a8 8 0 0 1-16 0Z" fill={ink} />;
  return (
    <path
      d="M43 57q7 7 14 0"
      fill="none"
      stroke={ink}
      strokeWidth={2.5}
      strokeLinecap="round"
    />
  );
}

function Hair({
  kind,
  fill,
  layer,
}: {
  kind: AvatarHair;
  fill: string;
  /**
   * Hair is drawn in two passes: `back` before the face, for anything that
   * shows *around* the head, and `front` after it, for anything that sits on
   * the forehead. Most styles only have a front.
   */
  layer: "back" | "front";
}) {
  if (layer === "back") {
    // Long hair falling behind the head: clearly wider than the face (r 40
    // against 34), so it reads as volume around the head rather than a thin
    // outline — anything narrower looked like a hood — and running past the
    // chin to shoulder length. The container's clip trims whatever runs past
    // its edge, so the bottom never needs to be exact.
    if (kind === "long")
      return (
        <path
          d="M10 52a40 40 0 0 1 80 0v34a6 6 0 0 1-6 6H16a6 6 0 0 1-6-6Z"
          fill={fill}
        />
      );
    return null;
  }

  // A side part. The outer edge is the head's own outline from temple to
  // temple — the start/end points sit on the r 34 circle at y 46, i.e.
  // x 50 ± √(34² − 4²) — so the hair hugs the skull. The inner edge is three
  // pieces, read right to left:
  //   - the small lock: from the right temple, curving up and in to (66, 28);
  //   - the parting: a short line up to an apex at (61, 20). The skin showing
  //     in that V-notch is what makes it read as a part rather than one
  //     slanted block of hair — without it the two locks merge into a wedge;
  //   - the big fringe: from the apex, a cubic that swells down across the
  //     forehead and sweeps out to the far temple. It passes the left eye at
  //     about y 38, clear of the tallest (`oval`) eyes, which start at 42.
  if (kind === "fringe")
    return (
      <path
        d="M16.24 46A34 34 0 0 1 83.76 46Q80 33 66 28L61 20C55 36 32 40 16.24 46Z"
        fill={fill}
      />
    );

  // The front of the long hair: curtain bangs parted in the middle. The inner
  // edge curves from the parting at the top of the forehead down to each
  // temple, leaving the eyes (y 42 and below) clear. The outer edge runs at
  // r 35.5, just past the head's outline (r 34): matched exactly, the face's
  // anti-aliased rim showed through as a hairline seam between these bangs
  // and the back layer.
  if (kind === "long")
    return (
      <path
        d="M14.5 50A35.5 35.5 0 0 1 85.5 50Q78 32 50 27Q22 32 14.5 50Z"
        fill={fill}
      />
    );

  // A baseball cap that fits the head: the crown is the head's own circle
  // (r 34) cut off at y 38 — the chord's ends sit exactly on the outline at
  // x 50 ± √(34² − 12²) — so nothing of it overhangs the skull. Only two
  // parts stick out: the brim, running from inside the crown out past the
  // right edge with its bottom flush on the crown's base, and the button,
  // centred on the top of the head so half of it pokes above. The base at
  // y 38 sits just clear of the eyes (the tallest, `oval`, start at 42).
  if (kind === "cap")
    return (
      <g fill={fill}>
        <path d="M18.19 38A34 34 0 0 1 81.81 38Z" />
        <path d="M60 32h32a3 3 0 0 1 0 6H60Z" />
        <circle cx={50} cy={16} r={3.5} />
      </g>
    );

  // Over-ear headphones. The band is a stroke rather than a filled shape, on
  // an arc at r 38 — a few units off the head (r 34) so it reads as resting
  // on top rather than painted onto the scalp. Its ends drop into the cups,
  // which straddle the head's outline at x 16 / 84: half on the face, half
  // out past it, the way real cups sit over the ears. They are centred at
  // y 51, beside the eyes and mouth but clear of both — the eyes reach no
  // further out than x 34 / 66.
  if (kind === "headphones")
    return (
      <g fill={fill}>
        <path
          d="M12 50A38 38 0 0 1 88 50"
          fill="none"
          stroke={fill}
          strokeWidth={4}
          strokeLinecap="round"
        />
        <rect x={8} y={41} width={14} height={20} rx={5} />
        <rect x={78} y={41} width={14} height={20} rx={5} />
      </g>
    );

  return null;
}

function Eyes({ kind, ink }: { kind: AvatarEyes; ink: string }) {
  return (
    <>
      <Eye kind={kind} cx={39} ink={ink} />
      <Eye kind={kind} cx={61} ink={ink} />
    </>
  );
}

export default function Avatar({
  eyes = "dot",
  eyesHover,
  mouth = "smile",
  mouthHover,
  hair = "none",
  palette = "orange",
  colors,
  x = 0,
  y = 10,
  tilt = 0,
  blinkEvery = 3.5,
  lookEvery = 2.2,
  className,
}: AvatarProps) {
  const container = useRef<SVGSVGElement>(null);
  const c = { ...PALETTES[palette], ...colors };

  // A hover part that matches its resting part would swap a shape for an
  // identical copy of itself — all motion, no change — so it is treated as
  // no hover part at all.
  const swapEyes = eyesHover !== undefined && eyesHover !== eyes;
  const swapMouth = mouthHover !== undefined && mouthHover !== mouth;

  // useId's output carries characters (colons, or « » on newer React) that are
  // legal in an id but not reliably inside a url(#…) reference, so it is
  // flattened to word characters before it names the clip path.
  const clip = `avatar-${useId().replace(/\W/g, "")}`;

  useGSAP(
    () => {
      // ── Idle ──────────────────────────────────────────────────────────────
      // Three loops on three separate groups, so none of them owns a transform
      // another one is writing to: the head bobs, the features glance around
      // inside it, and the eyes blink inside that. Nested groups compose; two
      // tweens on one element would fight over the same matrix.
      //
      // Gated on no-preference rather than switched off on reduce: an avatar
      // that never moves is the correct fallback, and matchMedia reverts the
      // lot if the reader flips the setting mid-visit.
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Breathing: a slow float with a hint of sway. svgOrigin pins the
        // rotation to the container's centre in viewBox units, so the head
        // rocks around the middle of the disc rather than its own corner.
        const bob = gsap.to("[data-bob]", {
          y: -2.5,
          rotation: 3,
          svgOrigin: "50 50",
          duration: 2.2,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });

        // Glancing: the eyes and mouth shift together while the face stays put,
        // which is what reads as the head turning rather than the whole avatar
        // sliding. repeatRefresh re-rolls the "random()" strings on every
        // cycle, so the glances never settle into a visible loop. This is the
        // one random thing left, and it is motion, not appearance — the face
        // itself is entirely set by props.
        const look = gsap.to("[data-features]", {
          x: "random(-4, 4)",
          y: "random(-2, 2)",
          duration: 0.45,
          ease: "power2.inOut",
          repeat: -1,
          repeatDelay: lookEvery,
          repeatRefresh: true,
        });

        // Blink: shut fast, open a touch slower — the asymmetry is most of what
        // makes it look like an eyelid rather than a flicker. transformOrigin
        // in percentages so each eye squashes about its own centre. Both eye
        // sets blink, so whichever is showing when the timer fires is covered;
        // the hidden set squashing inside a zero-scale group costs nothing.
        const blink = gsap
          .timeline({ repeat: -1, repeatDelay: blinkEvery })
          .to("[data-eye]", {
            scaleY: 0.1,
            transformOrigin: "50% 50%",
            duration: 0.07,
            ease: "power2.in",
          })
          .to("[data-eye]", { scaleY: 1, duration: 0.12, ease: "power2.out" });

        // Same reasoning as WhyUs' carousel clock: three infinite loops per
        // avatar, times the team, have no business ticking while the section
        // is off screen.
        const loops = [bob, look, blink];
        ScrollTrigger.create({
          trigger: container.current,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) =>
            loops.forEach((loop) =>
              self.isActive ? loop.resume() : loop.pause(),
            ),
        });
      });

      // ── Hover ────────────────────────────────────────────────────────────
      // The cheeks always flush. Eyes and mouth swap only when a hover part
      // was given: the resting part shrinks away and the hover part pops in
      // where it was. Both are always in the DOM, so this is scale tweens
      // rather than a shape morph. The incoming part starts slightly after the
      // outgoing one has begun to go, so the two never sit on top of each
      // other at full size.
      //
      // Eyes squash vertically, like a blink into the new pair; the mouth
      // scales about its centre. Scaling the eye *group* uniformly would pull
      // the two eyes towards each other as they shrank.
      //
      // fromTo for the incoming parts renders its start immediately, which is
      // what keeps them collapsed on load; the opacity={0} in the markup
      // covers the frames before GSAP hydrates.
      //
      // Reversed rather than replayed, so leaving mid-animation eases back
      // from wherever it reached. Outside the reduced-motion gate on purpose:
      // it is a small, pointer-initiated response, not unrequested movement.
      const hover = gsap
        .timeline({ paused: true })
        .to("[data-cheek]", { opacity: 0.6, duration: 0.3 }, 0);

      if (swapEyes) {
        hover
          .to(
            '[data-eyes="rest"]',
            {
              scaleY: 0,
              opacity: 0,
              transformOrigin: "50% 50%",
              duration: 0.12,
              ease: "power2.in",
            },
            0,
          )
          .fromTo(
            '[data-eyes="hover"]',
            { scaleY: 0, opacity: 0, transformOrigin: "50% 50%" },
            { scaleY: 1, opacity: 1, duration: 0.25, ease: "back.out(3)" },
            0.08,
          );
      }

      if (swapMouth) {
        hover
          .to(
            '[data-mouth="rest"]',
            {
              scale: 0,
              opacity: 0,
              transformOrigin: "50% 50%",
              duration: 0.15,
              ease: "power2.in",
            },
            0,
          )
          .fromTo(
            '[data-mouth="hover"]',
            { scale: 0, opacity: 0, transformOrigin: "50% 50%" },
            { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(3)" },
            0.1,
          );
      }

      // Native listeners wired here rather than React handlers calling
      // contextSafe: the timeline is built inside the hook's context (so
      // unmount reverts it with everything else) and never has to be parked in
      // a ref that render would appear to read.
      const svg = container.current;
      const enter = () => hover.play();
      const leave = () => hover.reverse();
      svg?.addEventListener("mouseenter", enter);
      svg?.addEventListener("mouseleave", leave);

      return () => {
        svg?.removeEventListener("mouseenter", enter);
        svg?.removeEventListener("mouseleave", leave);
      };
    },
    // Every prop the animation reads. Editing one — say a mouthHover tweaked
    // under Fast Refresh — rebuilds the timelines against the new markup
    // instead of leaving them pointed at parts that no longer exist.
    // revertOnUpdate is what makes that safe: without it @gsap/react defers
    // cleanup to unmount, and the old loops would keep running beside the new.
    {
      scope: container,
      dependencies: [swapEyes, swapMouth, blinkEvery, lookEvery],
      revertOnUpdate: true,
    },
  );

  return (
    <svg
      ref={container}
      viewBox="0 0 100 100"
      aria-hidden
      className={className}
    >
      <defs>
        <clipPath id={clip}>
          <circle cx={50} cy={50} r={50} />
        </clipPath>
      </defs>

      <circle cx={50} cy={50} r={50} fill={c.bg} />

      <g clipPath={`url(#${clip})`}>
        {/* Placement is a static attribute; animation happens one group down.
            GSAP writes its own transform on whatever it tweens, so animating
            this group directly would wipe out the offset and tilt. */}
        <g transform={`translate(${x} ${y}) rotate(${tilt} 50 50)`}>
          <g data-bob>
            <Hair kind={hair} fill={c.hair} layer="back" />
            <circle cx={50} cy={50} r={34} fill={c.face} />
            <Hair kind={hair} fill={c.hair} layer="front" />

            <g data-features>
              <g data-eyes="rest">
                <Eyes kind={eyes} ink={c.ink} />
              </g>
              {swapEyes && eyesHover && (
                <g data-eyes="hover" opacity={0}>
                  <Eyes kind={eyesHover} ink={c.ink} />
                </g>
              )}

              <circle
                data-cheek
                cx={33}
                cy={56}
                r={4}
                fill={c.cheek}
                opacity={0}
              />
              <circle
                data-cheek
                cx={67}
                cy={56}
                r={4}
                fill={c.cheek}
                opacity={0}
              />

              <g data-mouth="rest">
                <Mouth kind={mouth} ink={c.ink} />
              </g>
              {swapMouth && mouthHover && (
                <g data-mouth="hover" opacity={0}>
                  <Mouth kind={mouthHover} ink={c.ink} />
                </g>
              )}
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
