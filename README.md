# DBLA

Marketing site for a product studio — _"we build digital products that grow your business."_

A single-page, animation-heavy Next.js site with no backend: one route, one scroll, a stack of pinned sections choreographed with GSAP over an animated geometric backdrop.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Script                 | Does                                       |
| ---------------------- | ------------------------------------------ |
| `npm run dev`          | Dev server                                 |
| `npm run build`        | Production build                           |
| `npm run start`        | Serve the production build                 |
| `npm run lint`         | ESLint (flat config, `eslint-config-next`) |
| `npm run format`       | Prettier — writes                          |
| `npm run format:check` | Prettier — checks only                     |

## Stack

| Piece      | Version | Notes                                                                                      |
| ---------- | ------- | ------------------------------------------------------------------------------------------ |
| Next.js    | 16.3.1  | App Router. **Read `node_modules/next/dist/docs/` before writing code** — see `AGENTS.md`. |
| React      | 19.2.8  | Server Components by default; only animated sections are `"use client"`.                   |
| TypeScript | 5       | `strict: true`, `@/*` → repo root.                                                         |
| Tailwind   | v4      | CSS-first config. **No `tailwind.config.js`** — tokens live in `app/globals.css`.          |
| GSAP       | 3.15    | With `@gsap/react` (`useGSAP`); `SplitText` + `ScrollTrigger` are used throughout.         |
| Lenis      | 1.3     | Smooth scroll in `root` mode, driving its own RAF.                                         |
| NumberFlow | 0.6     | Animated project counter in the pinned `Projects` stack.                                   |
| Prettier   | 3.9     | `prettier-plugin-tailwindcss` sorts class strings.                                         |

## Structure

```
app/
  layout.tsx       fonts, <html>/<body>, SmoothScroll wrapper — nothing else
  page.tsx         the only route; composes the sections in scroll order
  globals.css      design tokens + @theme inline + base/component layers
  components/      all UI (no src/ dir, no route groups)
public/            project mockups, wordmark, halftone/noise textures
```

### Sections, in scroll order

`page.tsx` renders the backdrop first, so its pinned layer sits behind everything at `-z-1`:

| Component  | Role                                                                          |
| ---------- | ----------------------------------------------------------------------------- |
| `HeaderBg` | Pinned geometric backdrop — dashed rings, cross lines, a growing z-line.      |
| `Hero`     | Masked line entrance, pinned for a viewport while `Intro` slides up over it.  |
| `Intro`    | Positioning statement; one timeline owns both the hold and the exit.          |
| `Services` | Pinned stack of `ServiceBlock` panels — one service = one viewport of scroll. |
| `OurMotto` | Half-viewport slide-in over the section above.                                |
| `Projects` | Pinned 300vh case-study stack: `ProjectBlock` copy, imagery, `ProgressRing`.  |
| `WhyUs`    | Scrubbed line entrances.                                                      |
| `Cta`      | Clip-path wedge reveal that floods the viewport orange.                       |
| `Footer`   | Server Component — inlined wordmark, `LocalTime` clocks.                      |

Shared primitives: `DashedCircle` (dashed ring — optionally collapsed, spinning, or grown on scroll), `ScopeBar` (graduated tick bar), `ProgressRing` (tick dial), plus `SmoothScroll` and `ScrollLock` in the layout.

## Design tokens

Tokens are declared as CSS vars on `:root` in [app/globals.css](app/globals.css), then exposed to Tailwind via `@theme inline`. **Add new tokens in both places** or the utility won't exist.

- **Colors** — `--color-orange` (#f8612c), `--color-beige` (#e1dcd1), `--secondary`; used as `bg-accent` / `text-accent`, `background`, `foreground`, `secondary`. Light-only for now (dark mode is commented out).
- **Type** — a `calc()` modular scale (ratio 1.25), so `text-xs … text-8xl` are _project_ tokens, not Tailwind defaults; they switch to fluid `clamp()` above 1536px. Arbitrary font sizes break the scale.
- **Spacing** — `--space-base` (1rem) with multipliers, used as `p-space-2x`, `gap-space-base`, `py-space--2x`. Note the naming: **`space--2x` (double dash) is _smaller_ than base; `space-2x` is larger.** Fluid above 1280px.
- **Leading / tracking** — `leading-heading` (0.75), `leading-body`, `tracking-heading`, `tracking-body`. `.heading-style` is the shared uppercase-bold-tight recipe.

Fonts load in `layout.tsx` via `next/font/google`; Familjen Grotesk (`--font-grotesk`) is the body/display face. The document scrollbar is hidden in the base layer, and a full-bleed halftone texture sits on `body::after` with `mix-blend-mode: soft-light`.

## Animation conventions

Every animated component follows the same shape — match it rather than inventing a new one:

1. `"use client"` at the top.
2. `gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger)` at module scope.
3. A `container` ref + `useGSAP(() => {…}, { scope: container })`, so selectors are scoped and cleanup is automatic.

Recurring patterns:

- **`data-split="up" | "down"`** on a heading declares which direction its lines travel; `data-fade` marks supporting copy. Block components (`ServiceBlock`, `ProjectBlock`) are deliberately presentational and ship only markup plus these attributes — the choreography lives on the parent's master timeline, in scroll order.
- `SplitText.create(…, { type: "lines", mask: "lines", autoSplit: true, onSplit })` — return the entrance tween from `onSplit` so GSAP kills it before a re-split.
- **No SSR flash**: anything that grows or fades in starts at its tween's initial value in the markup (`scale-x-0`, `collapsed` on `DashedCircle` / `ScopeBar`). Collapsed markup needs a **`fromTo`** tween, not a plain `from`.
- Scroll positions that must survive a resize are passed as **functions** (`end: () => "+=" + window.innerHeight`) together with `invalidateOnRefresh`.
- Prefer transform properties (`scaleX`, `yPercent`, `rotate`) over layout properties so tweens stay on the compositor.
- Pinned sections measure their length in viewports (`PIN_VIEWPORTS` in `Projects`, one viewport per entry in `Services`), so adding content extends the pin without rewriting positions.

### Smooth scroll and the load lock

[SmoothScroll.tsx](app/components/SmoothScroll.tsx) wraps `{children}` in the root layout — a thin config wrapper around `<ReactLenis root>` with **deliberately no GSAP wiring**: in root mode Lenis performs a real native scroll that ScrollTrigger already listens for, so there is no `gsap.ticker` integration and no `scrollerProxy`. Don't set `autoRaf: false` either — `ReactLenis` recreates its instance on any option change, and a hand-rolled RAF would keep driving the destroyed one. Reduced-motion readers get `smoothWheel: false`, i.e. real native scrolling.

[ScrollLock.tsx](app/components/ScrollLock.tsx) renders inside that provider and freezes scroll for the first two seconds so the intro can play, scrolls to top on reload (`history.scrollRestoration = "manual"`), and refreshes ScrollTrigger on release. Reduced-motion readers aren't locked.

`lenis/dist/lenis.css` is imported in [layout.tsx](app/layout.tsx) — required. Put `data-lenis-prevent` on any inner scrollable panel.

## Working in this repo

- [AGENTS.md](AGENTS.md) — Next.js 16 differs from what's in most training data; read the bundled docs first.
- [CLAUDE.md](CLAUDE.md) — the long-form version of everything above, with the reasoning behind each choice.
- The components carry dense comments explaining _why_ each decision was made. Keep that density when editing them.
