---
version: alpha
name: Vercel Analysis
description: A visual-first, perceptually neutral UI system designed specifically for color tools and palettes. Minimalist dark-slate canvas (oklch(0.14 0 0)), maximum area for color swatches, dynamic visual slider tracks, zero decorative text, and high-precision monospaced HUD controls.

colors:
  # Neutral Canvas Stack (Perceptually neutral grays to avoid color distortion)
  canvas: "#0a0a0a"             # oklch(0.12 0 0) - Ultra-dark background
  canvas-card: "#141414"        # oklch(0.16 0 0) - Swatch card container
  canvas-elevated: "#1f1f1f"    # oklch(0.20 0 0) - Floating docks, dropdowns, tooltips
  canvas-input: "#171717"       # Input field background
  
  # Borders & Divides
  hairline: "#262626"           # 1px border for subtle card structures
  hairline-subtle: "#1a1a1a"    # Faint inner dividers between swatches
  border-focus: "#525252"       # Neutral white/gray ring on hover or focus

  # Ink / Text Ladder
  ink: "#f5f5f5"                # Primary numeric values, headers, active states
  body: "#a3a3a3"               # Muted labels, secondary copy
  mute: "#737373"               # Micro icons, disabled states
  faint: "#404040"              # Subtle placeholders

  # Semantic / Functional Overlays
  gamut-warning: "#f59e0b"      # Out-of-sRGB gamut indicator
  gamut-p3: "#06b6d4"           # Display-P3 wide gamut indicator
  copy-success: "#22c55e"       # Micro-toast flash on value copy

typography:
  display-title:
    fontFamily: Geist, Inter, system-ui, sans-serif
    fontSize: 24px
    fontWeight: 600
    lineHeight: 32px
    letterSpacing: -0.5px
  heading-card:
    fontFamily: Geist, Inter, system-ui, sans-serif
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: -0.2px
  label-mono:
    fontFamily: Geist Mono, JetBrains Mono, ui-monospace, monospace
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0
  value-hud:
    fontFamily: Geist Mono, JetBrains Mono, ui-monospace, monospace
    fontSize: 13px
    fontWeight: 400
    lineHeight: 18px
    letterSpacing: 0
  body-sm:
    fontFamily: Geist, Inter, system-ui, sans-serif
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: 0

rounded:
  none: 0px
  sm: 6px       # Input fields, small badges, copy pills
  md: 10px      # Individual swatch blocks, slider thumbs
  lg: 14px      # Palette cards, floating dock panels
  full: 9999px  # Category pills, icon buttons

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  2xl: 32px
  3xl: 48px

components:
  palette-card:
    backgroundColor: "{colors.canvas-card}"
    borderColor: "{colors.hairline}"
    borderRadius: "{rounded.lg}"
    padding: "{spacing.md}"
    gap: "{spacing.sm}"

  swatch-strip:
    height: "48px"
    borderRadius: "{rounded.md}"
    borderColor: "{colors.hairline}"
    overflow: "hidden"
    display: "flex"

  swatch-item:
    flex: "1"
    height: "100%"
    transition: "transform 150ms ease, z-index 0ms"
    hoverState: "scale-105 z-10 shadow-lg"

  slider-track-visual:
    height: "12px"
    borderRadius: "{rounded.full}"
    border: "1px solid {colors.hairline}"
    note: "Must render live CSS oklch gradient background along the active L, C, or H axis"

  color-hud:
    backgroundColor: "{colors.canvas-input}"
    borderColor: "{colors.hairline}"
    textColor: "{colors.ink}"
    typography: "{typography.value-hud}"
    borderRadius: "{rounded.sm}"
    padding: "{spacing.xs} {spacing.sm}"

  gamut-badge:
    backgroundColor: "rgba(0, 0, 0, 0.6)"
    backdropFilter: "blur(4px)"
    textColor: "{colors.gamut-warning}"
    typography: "{typography.label-mono}"
    borderRadius: "{rounded.full}"
    padding: "2px 8px"

  docked-toolbar:
    backgroundColor: "rgba(20, 20, 20, 0.85)"
    backdropFilter: "blur(12px)"
    borderColor: "{colors.hairline}"
    borderRadius: "{rounded.lg}"
    padding: "{spacing.sm} {spacing.md}"

---

# DESIGN SYSTEM SPECIFICATION (oklch.fyi Style)

## 1. Core Atmosphere & Principles
- **Color is the Content:** 80% of the UI surface is devoted to raw color previews and contiguous swatch bars.
- **Perceptually Neutral Framing:** All UI chrome uses dark, un-saturated neutral grays (`#0a0a0a` to `#1f1f1f`). Never use tinted backgrounds (like deep blue or purple dark modes), as they warp human perception of surrounding OKLCH colors.
- **Zero Inline Copy:** Remove introductory descriptions, long label texts, and descriptive paragraphs. Replace text instructions with interactive slider gradients, monospaced numeric HUDs, and visual hover states.
- **Micro-Interactions over Static Text:** Clicking any color strip or HUD item instantly copies the `oklch()` string or Hex value, accompanied by a subtle 150ms micro-toast feedback.

## 2. Layout & Card Architecture

### Palette Card (as seen on oklch.fyi)
Each palette card is a compact, self-contained unit:
1. **Header Row:**
   - Left: Palette Title (`{typography.heading-card}`) + Muted Category Label.
   - Right: Color Step Count Badge (`12 colors`) formatted as a mono pill badge.
2. **Swatch Bar (Hero Element):**
   - A contiguous horizontal row (`height: 48px`, `{rounded.md}`) displaying all steps side by side.
   - On hover, individual swatches scale slightly (`scale-105`) and show a tooltip with exact `L`, `C`, `H` and `Hex` values.
3. **Footer Action Bar:**
   - Minimal monospace action links (`View Palette →`, `Copy CSS`, `Export JSON`).
   - Muted text (`{colors.body}`) that brightens to white (`{colors.ink}`) on hover.

### Single Color / Picker Interface
- **Primary Preview:** Large full-width visual canvas or interactive gradient map.
- **Floating Dock:** Main controls (Lightness, Chroma, Hue sliders) live inside a floating glass-morphism dock (`backdrop-blur-md`) anchored at the bottom or side.
- **Live Visual Sliders:** Slider backgrounds are dynamically rendered linear gradients showing the exact color spectrum achievable by moving that specific handle.

## 3. Do's and Don'ts

### Do
- Use **Geist Mono** or **JetBrains Mono** for all numerical values (`L: 0.65`, `C: 0.18`, `H: 142°`).
- Keep borders thin (1px `{colors.hairline}`) and shadows low-alpha (`rgba(0,0,0,0.4)`).
- Hide wide-gamut (P3 / sRGB) warnings inside tiny badge icons on the swatch rather than displaying warning text blocks.
- Keep layout transitions under 150ms for tactile, instant feedback.

### Don't
- Don't use colorful buttons (e.g., bright blue or purple primary CTAs) that compete with the colors being generated.
- Don't write paragraph descriptions or instructions.
- Don't use white or light backgrounds by default—high ambient brightness causes eye fatigue and distorts color perception during palette editing.
- Don't use bulky card padding—keep gaps tight (`8px` to `16px`).