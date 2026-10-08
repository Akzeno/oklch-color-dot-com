#!/usr/bin/env node
/**
 * scripts/seo-check.mjs — the Phase 8 measurement gate.
 *
 * Run: npm run seo:check   (builds dist first, then runs this file)
 * Exits 1 if ANY check fails; prints a per-page table plus failure details.
 *
 * What it enforces (from the SEO spec):
 *   · title present, ≤60 chars (entities decoded before measuring), unique
 *   · meta description present, 70–160 chars (decoded), unique
 *   · exactly one <h1> per page
 *   · canonical present, on-domain, matching the page's own route, unique
 *   · required Open Graph + Twitter tags present; og:image must resolve
 *   · JSON-LD parses, has @context, and carries the required graph types
 *   · every internal href/src resolves to a real file in dist/
 *   · every <img> has an alt attribute
 *   · noindex appears on the 404 page and NOWHERE else
 *   · every indexable page is in sitemap.xml; sitemap has no duplicates;
 *     noindex pages are absent from it
 *   · no orphan pages: every indexable route is linked from another page
 *   · i18n: every indexable page carries hreflang alternates for all locales
 *     (plus x-default → the English version); titles and descriptions are
 *     unique *within* a locale (across locales the same page legitimately
 *     repeats until fully translated); breadcrumb "Home" may be localized
 *
 * Special cases:
 *   · /404 is the only page allowed (and required) to carry noindex.
 *     /500 carries the same noindex — an error page should stay out of the
 *     index. Both are exempt from canonical, sitemap-membership and orphan
 *     checks — utility pages should never be reachable from the site graph.
 *   · External links are not fetched. This gate is deterministic offline.
 *
 * The canonical origin is read from astro.config.mjs, never hard-coded.
 */

import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Config + helpers
// ---------------------------------------------------------------------------

const DIST = 'dist';

const config = fs.readFileSync('astro.config.mjs', 'utf8');
const siteMatch = config.match(/site:\s*['"]([^'"]+)['"]/);
if (!siteMatch) {
  console.error('FATAL: could not read `site` from astro.config.mjs');
  process.exit(1);
}
const ORIGIN = siteMatch[1].replace(/\/$/, '');

/** Entities Google would see decoded. Single pass — no double-decoding. */
const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '\u2013', mdash: '\u2014', hellip: '\u2026',
  lsquo: '\u2018', rsquo: '\u2019', ldquo: '\u201C', rdquo: '\u201D',
  copy: '\u00AE', reg: '\u00AE', trade: '\u2122', deg: '\u00B0',
  plusmn: '\u00B1', laquo: '\u00AB', raquo: '\u00BB',
  bull: '\u2022', middot: '\u00B7', times: '\u00D7', divide: '\u00F7',
  minus: '\u2212', euro: '\u20AC', pound: '\u00A3', yen: '\u00A5',
  sect: '\u00A7', para: '\u00B6', permil: '\u2030',
  le: '\u2264', ge: '\u2265', ne: '\u2260', alpha: '\u03B1',
  larr: '\u2190', rarr: '\u2192', harr: '\u2194',
};

function decodeEntities(text) {
  return text.replace(
    /&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g,
    (whole, entity) => {
      if (entity[0] === '#') {
        const code = entity[1] === 'x' || entity[1] === 'X'
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
      }
      return NAMED_ENTITIES[entity] ?? NAMED_ENTITIES[entity.toLowerCase()] ?? whole;
    }
  );
}

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

/** dist file → canonical route: dist/a/b/index.html → /a/b, dist/404.html → /404 */
function routeFor(file) {
  let rel = file.replace(/\\/g, '/').replace(new RegExp(`^${DIST}/?`), '');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) rel = rel.slice(0, -'/index.html'.length);
  else if (rel.endsWith('.html')) rel = rel.slice(0, -'.html'.length);
  return '/' + rel;
}

