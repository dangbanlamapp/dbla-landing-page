import type { Metadata } from "next";
import Contact from "@/app/components/Contact";
import Footer from "@/app/components/Footer";
import Header from "@/app/components/Header";

export const metadata: Metadata = {
  title: "Contact — DBLA",
  description: "Book a 15-minute discovery call with the studio.",
};

export default function ContactPage() {
  /*
    Same three-part composition as page.tsx, and the parts are not
    interchangeable — see the long note there.

    Header first: the bar is `position: fixed` so its own order is moot, but
    MenuPanel is a descendant of it and drops in at z-40, and main paints at
    z-1. main has to be the later sibling for the panel to cover the page.

    Footer OUTSIDE main and after it: it is `fixed` at -z-1 and never moves.
    main's `bg-background` is the opaque sheet that hides it, and `relative z-1`
    settles the paint order between two viewport-fixed siblings that DOM order
    alone would resolve the wrong way round. Footer renders its own h-screen
    runway ahead of itself, which is the scroll distance the reveal is
    performed over — a fixed element adds no document height of its own.

    That runway is also the whole reason main does not need extra height here.
    Contact is min-h-dvh, so the page is one viewport of content and one of
    reveal, and main clears the fold exactly as the last of the footer arrives.
  */
  return (
    <>
      <Header />
      <main className="relative z-1 bg-background">
        <Contact />
      </main>
      <Footer />
    </>
  );
}
