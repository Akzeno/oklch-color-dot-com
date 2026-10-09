# I18n page-content conventions (task reference)

This repo localizes with a dictionary system. English source of truth lives in
`src/config/navigation.ts` (SEO) and `src/i18n/translations/en.json` (shell).
Non-English dictionaries live beside it (`pt.json`, `es.json`, …). The `t()`
helper falls back to the English string you pass, so a missing key is safe.

Currently translated: shell (nav/footer labels), SEO titles/meta/H1s, the body
copy of every page (`pages.*`), and shared role names (`ui.roles.*`).
Your job (Phase 2): wire the interactive tool islands (Preact `.tsx` components)
through `t()` so buttons, toasts, labels and empty states render in pt.

## Dictionary shape

```
pages.<pageKey>.<camelCaseKey>        ← page body copy (headings, paragraphs,
                                        table cells, captions, link labels,
                                        breadcrumbs — everything visible)
pages.paletteData.<slug>.description  ← per-palette descriptions (data-driven)
pages.paletteCategories.<categoryId>  ← category filter labels
seo.<seoKey>.faqs                     ← localized FAQ pairs for the FAQPage
                                        JSON-LD (plain text only, no HTML)
```

Valid pageKeys for this batch:
`hexToOklch, oklchToHex, rgbToOklch, oklchToRgb, hslToOklch, oklchToHsl,
converterHub, palettes, paletteDetail, generator, preview, export, cssSyntax,
tailwindV4, vsHslRgb, about, contact, privacy, terms`

Valid seoKeys: same names as pageKeys except `paletteDetail` has none
(`palettes`, `generator`, `converterHub`, `hexToOklch`, `oklchToHex`,
`rgbToOklch`, `oklchToRgb`, `hslToOklch`, `oklchToHsl`, `preview`, `export`,
`cssSyntax`, `tailwindV4`, `vsHslRgb`, `about`, `contact`, `privacy`, `terms`).

## Wiring pattern (copy exactly)

```astro
---
import AppLayout from '../layouts/AppLayout.astro';
import { t } from '../i18n/translations';        // ../ for src/pages/x.astro
// import { t } from '../../i18n/translations';  // ../../ for learn/ or oklch-colors/
---
<h2 class="text-lg font-semibold text-ink">
  {t(locale, 'pages.hexToOklch.whyTitle', 'Why OKLCH beats HEX')}
</h2>
<p class="text-xs md:text-sm font-mono text-body">
  {t(locale, 'pages.hexToOklch.whyBody', 'English original sentence…')}
</p>
```

Rules:

1. **Always pass the exact English original as the third argument** (the
   fallback). Never write a shortened or reworded fallback — it must be the
   verbatim string that was in the page.
2. **Strings containing inline HTML** (`<strong>`, `<code>`, `<a>`) must use
   `set:html={t(locale, 'key', 'English with <strong class="text-ink">…')}`.
   Embed the element classes exactly as the original markup had them
   (`<strong class="text-ink">`, `<code class="text-ink">`) — in BOTH the
   English fallback and both fragment files.
3. **Code samples inside `<pre><code>`**: translate prose comments inside the
   code (`/* fallback for older browsers */` → `/* fallback para navegadores
   antigos */`), keep identifiers, values and syntax untouched. Wire them with
   plain `{t(...)}` interpolation (real newlines from `\n` in JSON are
   preserved inside `<pre>`).
4. **Data-driven sentences** (e.g. `[slug].astro` intro built from
   `palette.description` + computed hue/contrast steps) use placeholder
   templates:
   ```ts
   const intro = `${palette.description} ${t(
     locale, 'pages.paletteDetail.introTail',
     'The scale is anchored at hue {hue} … shades {aaWhite} pass …'
   ).replace('{hue}', String(hue)).replace('{aaWhite}', aaWhite).replace('{aaBlack}', aaBlack)}`;
   ```
   Placeholders: `{name}`, `{hue}`, `{aaWhite}`, `{aaBlack}`, `{step}`, …
   Use the same placeholder names in en and pt fragments.
5. **Localize `<title>`/meta only through the existing `seo` system** — never
   touch `navigation.ts`, `seo.ts` or the SEO props a page already passes.
6. **Do not translate**: palette/brand proper names (Zinc, Violet Pulse…),
   color notations (`oklch(62.3% 0.188 259.8)`, `hsl(H S% L%)`), CSS
   identifiers, `sRGB`, `Display-P3`, `HEX`, `RGB`, `HSL`, `WCAG 2.1 AA`,
   `Tailwind CSS v4`, `@theme`, `Baseline`, `VS Code`. Keep `→`/`·`/`—`
   characters.
7. **Skip `<head>` SEO attributes, hreflang, JSON-LD script wiring, island
   mount tags (`client:load`/`client:visible` components), `.tsx` files and
   layout files** — another pass handles those. Your page's islands stay
   untouched; only wrap the island's surrounding static copy.
8. **aria-labels / sr-only text**: translate them if they are page content
   (e.g. an FAQ section label); skip chrome managed by layouts.

## Portuguese (pt-BR) style