/** Does an internal URL path resolve to a real file in dist? */
function resolvesInDist(urlPath) {
  const clean = urlPath.split('#')[0].split('?')[0];
  if (!clean || clean === '/') return fs.existsSync(path.join(DIST, 'index.html'));
  const base = path.join(DIST, clean.replace(/^\//, ''));
  return (
    fs.existsSync(base) && fs.statSync(base).isFile() ||
    fs.existsSync(base + '.html') ||
    fs.existsSync(path.join(base, 'index.html'))
  );
}

// ---------------------------------------------------------------------------
// i18n helpers
// ---------------------------------------------------------------------------

/** URL prefixes of every non-default locale (lowercase, no slash). */
const LOCALE_PREFIXES = ['hi', 'pt', 'zh-cn', 'zh-hk', 'es', 'fr', 'de'];
const HREFLANG_CODES = ['en-US', 'hi-IN', 'pt-BR', 'zh-CN', 'zh-HK', 'es-ES', 'fr-FR', 'de-DE'];

/** Route → locale code: /de/hex-to-oklch → 'de', /hex-to-oklch → 'en'. */
function localeForRoute(route) {
  const seg = route.split('/')[1]?.toLowerCase() ?? '';
  return LOCALE_PREFIXES.includes(seg) ? seg : 'en';
}

/** Localized "Home" breadcrumb labels, read from the translation files. */
const HOME_LABELS = new Set(['Home']);
try {
  const dir = 'src/i18n/translations';
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json') || f === 'en.json') continue;
    const dict = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (dict?.common?.home) HOME_LABELS.add(dict.common.home);
  }
} catch (e) {
  console.error(`WARN: could not read translation files for Home labels: ${e.message}`);
}

// ---------------------------------------------------------------------------
// Parse every built page
// ---------------------------------------------------------------------------

if (!fs.existsSync(DIST)) {
  console.error('FATAL: dist/ not found — run `npm run build` first.');
  process.exit(1);
}

const pages = walk(DIST)
  .filter((f) => f.endsWith('.html'))
  .map((file) => {
    const html = fs.readFileSync(file, 'utf8');
    const route = routeFor(file);

    const titleRaw = (html.match(/<title>([^<]*)<\/title>/) || [])[1] ?? '';
    const descTag = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] ?? '';
    const canonical = (html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1] ?? '';
    const robotsTag = (html.match(/<meta name="robots" content="([^"]*)"/) || [])[1] ?? '';

    const og = {};
    for (const m of html.matchAll(/<meta property="(og:[a-z:_]+)" content="([^"]*)"/g)) {
      og[m[1]] = decodeEntities(m[2]);
    }
    const tw = {};
    for (const m of html.matchAll(/<meta property="twitter:([a-z:_]+)" content="([^"]*)"/g)) {
      tw[m[1]] = decodeEntities(m[2]);
    }

    const jsonLdBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map((m) => m[1]);

    // Every internal reference we can resolve offline.
    const refs = [];
    for (const m of html.matchAll(/<a\s[^>]*href="([^"]*)"/g)) refs.push(m[1]);
    for (const m of html.matchAll(/<img\s[^>]*src="([^"]*)"/g)) refs.push(m[1]);
    for (const m of html.matchAll(/<script\s[^>]*src="([^"]*)"/g)) refs.push(m[1]);
    for (const m of html.matchAll(/<link\s[^>]*href="([^"]*)"/g)) refs.push(m[1]);
    if (og['og:image']) refs.push(og['og:image']);
    if (tw['image']) refs.push(tw['image']);

    const imgs = [...html.matchAll(/<img[^>]*>/g)].map((m) => m[0]);

    const hreflangs = {};
    for (const m of html.matchAll(/<link rel="alternate" hreflang="([^"]*)" href="([^"]*)"/g)) {
      hreflangs[m[1]] = m[2];
    }

    return {
      file,
      route,
      locale: localeForRoute(route),
      title: decodeEntities(titleRaw),
      description: decodeEntities(descTag),
      h1Count: (html.match(/<h1[\s>]/g) || []).length,
      canonical,
      noindex: /noindex/i.test(robotsTag),
      og,
      tw,
      jsonLdBlocks,
      refs,
      imgs,
      hreflangs,
      issues: [],
    };
  });

const isUtility = (p) => p.route === '/404' || p.route === '/500';

// ---------------------------------------------------------------------------
// Per-page checks
// ---------------------------------------------------------------------------

