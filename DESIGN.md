---
version: alpha
name: Clean OKLCH Modern
description: A light-first, modern UI system with one confident accent color, balanced rounded corners, and strict limits on text and density. Neutral chrome keeps palette colors accurate. Works in light and dark.

fallback:
  rule: "Every OKLCH token has a hex twin (hex is in the comment beside each token). Tokens use @supports layering; direct declarations list hex first, then oklch."
  needs-fallback: "oklch below Chrome/Edge 111, Safari 15.4, Firefox 113. light-dark below Chrome/Edge 123, Safari 17.5, Firefox 120."
  overlays: "Shadows and rings use rgb(0 0 0 / a), never oklch."

# ---------- COLORS: LIGHT (default) ----------
colors:
  # Neutrals (chroma 0)
  canvas: "oklch(0.985 0 0)"            # #fafafa  page
  surface: "oklch(1 0 0)"               # #ffffff  cards, menus, docks
  surface-muted: "oklch(0.97 0 0)"      # #f5f5f5  table headers, card footers
  surface-sunken: "oklch(0.955 0 0)"    # #f0f0f0  chips, tab track, hover fill
  hairline: "oklch(0.92 0 0)"           # #e4e4e4  default border
  hairline-strong: "oklch(0.86 0 0)"    # #d1d1d1  inputs, hover border
  ink: "oklch(0.21 0 0)"                # #181818  headings, values
  body: "oklch(0.42 0 0)"               # #4d4d4d  paragraphs
  mute: "oklch(0.52 0 0)"               # #696969  helper text, icons
  faint: "oklch(0.72 0 0)"              # #a4a4a4  placeholders, decoration only

  # Accent (hue 265 = indigo; change hue to re-theme)
  accent: "oklch(0.55 0.20 265)"        # #3665e4  primary buttons, selected, links
  accent-hover: "oklch(0.50 0.20 265)"  # #2955d3
  accent-press: "oklch(0.45 0.19 265)"  # #1f47bc
  accent-soft: "oklch(0.965 0.015 265)" # #eef4fe  selected rows, soft buttons, active nav
  accent-soft-hover: "oklch(0.935 0.028 265)" # #e0eafd
  accent-border: "oklch(0.85 0.07 265)" # #b8cefd  selected outline
  accent-text: "oklch(0.47 0.19 265)"   # #244dc3  links, accent text on white/soft
  on-accent: "oklch(1 0 0)"             # #ffffff  text on accent fill

  # Status: fill (dots, icons, bars) / soft (backgrounds) / text
  success: "oklch(0.62 0.15 150)"       # #2e9e52
  success-soft: "oklch(0.965 0.04 150)" # #e1fce6
  success-text: "oklch(0.43 0.11 150)"  # #10602d
  warning: "oklch(0.78 0.15 75)"        # #efa831
  warning-soft: "oklch(0.975 0.025 85)" # #fff6e4
  warning-text: "oklch(0.47 0.095 75)"  # #79520a
  danger: "oklch(0.58 0.21 25)"         # #db2b33
  danger-soft: "oklch(0.965 0.016 25)"  # #fef0ee
  danger-text: "oklch(0.47 0.18 25)"    # #a9131f
  info: "oklch(0.62 0.13 235)"          # #0891c9
  info-soft: "oklch(0.965 0.018 235)"   # #e8f6fe
  info-text: "oklch(0.46 0.095 235)"    # #075f85

