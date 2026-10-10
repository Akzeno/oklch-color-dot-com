# Multi-Language (i18n) Implementation Plan

## Language Configuration

| Language | Code | Locale | Native Name | URL Prefix |
|----------|------|--------|-------------|------------|
| English (default) | `en` | `en-US` | English | `/` (no prefix) |
| Hindi | `hi` | `hi-IN` | हिन्दी | `/hi/` |
| Portuguese | `pt` | `pt-BR` | Português | `/pt/` |
| Chinese (Mandarin) | `zh-CN` | `zh-CN` | 中文 (简体) | `/zh-cn/` |
| Chinese (Cantonese) | `zh-HK` | `zh-HK` | 中文 (繁體/香港) | `/zh-hk/` |
| Spanish | `es` | `es-ES` | Español | `/es/` |
| French | `fr` | `fr-FR` | Français | `/fr/` |
| German | `de` | `de-DE` | Deutsch | `/de/` |
| Dutch | `nl` | `nl-NL` | Nederlands | `/nl/` |

**Strategy**: Path-based routing with English at root. Other languages get `/locale/` prefix.

## Technical Decisions

1. **English URLs**: Stay at root paths (`/`, `/oklch-colors`, etc.) — no `/en/` prefix
2. **Technical content**: Code snippets, CSS functions (`oklch()`, `rgb()`), token names stay in English
3. **Translation approach**: Build structure with English fallbacks; translations added incrementally
4. **Cantonese**: Uses `zh-HK` with Traditional Chinese characters

## Architecture

```
src/
├── i18n/
│   ├── config.ts              # Locale definitions, routing config
│   ├── routing.ts             # URL helpers, locale detection, path manipulation
│   ├── translations/
│   │   ├── en.json            # Base translations (source of truth)
│   │   ├── hi.json
│   │   ├── pt.json
│   │   ├── zh-CN.json
│   │   ├── zh-HK.json
│   │   ├── es.json
│   │   ├── fr.json
│   │   ├── de.json
│   │   ├── nl.json
│   │   └── index.ts           # Barrel export + type-safe translation function
│   └── middleware.ts          # Locale detection/redirection middleware
├── config/
│   └── navigation.ts          # Update to support i18n (labelKey → translation keys)
├── layouts/
│   ├── BaseLayout.astro       # Dynamic lang attribute, hreflang, localized SEO
│   └── AppLayout.astro        # Pass locale to Header/Sidebar
├── components/
│   ├── layout/
│   │   ├── Header.astro       # Language switcher dropdown
│   │   └── SidebarIsland.tsx  # Localized nav labels
│   └── common/
│       └── LanguageSwitcher.astro  # Reusable locale picker
├── pages/
│   ├── [lang]/                # Dynamic locale segment
│   │   ├── index.astro
│   │   ├── oklch-colors/
│   │   ├── learn/
│   │   ├── ...all tool pages...
│   │   └── ...
│   └── index.astro            # Redirect to default locale or show picker
├── utils/
│   ├── seoTables.ts           # Localized build-time tables
│   └── schema.ts              # Localized JSON-LD
└── middleware.ts              # Astro middleware for locale handling
```

## Implementation Phases

### Phase 1: Foundation (i18n config, routing, base translations)
- Create `src/i18n/config.ts` with locale definitions
- Create `src/i18n/routing.ts` with URL helpers
- Create `src/i18n/translations/en.json` (complete, all keys)
- Create `src/i18n/translations/index.ts` (type-safe `t()` function)
- Create placeholder translation files for other locales (fallback to English)

### Phase 2: Layout & Navigation
- Update `BaseLayout.astro`: dynamic `lang` attribute, hreflang tags, localized SEO
- Update `AppLayout.astro`: pass locale to Header/Sidebar
- Create `LanguageSwitcher.astro` component
- Update `Header.astro`: integrate language switcher
- Update `SidebarIsland.tsx`: use translation function for nav labels

### Phase 3: Page Migration
- Create `src/pages/[lang]/` directory structure
- Move all pages to `src/pages/[lang]/` with locale prop
- Update each page to use `t()` function for content
- Update SEO metadata to use localized strings

### Phase 4: SEO & Content Translation
- Translate all SEO metadata (titles, descriptions, keywords, FAQs)
- Translate all visible content (FAQs, educational content, tool labels)
- Update `sitemap.xml.ts` for localized URLs
- Update `robots.txt.ts` if needed

### Phase 5: Middleware & Routing
- Create `src/middleware.ts` for locale detection
- Handle root `/` redirect based on Accept-Language (optional)
- Ensure proper canonical URLs per locale

### Phase 6: Testing & Verification
- Verify all locales render correctly
- Check hreflang tags are correct
- Verify no broken links
- Test language switcher persistence

## Translation Key Structure (en.json)

```json
{
  "nav": { ... },           // Navigation labels
  "common": { ... },        // Shared UI text (language switcher, etc.)
  "seo": {                  // Per-page SEO metadata
    "index": { "title": "", "description": "", "h1": "", "keywords": [] },
    "palettes": { ... },
    "generator": { ... },
    "converterHub": { ... },
    "hexToOklch": { ... },
    ...
  },
  "content": {              // Per-page visible content
    "index": { "whyChoose": "", "whyChooseBody": "", ... },
    "palettes": { ... },
    ...
  },
  "tools": {                // Tool-specific UI labels
    "picker": { "lightness": "", "chroma": "", "hue": "", "addToCart": "", ... },
    "palettes": { "copy": "", "export": "", ... },
    ...
  },
  "learn": {                // Learn section content
    "whatIsOklch": { ... },
    "cssSyntax": { ... },
    ...
  }
}
```

## Files to Create/Modify

### New Files
- `src/i18n/config.ts`
- `src/i18n/routing.ts`
- `src/i18n/translations/en.json`
- `src/i18n/translations/hi.json` (placeholder)
- `src/i18n/translations/pt.json` (placeholder)
- `src/i18n/translations/zh-CN.json` (placeholder)
- `src/i18n/translations/zh-HK.json` (placeholder)
- `src/i18n/translations/es.json` (placeholder)
- `src/i18n/translations/fr.json` (placeholder)
- `src/i18n/translations/de.json` (placeholder)
- `src/i18n/translations/index.ts`
- `src/i18n/middleware.ts`
- `src/components/common/LanguageSwitcher.astro`
- `src/middleware.ts`
- `src/pages/[lang]/` directory structure (all pages)

### Modified Files
- `astro.config.mjs` (add i18n config or manual routing setup)
- `src/layouts/BaseLayout.astro`
- `src/layouts/AppLayout.astro`
- `src/components/layout/Header.astro`
- `src/components/layout/SidebarIsland.tsx`
- `src/config/navigation.ts` (add labelKey support for translations)
- `src/pages/sitemap.xml.ts`
- All page files (moved to `[lang]/` and updated for i18n)

## Rollback Plan
If issues arise:
1. Keep original pages at `src/pages/` as backup
2. Feature flag i18n with environment variable
3. Revert `astro.config.mjs` changes
4. Restore original `BaseLayout.astro` and `AppLayout.astro`