// -- title -----------------------------------------------------------------
// Unique within a locale: /de/hex-to-oklch and /hex-to-oklch legitimately
// share a title until the German override lands (both serve the same page).
const titleSeen = new Map();
for (const p of pages) {
  if (!p.title) p.issues.push('missing <title>');
  else if (p.title.length > 60) p.issues.push(`title ${p.title.length} chars >60`);
  else if (p.title.length < 10) p.issues.push(`title only ${p.title.length} chars`);
  if (p.title) {
    const key = `${p.locale}|${p.title}`;
    const prev = titleSeen.get(key);
    if (prev) p.issues.push(`duplicate title with ${prev}`);
    else titleSeen.set(key, p.route);
  }
}

// -- description -----------------------------------------------------------
const descSeen = new Map();
for (const p of pages) {
  if (!p.description) p.issues.push('missing meta description');
  else if (p.description.length < 70 || p.description.length > 160) {
    p.issues.push(`description ${p.description.length} chars outside 70–160`);
  }
  if (p.description) {
    const key = `${p.locale}|${p.description}`;
    const prev = descSeen.get(key);
    if (prev) p.issues.push(`duplicate description with ${prev}`);
    else descSeen.set(key, p.route);
  }
}

// -- H1 --------------------------------------------------------------------
for (const p of pages) {
  if (p.h1Count !== 1) p.issues.push(`${p.h1Count} <h1> tags (need exactly 1)`);
}

// -- noindex policy --------------------------------------------------------
for (const p of pages) {
  if (isUtility(p) && !p.noindex) p.issues.push('utility page must carry noindex');
  if (!isUtility(p) && p.noindex) p.issues.push('stray noindex on indexable page');
}

// -- canonical (skipped for noindex pages) ---------------------------------
const canonicalSeen = new Map();
for (const p of pages) {
  if (p.noindex) continue;
  const expected = ORIGIN + (p.route === '/' ? '/' : p.route);
  if (!p.canonical) {
    p.issues.push('missing canonical');
  } else if (!p.canonical.startsWith(ORIGIN + '/') && p.canonical !== ORIGIN) {
    p.issues.push(`canonical off-domain: ${p.canonical}`);
  } else if (p.canonical !== expected) {
    p.issues.push(`canonical mismatch: ${p.canonical} != ${expected}`);
  } else {
    const prev = canonicalSeen.get(p.canonical);
    if (prev) p.issues.push(`duplicate canonical with ${prev}`);
    else canonicalSeen.set(p.canonical, p.route);
  }
}

// -- hreflang alternates (i18n) --------------------------------------------
const CODE_PREFIX = {
  'en-US': '', 'hi-IN': '/hi', 'pt-BR': '/pt', 'zh-CN': '/zh-cn',
  'zh-HK': '/zh-hk', 'es-ES': '/es', 'fr-FR': '/fr', 'de-DE': '/de',
};
function stripLocaleRoute(route) {
  const seg = route.split('/')[1]?.toLowerCase() ?? '';
  if (!LOCALE_PREFIXES.includes(seg)) return route;
  return route.slice(seg.length + 1) || '/';
}
function expectedLocalizedRoute(baseRoute, prefix) {
  if (!prefix) return baseRoute === '/' ? '/' : baseRoute;
  return baseRoute === '/' ? prefix : prefix + baseRoute;
}
for (const p of pages) {
  if (p.noindex) continue;
  const baseRoute = stripLocaleRoute(p.route);
  for (const code of HREFLANG_CODES) {
    const actual = p.hreflangs[code];
    if (!actual) {
      p.issues.push(`missing hreflang ${code}`);
      continue;
    }
    const expected = ORIGIN + expectedLocalizedRoute(baseRoute, CODE_PREFIX[code]);
    if (actual !== expected) p.issues.push(`hreflang ${code} mismatch: ${actual} != ${expected}`);
  }
  if (!p.hreflangs['x-default']) {
    p.issues.push('missing hreflang x-default');
  } else {
    const expected = ORIGIN + (baseRoute === '/' ? '/' : baseRoute);
    if (p.hreflangs['x-default'] !== expected) {
      p.issues.push(`hreflang x-default mismatch: ${p.hreflangs['x-default']} != ${expected}`);
    }
  }
}

