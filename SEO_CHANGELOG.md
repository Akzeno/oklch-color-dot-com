# SEO Changelog — oklchcolor.com

> **Date:** 2026-10-07
> **Scope:** Full technical-SEO overhaul, Phases 0–8
> **Canonical domain:** `https://oklchcolor.com` (from `site` in `astro.config.mjs`)
> **Gate:** `npm run seo:check` — builds the site and fails (exit 1) on any regression

---

## Results at a glance

Baseline = commit `41cc230` (the state before Phase 0, audited in `SEO_AUDIT.md`).

| Metric | Before | After |
|--------|--------|-------|
| Pages built | 28 | 33 |
| Sitemap URLs | 29 (incl. duplicate `/hex-to-oklch`) | 32, de-duplicated, git-derived `lastmod` |
| Titles >60 chars | 4 (61–67 chars) | 0 (gate enforces 10–60) |
| Meta descriptions outside 70–160 | 17 (learn 162; 16 palettes 165–171) | 0 |
| Near-duplicate descriptions | all 16 palette pages (one template) | 0 (data-derived per palette) |
| Thin converter pages (<400 words) | 4 (306–336 words) | 0 (821–962 words) |
| Pages missing `og:image` / `twitter:image` | 28 of 28 | 0 |
| Pages with full JSON-LD `@graph` | basic app/Article nodes only | 32 (Organization, WebSite, page node, BreadcrumbList) |
| FAQPage JSON-LD | 0 | 6 (all converters) |
| Visible FAQ on converters | 2 of 6 | 6 of 6 |
| BreadcrumbList schema | 0 | 32 |
| Server-rendered footer with full nav | home only, 4 links | sitewide |
| `/oklch-converter` hub page | missing | present (CollectionPage) |
| Learn guides | 1 | 4 |
| 404 page | Astro default, indexable | custom, `noindex` |
| `*.pages.dev` `X-Robots-Tag: noindex` | missing | present (`public/_headers`) |
| `/hex-to-oklch-converter` redirect | meta-refresh | real 301 (`public/_redirects`) |
| `changefreq`/`priority` in sitemap | present (Google ignores) | removed |

---

## Lighthouse before/after (measured)

**Methodology**

