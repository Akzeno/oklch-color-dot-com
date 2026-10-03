# Quick Reference: Errors & Changes

## Common Error Locations

### TypeScript Errors
| Error | Check |
|-------|-------|
| `Cannot find module '...'` | Import path in component/page; check `tsconfig.json` paths |
| `Property '...' does not exist` | Type definitions in `src/utils/color.ts` or component props |
| `JSX element type '...' missing` | React component export in `.tsx` files |
| `Module '...' has no exported member` | Check exports in `src/utils/color.ts`, `src/stores/cartStore.ts` |

### Build Errors
| Error | Check |
|-------|-------|
| `Could not resolve '...'` | Import paths; check `astro.config.mjs` aliases |
| `Component '...' not found` | Component file exists in `src/components/`; correct extension |
| `Route '...' not found` | Page file in `src/pages/`; correct naming |
| `CSS variable not defined` | `src/styles/global.css` :root variables |

### Runtime Errors
| Error | Check |
|-------|-------|
| `useStore must be used within Provider` | Component wrapped in `<Provider>` in layout |
| `Color conversion failed` | `src/utils/color.ts` - input validation |
| `Hydration mismatch` | Server/client render differences in islands |

---

## Change Impact Map

### Change: Add New Converter
1. Create page: `src/pages/new-converter.astro`
2. Add route to: `src/config/navigation.ts`
3. Add SEO data: `src/utils/seoTables.ts`
4. Use: `src/components/converters/ConverterIsland.tsx`
5. Logic: `src/utils/color.ts`

### Change: Modify Color Logic
- **Primary**: `src/utils/color.ts` - all conversion functions
- **Affects**: All converter pages, ColorPickerIsland, PaletteGeneratorIsland, UIPreviewIsland

### Change: Update Navigation
- **Primary**: `src/config/navigation.ts`
- **Consumers**: Header.astro, SidebarIsland.tsx, MobileTabBar.tsx

### Change: Add Palette
- **Data**: `src/data/palettes.ts`
- **Display**: PaletteCard.astro, oklch-colors pages

### Change: Modify Cart
- **State**: `src/stores/cartStore.ts`
- **UI**: CartDrawerIsland.tsx, CartTriggerButton.tsx

### Change: Global Styles
- **Primary**: `src/styles/global.css`
- **Tailwind**: `astro.config.mjs` (tailwind config)

### Change: Layout Structure
- **App shell**: `src/layouts/AppLayout.astro`
- **Base HTML**: `src/layouts/BaseLayout.astro`

### Change: Add Interactive Component
1. Create `.tsx` in `src/components/<feature>/`
2. Import in `.astro` page with `client:load` or `client:visible`
3. Add types if needed

---

## File Extension Guide

| Extension | Language | Runtime | Use For |
|-----------|----------|---------|---------|
| `.astro` | Astro | Server | Pages, layouts, static components |
| `.tsx` | React/TSX | Client (island) | Interactive components |
| `.ts` | TypeScript | Both | Utils, stores, config, data |
| `.css` | CSS | Browser | Global styles |

---

## Debugging Checklist

1. **Type errors** → Run `npx tsc --noEmit`
2. **Build fails** → Check `astro build` output
3. **Styles missing** → Verify `global.css` imported in `BaseLayout.astro`
4. **Island not interactive** → Check `client:*` directive in parent `.astro`
5. **Store not updating** → Verify `<Provider>` in `AppLayout.astro`
6. **Route 404** → Check `src/pages/` file exists and builds

---

## Key Imports Reference

```typescript
// Color utilities
import { oklchToRgb, rgbToOklch, hslToOklch, ... } from '@/utils/color'

// Stores
import { cartStore, useCartStore } from '@/stores/cartStore'

// Navigation
import { navigation } from '@/config/navigation'

// Palettes
import { palettes } from '@/data/palettes'

// Components (in .astro files)
import ConverterIsland from '@/components/converters/ConverterIsland.tsx'
import ColorPickerIsland from '@/components/picker/ColorPickerIsland.tsx'
```

---

## Astro Config Aliases (`astro.config.mjs`)

```javascript
// Typically configured as:
'@/*': './src/*'
```

So `@/utils/color` = `src/utils/color.ts`