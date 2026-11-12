import type { NextConfig } from "next";

/**
 * Three build modes:
 *  - default          → output: "standalone" (full Node server: real scans)
 *  - EXPORT_STATIC=1  → output: "export" (static bundle for GitHub Pages);
 *                       API routes are removed by scripts/build-pages.sh
 *  - BUILD_WORKERS=1  → server build for Cloudflare Workers via
 *                       @opennextjs/cloudflare (scripts/build-workers.sh);
 *                       scan/stats variants are swapped in by the script
 *
 * Static hosting under a sub-path (GitHub Pages) sets NEXT_PUBLIC_BASE_PATH.
 */
const isExport = process.env.EXPORT_STATIC === "1";
const isWorkers = process.env.BUILD_WORKERS === "1";
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
  : isWorkers
    ? {
        ...shared,
        // OpenNext bundles its own server entry — do not use standalone output.
        images: { unoptimized: true },
      }
    : {
        ...shared,
        output: "standalone",
      };

export default nextConfig;