- Tool: Lighthouse 13.5.0 CLI (`npx lighthouse`), headless Chrome, default mobile emulation with simulated throttling.
- Server: `npx astro preview` serving the **built** `dist/`. Pitfall confirmed during measurement: if a stray `astro dev` owns the port, Lighthouse scores the dev server instead (dev module URLs appear as failed requests and tank performance — this produced a spurious perf 55 / LCP 41 s run during this audit). Always confirm the port serves `dist/` before trusting numbers.
- **Before:** clean worktree checked out to `41cc230` (parent of Phase 0's `f075803`), `npm install`, `npm run build`.
- **After:** `HEAD` (post Phase 8), same build/serve path.
- Pages: `/` and `/hex-to-oklch`, two runs each; results below were stable across runs.

| Page | Category | Before | After |
|------|----------|--------|-------|
| `/` | Performance | 92 | 92 |
| `/` | SEO | 100 | 100 |
| `/` | Accessibility | 92 | 92 |
| `/` | Best Practices | 100 | 100 |
| `/` | LCP | 2,727 ms | 2,736 ms |
| `/` | CLS | 0.000 | 0.000 |
| `/` | TBT | 0 ms | 0 ms |
| `/hex-to-oklch` | Performance | 92 | 92 |
| `/hex-to-oklch` | SEO | 100 | 100 |
| `/hex-to-oklch` | Accessibility | 95 | 95 |
| `/hex-to-oklch` | Best Practices | 100 | 100 |
| `/hex-to-oklch` | LCP | 2,699 ms | 2,678 ms |
| `/hex-to-oklch` | CLS | 0.000 | 0.000 |

**Reading these numbers honestly**

- **No regressions:** every category and Core Web Vital is flat before → after, despite adding ~5 pages, a sitewide footer, JSON-LD, and OG metadata.
- **Lighthouse SEO was already 100 before this work** — its SEO category only checks presence-level items (title exists, meta description exists, page is crawlable, link text, image alt). It does *not* check title length, description length range, duplicate titles/descriptions, OG images, sitemap hygiene, or JSON-LD — which is exactly where `SEO_AUDIT.md` found the real damage. Flat Lighthouse scores are therefore the expected outcome; the enforcement tool for those checks is `npm run seo:check`, not Lighthouse.
- **Accessibility failures are identical before and after**, all inside pre-change islands that this project treats as change-frozen:
  - `/`: `color-contrast`, `target-size` (ColorPickerIsland's alpha slider, 346×20 px).
  - `/hex-to-oklch`: `aria-required-children` (ConverterIsland `role="tablist"` with `<button>` children).
  See TODO(owner) below — these are pre-existing and out of scope for SEO.

**Reproduce:** `npm run build && npx astro preview` → `npx lighthouse http://localhost:<port>/ --only-categories=performance,seo,accessibility,best-practices`.

---

## Page weight (measured, Phase 6)

| Asset | Raw | Gzip |
|-------|-----|------|
| `/` HTML | 53,390 B | 12,721 B |
| `/hex-to-oklch` HTML | 55,083 B | 13,141 B |
| Palette detail HTML | 75,089 B | 13,387 B |
| `/learn/what-is-oklch` HTML | 54,846 B | 14,121 B |
| `/ui-preview` HTML (largest) | 156,499 B | 18,082 B |
| Compiled CSS | 66,621 B | 12,799 B |
| Converter island JS | 5,636 B | 2,089 B |
| All island JS on converter page | 25,404 B | — |

- No `<img>` elements anywhere; OG images are link-meta only (never loaded by the renderer).
- Only render-blocking request: Google Fonts stylesheet (`display=swap`).
- Cache fix (Phase 6): `public/_headers` had a **dead `/assets/*` rule** — Astro emits `/_astro/*`, so no asset was cacheable. Corrected to `/_astro/*  cache-control: public, max-age=31536000, immutable` plus `/apple-touch-icon.png`.
- Note: Cloudflare Pages applies `_headers` — verify in a deployed response header once live.

---

## What changed, by phase

One commit per phase; `npm run build` passed before each.

| Phase | Commit | Changes |
|-------|--------|---------|
| 0 — Audit | `f075803` | `SEO_AUDIT.md` (C1–C4, H1–H15, M1–M8, L1–L6); `scripts/audit-scan.mjs`; `scripts/compute-palette-seo.mjs`. C1 (nav not SSR'd) later re-verified as a **false positive**: all 12 nav anchors are present in raw HTML. |
| 1 — Titles/meta | `395dea2` | All titles ≤60 chars, unique H1s, descriptions into 70–160, data-derived unique palette descriptions. All metadata centralized in `src/config/navigation.ts`. |
| 2 — Content | `a514ae7` | 6 converter pages rewritten 821–962 words (was 306–336) with CSS snippets, gamut notes, FAQ; pillar `learn/what-is-oklch` 1,459 words (was 423); `/ui-preview` + `/export` thin-state fixed; `RelatedTools.astro`; varied per-palette `seoTables.ts`. |
| 3 — Crawling | `0a90e44` | Build-time OG images via sharp (`src/pages/og/[slug].png.ts`, 1200×630, 33 PNGs); BaseLayout `og:*`/`twitter:*` + `noindex` support; custom `404.astro` with `noindex`; dynamic `robots.txt` + `sitemap.xml` derived from `Astro.site` with git `lastmod`, `changefreq`/`priority` removed; real 301 in `public/_redirects`; `X-Robots-Tag: noindex` for `*.pages.dev`; `apple-touch-icon`. |
| 4 — Structured data | `3fad2ef` | `src/utils/schema.ts` emits one JSON-LD `@graph` (Organization, WebSite, page node, BreadcrumbList) on indexable pages; Article schema with `datePublished`/`dateModified` on learn pages; `og:type=article` for learn; FAQPage supported via the `faqs` field; no JSON-LD on noindex pages. |
| 5 — Internal linking | `d703508` | `/oklch-converter` hub (CollectionPage, FAQ, 6 direction cards, build-time 4-notation table); SSR `Footer.astro` sitewide; converters parent path → `/oklch-converter` (fixes sitemap duplicate + mobile "Convert" tab); `getAllNavItemsFlat()` dedup. |
| 6 — Performance | `7edd8da` | Fixed dead `/assets/*` cache rule → `/_astro/*` immutable; apple-touch-icon cache; page-weight audit (above). |
| 7 — New content | `47f5962` | 3 learn guides: `oklch-css-syntax` (~1,533 words), `oklch-in-tailwind-css-v4` (~1,044, build-time hex→oklch table), `oklch-vs-hsl-vs-rgb` (~1,203, build-time ramps); nav entries; `BarChart3` icon added to nav islands (import-only); RelatedTools sibling cross-links. |
| 8 — Gate | `c4e4bb4` | `scripts/seo-check.mjs` + `npm run seo:check`. |
| 8b — FAQPage | `cc96acb` | FAQPage JSON-LD on all 6 converters; `faqs` data in `navigation.ts` mirrors each page's visible FAQ verbatim. |

External facts used in content are sourced and dated in `SEO_AUDIT.md §8` (MDN Baseline May 2023 for `oklch()`; Tailwind v4.0 released January 22, 2025 with OKLCH default palette; Google dropped FAQ rich results May 2026).

---

## Verification

- **`npm run seo:check`** — 33 pages checked, **0 failing**, sitemap has 32 URLs. Checks per page: title length 10–60, description 70–160, uniqueness of both, exactly one H1, canonical present and correct, OG + Twitter tags, JSON-LD parses with required `@graph` shape (Organization, WebSite, one page type, BreadcrumbList starting at "Home"; Article dates; FAQPage when populated), internal links resolve to files, image `alt` attributes, no stray `noindex` (allowed only on `/404`), sitemap membership with no duplicates, and orphan detection via the sitewide footer.
- **Negative self-test:** a deliberately broken fixture page injected into `dist/` produced 18 issues across every category and exit code 1; after removal the gate passed again (exit 0).
- **`npm test`** — 14 suites; the same 3 failures (`token-drawer`, `solid-swatches`, `form-field-labels`) existed **before Phase 0** and the failure set is byte-identical at every phase gate.
- HTML entities are decoded before measurement; the checker derives the canonical domain from `astro.config.mjs` `site` (never hard-coded).

---

## Known issues / out of scope (intentionally not done)

- Pre-existing test failures: `token-drawer`, `solid-swatches`, `form-field-labels` (unrelated to SEO, present at baseline).
- Island a11y findings (alpha slider `target-size`, tablist `aria-required-children`, `color-contrast`) — islands are change-frozen by project rules; only icon imports were permitted.
- `FAQPage` rich results: Google stopped showing them in May 2026; schema is emitted for converters anyway because the visible FAQ sections are the real user-facing value and the field is trivial to keep in sync.
- Skipped per corrections: preconnect to own origin, meta keywords, per-page robots, PWA/hreflang/i18n, `changefreq`/`priority`.

---

## TODO (owner) — manual tasks not executed here

1. **Confirm the brand name.** "OKLCH Colors" is used as site name (`og:site_name` in `BaseLayout.astro`, `Organization` name in `schema.ts`, title suffix in `navigation.ts`). If a real brand exists, replace in those three places.
2. **Domain hygiene.** The workspace folder is `oklchcolor2.com` while the canonical domain is `oklchcolor.com`. Confirm which domain actually serves the deployed site; if `oklchcolor2.com` also serves content, create a **301 redirect to `oklchcolor.com` in the Cloudflare dashboard** (and/or align `site` in `astro.config.mjs` with reality).
3. **Search Console:** add the property, submit `https://oklchcolor.com/sitemap.xml`, monitor Coverage and Core Web Vitals.
4. **Promotion / backlinks (genuine efforts only — no bought or fabricated links):** post the tools to Hacker News (Show HN), r/webdev / r/css, submit to curated "awesome" lists, and answer relevant Stack Overflow questions where a link is genuinely useful.
5. **Optional a11y follow-ups** (would require touching frozen islands): slider `target-size`, `role="tab"` children in ConverterIsland tablist, contrast tuning.
6. **Verify `_headers` behavior on the live deployment** (Cloudflare Pages applies it; local preview does not).

---

## Measurement checklist (Phase 8)

**Every deploy / PR**

- [ ] `npm run seo:check` passes (exit 0). It rebuilds first, so a stale `dist/` cannot mask regressions.
- [ ] `npm test` — only the 3 known pre-existing failures.
- [ ] If a visible FAQ section changed, update the matching `faqs` array in `src/config/navigation.ts` (they must stay verbatim).

**Week 1 after deploy**

- [ ] Sitemap submitted in Search Console; expect 32 URLs.
- [ ] Coverage: no unexpected "Discovered – currently not indexed" backlog; `/404` not indexed; `oklchcolor2.com` (if live) 301s to `oklchcolor.com`.
- [ ] Rich Results Test on one converter: FAQPage + BreadcrumbList + WebApplication detected.
- [ ] URL Inspection on `/`, one converter, one learn page: canonical = `https://oklchcolor.com/...`, indexable.

**Weeks 2–4**

- [ ] Impressions/clicks for head terms: `oklch converter`, `hex to oklch`, `css oklch`, `oklch vs hsl`, `tailwind oklch`.
- [ ] Field Core Web Vitals in Search Console (target LCP < 2.5 s; local Lighthouse proxy was ~2.7 s before and after the work).

**Monthly**

- [ ] Re-run `npm run seo:check`.
- [ ] Spot-check server logs / Search Console for new 404s.
- [ ] Re-run Lighthouse (procedure above) after any significant UI change; compare against the before/after table in this file.
