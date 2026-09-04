import Cta from "@/app/components/Cta";
import Footer from "@/app/components/Footer";
import HeaderBg from "@/app/components/HeaderBg";
import Header from "@/app/components/Header";
import Hero from "@/app/components/Hero";
import Intro from "@/app/components/Intro";
import OurMotto from "@/app/components/OurMotto";
import Projects from "@/app/components/Projects";
import Services from "@/app/components/Services";
import WhyUs from "@/app/components/WhyUs";

export default function Home() {
  return (
    <>
      <Header />
      {/*
        The two classes here are the whole footer reveal, and Footer sits
        OUTSIDE this element on purpose — see the comment there.

        `bg-background` is what does the revealing. Until now the beige came
        from the canvas (body's background propagates up when html has none),
        so every section was transparent and a fixed layer behind them would
        have shown straight through. main needs its own opaque paint to be the
        sheet that slides off the footer.

        `relative z-1` then settles the paint order against the footer's -z-1.
        Both are viewport-fixed siblings, so DOM order alone would put the
        later one — the footer — on top.

        Making main a stacking context does not strand HeaderBg's own -z-1
        layer: a stacking context paints its background first and its negative
        children straight after, so that backdrop still lands above the beige
        and below the sections, exactly where it was. And `position: relative`
        is not one of the properties that break a descendant's
        `position: fixed`, so every ScrollTrigger pin inside still pins to the
        viewport.
      */}
      <main className="relative z-1 bg-background">
        <HeaderBg />
        <Hero />
        <Intro />
        <Services />
        <OurMotto />
        <Projects />
        <WhyUs />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
