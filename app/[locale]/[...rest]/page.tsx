import { notFound } from "next/navigation";

/*
  Any path no other route claims. The root layout lives under [locale], so
  there is no layout above it to render an unmatched URL's 404 in; catching
  everything here sends it through this segment's layout instead — the right
  <html lang>, the site's own chrome — and on to the default not-found page.
*/
export default function CatchAll() {
  notFound();
}