- Natural Brazilian Portuguese, informal-but-professional "você" register.
- Keep technical terms in English: gamut, chroma, sliders, tokens, wide-gamut,
  fallback, baseline, design system, dark mode, tailwind, hex — they are
  standard usage among Brazilian developers. Translate the connecting prose.
- Headings keep sentence case as the English (do not ALL-CAPS).
- Punctuation: use `—` (em dash) where English uses it; decimal commas are NOT
  used in code contexts (keep `0.62`); prose dates like "January 22, 2025" →
  "22 de janeiro de 2025".

## Fragment files

You do NOT edit `en.json`/`pt.json` directly. Instead write two fragment
files, one per language, with **identical key sets**:

- `src/i18n/translations/fragments/<your-fragment-id>.en.json`
- `src/i18n/translations/fragments/<your-fragment-id>.pt.json`

Shape (top-level `pages` and/or `seo`, nothing else):

```json
{
  "pages": {
    "hexToOklch": { "intro": "…", "whyTitle": "…" }
  },
  "seo": {
    "hexToOklch": {
      "faqs": [ { "question": "…", "answer": "…" } ]
    }
  }
}
```

For `seo.*.faqs`: translate the English `faqs` array found on that page's nav
item in `src/config/navigation.ts` (same count, same order, plain text — strip
any HTML like `<code>`; the JSON-LD wants text). The answers must match the
translated visible FAQ content on the page.

## Phase 2 — interactive islands (`.tsx` components)

Dictionary section for island UI strings:

```
ui.<island>.<camelCaseKey>        ← buttons, toasts, labels, placeholders,
                                     aria-labels, empty states, tabs, hints
ui.roles.<roleId>                 ← shared role names (ALREADY SEEDED — consume
                                     only, never define or edit): primary,
                                     secondary, trusty-button, success, danger,
                                     warning, info, background, text
```

Wiring pattern in an island:

```tsx
import type { LocaleCode } from '../../i18n/config';   // adjust ../ depth
import { t } from '../../i18n/translations';

interface Props {
  locale?: LocaleCode;
  // …existing props
}

export default function ConverterIsland({ locale = 'en', /* … */ }: Props) {
  // …
  return <button>{t(locale, 'ui.converter.copyValue', 'Copy value')}</button>;
}
```

Rules for islands:

1. **Add a `locale?: LocaleCode` prop** (default `'en'`) to the island root
   component and thread it to sub-components that need it (a `locale` prop,
   not context).
2. **Add `locale={locale}` at every mount site** in `.astro` files you own
   (pages + layouts listed in your assignment). Pages already have `locale`
   in frontmatter. Keep hydration directives (`client:load` / `client:visible`
   / `transition:persist`) untouched.
3. **Role names**: wherever the UI shows `role.name` or builds a suggestion
   `label` from it, look it up as `t(locale, 'ui.roles.' + role.id, role.name)`
   so user-created custom roles keep their own name. `ui.roles.*` is seeded
   in en.json/pt.json — do NOT redefine it in fragments.
4. **Variable names / CSS identifiers are never translated**: `value`
   fields (`trusty-button`, `--color-brand`), code output, `oklch()` values.
   Only human-facing `label`s are translated.
5. **Interpolated strings** (toasts like ``Copied ${label}``) become
   placeholder templates: `t(locale, 'ui.converter.copied', 'Copied {label}').replace('{label}', label)`
   — same placeholder names in en and pt.
6. **Generated CSS comments**: if an island writes human text into exported
   CSS (e.g. `/* Trusty Button */`), translate it through `ui.roles.*` /
   your own keys — that text is user-facing output.
7. **Static page copy that names island labels** (FAQ prose mentioning
   "Copy all" etc.) stays in `pages.*` — do NOT edit en.json/pt.json;
   instead list every such key + the label it references in your final
   report so the integrator can sync it after the UI strings are final.
8. Do NOT edit other islands' `ui.<island>` sections — your keys live under
   your own section only, even when a word repeats (duplication is fine).
9. Island fragments use the same file format, top-level section `"ui"`:
   `fragments/<id>.en.json` / `fragments/<id>.pt.json`.
10. Skip `aria-*` attributes ONLY when they are technical ARIA values
    (`aria-checked="true"`); do translate user-visible `aria-label` text.

## Your verification (run before reporting)

```bash
node -e "const f='src/i18n/translations/fragments/<id>';const en=JSON.parse(require('fs').readFileSync(f+'.en.json','utf8'));const pt=JSON.parse(require('fs').readFileSync(f+'.pt.json','utf8'));const k=(o,p='')=>Object.entries(o).flatMap(([a,b])=>b&&typeof b==='object'&&!Array.isArray(b)?k(b,p+a+'.'):[p+a]);const E=new Set(k(en)),P=new Set(k(pt));console.log('en',E.size,'pt',P.size);console.log('missing in pt:',[...E].filter(x=>!P.has(x)));console.log('missing in en:',[...P].filter(x=>!E.has(x)));"
```

Both fragments must parse and the key sets must be identical. Do NOT run
`npm run build` (the integrator builds once after merging everyone's work).
