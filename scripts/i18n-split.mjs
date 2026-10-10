// Splits the English source dictionary into small per-section work files that
// translation agents consume one at a time (en.json is ~2000 lines; a section
// file is a few KB and can be read, translated and written in one step).
//
// Output: i18n-work/en/<section>.json
//   nav.json, common.json, navShort.json   -> {"nav": {...}} etc.
//   seo.json                               -> {"seo": {...}}  (FAQ overrides)
//   seo-base.json                          -> {"seo": {<20 ids>: {title,
//                                              metaDescription, h1, keywords}}}
//                                              extracted from config/navigation.ts,
//                                              the English source of truth for SEO
//   pages.<key>.json                       -> {"pages": {"<key>": {...}}}
//   ui.<key>.json                          -> {"ui": {"<key>": {...}}}
//
// Every file is a valid JSON object with top-level keys drawn from
// {nav, common, navShort, pages, seo, ui}, so the merge script can simply
// deep-merge all of a locale's work files into its dictionary.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { navigationConfig } from '../src/config/navigation.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const i18nDir = join(root, 'src', 'i18n', 'translations');
const outDir = join(root, 'i18n-work', 'en');

const en = JSON.parse(readFileSync(join(i18nDir, 'en.json'), 'utf8'));

// Canonical path -> the `seo` id used in locale dictionaries. Mirrors SEO_KEYS
// in src/i18n/seo.ts (inlined because Node cannot resolve that module's
// extensionless TS imports); update both when adding a page.
const SEO_KEYS = {
  '/': 'index',
  '/oklch-colors': 'palettes',
  '/oklch-color-palette-generator': 'generator',
  '/oklch-converter': 'converterHub',
  '/hex-to-oklch': 'hexToOklch',
  '/oklch-to-hex': 'oklchToHex',
  '/rgb-to-oklch': 'rgbToOklch',
  '/oklch-to-rgb': 'oklchToRgb',
  '/hsl-to-oklch': 'hslToOklch',
  '/oklch-to-hsl': 'oklchToHsl',
  '/ui-preview': 'preview',
  '/export': 'export',
  '/learn/what-is-oklch': 'whatIsOklch',
  '/learn/oklch-css-syntax': 'cssSyntax',
  '/learn/oklch-in-tailwind-css-v4': 'tailwindV4',
  '/learn/oklch-vs-hsl-vs-rgb': 'vsHslRgb',
  '/about': 'about',
  '/contact': 'contact',
  '/privacy': 'privacy',
  '/terms': 'terms',
};

// English base SEO fields for every page (the `seo.<id>` contract in
// i18n/seo.ts). Locale dictionaries override these field-by-field; a locale
// without them serves the English metadata unchanged.
const seoBase = {};
const missingSeoKeys = [];
function collectSeo(items) {
  for (const item of items) {
    const id = SEO_KEYS[item.path];
    if (id) {
      if (!item.seo) {
        missingSeoKeys.push(`${item.path} (no seo block)`);
      } else {
        seoBase[id] = {
          title: item.seo.title,
          metaDescription: item.seo.metaDescription,
          h1: item.seo.h1,
          keywords: item.seo.keywords,
        };
      }
    }
    if (item.children) collectSeo(item.children);
  }
}
collectSeo(navigationConfig);

if (missingSeoKeys.length) {
  console.error('navigation.ts missing seo for:', missingSeoKeys);
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

let count = 0;
function emit(file, obj) {
  writeFileSync(join(outDir, file), JSON.stringify(obj, null, 2) + '\n', 'utf8');
  count++;
}

emit('nav.json', { nav: en.nav });
emit('common.json', { common: en.common });
emit('navShort.json', { navShort: en.navShort });
emit('seo.json', { seo: en.seo });
emit('seo-base.json', { seo: seoBase });
for (const key of Object.keys(en.pages)) emit(`pages.${key}.json`, { pages: { [key]: en.pages[key] } });
for (const key of Object.keys(en.ui)) emit(`ui.${key}.json`, { ui: { [key]: en.ui[key] } });

console.log(`wrote ${count} section files to i18n-work/en/`);
console.log(`seo-base ids: ${Object.keys(seoBase).length}, seo faq ids: ${Object.keys(en.seo).length}`);
