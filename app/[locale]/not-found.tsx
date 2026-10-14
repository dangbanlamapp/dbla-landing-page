import { useTranslations } from "next-intl";
import BackHeader from "@/app/components/BackHeader";

/*
  The 404 for anything under [locale] — an unknown project slug, or any path
  the catch-all picks up. Needed now that the root layout lives inside
  [locale]: without a boundary of its own below that layout, Next falls back
  to a bare error document with no <html lang>, no fonts and no way back.
  Here it renders inside the layout like every other page.
*/
export default function NotFound() {
  const t = useTranslations("NotFound");
  return (
    <>
      <BackHeader />
      <main className="flex h-svh flex-col items-center justify-center gap-space-base px-space-base text-center">
        <h1 className="heading-style text-6xl">404</h1>
        <p className="text-md">{t("message")}</p>
      </main>
    </>
  );
}
