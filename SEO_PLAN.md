# SEO Planning Document — oklchcolor2.com

> **Generated:** 2026-10-06  
> **Site URL:** https://oklchcolors.com  
> **Platform:** Astro v7.3.5 + Preact + Tailwind CSS v4  
> **Total Pages:** ~30 URLs (13 static + 16 dynamic palette pages + sitemap)

---

## Table of Contents

1. [Current SEO State](#1-current-seo-state)
2. [Identified Gaps & Issues](#2-identified-gaps--issues)
3. [Quick Wins (Do First)](#3-quick-wins-do-first)
4. [Technical SEO Roadmap](#4-technical-seo-roadmap)
5. [Content Strategy](#5-content-strategy)
6. [Structured Data Enhancements](#6-structured-data-enhancements)
7. [Performance & Core Web Vitals](#7-performance--core-web-vitals)
8. [Internal Linking Strategy](#8-internal-linking-strategy)
9. [Monitoring & Measurement](#9-monitoring--measurement)
10. [Implementation Priority Matrix](#10-implementation-priority-matrix)

---

## 1. Current SEO State

### What's Already Working

| Area | Status | Details |
|------|--------|---------|
| Canonical URLs | Done | Every page sets `canonicalPath` prop correctly |
| Basic Meta Tags | Done | Title, description, keywords on all pages |
| Open Graph | Partial | `og:type`, `og:url`, `og:title`, `og:description` present |
| Twitter Cards | Partial | `summary_large_image` set, but no image |
| JSON-LD | Partial | WebApplication / CollectionPage / Article schemas |
| Sitemap | Partial | Manual XML with priorities, but no `lastmod` |
| robots.txt | Done | Allows all, references sitemap |
| Semantic HTML | Done | Proper H1-H3 hierarchy, nav, main, section |
| Internal Linking | Partial | Cross-links between converters, breadcrumbs |
| Centralized SEO Config | Done | All metadata in `src/config/navigation.ts` |
| Build-time Rendering | Done | Static pages, fast load times |

---

## 2. Identified Gaps & Issues

### Critical (High Impact, Low Effort)

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| C1 | No `og:image` or `twitter:image` on any page | High — social shares have no preview | Low |
| C2 | No `lastmod` in sitemap | Medium — reduces crawl efficiency signals | Low |
| C3 | No `og:site_name` or `og:locale` | Medium — weakens OG presence | Low |
| C4 | No `robots` meta tag per page | Low — no granular control | Low |
| C5 | No `theme-color` meta tag | Low — mobile browser chrome | Low |

### Important (High Impact, Medium Effort)

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| I1 | No FAQPage structured data | High — FAQs exist but aren't marked up | Medium |
| I2 | No BreadcrumbList structured data | Medium — breadcrumbs visual only | Medium |
| I3 | No `article:published_time` / `modified_time` | Medium — Article schema incomplete | Low |
| I4 | No custom 404 page | Medium — poor UX for mistyped URLs | Low |
| I5 | No `preconnect` / `dns-prefetch` hints | Low — minor performance gain | Low |
| I6 | No `apple-touch-icon` | Low — iOS home screen icon | Low |
| I7 | No image optimization strategy | Medium — no responsive images | Medium |

### Nice-to-Have (Medium Impact, Higher Effort)

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| N1 | No `@astrojs/sitemap` integration | Low — manual sitemap works | Low |
| N2 | No PWA manifest | Medium — offline capability | Medium |
| N3 | No `alternate` hreflang tags | Low — single language site | Low |
| N4 | No `og:type` differentiation for articles | Low — should be `article` not `website` | Low |
| N5 | No content freshness strategy | Medium — no update cadence | Medium |

---

## 3. Quick Wins (Do First)

These can be implemented in under 2 hours and provide immediate SEO value.

### 3.1 Add Social Preview Images (C1)

**What:** Generate and add `og:image` and `twitter:image` to every page.

**How:**
- Create a dynamic OG image generator (e.g., using `@vercel/og` or a static template)
- Or create static OG images for each page type (1 per tool, 1 per palette)
- Recommended size: 1200x630px

**Where:** `src/layouts/BaseLayout.astro`

```astro
<meta property="og:image" content={`${Astro.site}og-image.png`} />
<meta name="twitter:image" content={`${Astro.site}og-image.png`} />
```

### 3.2 Add `lastmod` to Sitemap (C2)

**What:** Add last modification date to every sitemap entry.

**Where:** `src/pages/sitemap.xml.ts`

```ts
{
  url: 'https://oklchcolors.com/hex-to-oklch',
  lastmod: '2026-10-01',
  changefreq: 'weekly',
  priority: 0.8,
}
```

### 3.3 Add Missing OG Tags (C3)

**Where:** `src/layouts/BaseLayout.astro`

```astro
<meta property="og:site_name" content="OKLCH Colors" />
<meta property="og:locale" content="en_US" />
```

### 3.4 Add `theme-color` (C5)

**Where:** `src/layouts/BaseLayout.astro`

```astro
<meta name="theme-color" content="#0f172a" />
```

### 3.5 Add `preconnect` Hints (I5)

**Where:** `src/layouts/BaseLayout.astro`

```astro
<link rel="preconnect" href="https://oklchcolors.com" />
```

---

## 4. Technical SEO Roadmap

### Phase 1: Foundation (Week 1)

- [ ] Add `og:image` / `twitter:image` to all pages
- [ ] Add `lastmod` to sitemap entries
- [ ] Add `og:site_name`, `og:locale`
- [ ] Add `theme-color` meta tag
- [ ] Add `preconnect` / `dns-prefetch` hints
- [ ] Create custom 404 page (`src/pages/404.astro`)
- [ ] Add `apple-touch-icon` (180x180px)

### Phase 2: Structured Data (Week 2)

- [ ] Add FAQPage schema to pages with FAQ sections
- [ ] Add BreadcrumbList schema to palette detail pages
- [ ] Add `article:published_time` and `article:modified_time` to Article schema
- [ ] Fix `og:type` for article pages (should be `article` not `website`)

### Phase 3: Performance (Week 3)

- [ ] Audit and optimize images (WebP/AVIF, responsive `srcset`)
- [ ] Add `loading="lazy"` to below-fold images
- [ ] Minimize unused CSS (Tailwind purge is automatic, verify)
- [ ] Enable Astro's built-in asset optimization
- [ ] Run Lighthouse audit and fix issues

### Phase 4: Content & Links (Week 4)

- [ ] Expand internal linking between related tools
- [ ] Add "Related Tools" section to converter pages
- [ ] Create more educational content (blog posts, guides)
- [ ] Add FAQ sections to more pages
- [ ] Implement content update cadence

---

## 5. Content Strategy

### Content Pillars

Your site naturally organizes into these SEO content pillars:

| Pillar | Target Keywords | Pages |
|--------|----------------|-------|
| **OKLCH Color Converter** | "oklch converter", "color converter" | 6 converter pages |
| **OKLCH Color Palettes** | "oklch palette", "color palette generator" | Palette library + 16 detail pages |
| **OKLCH Education** | "what is oklch", "oklch explained" | Learn section |
| **Color Tools** | "color picker", "ui color preview" | Home, UI Preview, Export |

### Keyword Mapping (Per Page)

| Page | Primary Keyword | Secondary Keywords |
|------|----------------|-------------------|
| `/` | oklch color picker | color picker, oklch tool |
| `/hex-to-oklch` | hex to oklch | hex oklch converter, convert hex |
| `/oklch-to-hex` | oklch to hex | oklch hex converter |
| `/rgb-to-oklch` | rgb to oklch | rgb oklch converter |
| `/oklch-to-rgb` | oklch to rgb | oklch rgb converter |
| `/hsl-to-oklch` | hsl to oklch | hsl oklch converter |
| `/oklch-to-hsl` | oklch to hsl | oklch hsl converter |
| `/oklch-colors` | oklch color palette | oklch palettes, color library |
| `/oklch-color-palette-generator` | oklch palette generator | generate oklch palette |
| `/learn/what-is-oklch` | what is oklch | oklch explained, oklch guide |
| `/export` | export color palette | export oklch, color export |
| `/ui-preview` | ui color preview | color preview tool |

### Content Expansion Opportunities

1. **Blog/Guides Section** (`/blog/`)
   - "OKLCH vs HSL: Which Should You Use?"
   - "How to Accessible Colors with OKLCH"
   - "OKLCH in Tailwind CSS v4"
   - "Migrating from HEX to OKLCH"
   - "OKLCH for Design Systems"

2. **Individual Color Pages** (`/colors/[color-name]/`)
   - Target long-tail keywords like "oklch red", "oklch blue"
   - Show all conversions for that color
   - Display complementary/analogous colors

3. **Comparison Pages**
   - "OKLCH vs HSL vs RGB"
   - "OKLCH vs LCH vs LAB"

4. **Use-Case Pages**
   - "OKLCH for Web Design"
   - "OKLCH for Data Visualization"
   - "OKLCH for Dark Mode"

---

## 6. Structured Data Enhancements

### Current Schemas

| Schema Type | Used On | Status |
|-------------|---------|--------|
| WebApplication | Tool pages | Working |
| CollectionPage | Palette pages | Working |
| Article | Learn page | Working |

### Recommended Additions

#### FAQPage Schema

Add to pages with FAQ sections (most converter pages):

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is OKLCH?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "OKLCH is a perceptually uniform color space..."
      }
    }
  ]
}
```

#### BreadcrumbList Schema

Add to palette detail pages and learn article:

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://oklchcolors.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Palettes",
      "item": "https://oklchcolors.com/oklch-colors"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Sunset",
      "item": "https://oklchcolors.com/oklch-colors/sunset"
    }
  ]
}
```

#### Article Schema Enhancement

For the learn article, add:

```json
{
  "@type": "Article",
  "datePublished": "2026-01-15",
  "dateModified": "2026-10-01",
  "author": {
    "@type": "Organization",
    "name": "OKLCH Colors"
  }
}
```

---

## 7. Performance & Core Web Vitals

### Current Advantages

- Static site generation (Astro) = fast TTFB
- Preact (lightweight) = small JS bundle
- Tailwind CSS v4 = purged, minimal CSS
- Build-time color tables = no client-side computation

### Optimization Checklist

- [ ] **LCP (Largest Contentful Paint):** Ensure hero content loads immediately
- [ ] **CLS (Cumulative Layout Shift):** Set explicit dimensions on interactive elements
- [ ] **INP (Interaction to Next Paint):** Preact helps; minimize re-renders
- [ ] **Images:** Use `srcset` and `sizes` for responsive images
- [ ] **Fonts:** Use `font-display: swap` if custom fonts added
- [ ] **Third-party scripts:** None currently (good!)

### Astro-Specific Optimizations

```js
// astro.config.mjs
export default defineConfig({
  site: 'https://oklchcolors.com',
  integrations: [preact()],
  vite: {
    plugins: [tailwindcss()],
  },
  // Add these:
  build: {
    inlineStylesheets: 'auto',
  },
  experimental: {
    responsiveImages: true,
  },
});
```

---

## 8. Internal Linking Strategy

### Current Link Structure

```
Home (/)
├── Palette Library (/oklch-colors)
│   └── 16 Palette Detail Pages (/oklch-colors/[slug])
├── Palette Generator (/oklch-color-palette-generator)
├── 6 Converter Pages (cross-linked)
├── UI Preview (/ui-preview)
├── Export (/export)
└── Learn (/learn/what-is-oklch)
```

### Recommended Improvements

1. **Converter Cross-Linking Matrix**
   - Each converter page should link to all 5 other converters
   - Add "Related Converters" section at bottom

2. **Palette-to-Converter Links**
   - Palette detail pages: "Convert these colors" → link to relevant converter
   - Example: Sunset palette → "Convert Sunset HEX to OKLCH"

3. **Tool-to-Education Links**
   - Converter pages: "Learn more about OKLCH" → `/learn/what-is-oklch`
   - Learn page: "Try the converter" → link to relevant tool

4. **Related Tools Section**
   - Add to every page: "Related Tools" with 3-4 relevant links
   - Helps distribute link equity and improves crawl depth

5. **Footer Navigation**
   - Add comprehensive footer with all tools listed
   - Helps search engines discover all pages

---

## 9. Monitoring & Measurement

### Tools to Set Up

| Tool | Purpose | Priority |
|------|---------|----------|
| Google Search Console | Index status, queries, clicks | Critical |
| Bing Webmaster Tools | Bing/Yahoo search data | High |
| Google Analytics 4 | Traffic, behavior, conversions | High |
| PageSpeed Insights | Core Web Vitals | Medium |
| Ahrefs / SEMrush | Backlinks, keyword tracking | Medium |

### Key Metrics to Track

- **Organic traffic** (monthly)
- **Keyword rankings** (target keywords)
- **Click-through rate** (Search Console)
- **Core Web Vitals** (LCP, INP, CLS)
- **Indexed pages** (Search Console)
- **Backlink count** (monthly growth)

### Target Keywords to Monitor

| Keyword | Current Rank (est.) | Target |
|---------|---------------------|--------|
| oklch converter | — | Top 10 |
| oklch color palette | — | Top 10 |
| hex to oklch | — | Top 10 |
| what is oklch | — | Top 5 |
| oklch to hex | — | Top 10 |
| rgb to oklch | — | Top 10 |
| oklch palette generator | — | Top 10 |

---

## 10. Implementation Priority Matrix

### Priority 1 — Do Immediately (Week 1)

| Task | File(s) to Modify | Est. Time |
|------|-------------------|-----------|
| Add `og:image` / `twitter:image` | `BaseLayout.astro` | 30 min |
| Add `lastmod` to sitemap | `sitemap.xml.ts` | 15 min |
| Add `og:site_name`, `og:locale` | `BaseLayout.astro` | 10 min |
| Add `theme-color` | `BaseLayout.astro` | 5 min |
| Add `preconnect` hints | `BaseLayout.astro` | 5 min |
| Create custom 404 page | `src/pages/404.astro` | 30 min |
| Add `apple-touch-icon` | `public/` + `BaseLayout.astro` | 15 min |

### Priority 2 — Short Term (Week 2-3)

| Task | File(s) to Modify | Est. Time |
|------|-------------------|-----------|
| Add FAQPage schema | Converter pages | 2 hrs |
| Add BreadcrumbList schema | Palette detail pages | 1 hr |
| Enhance Article schema | `BaseLayout.astro` | 30 min |
| Fix `og:type` for articles | `BaseLayout.astro` | 10 min |
| Image optimization audit | All pages | 2 hrs |
| Add "Related Tools" sections | All pages | 3 hrs |
| Expand internal linking | All pages | 2 hrs |

### Priority 3 — Medium Term (Month 2)

| Task | File(s) to Modify | Est. Time |
|------|-------------------|-----------|
| Create blog section | `src/pages/blog/` | 8 hrs |
| Write 3-5 blog posts | Content creation | 10 hrs |
| Individual color pages | `src/pages/colors/[slug]/` | 6 hrs |
| Comparison pages | New pages | 4 hrs |
| PWA manifest | `public/manifest.json` | 2 hrs |

### Priority 4 — Long Term (Month 3+)

| Task | File(s) to Modify | Est. Time |
|------|-------------------|-----------|
| Content update cadence | Ongoing | Ongoing |
| Backlink outreach | Off-site | Ongoing |
| A/B test meta descriptions | All pages | Ongoing |
| Internationalization (i18n) | Astro config | 10 hrs |

---

## File Reference

| File | Purpose |
|------|---------|
| `src/layouts/BaseLayout.astro` | All SEO meta tags, JSON-LD |
| `src/config/navigation.ts` | Centralized SEO metadata |
| `src/pages/sitemap.xml.ts` | Sitemap generation |
| `public/robots.txt` | Crawler instructions |
| `astro.config.mjs` | Site URL, redirects, integrations |
| `src/utils/seoTables.ts` | Build-time SEO reference data |

---

## Summary

Your site has a **solid SEO foundation** with canonical URLs, basic meta tags, JSON-LD, and a sitemap. The biggest opportunities are:

1. **Social preview images** — critical for social sharing CTR
2. **FAQPage + BreadcrumbList schema** — rich snippet opportunities
3. **Content expansion** — blog posts and educational content
4. **Internal linking** — related tools sections
5. **Performance polish** — image optimization, Core Web Vitals

Start with **Priority 1** items (under 2 hours total), then move to structured data enhancements. The content expansion in Priority 3 will drive the most organic traffic growth over time.
