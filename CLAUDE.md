@AGENTS.md

# DBLA

Marketing site for a product studio ("we build digital products that grow your business"). Single-page, animation-heavy, no backend — currently Hero + Intro sections over an animated geometric backdrop.

## Stack

| Piece      | Version | Notes                                                                       |
| ---------- | ------- | --------------------------------------------------------------------------- |
| Next.js    | 16.3.1  | App Router. See `AGENTS.md` — read `node_modules/next/dist/docs/` first.    |
| React      | 19.2.8  | Server Components by default.                                               |
| TypeScript | 5       | `strict: true`, `@/*` → repo root.                                          |
| Tailwind   | v4      | CSS-first config. **No `tailwind.config.js`** — everything is in CSS.       |
| GSAP       | 3.15    | With `@gsap/react` (`useGSAP`); SplitText + ScrollTrigger are used heavily. |
| Lenis      | 1.3     | Smooth scroll, root mode, self-driven RAF. See below.                       |
| Prettier   | 3.9     | `prettier-plugin-tailwindcss` sorts class strings.                          |

Scripts: `npm run dev` / `build` / `start` / `lint` (`eslint`, flat config) / `format` / `format:check`.

## Structure

```
app/
  layout.tsx          root layout — fonts + <html>/<body>, nothing else
  page.tsx            the only route; composes the sections
  globals.css         design tokens + @theme inline + base/component layers
  components/         all UI lives here (no src/ dir, no route groups yet)
public/               halftone-bg.jpg, noise-bg.jpg + default Next svgs
```

`app/page.tsx` renders `HeaderBg` → `Hero` → `Intro` in that order; the backdrop is first so its pinned layer sits behind everything at `-z-1`.

## Design tokens — the important part

All tokens are declared as plain CSS vars on `:root` in [app/globals.css](app/globals.css), then exposed to Tailwind through `@theme inline`. **Add new tokens in both places** or the utility won't exist.

