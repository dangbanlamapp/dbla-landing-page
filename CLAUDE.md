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

## Content (Sanity)

Projects + case studies, services, team, testimonials and site settings (email, phone, social and legal links, meta description) all live in Sanity (project `ob6q59v5`, dataset `production`, public). Section headings and other animated copy stay in code. The Studio is a **separate repo** at `../studio-dbla-website` (`npm run dev` there → localhost:3333); schemas live in its `schemaTypes/`.

- `sanity/` here holds the client, `sanityFetch` / `<SanityLive />` (`defineLive`, classic mode — `cacheComponents` is off), `urlFor`, and **every GROQ query** in `sanity/lib/queries.ts`. `<SanityLive />` is mounted once in the root layout.
- **Data flow:** routes (server) call the getters in `sanity/lib/content.ts`, which map query results onto the components' own types (`Project`, `ProjectStory`, `Service`, `TeamMember`, `Testimonial`, `SiteSettings`) and pass them down as props. Components never import Sanity. Images become `StaticImageData`-shaped objects (CDN URL + cropped width/height), so `<Image src={…}>` and `src.width` work as with static imports.
- The root layout fetches site settings (→ `SiteSettingsProvider`, read by Footer and MenuPanel via `useSiteSettings()`) and the project cards (→ Preloader `mockups`). The contact page passes settings to `ContactInfo` as props so it stays a server component.
- **Count-dependent timing is computed from props**, not module constants — e.g. `schedule(count)` in Projects. Each content-driven section is rendered with `key={contentKey(data)}` so a live publish remounts it instead of React patching text SplitText has already split. Keep both patterns when adding a section.
- Project images are no longer in `public/` — upload to the Studio instead.
- **Freshness has two paths.** `<SanityLive />` revalidates from any open browser; a signed Sanity webhook → [app/api/revalidate/route.ts](app/api/revalidate/route.ts) expires the shared `SANITY_TAG` on every publish, so edits land even when nobody is on the site. **Every `sanityFetch` must pass `tags: [SANITY_TAG]`** or the webhook cannot reach it — go through the getters in `content.ts`. Needs `SANITY_REVALIDATE_SECRET` in `.env.local` and on the host.
- `sanity.types.ts` is **generated** — run `npm run typegen` in the Studio repo after changing a schema or a query. Never edit it by hand; it is in `.prettierignore`.
- Lists (projects, services, team, testimonials) are drag-ordered in the Studio; always `| order(orderRank)`.
- Strings fetched in draft mode carry invisible stega characters — `stegaClean()` any value used in logic (e.g. a figure's `kind`), and pass `stega: false` in `generateMetadata` / `generateStaticParams`.

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

### Route transition + shared scroll hold

[PageTransition.tsx](app/components/PageTransition.tsx) wraps `{children}` in SmoothScroll and imitates the menu opening: a black disc scales up from the centre with an accent disc `MENU_LEAD` behind it (`COVER`), the route changes behind them, then a hole opens through the accent with one through the black chasing it (`UNCOVER`) — the menu-close order. ~1.6s click-to-clear including the route commit. The curve and lead come from [menu-motion.ts](app/components/menu-motion.ts), shared with MenuPanel so the two stay in step. Scroll is held for the whole run.

- **Opt-in via [TransitionLink](app/components/TransitionLink.tsx).** Use it for links between pages of the site; plain `Link` / `<a>` (external, `#anchor`, mailto) never animate. It cancels next/link's navigation from `onNavigate`, which Link only fires for unmodified left-clicks on local URLs, and hands the href to PageTransition through context. `href` must be a string. Same-pathname links, back/forward and reduced-motion readers get the plain instant behaviour.
- Each disc is a `scale` tween (compositor); each hole is a radial-gradient `mask-image` driven by that layer's own `--hole` CSS var (unitless 0→1, multiplied out in CSS), since no transform can cut a hole. **Both are sized to exactly the viewport diagonal (`hypot(100vw, 100vh)`), on purpose** — an oversized disc crosses the corners early, the slow end of the ease plays off-screen, and the black/accent stagger disappears. Its initial scale is an inline `transform`, not Tailwind's `scale-0` — v4 compiles that to the CSS `scale` property, which would multiply with GSAP's transform.
- **Entrances wait for the reveal.** It re-provides `RevealContext` (exported from Preloader): the incoming page sees `revealed === false` until the hole starts opening, so anything already gated on `useRevealed()` just works. The outgoing page never sees it flip.
- **Never call `lenis.stop()` / `start()` directly** — use `holdScroll(lenis)` from [scroll-hold.ts](app/components/scroll-hold.ts). Holds are ref-counted per instance; ScrollLock, MenuPanel and PageTransition overlap (a menu link closes the menu on the same click that starts the wipe). The release returns `true` only when it actually resumed scrolling; call `ScrollTrigger.refresh()` only then.

The existing components carry dense explanatory comments about _why_ each choice was made — keep that density when editing them.
