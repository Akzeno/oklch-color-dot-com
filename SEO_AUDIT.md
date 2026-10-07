# SEO Audit — oklchcolor.com

> **Date:** 2026-10-07
> **Auditor:** Automated + manual review of `dist/**/*.html` (built 2026-10-07)
> **Scope:** All 28 built pages (12 static + 16 palette detail + sitemap)

---

## 1. Domain Resolution

| Item | Value |
|------|-------|
| `astro.config.mjs` `site` | `https://oklchcolor.com` |
| Folder name | `oklchcolor2.com` |
| SEO_PLAN.md states | `https://oklchcolor.com` |
| Canonical URLs in built HTML | `https://oklchcolor.com/...` |
| Sitemap URLs | `https://oklchcolor.com/...` |
| robots.txt Sitemap line | `https://oklchcolor.com/sitemap.xml` |

**Finding:** The canonical domain is `oklchcolor.com` everywhere in code. The folder name `oklchcolor2.com` is misleading but does not affect SEO as long as the site is served from `oklchcolor.com`. If `oklchcolor2.com` also serves content, it must 301 to `oklchcolor.com`. **TODO(owner):** Confirm which domain is actually deployed and whether the other redirects.

---

## 2. Page-by-Page Audit Summary

| Page | Title (len) | Desc (len) | H1 | Canonical | OG Image | Twitter Image | JSON-LD | Words | Issues |
|------|-------------|------------|-----|-----------|----------|---------------|---------|-------|--------|
| `/` | OKLCH Color Picker & Converter \| Real-time P3 & sRGB Gamut (66) | 155 | 1 | OK | MISSING | MISSING | WebApplication | 629 | Title too long |
| `/hex-to-oklch` | HEX to OKLCH Color Converter \| Accurate P3 & sRGB (53) | 131 | 1 | OK | MISSING | MISSING | WebApplication | 647 | — |
| `/oklch-to-hex` | OKLCH to HEX Converter \| Precise Gamut-Aware Conversion (55) | 121 | 1 | OK | MISSING | MISSING | WebApplication | 537 | — |
| `/rgb-to-oklch` | RGB to OKLCH Converter \| Perceptual Color Space Conversion (58) | 104 | 1 | OK | MISSING | MISSING | WebApplication | 318 | Thin content |
| `/oklch-to-rgb` | OKLCH to RGB Converter \| Gamut-Accurate Conversion (50) | 107 | 1 | OK | MISSING | MISSING | WebApplication | 306 | Thin content |
| `/hsl-to-oklch` | HSL to OKLCH Converter \| Fix Distorted Lightness (48) | 126 | 1 | OK | MISSING | MISSING | WebApplication | 336 | Thin content |
| `/oklch-to-hsl` | OKLCH to HSL Converter \| Backward-compatible Colors (51) | 106 | 1 | OK | MISSING | MISSING | WebApplication | 318 | Thin content |
| `/oklch-colors` | OKLCH Color Palettes \| Curated Design Token Scales (50) | 154 | 1 | OK | MISSING | MISSING | CollectionPage | 349 | — |
| `/oklch-color-palette-generator` | OKLCH Color Palette Generator \| 50-950 Scales & Harmonies (61) | 146 | 1 | OK | MISSING | MISSING | WebApplication | 932 | Title too long |
| `/ui-preview` | UI Component Preview & WCAG / APCA Contrast Matrix (54) | 142 | 1 | OK | MISSING | MISSING | WebApplication | 573 | — |
| `/export` | Export OKLCH Design Tokens \| Tailwind v4 @theme & CSS Variables (67) | 141 | 1 | OK | MISSING | MISSING | WebApplication | 243 | Title too long, thin |
| `/learn/what-is-oklch` | What is OKLCH? \| The Definitive Guide to Perceptual CSS Colors (62) | 162 | 1 | OK | MISSING | MISSING | Article | 423 | Title/desc too long |
| `/oklch-colors/[slug]` ×16 | "{Name} OKLCH Palette \| 50–950 Color Scale" (44-50) | 165-171 | 1 | OK | MISSING | MISSING | CollectionPage | ~397 | Desc too long, near-duplicate |

---

## 3. Ranked Issue List

### CRITICAL — Blocks crawling or indexing

