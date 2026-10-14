import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Points next-intl at i18n/request.ts, its default location.
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  images: {
    // Images uploaded to the Studio. Scoped to this project's own asset path
    // rather than the whole CDN host, so the optimizer cannot be pointed at
    // another Sanity project's files. `search` is left unset on purpose: the
    // URL builder carries crop, hotspot and size as query parameters, and an
    // empty `search` would reject every one of them.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        pathname: "/images/ob6q59v5/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
