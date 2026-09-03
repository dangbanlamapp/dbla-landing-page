import type { Metadata } from "next";
import { Familjen_Grotesk } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";
import SmoothScroll from "@/app/components/SmoothScroll";

const grotesk = Familjen_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DBLA",
  description: "A product team",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${grotesk.variable} h-full antialiased`}>
      <body className="relative">
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
