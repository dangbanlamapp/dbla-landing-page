import Cta from "@/app/components/Cta";
import Footer from "@/app/components/Footer";
import HeaderBg from "@/app/components/HeaderBg";
import Header from "@/app/components/Header";
import Hero from "@/app/components/Hero";
import Intro from "@/app/components/Intro";
import OurMotto from "@/app/components/OurMotto";
import OurTeam from "@/app/components/OurTeam";
import Projects from "@/app/components/Projects";
import Services from "@/app/components/Services";
import WhyUs from "@/app/components/WhyUs";
import {
  contentKey,
  getHomePage,
  getProjects,
  getServices,
  getTeam,
  getTestimonials,
} from "@/sanity/lib/content";
import { pageLocale } from "@/i18n/locale";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const locale = await pageLocale(params);
  const [copy, projects, services, team, testimonials] = await Promise.all([
    getHomePage(locale),
    getProjects(locale),
    getServices(locale),
    getTeam(locale),
    getTestimonials(locale),
  ]);

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
        {/*
          Every section is keyed on its content (see contentKey) — its
          headings from the Homepage document, and its list where it has one
          — so a live publish remounts it rather than patching text SplitText
          has already split. The four with a list are skipped when it is
          empty: every one of them divides its pin, its carousel or its grid
          by that count.
        */}
        <Hero key={contentKey(copy.hero)} copy={copy.hero} />
        <Intro key={contentKey(copy.intro)} copy={copy.intro} />
        {services.length > 0 && (
          <Services
            key={contentKey([services, copy.services])}
            services={services}
            copy={copy.services}
          />
        )}
        <OurMotto key={contentKey(copy.motto)} copy={copy.motto} />
        {projects.length > 0 && (
          <Projects
            key={contentKey([projects, copy.projects])}
            projects={projects}
            copy={copy.projects}
          />
        )}
        {testimonials.length > 0 && (
          <WhyUs
            key={contentKey([testimonials, copy.whyUs])}
            testimonials={testimonials}
            copy={copy.whyUs}
          />
        )}
        {team.length > 0 && (
          <OurTeam
            key={contentKey([team, copy.team])}
            team={team}
            copy={copy.team}
          />
        )}
        <Cta key={contentKey(copy.cta)} copy={copy.cta} />
      </main>
      <Footer />
    </>
  );
}
