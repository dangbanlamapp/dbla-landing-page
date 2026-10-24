import { Fragment } from "react";
import ContactForm from "./ContactForm";
import ContactInfo from "./ContactInfo";
import DashedCircle from "./DashedCircle";
import type { SiteSettings } from "./site-settings";
import { useTranslations } from "next-intl";
import { RICH } from "./rich";

/**
 * The two-column split, written once and applied to BOTH the heading row and
 * the panel below it. That is the whole reason the heading's right edge lands
 * on the panel's divider: the two share one column definition rather than two
 * sets of numbers that happen to agree today.
 */
const COLUMNS = "grid grid-cols-1 lg:grid-cols-2";

/**
 * The page's words, from the Studio's "Contact page" singleton. Every field is
 * optional and each one missing falls back to its messages/ string on its own,
 * so a blank or half-filled document still renders the page whole. The four
 * placeholder keys match the form's field names, which is what lets
 * ContactForm read them by name.
 */
export type ContactCopy = {
  /** Plain text; each newline becomes a line break, as `<br></br>` does in
   *  the message it replaces. */
  title?: string;
  body?: string;
  name?: string;
  company?: string;
  email?: string;
  message?: string;
  submit?: string;
};

/** A Studio title's newlines as the heading's line breaks. */
function withBreaks(text: string) {
  return text.split("\n").map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line}
    </Fragment>
  ));
}

