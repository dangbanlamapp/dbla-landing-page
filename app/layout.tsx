import type { Metadata } from "next";
import { Familjen_Grotesk } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";
import Preloader from "@/app/components/Preloader";
import SmoothScroll from "@/app/components/SmoothScroll";

const grotesk = Familjen_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // `default` is the home page; the template lets a sub-route such as /contact
  // set a bare `title: "Contact"` and still get the brand suffix.
  title: {
    default: "DBLA | Product studio for non-technical founders",
    template: "%s | DBLA",
  },
  description:
    "We design and build websites, mobile apps and web apps for non-technical founders, from first sketch to launch.",
  openGraph: {
    title: "DBLA | Product studio for non-technical founders",
    description:
      "We design and build websites, mobile apps and web apps for non-technical founders, from first sketch to launch.",
    siteName: "DBLA",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${grotesk.variable} h-full antialiased`}>
      <body className="relative">
        {/*
          Outside SmoothScroll, which stays a pure Lenis config wrapper. Being
          the outer element is what lets ScrollLock — mounted inside the Lenis
          provider, because it needs useLenis — still read the reveal signal off
          this context, and what keeps the curtain from replaying on a
          client-side route change: the root layout persists across navigation,
          so this component never remounts.
        */}
        <Preloader>
          <SmoothScroll>{children}</SmoothScroll>
        </Preloader>
      </body>
    </html>
  );
}
