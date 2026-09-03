// No "use client": nothing here animates yet, so it stays a Server Component.
// Add the directive (and the useGSAP/scope shape the other sections use) only
// once it actually needs one.

import DashedCircle from "./DashedCircle";
import LocalTime from "./LocalTime";

/**
 * The wordmark is inlined rather than pulled from public/DBLA.svg through
 * next/image, because the exported file paints its single path in #E1DCD1 —
 * literally --color-beige, i.e. the page background — so it rendered as a
 * beige shape on a beige ground and read as invisible, not transparent.
 *
 * Hard-coding a different hex in the .svg would fix the symptom and put a
 * colour outside the token system, where nothing about a theme change can
 * reach it. Inline + `fill="currentColor"` hands the colour back to Tailwind,
 * so it is set below with a real token class.
 *
 * It is a component and not a constant because the footer renders it twice, in
 * two different colours, and `currentColor` is what makes one markup serve
 * both — see the stack in Footer.
 *
 * width/height stay on the element alongside viewBox: that is what the browser
 * derives the intrinsic aspect ratio from, so `h-auto` has a ratio to resolve
 * against once `w-[90vw]` takes over the width — same no-reflow guarantee the
 * static next/image import gave.
 */
function Wordmark({ className }: { className?: string }) {
  return (
    <svg
      width="1264"
      height="344"
      viewBox="0 0 1264 344"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="DBLA"
      className={className}
    >
      <path
        d="M148 -1.16825e-05C268.333 -1.16825e-05 328.5 57.3333 328.5 172C328.5 286.667 268.333 344 148 344H-1V-1.16825e-05H148ZM109.5 261.5H146C192.333 261.5 215.5 236.667 215.5 187V157C215.5 107.333 192.333 82.5 146 82.5H109.5V261.5ZM552.16 -1.16825e-05C569.494 -1.16825e-05 585.327 3.66666 599.66 11C614.327 18 625.827 28 634.16 41C642.827 54 647.16 68.5 647.16 84.5C647.16 126.833 627.994 153.5 589.66 164.5V166.5C633.327 176.5 655.16 205.167 655.16 252.5C655.16 270.5 650.66 286.5 641.66 300.5C632.994 314.167 620.994 324.833 605.66 332.5C590.327 340.167 573.494 344 555.16 344H323.16V-1.16825e-05H552.16ZM433.66 134H509.66C516.993 134 522.993 131.5 527.66 126.5C532.66 121.167 535.16 114.667 535.16 107V102C535.16 94.6666 532.66 88.5 527.66 83.5C522.66 78.1667 516.66 75.5 509.66 75.5H433.66V134ZM433.66 264H517.66C524.993 264 530.993 261.5 535.66 256.5C540.66 251.167 543.16 244.667 543.16 237V232C543.16 224.333 540.66 218 535.66 213C530.993 207.667 524.993 205 517.66 205H433.66V264ZM647.32 -1.16825e-05H757.82V256H934.32V344H647.32V-1.16825e-05ZM1146.32 344L1131.82 295.5H1011.32L996.816 344H883.816L1009.32 -1.16825e-05H1137.82L1263.32 344H1146.32ZM1034.32 218.5H1108.82L1072.82 96H1070.82L1034.32 218.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * One wordmark, painted twice, with a circle deciding which one you see where:
 * orange underneath, beige on top clipped to the disc. Not two shapes butted
 * together — the beige copy is the *same* path at the *same* size and place,
 * so the letterforms can never drift apart and the colour change lands exactly
 * on the circle's edge, mid-glyph.
 *
 * Masking the top copy rather than knocking a hole in the orange one is what
 * keeps that true: an inverted mask on the base would put the seam under two
 * independent clips that both have to agree, instead of one.
 *
 * These are the only knobs, and both the disc and the mask read them, so the
 * mask cannot fall out of register with the shape it is tracing. `--circle-y`
 * is how far the disc hangs *below* the section's bottom edge — kept positive
 * so every calc() operand below stays positive and no `- -4vw` has to be
 * trusted to parse.
 *
 * y is most of the radius on purpose. It puts the centre at r - y = 11vw above
 * the bottom edge, which is roughly where the wordmark's own centre line falls
 * (90vw * 344/1264 / 2, less the --wordmark-y shift, ≈ 9.3vw) — so the disc
 * reads as centred on the mark rather than floating above it, and the top of
 * the arc lands ~42vw up, well inside a landscape viewport. Anything much
 * smaller pushes the crown off the top of the fold: at y = 4vw the arc peaked
 * at 58vw, above the ~56vw height of a 16:9 screen, so the circle looked like
 * a flat-topped wall.
 *
 * That comparison is vw against vh, which only holds while the viewport is
 * wider than it is tall. On a portrait screen 100vh dwarfs 62vw and the disc
 * becomes a small puck near the bottom — worth a breakpoint if the footer ever
 * has to hold up on mobile.
 */
const FOOTER_VARS = {
  "--circle-d": "80vh",
  "--circle-r": "calc(var(--circle-d) / 2)",
  "--circle-y": "-5vh",
  "--wordmark-y": "10vh",
} as React.CSSProperties;

/**
 * The masked layer is `inset-0`, i.e. the whole section, so `100%` here is the
 * section's height and the gradient's centre resolves in the same coordinates
 * as the disc's own offset: 100% + y is the disc's bottom edge, minus r is its
 * centre line.
 *
 * The stops are a hair apart rather than hard at 100% because a single-stop
 * radial edge aliases into a staircase; half a percent of the radius reads as
 * a clean curve without visibly softening the seam.
 */
const CIRCLE_MASK =
  "radial-gradient(circle var(--circle-r) at 50% calc(100% + var(--circle-y) - var(--circle-r)), #000 99.5%, transparent 100%)";

/**
 * Identical on both copies on purpose — same box, same alignment, so "same
 * size and exact position" is structural rather than two sets of numbers that
 * happen to match today. items-end is what sits them on the bottom edge now
 * that the layer is full-height.
 */
const LAYER = "absolute flex-col inset-0 flex items-center justify-end";

/**
 * The downward shift rides on the svg, not on LAYER, and that distinction is
 * load-bearing: a mask is resolved against its own element's box, so
 * translating the masked *layer* would carry the gradient down with it and
 * slide the seam off the disc, which does not move. Shifting the child leaves
 * every masking box where it was.
 *
 * `block` matters for the same reason it always did: an inline svg sits on the
 * text baseline and would add a descender's worth of gap under the mark.
 */
const WORDMARK = "block h-auto w-[90vw] translate-y-[var(--wordmark-y)]";

/**
 * Hard-coded rather than `new Date().getFullYear()`. This is a Server
 * Component on a fully static page, so a computed year is evaluated once at
 * build time and then frozen into the HTML — it would be right today, go
 * stale silently on the next 1 January, and only unstick itself whenever the
 * site next happens to be rebuilt. Moving the call to the client swaps that
 * for a hydration mismatch. An explicit constant at least fails visibly.
 */
const YEAR = 2026;

/** href is a placeholder — these routes do not exist yet. */
const LEGAL_LINKS = [
  { label: "Terms of Service", href: "#" },
  { label: "Privacy Policy", href: "#" },
  { label: "Cookie Settings", href: "#" },
];

export default function Footer() {
  return (
    // overflow-hidden earns its keep twice now — it clips the disc that
    // --circle-y hangs past the bottom edge, and it is what turns the
    // wordmark's --wordmark-y overhang into a crop instead of letting the
    // letters spill past the end of the document.
    <section
      id="footer"
      style={FOOTER_VARS}
      className="relative h-screen overflow-hidden"
    >
      <div
        id="footer-circle"
        style={{
          width: "var(--circle-d)",
          height: "var(--circle-d)",
          bottom: "calc(var(--circle-y) * -1)",
        }}
        className="absolute left-1/2 -translate-x-1/2 rounded-full bg-accent"
      />

      <div className={LAYER}>
        <Wordmark className={`${WORDMARK} text-accent`} />
      </div>
      {/* mask-repeat defaults to `repeat`, and the gradient is sized to this
        box — so once the shifted svg pokes out below, the tile underneath
        would paint a second circle's worth of beige into the overhang. The
        section's clip hides it today; no-repeat means it is not waiting for
        someone to raise --wordmark-y past the crop. */}
      <div
        className={LAYER}
        style={{
          WebkitMaskImage: CIRCLE_MASK,
          maskImage: CIRCLE_MASK,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
        }}
      >
        <div className="absolute inset-0 top-[-100vh]">
          <DashedCircle dots="vertical" spin={0} size="60vh" />
          <DashedCircle dots="vertical" spin={0} size="120vh" />
          <DashedCircle dots="vertical" spin={0} size="180vh" />
        </div>

        <div id="cross-lines" className="absolute inset-0">
          <div
            id="y-line"

            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="h-screen w-px bg-black opacity-10"></div>
          </div>
        </div>

        <Wordmark className={`${WORDMARK} text-background`} />
      </div>

      <div className="absolute inset-x-0 bottom-0 m-auto flex w-[90vw] items-end justify-between gap-space-2x py-space-base text-sm text-black">
        {/* Not <p>: this is a lone piece of metadata, not prose. */}
        <span className="flex-1 text-left">&copy; {YEAR} DBLA</span>
        <p className="flex-1 text-center">
          Site by{" "}
          <a className="hover:underline" href="www.kaobui.com">
            Kaobui
          </a>
        </p>
        <nav aria-label="Legal" className="flex-1">
          <ul className="flex justify-end gap-space-2x">
            {LEGAL_LINKS.map(({ label, href }) => (
              <li key={label}>
                <a href={href} className="hover:underline">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="relative m-auto flex h-full w-[90vw] flex-col gap-[20vh] py-space-2x">
        <div className="flex w-full items-start justify-center text-center text-black">
          <p className="heading-style flex-1 text-left text-base">
            Hochiminh City, Vietnam <br />
            <LocalTime timeZone="Asia/Ho_Chi_Minh" className="opacity-50" />
          </p>
          <p className="heading-style flex-1 text-base">Working Worldwide.</p>
          <p className="heading-style flex-1 text-right text-base">
            Paris, France <br />
            <LocalTime timeZone="Europe/Paris" className="opacity-50" />
          </p>{" "}
        </div>
        <div className="flex w-full items-end justify-between">
          <nav className="flex-1 text-md font-medium uppercase">
            <ul>
              <li>home</li>
              <li>about</li>
              <li>services</li>
              <li>contact</li>
            </ul>
          </nav>
          <div className="flex flex-col items-center gap-space--1x">
            <p className="heading-style text-3xl">bring your ideas to life</p>
            <a
              className="rounded-md bg-background px-space-2x py-space--2x text-md font-bold tracking-tighter uppercase"
              href=""
            >
              get in touch
            </a>
            <a className="text-md text-black" href="">
              contact@dbla.com
            </a>
          </div>
          <ul className="flex-1 text-right text-md font-medium uppercase">
            <li>instagram</li>
            <li>tiktok</li>
            <li>linkedIn</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