# ---------- COLORS: DARK (soft charcoal) ----------
colors-dark:
  canvas: "oklch(0.21 0 0)"             # #181818
  surface: "oklch(0.25 0 0)"            # #222222
  surface-muted: "oklch(0.285 0 0)"     # #2a2a2a
  surface-sunken: "oklch(0.32 0 0)"     # #333333
  hairline: "oklch(0.34 0 0)"           # #383838
  hairline-strong: "oklch(0.42 0 0)"    # #4d4d4d
  ink: "oklch(0.97 0 0)"                # #f5f5f5
  body: "oklch(0.80 0 0)"               # #bebebe
  mute: "oklch(0.68 0 0)"               # #989898
  faint: "oklch(0.50 0 0)"              # #636363
  accent: "oklch(0.70 0.15 265)"        # #709afb
  accent-hover: "oklch(0.75 0.125 265)" # #87acfd
  accent-press: "oklch(0.65 0.17 265)"  # #5b89f6
  accent-soft: "oklch(0.31 0.06 265)"   # #212f4f
  accent-soft-hover: "oklch(0.35 0.08 265)" # #263864
  accent-border: "oklch(0.45 0.11 265)" # #375292
  accent-text: "oklch(0.80 0.10 265)"   # #9ebdff
  on-accent: "oklch(0.21 0 0)"          # #181818  dark text on light accent
  success: "oklch(0.74 0.16 150)"       # #51c672
  success-soft: "oklch(0.30 0.05 150)"  # #1a3520
  success-text: "oklch(0.82 0.13 150)"  # #83dc97
  warning: "oklch(0.82 0.15 75)"        # #fcb442
  warning-soft: "oklch(0.31 0.05 75)"   # #3f2c10
  warning-text: "oklch(0.86 0.11 75)"   # #fbc77c
  danger: "oklch(0.70 0.19 25)"         # #ff645f
  danger-soft: "oklch(0.31 0.07 25)"    # #4e201e
  danger-text: "oklch(0.82 0.10 25)"    # #ffaba3
  info: "oklch(0.74 0.12 235)"          # #53b6eb
  info-soft: "oklch(0.30 0.045 235)"    # #143141
  info-text: "oklch(0.82 0.09 235)"     # #89cef6

typography:
  display: { fontFamily: "Geist, Inter, system-ui, sans-serif", fontSize: 28px, fontWeight: 600, lineHeight: 36px, letterSpacing: -0.02em }
  title:   { fontFamily: "Geist, Inter, system-ui, sans-serif", fontSize: 16px, fontWeight: 600, lineHeight: 24px, letterSpacing: -0.01em }
  body:    { fontFamily: "Geist, Inter, system-ui, sans-serif", fontSize: 14px, fontWeight: 400, lineHeight: 22px }
  small:   { fontFamily: "Geist, Inter, system-ui, sans-serif", fontSize: 13px, fontWeight: 400, lineHeight: 18px }
  label:   { fontFamily: "Geist, Inter, system-ui, sans-serif", fontSize: 12px, fontWeight: 500, lineHeight: 16px }
  value:   { fontFamily: "Geist Mono, JetBrains Mono, ui-monospace, monospace", fontSize: 13px, fontWeight: 400, lineHeight: 18px }

rounded: { sm: 8px, md: 12px, lg: 16px, xl: 24px, full: 9999px }

spacing: { xxs: 4px, xs: 8px, sm: 12px, md: 16px, lg: 24px, xl: 32px, 2xl: 48px, 3xl: 64px }

shadow:
  sm: "0 1px 2px rgb(0 0 0 / 0.05)"
  md: "0 4px 16px rgb(0 0 0 / 0.08), 0 1px 2px rgb(0 0 0 / 0.04)"
  lg: "0 12px 32px rgb(0 0 0 / 0.12), 0 2px 6px rgb(0 0 0 / 0.06)"

components:
  card:           { backgroundColor: "{colors.surface}", borderColor: "{colors.hairline}", borderRadius: "{rounded.lg}", padding: "{spacing.lg}", gap: "{spacing.md}", shadow: "{shadow.sm}" }
  swatch-strip:   { height: 64px, borderRadius: "{rounded.md}", display: flex, overflow: hidden, ring: "inset 0 0 0 1px rgb(0 0 0 / 0.08) in light, rgb(255 255 255 / 0.14) in dark" }
  button-primary: { backgroundColor: "{colors.accent}", textColor: "{colors.on-accent}", borderRadius: "{rounded.sm}", height: 40px, padding: "0 16px" }
  button-secondary: { backgroundColor: "{colors.surface}", textColor: "{colors.ink}", borderColor: "{colors.hairline-strong}", borderRadius: "{rounded.sm}", height: 40px }
  button-soft:    { backgroundColor: "{colors.accent-soft}", textColor: "{colors.accent-text}", borderRadius: "{rounded.sm}", height: 40px }
  input:          { backgroundColor: "{colors.surface}", borderColor: "{colors.hairline-strong}", borderRadius: "{rounded.sm}", height: 40px, padding: "0 12px" }
  badge:          { borderRadius: "{rounded.full}", padding: "2px 10px", typography: "{typography.label}" }
  dock:           { backgroundColor: "{colors.surface}", borderColor: "{colors.hairline}", borderRadius: "{rounded.xl}", padding: "{spacing.sm} {spacing.md}", shadow: "{shadow.lg}" }
---

# Clean OKLCH Modern: Design Guide

Calm surfaces, one accent color, soft corners, very little text. The UI should be understood at a glance and never compete with the colors being tested.

