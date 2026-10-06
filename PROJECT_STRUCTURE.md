# Project Structure Documentation

## Overview
This is an Astro-based web application for OKLCH color conversion tools and palette generation. The project uses Preact islands for interactive components, Tailwind CSS v4 for styling, and Nanostores for state management.

---

## Root Directory

```
oklchcolor2.com/
├── .agents/              # Agent configurations and skills
├── .astro/               # Astro build cache (generated)
├── .git/                 # Git repository
├── .kilo/                # Kilo config
├── .vscode/              # VS Code settings
├── dist/                 # Production build output (generated)
├── node_modules/         # Dependencies (generated)
├── public/               # Static assets served directly
├── src/                  # Source code
├── tests/                # Test files
├── uiRefrence/           # UI reference materials
├── .gitignore
├── AGENTS.md             # Agent instructions
├── astro.config.mjs      # Astro configuration
├── CLAUDE.md             # Claude-specific instructions
├── DESIGN.md             # Design documentation
├── package.json          # Project dependencies and scripts
├── package-lock.json     # Locked dependencies
├── PROJECT_STRUCTURE.md  # This file
├── QUICK_REFERENCE.md    # Quick reference guide
├── README.md             # Project overview
├── SEO_PLAN.md           # SEO planning document
├── skills-lock.json      # Skills lock file
└── tsconfig.json         # TypeScript configuration
```

---

## Public Directory (`/public`)

Static files served directly at root path:

| File | Purpose |
|------|---------|
| `favicon.ico` | Legacy favicon |
| `favicon.svg` | Modern SVG favicon |
| `robots.txt` | Search engine crawling rules |
| `_headers` | Cloudflare Pages cache & security headers |

---

## Source Directory (`/src`)

```
src/
├── assets/           # Static assets (images, icons)
├── components/       # Reusable UI components (Astro & Preact)
├── config/           # Configuration files
├── data/             # Static data files
├── hooks/            # Custom Preact hooks
├── layouts/          # Page layout components
├── pages/            # File-based routing (Astro pages)
├── stores/           # State management (Nanostores)
├── styles/           # Global styles
└── utils/            # Utility functions
```

---

### Assets (`/src/assets`)

| File | Purpose |
|------|---------|
| `astro.svg` | Astro logo |
| `background.svg` | Background pattern |

---

### Components (`/src/components`)

Organized by feature/domain:

#### Cart (`/src/components/cart`)
| File | Type | Purpose |
|------|------|---------|
| `CartDrawerIsland.tsx` | Preact | Slide-out cart drawer (interactive) |
| `CartTriggerButton.tsx` | Preact | Button to open cart |

#### Common (`/src/components/common`)
| File | Type | Purpose |
|------|------|---------|
| `Toast.tsx` | Preact | Toast notification component |

#### Converters (`/src/components/converters`)
| File | Type | Purpose |
|------|------|---------|
| `ConverterIsland.tsx` | Preact | Base converter component for color space conversions |

#### Export (`/src/components/export`)
| File | Type | Purpose |
|------|------|---------|
| `ExportIsland.tsx` | Preact | Export functionality (CSS, Tailwind, etc.) |

#### Generator (`/src/components/generator`)
| File | Type | Purpose |
|------|------|---------|
| `PaletteGeneratorIsland.tsx` | Preact | Color palette generator interactive UI |

#### Layout (`/src/components/layout`)
| File | Type | Purpose |
|------|------|---------|
| `Header.astro` | Astro | Site header/navigation |
| `MobileTabBar.tsx` | Preact | Mobile bottom tab bar |
| `SidebarIsland.tsx` | Preact | Collapsible sidebar navigation |

#### Palettes (`/src/components/palettes`)
| File | Type | Purpose |
|------|------|---------|
| `PaletteCard.astro` | Astro | Library card for one palette — full-bleed swatch strip, links to its own page |
| `SwatchStrip.tsx` | Preact | Contiguous swatch bar with hover readout (palette generator) |
| `PaletteDetailIsland.tsx` | Preact | A palette's own page: large colour cards, quick copy, save to a custom variable |

#### Picker (`/src/components/picker`)
| File | Type | Purpose |
|------|------|---------|
| `ColorPickerIsland.tsx` | Preact | Advanced color picker with OKLCH support |

#### Preview (`/src/components/preview`)
| File | Type | Purpose |
|------|------|---------|
| `UIPreviewIsland.tsx` | Preact | Live UI preview with color theming |
| `CartSidebar.tsx` | Preact | Design-token role/shade inspector beside the preview |
| `ColorActionPopover.tsx` | Preact | Click-action popover (cart colors, palettes, picker handoff, delete color / delete full scale) |

---

### Config (`/src/config`)

| File | Purpose |
|------|---------|
| `navigation.ts` | Site navigation structure, menu configuration, and SEO metadata for all pages |

---

### Data (`/src/data`)

| File | Purpose |
|------|---------|
| `palettes.ts` | 16 predefined color palette definitions |

---

### Hooks (`/src/hooks`)

| File | Purpose |
|------|---------|
| `useCart.ts` | Cart state and actions |
| `useShadeEditor.ts` | Shade editing logic |
| `useClipboard.ts` | Clipboard copy functionality |
| `useKeyboard.ts` | Keyboard shortcut handling |
| `useMediaQuery.ts` | Responsive breakpoint detection |
| `useDebounce.ts` | Debounced value hook |
| `useLocalStorage.ts` | Persistent local storage hook |

---

### Layouts (`/src/layouts`)