export default function Contact({
  settings,
  copy = {},
}: {
  settings: SiteSettings;
  copy?: ContactCopy;
}) {
  const t = useTranslations("Contact");
  const common = useTranslations("Common");
  return (
    <section
      id="contact"
      /**
       * h-svh, and the unit is the whole point of "fits in the viewport".
       *
       * svh is the SMALL viewport — the height the page has while the mobile
       * URL bar is still showing — so the composition fits at the worst moment
       * and never has to move. dvh fits too, but it re-lays the whole panel out
       * every time the bar collapses or returns, and a page with no scroll of
       * its own would jump for no reason a reader could see. lvh is the trap:
       * it is the height available only AFTER the bar goes away, so at load the
       * bottom of the form sits under the browser chrome with no scroll to
       * reach it. Same reasoning as Hero.
       *
       * NOT overflow-hidden. Clipping lives on the drawn layer below, which is
       * the only thing that needs it. If the content ever does outgrow a very
       * short viewport, it spills out of this box and stays reachable by
       * scrolling — clipping here would silently eat the submit button instead.
       *
       * justify-center-safe, not justify-center, for the other half of that:
       * plain centring splits any overflow evenly and pushes the top of the
       * heading off the top of the screen, where nothing can scroll up to it.
       * `safe` falls back to flex-start the moment the content stops fitting.
       *
       * The top pad is a calc rather than a vh because it exists to clear the
       * fixed header bar, and that bar is sized by a rem type step — it does
       * not shrink when the viewport does. 4rem is the bar plus air; the 2vh on
       * top is the part that may breathe.
       */
      className="relative flex h-svh flex-col justify-center-safe px-[1vw] pt-[calc(4rem+2vh)] pb-[4vh]"
    >
      {/* Drawn layer, behind everything, and the one box that clips: the ring
          is deliberately wider than the viewport, and without a clip here it
          would stretch the page's scroll width. aria-hidden and not merely
          decorative by convention — none of it is content, and the ring's two
          dots would otherwise be announced as empty structure. */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        {/* Bigger than the viewport in both axes, so only four arcs cut the
            corners and no reader ever sees the ring close. max() rather than
            vmax: vmax alone collapses to the *short* side on a landscape
            laptop and the arcs walk off the top and bottom of the frame. */}
        <DashedCircle size="max(110vw, 110vh)" dots="horizontal" />

        {/* Centred on the section, not on the panel, which is why they read as
            page furniture the orange happens to cover rather than as part of
            it. Only their four stubs outside the panel are ever visible. */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-full w-px bg-black opacity-10"></div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-px w-full bg-black opacity-10"></div>
        </div>
      </div>

      {/*
        Heading row and panel, wrapped. `relative` only to enter the positioned
        paint order — the drawn layer above is absolute and would otherwise
        paint over a static sibling whatever the DOM order says.
      */}
      <div className="relative w-full">
        {/*
          The heading gets a row of its own, and that is what stops it being
          clipped. It used to hang off the top of the orange on a negative
          margin-TOP, which meant it contributed no height at all: the section's
          top padding was then the only thing holding it on screen, and it had
          to cover the overhang and the fixed header bar at once. On any
          viewport where that guess ran short, the top of the type was cropped —
          and a section cannot be scrolled above its own start, so it was gone.

          Now the row carries the height and the overlap is a negative
          margin-BOTTOM on the heading itself: the panel is pulled up under the
          last line instead of the heading being pushed up out of the panel. The
          composition is identical, and the top of the type is ordinary flow
          that nothing can push past the top edge.

          -0.3em, in the heading's own font-size, IS the overlap. The block is
          two lines at leading-heading (0.75), so 1.5em tall, and giving 0.3em
          back leaves the last line's lower fifth over the orange — the same
          proportion at 48px as at 95px, where a rem value would drift at every
          step of the scale.

          z-1 because that overhang has to paint ON the orange: the panel is a
          later sibling carrying a background, so DOM order alone buries it.
        */}
        <div className={`${COLUMNS} relative z-1`}>
          <h1 className="heading-style mb-[-0.3em] px-space-2x text-center text-5xl leading-heading sm:text-6xl lg:pr-space-2x lg:text-right lg:text-7xl xl:text-8xl">
            {copy.title ? withBreaks(copy.title) : t.rich("title", RICH)}
          </h1>
        </div>

        {/*
          No padding of its own: each column owns its insets, because the two
          are not symmetric. The left runs its text right up to the divider,
          the right holds the form off it by more.

          Those insets are what keep the section inside one viewport, so they
          are viewport-relative at lg and fixed steps below it. A vh pad cannot
          push the panel past a screen it is measured against; the space-6x this
          replaced was 120px a side no matter how short the screen was, which is
          most of a 600px laptop before a single field is drawn. Below lg the
          columns stack and there is no room for that generosity in the first
          place, so the small steps do the same job by being small.
        */}
        <div className={`${COLUMNS} w-full bg-accent`}>
          {/* The top pad also has to clear the heading's 0.3em overhang — at
              the largest step that is ~29px, which space-3x covers. */}
          <div className="flex flex-col items-center justify-between px-space-2x pt-space-3x pb-space-2x text-center lg:items-end lg:pt-[8vh] lg:pr-space-2x lg:pb-[8vh] lg:text-right">
            <p className="max-w-[46ch] pt-space-base text-base leading-body">
              {copy.body ?? t("body")}
            </p>

            {/* The same block the menu prints, in the other colourway: this
                panel is orange under the page's dark foreground rather than the
                menu sheet's beige-on-orange, so the pair is inverted — dark
                text resolving to beige on hover.

                `align` differs from the menu's for the one reason the prop
                exists: this column centres its text below lg, where the menu
                stacks it left. Both flush right at lg. */}
            <ContactInfo
              settings={settings}
              align="items-center lg:items-end"
              link="text-foreground hover:text-background focus-visible:text-background"
              className="mt-space-2x text-base lg:mt-space-3x"
            />
          </div>

          {/*
            The divider is this column's left border rather than a third
            absolute line, and that only works because the panel is centred and
            split into two equal columns: the border lands on the same x as the
            page's own vertical rule behind it, so the one line appears to pass
            through the orange. Move either the panel's width off centre or
            COLUMNS off 1fr 1fr and the two separate by exactly that error.

            This is also the column that sets the panel's height — it is the
            taller of the two — so its padding is the lever if the fit ever
            needs adjusting.
          */}
          <div className="flex flex-col justify-center px-space-2x py-space-3x lg:border-l lg:border-black/15 lg:py-[8vh] lg:pr-space-6x lg:pl-space-2x">
            {/* The button's fallback lives in Common, which the form does not
                read, so it is resolved here; the placeholders fall back
                inside the form, per field. */}
            <ContactForm
              copy={{
                name: copy.name,
                company: copy.company,
                email: copy.email,
                message: copy.message,
                submit: copy.submit ?? common("contactUs"),
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