---

## 1. Principles

1. **Calm over busy.** Fewer elements, more space. If it doesn't help the task, remove it.
2. **One accent.** Neutrals do the structure, a single accent marks actions and selection.
3. **60 / 30 / 10.** 60% neutral surfaces, 30% content (swatches, text), 10% accent and status.
4. **Visual first, words second.** Show a swatch, slider, or badge instead of a sentence.
5. **Space before lines.** Group with whitespace; add borders only when space isn't enough.
6. **Readable everywhere.** Real text always passes WCAG AA, in light and dark.

---

## 2. Color

### Neutrals

| Token | Light | Dark | Use |
|---|---|---|---|
| `canvas` | `oklch(0.985 0 0)` | `oklch(0.21 0 0)` | Page |
| `surface` | `oklch(1 0 0)` | `oklch(0.25 0 0)` | Cards, menus, docks |
| `surface-muted` | `oklch(0.97 0 0)` | `oklch(0.285 0 0)` | Table headers, footers |
| `surface-sunken` | `oklch(0.955 0 0)` | `oklch(0.32 0 0)` | Chips, tab track, hover fill |
| `hairline` | `oklch(0.92 0 0)` | `oklch(0.34 0 0)` | Default border |
| `hairline-strong` | `oklch(0.86 0 0)` | `oklch(0.42 0 0)` | Inputs, hover border |
| `ink` | `oklch(0.21 0 0)` | `oklch(0.97 0 0)` | Headings, values |
| `body` | `oklch(0.42 0 0)` | `oklch(0.80 0 0)` | Paragraphs |
| `mute` | `oklch(0.52 0 0)` | `oklch(0.68 0 0)` | Helper text, icons |
| `faint` | `oklch(0.72 0 0)` | `oklch(0.50 0 0)` | Placeholders only |

### Accent (indigo, hue 265)

| Token | Light | Dark | Use |
|---|---|---|---|
| `accent` | `oklch(0.55 0.20 265)` | `oklch(0.70 0.15 265)` | Primary button, toggle on, focus ring |
| `accent-hover` | `oklch(0.50 0.20 265)` | `oklch(0.75 0.125 265)` | Hover on accent fill |
| `accent-press` | `oklch(0.45 0.19 265)` | `oklch(0.65 0.17 265)` | Pressed |
| `accent-soft` | `oklch(0.965 0.015 265)` | `oklch(0.31 0.06 265)` | Selected row, soft button, active nav |
| `accent-soft-hover` | `oklch(0.935 0.028 265)` | `oklch(0.35 0.08 265)` | Hover on soft |
| `accent-border` | `oklch(0.85 0.07 265)` | `oklch(0.45 0.11 265)` | Selected outline |
| `accent-text` | `oklch(0.47 0.19 265)` | `oklch(0.80 0.10 265)` | Links, text on soft |
| `on-accent` | `oklch(1 0 0)` | `oklch(0.21 0 0)` | Text on accent fill |

**Re-theme by setting two variables: `--accent-h` (hue) and `--accent-c` (chroma).** Lightness stays fixed, so contrast stays about the same. Some hues cannot reach chroma `0.20` inside sRGB, so use the lower chroma from this table:

| Hue | Name | Light chroma |
|---|---|---|
| 265 | Indigo (default) | 0.20 |
| 300 | Violet | 0.20 |
| 350 | Pink | 0.18 |
| 25 | Red | 0.18 |
| 250 | Blue | 0.12 |
| 150 | Green | 0.12 |
| 50 | Orange | 0.12 |
| 190 | Teal | 0.075 |

In dark mode the CSS caps chroma automatically (`min()`), so you only set the light value. Re-check contrast once after changing hue.

### Status

Each status has three parts: **fill** (dots, icons, bars), **soft** (backgrounds), **text** (readable on white or soft).

| Status | Fill | Soft | Text |
|---|---|---|---|
| Success (light) | `oklch(0.62 0.15 150)` | `oklch(0.965 0.04 150)` | `oklch(0.43 0.11 150)` |
| Warning (light) | `oklch(0.78 0.15 75)` | `oklch(0.975 0.025 85)` | `oklch(0.47 0.095 75)` |
| Danger (light) | `oklch(0.58 0.21 25)` | `oklch(0.965 0.016 25)` | `oklch(0.47 0.18 25)` |
| Info (light) | `oklch(0.62 0.13 235)` | `oklch(0.965 0.018 235)` | `oklch(0.46 0.095 235)` |
| Success (dark) | `oklch(0.74 0.16 150)` | `oklch(0.30 0.05 150)` | `oklch(0.82 0.13 150)` |
| Warning (dark) | `oklch(0.82 0.15 75)` | `oklch(0.31 0.05 75)` | `oklch(0.86 0.11 75)` |
| Danger (dark) | `oklch(0.70 0.19 25)` | `oklch(0.31 0.07 25)` | `oklch(0.82 0.10 25)` |
| Info (dark) | `oklch(0.74 0.12 235)` | `oklch(0.30 0.045 235)` | `oklch(0.82 0.09 235)` |

