# Project Structure Documentation

## Overview
This is an Astro-based web application for OKLCH color conversion tools and palette generation. The project uses React islands for interactive components.

---

## Root Directory

```
oklchcolor2.com/
├── .agents/              # Agent configurations and skills
├── .astro/               # Astro build output (generated)
├── .git/                 # Git repository
├── .vscode/              # VS Code settings
├── dist/                 # Production build output (generated)
├── node_modules/         # Dependencies (generated)
├── public/               # Static assets served directly
├── src/                  # Source code
├── .gitignore
├── AGENTS.md             # Agent instructions
├── astro.config.mjs      # Astro configuration
├── CLAUDE.md             # Claude-specific instructions
├── DESIGN.md             # Design documentation
├── package.json          # Project dependencies and scripts
├── package-lock.json     # Locked dependencies
├── README.md             # Project overview
├── skills-lock.json      # Skills lock file
├── tsconfig.json         # TypeScript configuration
```

---

## Public Directory (`/public`)

Static files served directly at root path:

| File | Purpose |
|------|---------|
| `favicon.ico` | Legacy favicon |
| `favicon.svg` | Modern SVG favicon |
| `robots.txt` | Search engine crawling rules |

---

## Source Directory (`/src`)

```
src/
├── assets/           # Static assets (images, icons)
├── components/       # Reusable UI components (Astro & React)
├── config/           # Configuration files
├── data/             # Static data files
├── layouts/          # Page layout components
├── pages/            # File-based routing (Astro pages)
├── stores/           # State management (Nanostores)
├── styles/           # Global styles
├── utils/            # Utility functions
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

#### Root Components
| File | Type | Purpose |
|------|------|---------|
| `Welcome.astro` | Astro | Welcome/hero component |

#### Cart (`/src/components/cart`)
| File | Type | Purpose |
|------|------|---------|
| `CartDrawerIsland.tsx` | React | Slide-out cart drawer (interactive) |
| `CartTriggerButton.tsx` | React | Button to open cart |

#### Common (`/src/components/common`)
| File | Type | Purpose |
|------|------|---------|
| `Toast.tsx` | React | Toast notification component |

#### Converters (`/src/components/converters`)
| File | Type | Purpose |
|------|------|---------|
| `ConverterIsland.tsx` | React | Base converter component for color space conversions |

#### Export (`/src/components/export`)
| File | Type | Purpose |
|------|------|---------|
| `ExportIsland.tsx` | React | Export functionality (CSS, Tailwind, etc.) |

#### Generator (`/src/components/generator`)
| File | Type | Purpose |
|------|------|---------|
| `PaletteGeneratorIsland.tsx` | React | Color palette generator interactive UI |

#### Layout (`/src/components/layout`)
| File | Type | Purpose |
|------|------|---------|
| `Header.astro` | Astro | Site header/navigation |
| `MobileTabBar.tsx` | React | Mobile bottom tab bar |
| `SidebarIsland.tsx` | React | Collapsible sidebar navigation |

#### Palettes (`/src/components/palettes`)
| File | Type | Purpose |
|------|------|---------|
| `PaletteCard.astro` | Astro | Display card for color palette |
| `SwatchStripIsland.tsx` | React | Interactive color swatch strip |

#### Picker (`/src/components/picker`)
| File | Type | Purpose |
|------|------|---------|
| `ColorPickerIsland.tsx` | React | Advanced color picker with OKLCH support |

#### Preview (`/src/components/preview`)
| File | Type | Purpose |
|------|------|---------|
| `UIPreviewIsland.tsx` | React | Live UI preview with color theming |
| `CartSidebar.tsx` | React | Design-token role/shade inspector beside the preview |
| `ColorActionPopover.tsx` | React | Click-action popover (cart colors, palettes, picker handoff, delete color / delete full scale) |

---

### Config (`/src/config`)

| File | Purpose |
|------|---------|
| `navigation.ts` | Site navigation structure and menu configuration |

---

### Data (`/src/data`)

| File | Purpose |
|------|---------|
| `palettes.ts` | Predefined color palette definitions |

---

### Layouts (`/src/layouts`)

| File | Purpose |
|------|---------|
| `AppLayout.astro` | Main application layout with header/sidebar |
| `BaseLayout.astro` | Base HTML layout with meta tags, fonts |
| `Layout.astro` | Simple content layout |

---

### Pages (`/src/pages`)

File-based routing. Each `.astro` file becomes a route.

#### Root Routes
| Route | File | Purpose |
|-------|------|---------|
| `/` | `index.astro` | Homepage with converter overview |
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
| `/oklch-colors/[slug]` | `[slug].astro` | Individual palette detail page |

---

### Stores (`/src/stores`)

| File | Purpose |
|------|---------|
| `cartStore.ts` | Nanostores-based cart state management |

---

### Styles (`/src/styles`)

| File | Purpose |
|------|---------|
| `global.css` | Global styles, CSS variables, Tailwind imports |

---

### Utils (`/src/utils`)

| File | Purpose |
|------|---------|
| `color.ts` | Color conversion utilities (OKLCH, RGB, HSL, HEX) |
| `seoTables.ts` | SEO metadata generation for converter pages |

---

## Key Patterns

### Component Types
- **`.astro`** - Server-rendered Astro components (no client JS by default)
- **`.tsx`** - React components (used as "islands" for interactivity)
- **Islands** - React components with `client:load` or `client:visible` directives

### State Management
- Uses **Nanostores** (`cartStore.ts`) for lightweight global state
- React components consume stores via `useStore()` hook

### Color Conversions
- Centralized in `src/utils/color.ts`
- Supports: OKLCH, sRGB, HSL, HEX, Lab, LCH
- Used by all converter pages and components

### Navigation
- Defined in `src/config/navigation.ts`
- Consumed by `Header.astro`, `SidebarIsland.tsx`, `MobileTabBar.tsx`

---

## Common Tasks & Where to Look

| Task | Location |
|------|----------|
| Add new converter page | Create `.astro` in `src/pages/`, add to `navigation.ts` |
| Modify color conversion logic | `src/utils/color.ts` |
| Add new palette | `src/data/palettes.ts` |
| Change site navigation | `src/config/navigation.ts` |
| Modify global styles | `src/styles/global.css` |
| Add new React island | Create `.tsx` in appropriate `src/components/*/` |
| Change layout structure | `src/layouts/AppLayout.astro` |
| Modify cart behavior | `src/stores/cartStore.ts`, `src/components/cart/` |
| Update SEO for converters | `src/utils/seoTables.ts`, individual page files |

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
| `astro` | Static site generator |
| `react` + `react-dom` | Interactive islands |
| `@nanostores/react` | State management |
| `tailwindcss` | Styling (v4) |
| `typescript` | Type safety |

See `package.json` for complete list.