import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * SALIRA on Cloudflare Workers (OpenNext).
 * No cache binding needed: pages are static prerenders or force-dynamic API
 * routes; nothing relies on ISR revalidation.
 */
export default defineCloudflareConfig({});