Never rely on color alone: pair status with an icon or a one-word label.

### Contrast (checked)

| Pair | Ratio | Result |
|---|---|---|
| `ink` on `surface` | 17.8 | AAA |
| `body` on `surface` | 8.5 | AAA |
| `mute` on `surface` | 5.5 | AA |
| `on-accent` (white) on `accent` | 5.1 | AA |
| `accent-text` on `surface` / on `accent-soft` | 7.2 / 6.5 | AAA / AAA |
| Status text on its soft background | 6.4 to 7.1 | AA |
| `accent` fill vs `surface` (UI parts) | 5.1 | Passes 3:1 |
| `faint` on `surface` | 2.5 | Fail: decoration only |
| `warning` fill on `surface` | 2.0 | Fail: use `warning-text` for text |
| `on-accent` on `danger` fill (light / dark) | 4.8 / 6.1 | AA |
| Dark: `ink` / `body` / `mute` on `surface` | 14.6 / 8.6 / 5.5 | AA+ |
| Dark: `on-accent` on `accent` | 6.5 | AA |
| Dark: `accent-text` on `surface` | 8.5 | AAA |

---

## 3. Shape: balanced roundedness

Soft, but not bubbly. Corner size grows with element size.

| Token | Size | Used for |
|---|---|---|
| `sm` | 8px | Buttons, inputs, chips, tooltips |
| `md` | 12px | Swatches, menus, alerts, tab track |
| `lg` | 16px | Cards, panels |
| `xl` | 24px | Modals, floating dock |
| `full` | pill | Badges, toggles, avatars, slider thumbs |

Rules:
- **Nested corners:** inner radius = outer radius minus padding (card 16 with 8px inset → inner 8).
- **Pills are for small things only.** Buttons stay at 8px, not pill-shaped.
- Use at most **two** radius sizes in any one area.

---

## 4. Typography

| Style | Size / Line | Weight | Use |
|---|---|---|---|
| `display` | 28 / 36 | 600 | Page title, once |
| `title` | 16 / 24 | 600 | Card titles |
| `body` | 14 / 22 | 400 | Default text |
| `small` | 13 / 18 | 400 | Helper text |
| `label` | 12 / 16 | 500 | Badges, slider labels |
| `value` | 13 / 18 mono | 400 | Every number and hex |

Font: Geist or Inter. Mono: Geist Mono or JetBrains Mono. Only three weights: 400, 500, 600. Never below 12px.

---

## 5. Spacing, layout, elevation

| What | Value |
|---|---|
| Scale | 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 |
| Card padding | 24 (20 on mobile) |
| Inside a card | 16 between groups, 8 between label and control |
| Between cards | 24 |
| Between page sections | 48 |
| Max content width | 1200, centered |
| Card grid | 3 columns desktop · 2 tablet · 1 mobile |
| Click target | 40 tall (44 on touch) |

**Elevation:** cards use a hairline + `shadow-sm`. Hover on a clickable card → `shadow-md`. Floating things (dock, menus) → `shadow-lg`. Never a heavy border and a heavy shadow together.

---

## 6. Keep it uncluttered

The balance between text and UI is set by hard limits. Stay under them.

### Text budget

| Element | Limit |
|---|---|
| Page | 1 title + at most 1 short subtitle line |
| Section header | 1 to 3 words |
| Card | 1 title + 1 visual + at most 3 text items |
| Label | 1 to 3 words |
| Helper text | 1 line, under 60 characters |
| Button | 1 to 2 words, verb first (`Copy`, `Export`) |
| Tooltip | 8 words or fewer |
| Empty state | Icon + 1 line + 1 button |

### Density budget

| Element | Limit |
|---|---|
| Primary buttons per view | 1 |
| Visible actions per card | 2, the rest go in a `⋯` menu |
| Cards above the fold | 6 |
| Text levels per card | 3 (`ink` → `body` → `mute`) |
| Border levels per card | 1 |
| Colors in UI chrome | Neutrals + 1 accent (status only when needed) |

