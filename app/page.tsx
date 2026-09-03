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
      <main className="">
        <HeaderBg />
        <Hero />
        <Intro />
        <Services />
        <OurMotto />
        <Projects />
        <WhyUs />
        <Cta />
        <Footer />
      </main>
    </>
  );
}