| File | Purpose |
|------|---------|
| `BaseLayout.astro` | Base HTML layout with all SEO meta tags, OG tags, Twitter cards, JSON-LD structured data |
| `AppLayout.astro` | Main application layout with header, sidebar, mobile tab bar, cart, and toast |
| `Layout.astro` | Minimal unused layout (not referenced by any page) |

---

### Pages (`/src/pages`)

File-based routing. Each `.astro` file becomes a route.

#### Root Routes
| Route | File | Purpose |
|-------|------|---------|
| `/` | `index.astro` | Homepage with color picker |
| `/export` | `export.astro` | Export tools page |
| `/ui-preview` | `ui-preview.astro` | Live UI preview tool |
| `/oklch-to-hsl` | `oklch-to-hsl.astro` | OKLCH → HSL converter |
| `/hsl-to-oklch` | `hsl-to-oklch.astro` | HSL → OKLCH converter |
| `/oklch-to-rgb` | `oklch-to-rgb.astro` | OKLCH → RGB converter |
| `/rgb-to-oklch` | `rgb-to-oklch.astro` | RGB → OKLCH converter |
| `/oklch-to-hex` | `oklch-to-hex.astro` | OKLCH → HEX converter |
| `/hex-to-oklch` | `hex-to-oklch.astro` | HEX → OKLCH converter |
| `/oklch-color-palette-generator` | `oklch-color-palette-generator.astro` | Palette generator tool |
| `/sitemap.xml` | `sitemap.xml.ts` | Auto-generated sitemap |

#### Learn Section (`/src/pages/learn`)
| Route | File | Purpose |
|-------|------|---------|
| `/learn/what-is-oklch` | `what-is-oklch.astro` | Educational article about OKLCH |

#### OKLCH Colors Section (`/src/pages/oklch-colors`)
| Route | File | Purpose |
|-------|------|---------|
| `/oklch-colors` | `index.astro` | Color palette listing |
| `/oklch-colors/[slug]` | `[slug].astro` | Individual palette detail page (16 palettes) |

---

### Stores (`/src/stores`)

| File | Purpose |
|------|---------|
| `cartStore.ts` | Nanostores-based cart state management |
| `generatorStore.ts` | Palette generator state |
| `customPaletteStore.ts` | User-saved custom palettes |

---

### Styles (`/src/styles`)

| File | Purpose |
|------|---------|
| `global.css` | Global styles, CSS variables, Tailwind v4 imports |

---

### Utils (`/src/utils`)

| File | Purpose |
|------|---------|
| `color.ts` | Color conversion utilities (OKLCH, RGB, HSL, HEX, Lab, LCH) |
| `seoTables.ts` | Build-time SEO reference tables and color data |
| `navigate.ts` | Client-side navigation helper using Astro's `navigate()` |
| `clipboard.ts` | Clipboard copy functionality |

---

## Key Patterns

### Component Types
- **`.astro`** — Server-rendered Astro components (no client JS by default)
- **`.tsx`** — Preact components (used as "islands" for interactivity)
- **Islands** — Preact components with `client:load` or `client:visible` directives

### State Management
- Uses **Nanostores** for lightweight global state
- Stores: `cartStore`, `generatorStore`, `customPaletteStore`
- Preact components consume stores via `useStore()` hook

### Color Conversions
- Centralized in `src/utils/color.ts`
- Supports: OKLCH, sRGB, HSL, HEX, Lab, LCH
- Uses `culori` library for accurate color science
- Used by all converter pages and components

### Navigation
- Defined in `src/config/navigation.ts`
- Consumed by `Header.astro`, `SidebarIsland.tsx`, `MobileTabBar.tsx`
- Client-side navigation via `src/utils/navigate.ts`

### SEO
- All metadata centralized in `src/config/navigation.ts`
- `BaseLayout.astro` generates all meta tags, OG tags, Twitter cards, JSON-LD
- Sitemap auto-generated via `src/pages/sitemap.xml.ts`
- See `SEO_PLAN.md` for complete SEO strategy

### Caching
- `public/_headers` configures Cloudflare Pages caching
- Static assets: 1 year immutable
- HTML pages: no-cache (always revalidate)
- Security headers included

---

## Common Tasks & Where to Look

| Task | Location |
|------|----------|
| Add new converter page | Create `.astro` in `src/pages/`, add to `navigation.ts` |
| Modify color conversion logic | `src/utils/color.ts` |
| Add new palette | `src/data/palettes.ts` |
| Change site navigation | `src/config/navigation.ts` |
| Modify global styles | `src/styles/global.css` |
| Add new Preact island | Create `.tsx` in appropriate `src/components/*/` |
| Change layout structure | `src/layouts/AppLayout.astro` |
| Modify cart behavior | `src/stores/cartStore.ts`, `src/components/cart/` |
| Update SEO for pages | `src/config/navigation.ts`, `src/layouts/BaseLayout.astro` |
| Modify caching rules | `public/_headers` |
| Add new hook | Create `.ts` in `src/hooks/` |

---

## Build & Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run typecheck  # or: npx tsc --noEmit
```

---

## Dependencies (Key)

| Package | Purpose |
|---------|---------|
| `astro` | Static site generator (v7.3.5) |
| `preact` | Interactive islands (v10.29.8) |
| `@astrojs/preact` | Preact integration |
| `@nanostores/preact` | State management |
| `culori` | Color science library |
| `lucide-preact` | Icon library |
| `tailwindcss` | Styling (v4.3.3) |
| `@tailwindcss/vite` | Tailwind Vite plugin |
| `typescript` | Type safety |

See `package.json` for complete list.