### Tactics
- **Swap words for visuals:** a swatch instead of "blue", a gradient track instead of instructions, a badge instead of a sentence.
- **Hide detail until asked:** tooltips, expanders, and menus hold the extra info.
- **Hierarchy comes from size, weight, and tone**, not boxes, underlines, or extra colors.
- **Group tightly, separate loosely:** 16px inside a group, 32px or more between groups.
- **One left edge:** align text and controls to the same start line.

### Before / after

| Too much | Better |
|---|---|
| "Primary Palette: This palette contains 12 shades generated from your base color. Click any swatch to copy its value. Learn more about how it works." | **Primary** · `12` · swatch strip · `Copy` · `⋯` |

---

## 7. Components

| Component | Spec |
|---|---|
| **Primary button** | `accent` fill, `on-accent` text, 40px, 8px radius, weight 500. Hover `accent-hover`, press `accent-press` |
| **Secondary button** | `surface` fill, 1px `hairline-strong`, `ink` text. Hover fills `surface-sunken` |
| **Soft button** | `accent-soft` fill, `accent-text` text. Hover `accent-soft-hover` |
| **Ghost button** | No fill, `body` text. Hover fills `surface-sunken` |
| **Danger button** | `danger` fill, `on-accent` text (white in light, charcoal in dark). Destructive actions only |
| **Input** | `surface` fill, 1px `hairline-strong`, 40px, 8px radius. Focus: `accent` border + 3px ring at 25% accent |
| **Card** | `surface`, 1px `hairline`, 16px radius, 24px padding, `shadow-sm` |
| **Swatch strip** | 64px tall, 12px radius, flush swatches, a 1px ring drawn **over** the strip (`--swatch-ring`: black 8% in light, white 14% in dark) so light swatches on white and dark swatches on charcoal stay visible. Hover: scale 1.04 + tooltip with L C H and hex. Click: copy |
| **Value chip** | `surface-sunken`, mono 13px, 8px radius, `6px 10px` padding. Click to copy |
| **Navbar** | 56px, `surface`, bottom hairline. Links `body` → `ink` on hover. Active link: `accent-soft` pill with `accent-text` |
| **Tabs (segmented)** | Track `surface-sunken`, 12px radius, 4px inset. Active tab: `surface`, 8px radius, `shadow-sm`, `ink`. Inactive: `mute` |
| **Badge** | Pill, 12px label, status `soft` fill + status `text`. No border |
| **Alert** | Status `soft` fill, 12px radius, 16px padding, icon in status `fill`, `ink` text. No border |
| **Toggle** | 40×24 pill. On: `accent`. Off: `hairline-strong`. 20px white thumb |
| **Slider (L, C, H)** | 12px track with live OKLCH gradient, 20px white thumb with `shadow-sm`. Label left, mono value right |
| **Floating dock** | `surface`, 1px hairline, 24px radius, `shadow-lg`, anchored bottom center. Holds sliders and copy actions |
| **Tooltip** | `ink` fill, `canvas` text, 12px mono, 8px radius, 8px padding |
| **Gamut badge** | Tiny pill on the swatch corner: dot + `P3` or `sRGB!`. No warning paragraphs |

---

## 8. States

| State | Treatment |
|---|---|
| Hover | Border → `hairline-strong`, or fill → `surface-sunken` |
| Pressed | Scale 0.98, darker accent step |
| Focus-visible | 2px `accent` outline, 2px offset. Always visible |
| Selected | `accent-soft` fill + 1px `accent-border` |
| Disabled | 45% opacity, `not-allowed` cursor |
| Error | `danger` border + one-line `danger-text` message |
| Copied | `success-text` + check icon for 1.2s |
| Loading | `surface-sunken` skeleton, no spinner over swatches |

All transitions: `150ms ease`, on color, border, and transform only.

---

## 9. Browser support and fallbacks

Older browsers ignore colors they don't understand, which leaves the UI with no color. Every OKLCH token therefore ships with a hex twin.

### 9.1 Who needs the fallback

| Feature | Chrome / Edge | Safari | Firefox |
|---|---|---|---|
| `oklch()` | 111 | 15.4 | 113 |
| `light-dark()` | 123 | 17.5 | 120 |

Anything older gets the hex fallback layers. The hex values sit next to every token in the frontmatter above.

### 9.2 Fallback rules