// -- Open Graph + Twitter --------------------------------------------------
const OG_REQUIRED = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type', 'og:site_name'];
const TW_REQUIRED = ['card', 'title', 'description', 'image'];
for (const p of pages) {
  for (const key of OG_REQUIRED) {
    if (!p.og[key]) p.issues.push(`missing ${key}`);
  }
  for (const key of TW_REQUIRED) {
    if (!p.tw[key]) p.issues.push(`missing twitter:${key}`);
  }
}

// -- JSON-LD ---------------------------------------------------------------
for (const p of pages) {
  if (p.noindex) {
    // The 404 emits none by design; if one appears it must still parse.
    for (const block of p.jsonLdBlocks) {
      try { JSON.parse(block); } catch (e) { p.issues.push(`unparseable JSON-LD: ${e.message}`); }
    }
    continue;
  }

  if (p.jsonLdBlocks.length !== 1) {
    p.issues.push(`${p.jsonLdBlocks.length} JSON-LD blocks (need exactly 1)`);
    continue;
  }

  let data;
  try {
    data = JSON.parse(p.jsonLdBlocks[0]);
  } catch (e) {
    p.issues.push(`JSON-LD parse error: ${e.message}`);
    continue;
  }

  if (data['@context'] !== 'https://schema.org') p.issues.push('JSON-LD missing @context');
  const graph = Array.isArray(data['@graph']) ? data['@graph'] : null;
  if (!graph) {
    p.issues.push('JSON-LD has no @graph array');
    continue;
  }

  const types = graph.map((n) => n && n['@type']).filter(Boolean);
  for (const required of ['Organization', 'WebSite']) {
    if (!types.includes(required)) p.issues.push(`JSON-LD graph missing ${required}`);
  }

  const pageTypes = types.filter((t) => ['WebApplication', 'CollectionPage', 'Article'].includes(t));
  if (pageTypes.length !== 1) {
    p.issues.push(`JSON-LD page type count ${pageTypes.length} (need exactly 1)`);
  }

  const article = graph.find((n) => n['@type'] === 'Article');
  if (article && (!article.datePublished || !article.dateModified)) {
    p.issues.push('Article JSON-LD missing datePublished/dateModified');
  }

  const crumb = graph.find((n) => n['@type'] === 'BreadcrumbList');
  if (p.route === '/' && crumb) p.issues.push('home page should not emit BreadcrumbList');
  if (p.route !== '/' && !crumb) p.issues.push('missing BreadcrumbList JSON-LD');
  if (crumb) {
    const items = crumb.itemListElement || [];
    const positions = items.map((i) => i.position);
    const okSeq = positions.every((v, i) => v === i + 1);
    if (items.length === 0 || !okSeq) p.issues.push('BreadcrumbList positions not 1..n');
    else if (!HOME_LABELS.has(items[0].name)) p.issues.push(`BreadcrumbList must start with Home (localized ok: got "${items[0].name}")`);
  }
}

// -- internal references resolve -------------------------------------------
for (const p of pages) {
  for (const ref of p.refs) {
    let target = null;
    if (ref.startsWith('/')) target = ref;
    else if (ref.startsWith(ORIGIN)) target = ref.slice(ORIGIN.length) || '/';
    // External, mailto:, #frag-only and empty hrefs are out of scope.
    if (target === null || ref.startsWith('#') || ref.startsWith('mailto:')) continue;
    if (!resolvesInDist(target)) p.issues.push(`broken internal link: ${ref}`);
  }
}

