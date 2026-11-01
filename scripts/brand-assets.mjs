// Generates the favicons, app icons and the default share image from src/_data/brand.js.
// Run after changing the brand colours:  npm run brand-assets
// Fonts: IBM Plex Mono and IBM Plex Sans Arabic (SIL Open Font License, see scripts/fonts/OFL.txt).
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

import brand from "../src/_data/brand.js";

const here = (path) => fileURLToPath(new URL(path, import.meta.url));
const STATIC = here("../src/static/");
const IMAGES = here("../src/assets/images/");

const light = brand.colors.light;
const dark = brand.colors.dark;

const fonts = {
  fontFiles: [
    here("./fonts/IBMPlexMono-Regular.ttf"),
    here("./fonts/IBMPlexMono-SemiBold.ttf"),
    here("./fonts/IBMPlexSansArabic-Regular.ttf"),
    here("./fonts/IBMPlexSansArabic-SemiBold.ttf"),
  ],
  loadSystemFonts: false,
  defaultFontFamily: "IBM Plex Mono",
};

// The mark, drawn on a 32-unit grid: prompt chevron and cursor on an accent tile.
const mark = ({ radius = 8, tile = light.accent, ink = light.accentInk } = {}) => `
  <rect width="32" height="32" rx="${radius}" fill="${tile}"/>
  <path d="M9.5 11l5 5-5 5" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="17" y="19.4" width="6.5" height="2.6" rx="1.3" fill="${ink}"/>`;

const svg = (width, height, content) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${content}</svg>`;

function png(source, width) {
  return new Resvg(source, { fitTo: { mode: "width", value: width }, font: fonts }).render().asPng();
}

// Favicon SVG: switches to the dark-mode accent when the browser UI is dark.
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <style>.tile{fill:${light.accent}}.ink{fill:${light.accentInk};stroke:${light.accentInk}}
  @media (prefers-color-scheme: dark){.tile{fill:${dark.accent}}.ink{fill:${dark.accentInk};stroke:${dark.accentInk}}}</style>
  <rect class="tile" width="32" height="32" rx="8"/>
  <path class="ink" d="M9.5 11l5 5-5 5" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="fill:none"/>
  <rect class="ink" x="17" y="19.4" width="6.5" height="2.6" rx="1.3" style="stroke:none"/>
</svg>
`;
writeFileSync(STATIC + "favicon.svg", faviconSvg);

// Small favicons keep rounded corners; app icons are full-bleed squares (the OS applies its own mask)
// with the mark inset so it survives circular masks.
const roundedMark = svg(32, 32, mark());
const appIcon = svg(32, 32, `<rect width="32" height="32" fill="${light.accent}"/><g transform="translate(4 4) scale(.75)">${mark({ radius: 0 })}</g>`);

const favicon16 = png(roundedMark, 16);
const favicon32 = png(roundedMark, 32);
const favicon48 = png(roundedMark, 48);
writeFileSync(STATIC + "favicon-16x16.png", favicon16);
writeFileSync(STATIC + "favicon-32x32.png", favicon32);
writeFileSync(STATIC + "apple-touch-icon.png", png(appIcon, 180));
writeFileSync(STATIC + "android-chrome-192x192.png", png(appIcon, 192));
writeFileSync(STATIC + "android-chrome-512x512.png", png(appIcon, 512));

// favicon.ico: an ICO container holding PNG images (supported by every current browser).
function ico(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const entry = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((image) => image.data)]);
}
writeFileSync(
  STATIC + "favicon.ico",
  ico([
    { size: 16, data: favicon16 },
    { size: 32, data: favicon32 },
    { size: 48, data: favicon48 },
  ])
);

// Default share image (1200×630): dark terminal look, Arabic and English taglines.
const og = svg(
  1200,
  630,
  `
  <defs>
    <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="1.5" cy="1.5" r="1.5" fill="${dark.lineStrong}"/>
    </pattern>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0.9"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <mask id="fadeMask"><rect width="1200" height="630" fill="url(#fade)"/></mask>
  </defs>
  <rect width="1200" height="630" fill="${dark.bg}"/>
  <rect width="1200" height="630" fill="url(#dots)" mask="url(#fadeMask)"/>

  <g transform="translate(80 76) scale(2)">${mark({ tile: dark.accent, ink: dark.accentInk })}</g>
  <text x="164" y="122" font-family="IBM Plex Mono" font-weight="600" font-size="44" fill="${dark.ink}">sultanops</text>

  <text x="1120" y="292" font-family="IBM Plex Sans Arabic" font-weight="600" font-size="58" fill="${dark.ink}" text-anchor="end" direction="rtl">دروس عملية في السحابة والشبكات</text>
  <text x="1120" y="372" font-family="IBM Plex Sans Arabic" font-weight="600" font-size="58" fill="${dark.ink}" text-anchor="end" direction="rtl">وأمن الخوادم</text>
  <text x="80" y="450" font-family="IBM Plex Mono" font-size="28" fill="${dark.muted}">Hands-on guides to cloud, networking &amp; server security</text>

  <line x1="80" y1="512" x2="1120" y2="512" stroke="${dark.line}" stroke-width="2"/>
  <text x="80" y="562" font-family="IBM Plex Mono" font-weight="600" font-size="28" fill="${dark.accent}">$</text>
  <text x="112" y="562" font-family="IBM Plex Mono" font-size="28" fill="${dark.ink}">blog.sultanops.com</text>
  <rect x="436" y="538" width="15" height="30" fill="${dark.accent}"/>
  <text x="1120" y="562" font-family="IBM Plex Mono" font-size="24" fill="${dark.faint}" text-anchor="end">AR · EN</text>
`
);
writeFileSync(IMAGES + "og-default.png", png(og, 1200));

console.log("Brand assets written to src/static/ and src/assets/images/");