| Case | Rule |
|---|---|
| **Color tokens** (custom properties) | Declare hex tokens first, then override with OKLCH **inside `@supports`**. Never write `--x: #hex;` then `--x: oklch(...)` expecting a fallback: custom properties accept any value, so the second line wins and the color breaks in old browsers |
| **Colors written directly** in a property | Hex line first, OKLCH line after. Old browsers drop the line they can't parse. This does **not** work with `var()` |
| **Black and white overlays** (shadows, rings) | Use `rgb(0 0 0 / 0.08)`, not OKLCH. Same look, works everywhere, no fallback needed |
| **Gradients** | Plain `linear-gradient(...)` first, then `linear-gradient(in oklch ...)` |
| **Dark mode** | The fallback layer follows `prefers-color-scheme` and `data-theme`. `light-dark()` is used only in the OKLCH layer |
| **Re-theming** | `--accent-h` and `--accent-c` change the OKLCH layer only. The fallback accent stays indigo hex. If you change the accent, convert the new values to hex and update the fallback rows |
| **Testing** | Rename `oklch` to `oklchx` inside both `@supports` conditions to preview the fallback layers |

### 9.3 Drop-in CSS

Three layers: **1** base (hex, light) → **2** hex dark, only when OKLCH is unsupported → **3** OKLCH with `light-dark()`, only when fully supported. The `@supports` test checks everything layer 3 uses (`oklch`, `light-dark`, `min`, `calc`), so a browser that supports only part of it safely stays on the hex layers.

