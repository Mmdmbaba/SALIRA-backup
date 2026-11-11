#!/usr/bin/env node
/** Generate public/og-image.png (1200x630) — SALIRA violet-gradient identity.
 *  Run with: node scripts/make_og_image.js   (requires `npm i sharp`)
 *  A dependency-free fallback lives in scripts/make_og_image.py (PIL).
 */
import sharp from "sharp";

const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0d1126"/>
      <stop offset="1" stop-color="#151b38"/>
    </linearGradient>
    <linearGradient id="tile" x1="0" y1="0" x2="300" y2="300" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0d1126"/>
      <stop offset="1" stop-color="#151b38"/>
    </linearGradient>
    <linearGradient id="acc" x1="90" y1="465" x2="390" y2="165" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#3B82F6"/>
      <stop offset="1" stop-color="#7C3AED"/>
    </linearGradient>
    <linearGradient id="acc2" x1="10" y1="54" x2="54" y2="10" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#3B82F6"/>
      <stop offset="1" stop-color="#7C3AED"/>
    </linearGradient>
    <linearGradient id="rule" x1="450" y1="0" x2="1150" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#7C3AED"/>
      <stop offset="1" stop-color="#3B82F6"/>
    </linearGradient>
    <radialGradient id="g1" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(40 40) scale(430)">
      <stop offset="0" stop-color="#7C3AED" stop-opacity="0.32"/>
      <stop offset="1" stop-color="#7C3AED" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g2" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1160 590) scale(430)">
      <stop offset="0" stop-color="#3B82F6" stop-opacity="0.32"/>
      <stop offset="1" stop-color="#3B82F6" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#g1)"/>
  <rect width="1200" height="630" fill="url(#g2)"/>

  <!-- app-icon badge with sliced-S monogram (64-space coords, scaled) -->
  <rect x="90" y="165" width="300" height="300" rx="66" fill="url(#tile)" stroke="url(#acc)" stroke-opacity="0.55" stroke-width="2"/>
  <g transform="translate(90 165) scale(4.7)">
    <path d="M 43 21 A 11 11 0 1 0 32 32 A 11 11 0 1 1 21 43"
          fill="none" stroke="url(#acc2)" stroke-width="7" stroke-linecap="round"/>
    <rect x="16" y="19.7" width="32" height="2.6" fill="url(#tile)"/>
    <rect x="16" y="41.7" width="32" height="2.6" fill="url(#tile)"/>
  </g>

  <!-- wordmark + rule + subtitle -->
  <text x="450" y="355" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-weight="700"
        font-size="150" letter-spacing="24" fill="#F2F4FF">SALIRA</text>
  <rect x="450" y="402" width="700" height="6" fill="url(#rule)"/>
  <text x="450" y="478" font-family="DejaVu Sans, Arial, sans-serif" font-size="28" letter-spacing="3"
        fill="#9AA3C7">AMNEZIAWG &#183; WARP &#183; MTPROTO PROXY</text>
  <text x="1075" y="575" text-anchor="end" font-family="DejaVu Sans Mono, monospace"
        font-size="28" fill="#69749E">salira.example</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile("public/og-image.png");
console.log("public/og-image.png written (1200x630)");