// -- img alt ---------------------------------------------------------------
for (const p of pages) {
  for (const img of p.imgs) {
    if (!/\salt="/.test(img)) p.issues.push(`img missing alt: ${img.slice(0, 70)}…`);
  }
}

// ---------------------------------------------------------------------------
// Site-wide checks: sitemap + orphans
// ---------------------------------------------------------------------------

const globalIssues = [];

const sitemapPath = path.join(DIST, 'sitemap.xml');
let sitemapUrls = [];
if (!fs.existsSync(sitemapPath)) {
  globalIssues.push('dist/sitemap.xml does not exist');
} else {
  const sm = fs.readFileSync(sitemapPath, 'utf8');
  sitemapUrls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const seenLoc = new Set();
  for (const loc of sitemapUrls) {
    if (seenLoc.has(loc)) globalIssues.push(`sitemap duplicate entry: ${loc}`);
    seenLoc.add(loc);
  }
}
const sitemapSet = new Set(sitemapUrls);

for (const p of pages) {
  if (p.noindex) {
    if (sitemapSet.has(p.canonical)) p.issues.push('noindex page listed in sitemap');
    continue;
  }
  const expected = ORIGIN + (p.route === '/' ? '/' : p.route);
  if (!sitemapSet.has(expected)) p.issues.push('missing from sitemap.xml');
}

// Orphans: an indexable page must be linked from at least one OTHER page.
const inbound = new Map(); // route → Set(source routes)
for (const p of pages) {
  for (const ref of p.refs) {
    if (!ref.startsWith('/') && !ref.startsWith(ORIGIN)) continue;
    const target = ref.startsWith('/') ? ref : ref.slice(ORIGIN.length) || '/';
    const clean = target.split('#')[0].split('?')[0];
    // Map the URL back to a built route (/, /foo, /foo/index.html all → /foo)
    let route = clean;
    if (route.endsWith('/index.html')) route = route.slice(0, -'/index.html'.length);
    if (route.endsWith('.html')) route = route.slice(0, -'.html'.length);
    if (route.length > 1 && route.endsWith('/')) route = route.slice(0, -1);
    if (route === '') route = '/';
    if (!inbound.has(route)) inbound.set(route, new Set());
    inbound.get(route).add(p.route);
  }
}

for (const p of pages) {
  if (p.noindex) continue; // utility pages are legitimately unreachable
  const sources = inbound.get(p.route);
  const others = sources ? [...sources].filter((s) => s !== p.route) : [];
  if (others.length === 0) p.issues.push('orphan page (nothing points to it)');
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const pad = (s, n) => String(s).padEnd(n).slice(0, n);
const padStart = (s, n) => String(s).padStart(n);

const header = [
  pad('PAGE', 34), padStart('TTL', 4), padStart('DSC', 4), padStart('H1', 3),
  padStart('CAN', 4), padStart('HFL', 4), padStart('OG', 3), padStart('TW', 3), padStart('LD', 3),
  padStart('LNK', 4), padStart('ALT', 4), padStart('ROB', 4), padStart('SMP', 4),
  padStart('ORP', 4), '  RESULT',
].join(' ');

console.log(header);
console.log('-'.repeat(header.length));

let failures = 0;
for (const p of pages) {
  const has = (needle) => (issue) => issue.includes(needle);

  // Columns show ok / fail based on whether any issue touches that area.
  const col = (pred) => (p.issues.some(pred) ? ' !' : 'ok');

  const line = [
    pad(p.route, 34),
    padStart(p.title.length, 4),
    padStart(p.description.length || '-', 4),
    padStart(p.h1Count, 3),
    col(has('canonical')),
    col(has('hreflang')),
    col(has('og:')),
    col(has('twitter')),
    col(has('JSON-LD') || has('json-ld') || has('Breadcrumb') || has('Article')),
    col(has('link')),
    col(has('alt')),
    col(has('noindex')),
    col(has('sitemap')),
    col(has('orphan')),
    '  ' + (p.issues.length ? `FAIL (${p.issues.length})` : 'PASS'),
  ].join(' ');

  console.log(line);
  if (p.issues.length) failures++;
}

console.log('');

const detail = [];
for (const p of pages) {
  for (const issue of p.issues) detail.push(`  ${p.route}: ${issue}`);
}
for (const g of globalIssues) detail.push(`  <site>: ${g}`);

if (detail.length) {
  console.log('FAILURES:');
  for (const d of detail) console.log(d);
  console.log('');
}

console.log(
  `${pages.length} pages checked · ${failures} page(s) failing · ` +
  `${globalIssues.length} site-wide issue(s) · sitemap has ${sitemapUrls.length} URLs`
);

if (detail.length) {
  console.log('SEO CHECK FAILED');
  process.exit(1);
}
console.log('SEO CHECK PASSED');