```css
/* ===== Layer 1: base. Hex, light. Works in every browser ===== */
:root {
  color-scheme: light;
  --accent-h: 265;            /* layer 3 only */
  --accent-c: 0.20;           /* layer 3 only */
  --canvas: #fafafa; --surface: #ffffff; --surface-muted: #f5f5f5; --surface-sunken: #f0f0f0;
  --hairline: #e4e4e4; --hairline-strong: #d1d1d1;
  --ink: #181818; --body: #4d4d4d; --mute: #696969; --faint: #a4a4a4;
  --accent: #3665e4; --accent-hover: #2955d3; --accent-press: #1f47bc; --accent-soft: #eef4fe;
  --accent-soft-hover: #e0eafd; --accent-border: #b8cefd; --accent-text: #244dc3; --on-accent: #ffffff;
  --success: #2e9e52; --success-soft: #e1fce6; --success-text: #10602d;
  --warning: #efa831; --warning-soft: #fff6e4; --warning-text: #79520a;
  --danger: #db2b33; --danger-soft: #fef0ee; --danger-text: #a9131f;
  --info: #0891c9; --info-soft: #e8f6fe; --info-text: #075f85;
  --swatch-ring: rgb(0 0 0 / 0.08);
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 16px rgb(0 0 0 / 0.08);
  --shadow-lg: 0 12px 32px rgb(0 0 0 / 0.12);
  --r-sm: 8px; --r-md: 12px; --r-lg: 16px; --r-xl: 24px;
  --font: Geist, Inter, system-ui, sans-serif;
  --mono: "Geist Mono", "JetBrains Mono", ui-monospace, monospace;
}

/* ===== Layer 2: hex dark, only if OKLCH is NOT fully supported ===== */
@supports not (color: light-dark(oklch(0.5 min(0.2, 0.15) 265), oklch(0.7 calc(0.2 * 0.95) 265))) {
  @media (prefers-color-scheme: dark) {        /* system dark, unless the page forces light */
    :root:not([data-theme="light"]) {
      color-scheme: dark;
      --canvas: #181818; --surface: #222222; --surface-muted: #2a2a2a; --surface-sunken: #333333;
      --hairline: #383838; --hairline-strong: #4d4d4d;
      --ink: #f5f5f5; --body: #bebebe; --mute: #989898; --faint: #636363;
      --accent: #709afb; --accent-hover: #87acfd; --accent-press: #5b89f6; --accent-soft: #212f4f;
      --accent-soft-hover: #263864; --accent-border: #375292; --accent-text: #9ebdff; --on-accent: #181818;
      --success: #51c672; --success-soft: #1a3520; --success-text: #83dc97;
      --warning: #fcb442; --warning-soft: #3f2c10; --warning-text: #fbc77c;
      --danger: #ff645f; --danger-soft: #4e201e; --danger-text: #ffaba3;
      --info: #53b6eb; --info-soft: #143141; --info-text: #89cef6;
      --swatch-ring: rgb(255 255 255 / 0.14);
      --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.30);
      --shadow-md: 0 4px 16px rgb(0 0 0 / 0.40);
      --shadow-lg: 0 12px 32px rgb(0 0 0 / 0.50);
    }
  }
  :root[data-theme="dark"] {                   /* forced dark: same values as above */
    color-scheme: dark;
    --canvas: #181818; --surface: #222222; --surface-muted: #2a2a2a; --surface-sunken: #333333;
    --hairline: #383838; --hairline-strong: #4d4d4d;
    --ink: #f5f5f5; --body: #bebebe; --mute: #989898; --faint: #636363;
    --accent: #709afb; --accent-hover: #87acfd; --accent-press: #5b89f6; --accent-soft: #212f4f;
    --accent-soft-hover: #263864; --accent-border: #375292; --accent-text: #9ebdff; --on-accent: #181818;
    --success: #51c672; --success-soft: #1a3520; --success-text: #83dc97;
    --warning: #fcb442; --warning-soft: #3f2c10; --warning-text: #fbc77c;
    --danger: #ff645f; --danger-soft: #4e201e; --danger-text: #ffaba3;
    --info: #53b6eb; --info-soft: #143141; --info-text: #89cef6;
    --swatch-ring: rgb(255 255 255 / 0.14);
    --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.30);
    --shadow-md: 0 4px 16px rgb(0 0 0 / 0.40);
    --shadow-lg: 0 12px 32px rgb(0 0 0 / 0.50);
  }
}

/* ===== Layer 3: OKLCH, only if fully supported ===== */
@supports (color: light-dark(oklch(0.5 min(0.2, 0.15) 265), oklch(0.7 calc(0.2 * 0.95) 265))) {
  :root {
    color-scheme: light dark;   /* follows the system theme */

    /* neutrals */
    --canvas:          light-dark(oklch(0.985 0 0), oklch(0.21 0 0));
    --surface:         light-dark(oklch(1 0 0),     oklch(0.25 0 0));
    --surface-muted:   light-dark(oklch(0.97 0 0),  oklch(0.285 0 0));
    --surface-sunken:  light-dark(oklch(0.955 0 0), oklch(0.32 0 0));
    --hairline:        light-dark(oklch(0.92 0 0),  oklch(0.34 0 0));
    --hairline-strong: light-dark(oklch(0.86 0 0),  oklch(0.42 0 0));
    --ink:   light-dark(oklch(0.21 0 0), oklch(0.97 0 0));
    --body:  light-dark(oklch(0.42 0 0), oklch(0.80 0 0));
    --mute:  light-dark(oklch(0.52 0 0), oklch(0.68 0 0));
    --faint: light-dark(oklch(0.72 0 0), oklch(0.50 0 0));

    /* accent */
    --accent:            light-dark(oklch(0.55 var(--accent-c) var(--accent-h)), oklch(0.70 min(var(--accent-c), 0.15) var(--accent-h)));
    --accent-hover:      light-dark(oklch(0.50 var(--accent-c) var(--accent-h)), oklch(0.75 min(var(--accent-c), 0.125) var(--accent-h)));
    --accent-press:      light-dark(oklch(0.45 calc(var(--accent-c) * 0.95) var(--accent-h)), oklch(0.65 min(var(--accent-c), 0.17) var(--accent-h)));
    --accent-soft:       light-dark(oklch(0.965 0.015 var(--accent-h)), oklch(0.31 0.06 var(--accent-h)));
    --accent-soft-hover: light-dark(oklch(0.935 0.028 var(--accent-h)), oklch(0.35 0.08 var(--accent-h)));
    --accent-border:     light-dark(oklch(0.85 0.07 var(--accent-h)),   oklch(0.45 0.11 var(--accent-h)));
    --accent-text:       light-dark(oklch(0.47 min(var(--accent-c), 0.19) var(--accent-h)), oklch(0.80 0.10 var(--accent-h)));
    --on-accent:         light-dark(oklch(1 0 0), oklch(0.21 0 0));

    /* status: fill / soft / text */
    --success:      light-dark(oklch(0.62 0.15 150), oklch(0.74 0.16 150));
    --success-soft: light-dark(oklch(0.965 0.04 150), oklch(0.30 0.05 150));
    --success-text: light-dark(oklch(0.43 0.11 150), oklch(0.82 0.13 150));
    --warning:      light-dark(oklch(0.78 0.15 75),  oklch(0.82 0.15 75));
    --warning-soft: light-dark(oklch(0.975 0.025 85), oklch(0.31 0.05 75));
    --warning-text: light-dark(oklch(0.47 0.095 75), oklch(0.86 0.11 75));
    --danger:       light-dark(oklch(0.58 0.21 25),  oklch(0.70 0.19 25));
    --danger-soft:  light-dark(oklch(0.965 0.016 25), oklch(0.31 0.07 25));
    --danger-text:  light-dark(oklch(0.47 0.18 25),  oklch(0.82 0.10 25));
    --info:         light-dark(oklch(0.62 0.13 235), oklch(0.74 0.12 235));
    --info-soft:    light-dark(oklch(0.965 0.018 235), oklch(0.30 0.045 235));
    --info-text:    light-dark(oklch(0.46 0.095 235), oklch(0.82 0.09 235));
    /* shape + elevation (rgb: same look as oklch for pure black/white) */
    --swatch-ring: light-dark(rgb(0 0 0 / 0.08), rgb(255 255 255 / 0.14));
    --shadow-sm: 0 1px 2px light-dark(rgb(0 0 0 / 0.05), rgb(0 0 0 / 0.30));
    --shadow-md: 0 4px 16px light-dark(rgb(0 0 0 / 0.08), rgb(0 0 0 / 0.40));
    --shadow-lg: 0 12px 32px light-dark(rgb(0 0 0 / 0.12), rgb(0 0 0 / 0.50));
  }
  :root[data-theme="light"] { color-scheme: light; }
  :root[data-theme="dark"]  { color-scheme: dark; }
}

/* ===== Components: tokens only, no layer logic needed ===== */
body { background: var(--canvas); color: var(--body); font: 400 14px/22px var(--font); }

.card {
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: var(--r-lg);
  padding: 24px;
  box-shadow: var(--shadow-sm);
}

.btn {
  height: 40px; padding: 0 16px;
  border-radius: var(--r-sm);
  font: 500 14px var(--font);
  transition: background 150ms ease, border-color 150ms ease, transform 150ms ease;
}
.btn-primary { background: var(--accent); color: var(--on-accent); border: 0; }
.btn-primary:hover  { background: var(--accent-hover); }
.btn-primary:active { background: var(--accent-press); transform: scale(0.98); }
.btn-danger { background: var(--danger); color: var(--on-accent); border: 0; }

.swatch-strip { position: relative; display: flex; height: 64px; border-radius: var(--r-md); overflow: hidden; }
.swatch-strip::after {            /* ring sits over the swatches, in both themes */
  content: ""; position: absolute; inset: 0; border-radius: inherit;
  box-shadow: inset 0 0 0 1px var(--swatch-ring); pointer-events: none;
}
.swatch { flex: 1; transition: transform 150ms ease; }
.swatch:hover { transform: scale(1.04); position: relative; z-index: 1; }

:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* ===== Direct colors and gradients: fallback line first ===== */
.badge-new { background: #e1fce6; background: oklch(0.965 0.04 150); }
.track     { background: linear-gradient(to right, #3665e4, #b8cefd);
             background: linear-gradient(in oklch to right, oklch(0.55 0.20 265), oklch(0.85 0.07 265)); }
```