| # | Issue | Evidence | Fix |
|---|-------|----------|-----|
| C1 | **Primary navigation not in raw HTML.** `SidebarIsland` and `MobileTabBar` are `client:load` Preact islands. Crawlers that don't execute JS see zero nav links — only the content-section links at the bottom of each page. | `AppLayout.astro` lines 33, 54: `<SidebarIsland client:load>`, `<MobileTabBar client:load>`. Raw HTML of every page contains only content-section `<a href>` links. | Server-render the nav as real `<a href>` in an Astro component. Keep Preact islands only for interactivity (collapse toggle, sheet open/close). |
| C2 | **No custom 404 page.** Astro serves a default 404 with no internal links, no branding, no navigation. | No `src/pages/404.astro` exists. | Create `src/pages/404.astro` with real 404 status, noindex, links to main tools. |
| C3 | **Sitemap has duplicate `/hex-to-oklch` entry.** The parent "Converters" nav item has `path: '/hex-to-oklch'` AND the child `hex-to-oklch` also has `path: '/hex-to-oklch'`. `getAllNavItemsFlat()` returns both. | `dist/sitemap.xml` lines 10-17: two identical `<loc>https://oklchcolor.com/hex-to-oklch</loc>` entries. | Change parent path to `/oklch-converter` (the new hub) or exclude parent from sitemap. |
| C4 | **Sitemap hard-codes `siteUrl`.** Should derive from `Astro.site` to avoid drift. | `sitemap.xml.ts` line 6: `const siteUrl = 'https://oklchcolor.com'` | Use `Astro.site` or import from a shared config. |

### HIGH — Significantly impacts rankings

