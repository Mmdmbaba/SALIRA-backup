/**
 * Base-path helper for static hosting under a sub-path (GitHub Pages project
 * sites, e.g. https://<user>.github.io/salira/).
 *
 * NEXT_PUBLIC_BASE_PATH is injected at build time by scripts/build-pages.sh.
 * Empty string in standalone/dev builds (assets stay at the root).
 */
export const BASE_PATH: string = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Prefix a root-relative public asset path with the configured base path. */
export function withBase(p: string): string {
  if (!p.startsWith("/") || /^https?:\/\//i.test(p)) return p;
  return `${BASE_PATH}${p}`;
}