---

## 10. Do and Don't

**Do**
- Use `accent` for the one main action and for selection, nothing else.
- Let whitespace group things before reaching for a border or a box.
- Keep every number in mono.
- Use soft status backgrounds (`*-soft` + `*-text`) for badges and alerts.
- Add the swatch ring so light swatches (in light) and dark swatches (in dark) stay visible.
- Ship a hex fallback for every OKLCH token (section 9).

**Don't**
- Don't add a second accent color or tint the neutrals.
- Don't write paragraphs inside the UI. Use a label, a value, or a tooltip.
- Don't use pill-shaped buttons or radius above 24px on cards.
- Don't use `faint` or any status **fill** for readable text.
- Don't show more than one primary button per view.
- Don't go darker than `oklch(0.21)` in dark mode.
- Don't redeclare a custom property as `oklch()` after a hex value and expect a fallback. Use `@supports`.

---

## 11. Quick checklist

- [ ] One primary button, one accent color
- [ ] Every card: 1 title, 1 visual, 3 or fewer text items
- [ ] Text 14px+ (labels 12px+), passes AA
- [ ] Corners follow the scale (8 / 12 / 16 / 24 / pill)
- [ ] Focus ring visible on every control
- [ ] Swatches visible on cards in both themes (ring)
- [ ] Light and dark both checked
- [ ] Fallback layers present and previewed (rename `oklch` to `oklchx` in both `@supports` tests)