| # | Issue | Evidence | Fix |
|---|-------|----------|-----|
| H1 | **No `og:image` or `twitter:image` on any page.** Social shares have no preview image. | All 28 pages: `ogImage: ""`, `twitterImage: ""`. | Generate OG images at build time (satori + resvg endpoint) or create static branded PNGs per page type. |
| H2 | **No `og:site_name`, `og:locale`, `theme-color`, `apple-touch-icon`.** | All pages: empty. | Add to BaseLayout. |
| H3 | **Titles too long on 4 pages.** Home (66), Export (67), Learn (62), Generator (61). Google truncates at ~60 chars. | See table above. | Rewrite to ≤60 chars per Phase 1 spec. |
| H4 | **Meta descriptions too long on learn (162) and all 16 palette pages (165-171).** Google truncates at ~160. | See table above. | Rewrite to ≤160 chars. |
| H5 | **Palette detail descriptions are near-duplicates.** All 16 use the same template: "Explore the {name} OKLCH color palette with 11 perceptually uniform shade steps (50 to 950). Copy individual CSS values or add swatches to your design token cart." | `dist/oklch-colors/*/index.html` — descriptions differ only in palette name. | Generate unique descriptions per palette from data (hue range, WCAG results, character). |
| H6 | **No server-rendered footer.** The footer is inside `AppLayout` but only has a simple copyright line on the home page. No comprehensive tool listing. | `index.astro` lines 173-181: only 4 links in a "footer strip". Other pages have 2-4 links. | Create a server-rendered `Footer.astro` with all tools, learn guides, and palette library. |
| H7 | **No RelatedTools component.** Converter pages have only 2-4 hand-written internal links at the bottom. | See converter page source files. | Create `src/components/common/RelatedTools.astro`, data-driven from `navigation.ts`. |
| H8 | **No `/oklch-converter` hub page.** The "oklch converter" query has no dedicated page. | No file exists. | Create hub page listing all 6 converters. |
| H9 | **No `/learn/oklch-css-syntax` page.** The "css oklch" / "oklch css" / "can i use oklch" queries have no dedicated page. | No file exists. | Create CSS syntax guide. |
| H10 | **No `/learn/oklch-vs-hsl-vs-rgb` page.** The "why use oklch" query has no dedicated page. | No file exists. | Create comparison guide. |
| H11 | **No `/learn/oklch-in-tailwind-css-v4` page.** The "when did tailwind css start using oklch" query has no dedicated page. | No file exists. | Create Tailwind v4 guide. |
| H12 | **`og:type` is always "website".** Learn pages should be "article". | All pages: `ogType: "website"`. | Set `og:type` to `article` for learn pages with `article:published_time` and `article:modified_time`. |
| H13 | **Article schema incomplete.** No `datePublished`, `dateModified`, `author`, or `image`. | `BaseLayout.astro` JSON-LD: only `@type`, `name`, `url`, `description`, `applicationCategory`, `operatingSystem`, `offers`. | Add full Article schema for learn pages. |
| H14 | **No BreadcrumbList schema.** Visible breadcrumbs exist on palette and learn pages but no structured data. | `what-is-oklch.astro` lines 21-27: visible breadcrumb nav. `[slug].astro` lines 32-38: visible breadcrumb nav. | Add BreadcrumbList JSON-LD matching visible breadcrumbs. |
| H15 | **Redirect uses meta-refresh, not 301.** `/hex-to-oklch-converter` serves a meta-refresh page (Astro's default redirect behavior). | `dist/hex-to-oklch-converter/index.html`: `<meta http-equiv="refresh" content="0;url=/hex-to-oklch">`. | Move redirect to `public/_redirects` for a real 301. |

### MEDIUM — Technical hygiene

| # | Issue | Evidence | Fix |
|---|-------|----------|-----|
| M1 | **Sitemap has no `lastmod`.** Google uses lastmod to prioritize crawling. | `sitemap.xml.ts`: no lastmod field. | Add truthful lastmod from git history. |
| M2 | **Sitemap uses `changefreq` and `priority`.** Google ignores these. | `sitemap.xml.ts`: includes both. | Remove to keep sitemap clean (optional). |
| M3 | **No visible FAQ on 4 of 6 converter pages.** Only `hex-to-oklch` and `oklch-to-hex` have FAQ sections. | `rgb-to-oklch.astro`, `oklch-to-rgb.astro`, `hsl-to-oklch.astro`, `oklch-to-hsl.astro`: no FAQ section. | Add 4-6 Q&As per converter page. |
| M4 | **No CSS snippet section on 5 of 6 converter pages.** Only `hex-to-oklch` has a Tailwind v4 `@theme` snippet. | Other converter pages: no `<pre>` code block. | Add copy-ready CSS snippet with progressive enhancement. |
| M5 | **No gamut note on 3 converter pages.** Only `hex-to-oklch` and `oklch-to-hex` have gamut explanations. | `rgb-to-oklch.astro`, `oklch-to-rgb.astro`, `hsl-to-oklch.astro`, `oklch-to-hsl.astro`: no gamut section. | Add gamut note (clamping vs Display-P3). |
| M6 | **`/ui-preview` and `/export` have thin server-rendered content when cart is empty.** A crawler sees the empty state. | `ui-preview.astro`: 573 words but mostly island shell. `export.astro`: 243 words. | Add 300+ words of server-rendered explanation, sample token output, and how-to section. |
| M7 | **No `X-Robots-Tag: noindex` for `*.pages.dev` in `_headers`.** The Cloudflare Pages preview domain could be indexed. | `public/_headers`: no pages.dev rule. | Add `https://:project.pages.dev/*` → `X-Robots-Tag: noindex`. |
| M8 | **No FAQPage schema.** Per corrections, this is optional/low priority. Google stopped showing FAQ rich results in May 2026. | No FAQPage JSON-LD anywhere. | Skip for now; visible FAQ sections are the real value. |

### LOW — Nice-to-have (mostly skipped per corrections)

| # | Issue | Decision |
|---|-------|----------|
| L1 | No `preconnect` to own origin | **Skip** — does nothing for same-origin requests (Correction #2). |
| L2 | No PWA manifest | **Skip** — not a ranking lever for a tool site (Correction #6). |
| L3 | No hreflang / i18n | **Skip** — single-language site (Correction #6). |
| L4 | No `responsiveImages` config | **Skip** — doesn't exist in Astro 7.3.5 (Correction #9). |
| L5 | No `meta name="keywords"` | **Skip** — ignored by Google (Correction #4). Already present but harmless. |
| L6 | No per-page `robots` meta | **Skip** — unnecessary (Correction #5). |

---

## 4. Crawlability Deep-Dive

### 4.1 Nav links in raw HTML

**Status: FAIL.** The primary navigation (`SidebarIsland`, `MobileTabBar`) is rendered by Preact islands with `client:load`. A crawler that doesn't execute JavaScript sees only the content-section links at the bottom of each page. This means:
- The sidebar's 11 nav links are invisible to non-JS crawlers.
- The mobile tab bar's 5 links are invisible.
- Only 2-4 hand-written links per page are in raw HTML.

**Fix:** Server-render the navigation in an Astro component with real `<a href>` tags. The Preact islands can enhance interactivity (collapse, sheet) but the base nav must be SSR'd.

### 4.2 Tool islands SSR default state

**Status: PASS.** `ConverterIsland` renders a meaningful default result in the HTML. For `hex-to-oklch`, the built HTML contains `oklch(62.3% 0.188 259.8)` (the conversion of `#3b82f6`). The `ColorPickerIsland` and `PaletteGeneratorIsland` also render default states.

### 4.3 Cart-dependent pages

**Status: PARTIAL.** `/ui-preview` and `/export` depend on cart state (localStorage). A crawler sees the empty state. Both pages have some server-rendered content but it's thin (243-573 words, mostly island shell). Need 300+ words of useful explanation and sample output.

### 4.4 `/_astro/` blocking

**Status: PASS.** `robots.txt` allows all. `/_astro/` is not blocked.

### 4.5 Trailing slash consistency

**Status: PASS.** `trailingSlash` config is default (`'ignore'`). Built pages are at `dist/hex-to-oklch/index.html`. Canonical URLs, sitemap, and internal links all use no trailing slash. Consistent.

### 4.6 Cloudflare Pages `*.pages.dev` indexing

**Status: FAIL.** No `X-Robots-Tag: noindex` rule in `public/_headers` for the pages.dev domain. The preview domain could be indexed, creating duplicate content.

**Fix:** Add to `public/_headers`:
```
https://:project.pages.dev/*
  X-Robots-Tag: noindex

https://:version.:project.pages.dev/*
  X-Robots-Tag: noindex
```

---

## 5. Sitemap Issues

| Issue | Detail |
|-------|--------|
| Duplicate entry | `/hex-to-oklch` appears twice (parent + child nav item) |
| No `lastmod` | All entries lack lastmod |
| Hard-coded URL | `siteUrl` is a string literal, not derived from `Astro.site` |
| Includes redirect page | `/hex-to-oklch-converter` is not in sitemap (correct — it's a redirect) |
| Missing new pages | `/oklch-converter`, `/learn/oklch-css-syntax`, etc. not yet in sitemap |

---

## 6. Structured Data Issues

| Issue | Detail |
|-------|--------|
| No `og:image` / `twitter:image` | All 28 pages |
| No `og:site_name` / `og:locale` | All pages |
| `og:type` always "website" | Learn pages should be "article" |
| Article schema incomplete | No dates, author, or image |
| No BreadcrumbList | Visible breadcrumbs exist but no JSON-LD |
| No FAQPage | Optional per corrections — skip |
| `applicationCategory` | "DesignApplication" — should be "DesignApplication" or "UtilitiesApplication" (valid) |
| `operatingSystem` | "All" — should be "Any" per Phase 4 spec |

---

## 7. Content Depth Issues

| Page | Words | Target | Gap |
|------|-------|--------|-----|
| `/rgb-to-oklch` | 318 | 600+ | Missing CSS snippet, gamut note, FAQ |
| `/oklch-to-rgb` | 306 | 600+ | Missing CSS snippet, gamut note, FAQ |
| `/hsl-to-oklch` | 336 | 600+ | Missing CSS snippet, gamut note, FAQ |
| `/oklch-to-hsl` | 318 | 600+ | Missing CSS snippet, gamut note, FAQ |
| `/export` | 243 | 300+ | Thin — needs sample output, how-to |
| `/learn/what-is-oklch` | 423 | 800+ | Missing diagram, browser support, Tailwind section, FAQ, sources |
| Palette detail pages | ~397 | 500+ | Missing unique intro, related palettes, converter links |

---

## 8. Verified External Facts (for content)

| Fact | Source | Date |
|------|--------|------|
| `oklch()` is Baseline (widely available) | MDN | Since May 2023 |
| Tailwind CSS v4.0 released | tailwindcss.com/blog | January 22, 2025 |
| Tailwind v4 default palette uses OKLCH | tailwindcss.com/blog | January 22, 2025 |
| Cloudflare Pages `_headers` supports `https://:project.pages.dev/*` | developers.cloudflare.com | Verified 2026-10-07 |
| Google stopped FAQ rich results | Google Search Central | May 2026 |

---

## 9. Priority Order for Fixes

1. **Phase 1:** Titles, H1s, meta descriptions (highest impact, do first)
2. **Phase 2:** On-page content (what ranks)
3. **Phase 3:** Crawling and technical hygiene (nav SSR, 404, sitemap, _headers)
4. **Phase 4:** Structured data (support layer)
5. **Phase 5:** Internal linking (RelatedTools, footer, hub page)
6. **Phase 6:** Performance polish
7. **Phase 7:** New content (hub + 3 learn guides)
8. **Phase 8:** Measurement checklist

---

*End of audit.*