- **Colors**: `--color-orange` (#f8612c), `--color-beige` (#e1dcd1), `--secondary`. Exposed as `bg-accent` / `text-accent` (orange), `background`, `foreground`, `secondary`. Dark mode is commented out — the site is light-only for now.
- **Type**: a modular scale (ratio 1.25) built with `calc()`, so `text-xs … text-8xl` are **project tokens, not Tailwind defaults**. Above 1536px they switch to fluid `clamp()` values. Sizing text with an arbitrary value instead of a step breaks the scale.
- **Spacing**: `--space-base` (1rem) with multipliers. Note the naming: **`space--2x` (double dash) is _smaller_ than base, `space-2x` is larger.** Utilities read `p-space-2x`, `gap-space-base`, `py-space--2x`. Fluid via `clamp()` above 1280px.
- **Leading / tracking**: `leading-heading` (0.75) and `leading-body`, `tracking-heading` / `tracking-body`.
- `.heading-style` in `@layer components` is the shared uppercase-bold-tight heading recipe.

Fonts are loaded in `layout.tsx` via `next/font/google` (Familjen Grotesk as body/display, Geist + Geist Mono available). `--font-grotesk` is the default `body` font-family.

The document scrollbar is hidden in the base layer (`scrollbar-width: none` on `html`, plus the `::-webkit-scrollbar` fallback). Scoped to the root scroller on purpose — an inner `data-lenis-prevent` panel needs to keep its own. It also absorbs the ~15px reflow the `overflow: clip` in [ScrollLock](app/components/ScrollLock.tsx) would otherwise cause on platforms with classic scrollbars.

Two full-bleed texture overlays sit on `body::after` (halftone, `mix-blend-mode: soft-light`) — the noise variant is commented out.

## Animation conventions

Every animated component follows the same shape; match it rather than inventing a new one:

1. `"use client"` at the top.
2. `gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger)` at module scope.
3. A `container` ref + `useGSAP(() => {...}, { scope: container })` so selectors are scoped and cleanup is automatic.

Specific patterns in use:

- **`data-split="up" | "down"`** on a heading declares which direction its lines travel. `Hero` and `Intro` both read `heading.dataset.split` to derive `yPercent`. `data-fade` marks supporting copy.
- `SplitText.create(..., { type: "lines", mask: "lines", autoSplit: true, onSplit })` — return the entrance tween from `onSplit` so GSAP kills it before a re-split; kill any tween you stored yourself (see `exits[i]?.kill()` in [Hero.tsx](app/components/Hero.tsx)).
- **No SSR flash**: elements that animate open start at their tween's initial value in the markup — `scale-x-0` on the z-line, `collapsed` prop on `DashedCircle` rendering `height: 0`. Keep this up for anything new that grows/fades in.
- **Pinning**: `HeaderBg` pins an inner `pinLayer` and rotates a separate `rotator` child, because ScrollTrigger applies `position: fixed` to the pinned element and rotation would fight it. Hero pins with `pinSpacing: false`.
- Scroll positions that must survive resize are passed as **functions** (`end: () => "+=" + window.innerHeight`), not fixed numbers, plus `invalidateOnRefresh`.
- Prefer transform properties (`scaleX`, `yPercent`, `rotate`) over layout properties so tweens stay on the compositor.

### Smooth scroll (Lenis)

[SmoothScroll.tsx](app/components/SmoothScroll.tsx) wraps `{children}` in the root layout. It is a thin config wrapper around `<ReactLenis root>` — **deliberately no GSAP wiring**, and it should stay that way:

- **Don't add `gsap.ticker` integration.** In `root` mode Lenis performs a real native window scroll, and ScrollTrigger already listens for that (`_addListener(_doc, "scroll", _onScroll)`, plus a `wheel` listener GSAP added specifically for third-party smooth-scroll libraries). Pins and `scrub` stay in sync for free. No `scrollerProxy` either.
- **Don't set `autoRaf: false`.** `ReactLenis` keys its instance effect on `JSON.stringify(options)`, so it destroys and recreates the Lenis instance whenever an option changes. With `autoRaf: false` and a hand-rolled RAF in a `useEffect([], …)`, the effect keeps driving the _destroyed_ instance and scroll freezes for good — same failure under StrictMode's dev double-mount. Letting Lenis own its loop makes recreation safe.
- That recreate-on-options-change behavior is what makes reactive options work: `smoothWheel: !reduced` genuinely takes effect when the media query flips.

**Reduced motion**: as of Lenis 1.3.26 the built-in `respectReducedMotion` (on by default) does two things — programmatic `scrollTo` becomes immediate, _and_ wheel/touch scrolls get `lerp: 1`, i.e. no easing. The explicit `matchMedia` + `smoothWheel: !reduced` still earns its place because it goes further: `smoothWheel: false` makes Lenis skip `preventDefault` entirely and hand the gesture back to the browser, so the reader gets real native scrolling instead of an unsmoothed JS re-implementation of it. Note this covers Lenis only; the GSAP entrances in `Hero` / `Intro` / `HeaderBg` still play at full motion (`gsap.matchMedia()` would be the way to finish that).

Current options: `lerp: 0.05` (heavier than the 0.1 default), `anchors: { offset: -80 }`. Two are currently inert and safe to ignore or remove — `wheelMultiplier: 1` is already the default, and `touchMultiplier` does nothing while `syncTouch` is `false` (Lenis bails to native scroll for touch unless `syncTouch` is on).

`lenis/dist/lenis.css` is imported in [layout.tsx](app/layout.tsx) — required, it sets `html.lenis { height: auto }` and the `data-lenis-prevent` escape hatches. Put `data-lenis-prevent` on any inner scrollable panel.

### Load lock + scroll to top

[ScrollLock.tsx](app/components/ScrollLock.tsx) renders inside `<ReactLenis>` (it needs `useLenis`, whose context comes from the provider above it) and renders nothing itself.

- **The 2s freeze**: `lenis.stop()` for `LOCK_MS`, then `start()`. `stop()` is the right lever rather than swallowing wheel events, because lenis.css turns `.lenis-stopped` into `overflow: clip` on `<html>` — that kills the scrollbar, arrow keys and space bar too, not just the wheel. Scroll to 0 **before** stopping, or a mid-page load gets clipped in place with no way out.
- The release time is an absolute `performance.now()` deadline held in a ref, so the instance swap `ReactLenis` performs on any option change — and StrictMode's double-mount — re-locks for the remainder instead of restarting a full 2s.
- `ScrollTrigger.refresh()` on release: a clipped `<html>` is not a scroll container and reports no scrollable overflow, and ScrollTrigger auto-refreshes on window `load`, which can easily land inside the lock. The re-measure is a no-op when nothing refreshed. If you push `LOCK_MS` past ~2.5s, note `HeaderBg`'s intro `onComplete` fires its own `ScrollTrigger.refresh()` at that point and would then run while clipped.
- Reduced-motion readers are **not** locked — the freeze only protects an entrance they are not being shown at full strength anyway.
- **Scroll to top on reload**: a mount effect sets `history.scrollRestoration = "manual"` and calls `window.scrollTo(0, 0)`. The App Router never touches that property, so the default is the browser handing you back your old offset. The mode is stored on the session history entry and a reload reuses that entry, so from the second load onward the browser never restores at all; the `scrollTo` only has work to do on the first load of a tab. **Do not "improve" this into a parse-time script**: a bare inline `<script>` triggers React's "scripts inside React components are never executed when rendering on the client" warning, and `next/script`'s `beforeInteractive` does not inline the code — it pushes it onto `self.__next_s` for the Next runtime to drain after its bundle loads, i.e. _later_ than the effect. Consequence of manual mode: back/forward stop restoring a position too, and a reload on a `#anchor` URL lands at the top rather than the anchor.

The existing components carry dense explanatory comments about _why_ each choice was made — keep that density when editing them.
