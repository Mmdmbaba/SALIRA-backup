import type { NextConfig } from "next";

/**
 * Two build modes:
 *  - default        → output: "standalone" (full server: API routes, Prisma, real scans)
 *  - EXPORT_STATIC=1 → output: "export" (static bundle for GitHub Pages / any static host)
 *                     API routes are removed by scripts/build-pages.sh before this build runs.
 *
 * For static hosting under a sub-path (e.g. https://<user>.github.io/salira/),
 * set NEXT_PUBLIC_BASE_PATH=/salira so both routing and asset URLs are correct.
 */
const isExport = process.env.EXPORT_STATIC === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const shared: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

const nextConfig: NextConfig = isExport
  ? {
      ...shared,
      output: "export",
      basePath,
      trailingSlash: true,
      images: { unoptimized: true },
    }
  : {
      ...shared,
      output: "standalone",
    };

export default nextConfig;
