export interface SEOMetadata {
  title: string;
  metaDescription: string;
  h1: string;
  keywords: string[];
  schemaType: 'WebApplication' | 'CollectionPage' | 'Article';
  ogImage?: string;
  datePublished?: string;
  dateModified?: string;
  faqs?: Array<{ question: string; answer: string }>;
  related?: string[];
}

export interface NavItem {
  id: string;
  labelKey: string;
  defaultLabel: string;
  icon: string; // Lucide icon name
  path: string;
  order: number;
  group: 'tools' | 'converters' | 'system' | 'learn';
  showInMobileBar?: boolean;
  mobileBarOrder?: number;
  badge?: string;
  seo: SEOMetadata;
  children?: NavItem[];
}

const PUBLISHED = '2026-10-04';
const MODIFIED = '2026-10-07';

export const navigationConfig: NavItem[] = [
  {
    id: 'picker',
    labelKey: 'nav.picker',
    defaultLabel: 'Color Picker',
    icon: 'Pipette',
    path: '/',
    order: 1,
    group: 'tools',
    showInMobileBar: true,
    mobileBarOrder: 1,
    seo: {
      title: 'OKLCH Color Picker - CSS oklch() Tool for Tailwind v4',
      metaDescription:
        'Free OKLCH color picker with live L, C, H sliders, Display-P3 gamut warnings and one-click Tailwind CSS v4 token export. Copy oklch() values instantly.',
      h1: 'OKLCH Color Picker',
      keywords: ['oklch color picker', 'oklch picker', 'css oklch', 'display-p3 color picker', 'perceptual color picker'],
      schemaType: 'WebApplication',
      datePublished: PUBLISHED,
      dateModified: MODIFIED,
      // Verbatim copy of the visible FAQ section on the page (source of
      // truth: src/pages/index.astro) — keep the two in sync.
      faqs: [
        {
          question: 'What is the difference between OKLCH and HSL?',
          answer:
            'HSL distorts perceived brightness: yellow at 50% lightness looks almost white, while blue at 50% lightness looks dark. OKLCH fixes this with mathematically modeled human visual perception, ensuring lightness is uniform regardless of hue.',
        },
        {
          question: 'Do all modern browsers support CSS oklch()?',
          answer:
            'Yes! Chrome 111+, Safari 15.4+, Firefox 113+, and Edge 111+ support oklch() natively, representing over 93% global browser adoption.',
        },
        {
          question: 'How does the color cart work?',
          answer:
            'Whenever you click "Add to Cart" or tap a swatch from our palettes, that exact single color is placed into your chosen UI role (e.g. Primary, Trusty Button, Danger). It automatically slots into the closest shade step (50–950), which you can then preview on real dummy UI components or export to Tailwind v4.',
        },
        {
          question: 'What does "sRGB" mean on the gamut badge?',
          answer:
            'The color fits inside sRGB — the standard gamut that every screen, browser, and CSS color function can display. The badge\'s green dot means what you see on the canvas is exactly what the copied oklch() value will render: nothing is being clamped, so the swatch is a literal preview of the value.',
        },
        {
          question: 'What does "Display-P3" mean on the gamut badge?',
          answer:
            'The color is more vivid than sRGB can reproduce, but still fits Display-P3 — the wider gamut used by modern phones, laptops, and monitors. Wide-gamut displays show it at full intensity; on older sRGB-only screens the browser gamut-maps it back toward sRGB, so it may look slightly less vivid there. It is a real, usable color — just one that benefits from a P3 display to appreciate fully.',
        },
        {
          question: 'What does "Clipped" mean on the gamut badge?',
          answer:
            'The color is too saturated even for Display-P3, so no current screen can show it as authored — the browser clamps it to the nearest displayable color and the swatch becomes an approximation of your OKLCH values rather than the values themselves. Lower the Chroma slider (its max label shows the sRGB ceiling for that lightness and hue) until the badge reads sRGB or Display-P3 to get a color you can trust.',
        },
      ],
    },
  },
  {
    id: 'palettes',
    labelKey: 'nav.palettes',
    defaultLabel: 'Palette Library',
    icon: 'Palette',
    path: '/oklch-colors',
    order: 2,
    group: 'tools',
    showInMobileBar: true,
    mobileBarOrder: 2,
    seo: {
      title: 'OKLCH Color Palettes - 16 Scales, 50-950, Tailwind v4',
      metaDescription:
        'Browse 16 curated OKLCH color palettes, each an 11-step 50-950 scale. Copy any oklch() value or save shades as Tailwind CSS v4 design tokens.',
      h1: 'OKLCH Color Palettes',
      keywords: ['oklch color palettes', 'oklch colors', 'radix oklch', 'tailwind v4 palettes', 'accessible color scales'],
      schemaType: 'CollectionPage',
      datePublished: PUBLISHED,
      dateModified: MODIFIED,
    },
  },
  {
    id: 'generator',
    labelKey: 'nav.generator',
    defaultLabel: 'Palette Generator',
    icon: 'Sparkles',
    path: '/oklch-color-palette-generator',
    order: 3,
    group: 'tools',
    showInMobileBar: false,
    seo: {
      title: 'OKLCH Color Palette Generator - Accessible 50-950 Scale',
      metaDescription:
        'Enter any base color and generate an accessible 50-950 OKLCH palette with even lightness and gamut-safe chroma. Copy as CSS or Tailwind v4.',
      h1: 'OKLCH Color Palette Generator',
      keywords: ['oklch palette generator', 'color scale generator 50-950', 'oklch harmonies', 'tailwind v4 color scale generator'],
      schemaType: 'WebApplication',
      datePublished: PUBLISHED,
      dateModified: MODIFIED,
    },
  },
  {
    id: 'converters',
    labelKey: 'nav.converters',
    defaultLabel: 'Converters',
    icon: 'ArrowLeftRight',
    // The hub page, not a duplicate of the child /hex-to-oklch route. This path
    // used to equal the first child's, which put /hex-to-oklch in the sitemap
    // twice and gave the mobile "Convert" tab an arbitrary landing page.
    path: '/oklch-converter',
    order: 4,
    group: 'converters',
    showInMobileBar: true,
    mobileBarOrder: 3,
    seo: {
      title: 'OKLCH Converter - HEX, RGB & HSL to oklch() CSS',
      metaDescription:
        'Pick the OKLCH converter you need: turn HEX, RGB or HSL colors into CSS oklch(), or turn oklch() back into any of them, with live gamut detection.',
      h1: 'OKLCH Converter',
      keywords: ['oklch converter', 'convert to oklch', 'color to oklch', 'oklch color converter'],
      schemaType: 'CollectionPage',
      datePublished: PUBLISHED,
      dateModified: MODIFIED,
    },
    children: [
      {
        id: 'hex-to-oklch',
        labelKey: 'nav.hexToOklch',
        defaultLabel: 'HEX to OKLCH',
        icon: 'Hash',
        path: '/hex-to-oklch',
        order: 1,
        group: 'converters',
        seo: {
          title: 'HEX to OKLCH Converter - Free CSS oklch() Tool',
          metaDescription:
            'Convert 3, 6 or 8-digit HEX colors to CSS oklch() instantly. Free HEX to OKLCH converter with live sRGB and Display-P3 gamut detection.',
          h1: 'HEX to OKLCH Converter',
          keywords: ['hex to oklch', 'hex to oklch converter', 'convert hex to oklch'],
          schemaType: 'WebApplication',
          datePublished: PUBLISHED,
          dateModified: MODIFIED,
          // Verbatim copy of the visible FAQ section on the page (source of
          // truth: src/pages/hex-to-oklch.astro) — keep the two in sync.
          faqs: [
            {
              question: 'Are HEX to OKLCH conversions reversible without loss?',
              answer:
                'Yes. Because sRGB is a mathematical subset of OKLCH, converting a HEX value into OKLCH and then back to HEX yields the exact original 6-digit hexadecimal code. The round-trip is lossless for all sRGB colors.',
            },
            {
              question: 'Can I paste 3-digit shorthand HEX codes?',
              answer:
                'Yes! Our converter natively parses shorthand codes like #fff or #f00 and expands them correctly. Each digit is duplicated (#f00 → #ff0000) before conversion.',
            },
            {
              question: 'What is the difference between OKLCH and HEX?',
              answer:
                'HEX is a device-dependent sRGB notation that mixes red, green, and blue channels. OKLCH is a perceptually uniform color space that separates lightness, chroma, and hue — making it far easier to create accessible, consistent color systems.',
            },
            {
              question: 'Do all modern browsers support CSS oklch()?',
              answer:
                'Yes. oklch() is a Baseline feature available across all modern browsers since May 2023. Chrome, Edge, Safari, and Firefox all support it natively. See the MDN browser compatibility table for details.',
            },
            {
              question: 'How do I use OKLCH in Tailwind CSS v4?',
              answer:
                'Tailwind v4 uses OKLCH for its entire default palette. Define custom colors in your @theme block using --color-{name}: oklch(...) and Tailwind generates utilities like bg-{name} automatically.',
            },
          ],
        },
      },
      {
        id: 'oklch-to-hex',
        labelKey: 'nav.oklchToHex',
        defaultLabel: 'OKLCH to HEX',
        icon: 'FileCode2',
        path: '/oklch-to-hex',
        order: 2,
        group: 'converters',
        seo: {
          title: 'OKLCH to HEX Converter - Free CSS Color Tool',
          metaDescription:
            'Convert CSS oklch() values to 6 or 8-digit HEX instantly. Free OKLCH to HEX converter with sRGB gamut clamping and Display-P3 detection.',
          h1: 'OKLCH to HEX Converter',
          keywords: ['oklch to hex', 'oklch to hex converter', 'oklch to rgb hex'],
          schemaType: 'WebApplication',
          datePublished: PUBLISHED,
          dateModified: MODIFIED,
          // Verbatim copy of the visible FAQ section on the page (source of
          // truth: src/pages/oklch-to-hex.astro) — keep the two in sync.
          faqs: [
            {
              question: 'What happens if my OKLCH color is in Display-P3?',
              answer:
                'If the color exceeds sRGB boundaries, our engine alerts you with a Display-P3 badge and automatically provides the optimal clamped sRGB HEX code as a graceful fallback. The hue and lightness are preserved as closely as possible.',
            },
            {
              question: 'How do I export HEX fallbacks in CSS?',
              answer:
                'On our Export page, switch to the "HEX Fallback + OKLCH" tab to generate twin variable lines, ensuring full backward compatibility on legacy browsers.',
            },
            {
              question: 'Is the OKLCH to HEX conversion lossy?',
              answer:
                'For sRGB colors, the conversion is lossless — you get back the exact same HEX value. For Display-P3 colors, the conversion to HEX requires clamping to sRGB, which is a lossy step. The OKLCH original remains the source of truth.',
            },
            {
              question: 'Can I convert OKLCH with alpha to 8-digit HEX?',
              answer:
                'Yes. An OKLCH value like oklch(62.3% 0.188 259.8 / 0.5) converts to #3b82f680 — the last two digits represent the alpha channel in hex.',
            },
            {
              question: 'Why does my HEX color look different on different screens?',
              answer:
                'HEX values are absolute sRGB colors. On a wide-gamut Display-P3 monitor, the browser may render them more vividly than on a standard sRGB monitor. This is expected behavior — the HEX value itself does not change.',
            },
          ],
        },
      },
      {
        id: 'rgb-to-oklch',
        labelKey: 'nav.rgbToOklch',
        defaultLabel: 'RGB to OKLCH',
        icon: 'SlidersHorizontal',
        path: '/rgb-to-oklch',
        order: 3,
        group: 'converters',
        seo: {
          title: 'RGB to OKLCH Converter - Free CSS oklch() Tool',
          metaDescription:
            'Convert rgb() and rgba() colors to CSS oklch() instantly. Free RGB to OKLCH converter with live gamut boundary checks.',
          h1: 'RGB to OKLCH Converter',
          keywords: ['rgb to oklch', 'convert rgb to oklch', 'srgb to oklch'],
          schemaType: 'WebApplication',
          datePublished: PUBLISHED,
          dateModified: MODIFIED,
          // Verbatim copy of the visible FAQ section on the page (source of
          // truth: src/pages/rgb-to-oklch.astro) — keep the two in sync.
          faqs: [
            {
              question: 'Can I convert rgba() with alpha to OKLCH?',
              answer:
                'Yes. rgba(59, 130, 246, 0.5) converts to oklch(62.3% 0.188 259.8 / 0.5) — the alpha channel is preserved as a slash parameter.',
            },
            {
              question: 'What is the difference between RGB and OKLCH?',
              answer:
                'RGB is a device-dependent additive color model. OKLCH is a perceptually uniform color space where equal lightness values look equally bright. OKLCH makes it far easier to create accessible, consistent color systems.',
            },
            {
              question: 'Is RGB to OKLCH conversion reversible?',
              answer:
                'Yes, for sRGB colors. Converting RGB → OKLCH → RGB yields the original values. The round-trip is lossless within the sRGB gamut.',
            },
            {
              question: 'Do all browsers support oklch()?',
              answer:
                'Yes. oklch() is a Baseline feature available across all modern browsers since May 2023. Chrome, Edge, Safari, and Firefox all support it natively.',
            },
            {
              question: 'How do I use OKLCH in Tailwind CSS v4?',
              answer:
                'Tailwind v4 uses OKLCH for its entire default palette. Define custom colors in your @theme block using --color-{name}: oklch(...) and Tailwind generates utilities automatically.',
            },
          ],
        },
      },
      {
        id: 'oklch-to-rgb',
        labelKey: 'nav.oklchToRgb',
        defaultLabel: 'OKLCH to RGB',
        icon: 'SlidersHorizontal',
        path: '/oklch-to-rgb',
        order: 4,
        group: 'converters',
        seo: {
          title: 'OKLCH to RGB Converter - Free CSS Color Tool',
          metaDescription:
            'Convert CSS oklch() values to rgb() or rgba() for legacy CSS and canvas. Free OKLCH to RGB converter with automatic gamut mapping.',
          h1: 'OKLCH to RGB Converter',
          keywords: ['oklch to rgb', 'oklch to rgba', 'oklch to srgb converter'],
          schemaType: 'WebApplication',
          datePublished: PUBLISHED,
          dateModified: MODIFIED,
          // Verbatim copy of the visible FAQ section on the page (source of
          // truth: src/pages/oklch-to-rgb.astro) — keep the two in sync.
          faqs: [
            {
              question: 'Why do I need RGB if I have OKLCH?',
              answer:
                'Legacy tools — canvas renderers, older JavaScript libraries, email clients, and some image editors — only understand RGB. Converting OKLCH to RGB ensures compatibility with these tools.',
            },
            {
              question: 'Is the OKLCH to RGB conversion lossy?',
              answer:
                'For sRGB colors, the conversion is lossless. For Display-P3 colors, clamping to sRGB is a lossy step. The OKLCH original remains the source of truth.',
            },
            {
              question: 'Can I use OKLCH alpha in rgba()?',
              answer:
                'Yes. oklch(62.3% 0.188 259.8 / 0.5) converts to rgba(59, 130, 246, 0.5) — the alpha channel is preserved.',
            },
            {
              question: 'What happens with out-of-gamut colors?',
              answer:
                'The engine clamps chroma to the nearest in-gamut value while preserving hue and lightness. You will see a gamut badge indicating the color was clamped.',
            },
            {
              question: 'How do I use RGB values in canvas?',
              answer:
                'Pass the RGB string directly to ctx.fillStyle or ctx.strokeStyle. Canvas 2D only understands sRGB, so the RGB output is always canvas-safe.',
            },
          ],
        },
      },
      {
        id: 'hsl-to-oklch',
        labelKey: 'nav.hslToOklch',
        defaultLabel: 'HSL to OKLCH',
        icon: 'CircleDot',
        path: '/hsl-to-oklch',
        order: 5,
        group: 'converters',
        seo: {
          title: 'HSL to OKLCH Converter - Free CSS oklch() Tool',
          metaDescription:
            "Convert hsl() colors to CSS oklch() instantly and fix HSL's uneven perceived lightness. Free HSL to OKLCH converter with gamut checks.",
          h1: 'HSL to OKLCH Converter',
          keywords: ['hsl to oklch', 'convert hsl to oklch', 'hsl oklch comparison'],
          schemaType: 'WebApplication',
          datePublished: PUBLISHED,
          dateModified: MODIFIED,
          // Verbatim copy of the visible FAQ section on the page (source of
          // truth: src/pages/hsl-to-oklch.astro) — keep the two in sync.
          faqs: [
            {
              question: 'What is the main difference between HSL and OKLCH?',
              answer:
                "HSL's lightness is not perceptually uniform — yellow at 50% lightness looks almost white, while blue at 50% looks dark. OKLCH's lightness is perceptually uniform: 50% lightness looks equally bright regardless of hue.",
            },
            {
              question: 'Can I convert HSL with alpha to OKLCH?',
              answer:
                'Yes. hsla(217, 91%, 60%, 0.5) converts to oklch(62.3% 0.188 259.8 / 0.5) — the alpha channel is preserved.',
            },
            {
              question: 'Is HSL to OKLCH conversion reversible?',
              answer:
                'Yes, for sRGB colors. Converting HSL → OKLCH → HSL yields the original values. The round-trip is lossless within the sRGB gamut.',
            },
            {
              question: 'Why should I switch from HSL to OKLCH?',
              answer:
                'OKLCH gives you perceptually uniform lightness, predictable palettes, and access to wide-gamut Display-P3 colors. It makes accessible, consistent color systems far easier to build.',
            },
            {
              question: 'Do all browsers support oklch()?',
              answer:
                'Yes. oklch() is a Baseline feature available across all modern browsers since May 2023. Chrome, Edge, Safari, and Firefox all support it natively.',
            },
          ],
        },
      },
      {
        id: 'oklch-to-hsl',
        labelKey: 'nav.oklchToHsl',
        defaultLabel: 'OKLCH to HSL',
        icon: 'CircleDot',
        path: '/oklch-to-hsl',
        order: 6,
        group: 'converters',
        seo: {
          title: 'OKLCH to HSL Converter - Free CSS Color Tool',
          metaDescription:
            'Convert CSS oklch() colors to hsl(h, s%, l%) instantly. Free OKLCH to HSL converter with automatic sRGB gamut mapping.',
          h1: 'OKLCH to HSL Converter',
          keywords: ['oklch to hsl', 'oklch to hsl converter', 'oklch fallback to hsl'],
          schemaType: 'WebApplication',
          datePublished: PUBLISHED,
          dateModified: MODIFIED,
          // Verbatim copy of the visible FAQ section on the page (source of
          // truth: src/pages/oklch-to-hsl.astro) — keep the two in sync.
          faqs: [
            {
              question: 'Why do I need HSL if I have OKLCH?',
              answer:
                'Legacy tools — email clients, older CSS preprocessors, native apps, and some design tools — only understand HSL. Converting OKLCH to HSL ensures compatibility with these tools.',
            },
            {
              question: 'Is the OKLCH to HSL conversion lossy?',
              answer:
                'For sRGB colors, the conversion is lossless. For Display-P3 colors, clamping to sRGB is a lossy step. The OKLCH original remains the source of truth.',
            },
            {
              question: 'Can I use OKLCH alpha in hsla()?',
              answer:
                'Yes. oklch(62.3% 0.188 259.8 / 0.5) converts to hsla(217, 91%, 60%, 0.5) — the alpha channel is preserved.',
            },
            {
              question: 'What happens with out-of-gamut colors?',
              answer:
                'The engine clamps chroma to the nearest in-gamut value while preserving hue. You will see a gamut badge indicating the color was clamped.',
            },
            {
              question: 'How do I use HSL values in email templates?',
              answer:
                'Many email clients only support HSL or HEX. Use the HSL output directly in your inline styles — it will render consistently across email clients.',
            },
          ],
        },
      },
    ],
  },
  {
    id: 'preview',
    labelKey: 'nav.preview',
    defaultLabel: 'UI Preview',
    icon: 'LayoutTemplate',
    path: '/ui-preview',
    order: 5,
    group: 'tools',
    showInMobileBar: true,
    mobileBarOrder: 4,
    seo: {
      title: 'UI Color Preview - Test OKLCH Palettes (WCAG & APCA)',
      metaDescription:
        'Preview your OKLCH palette on real UI components with WCAG 2.1 AA/AAA and APCA contrast scores. Click any element to swap its color token.',
      h1: 'UI Color Preview',
      keywords: ['oklch ui preview', 'color contrast checker oklch', 'wcag apca contrast matrix', 'design token preview'],
      schemaType: 'WebApplication',
      datePublished: PUBLISHED,
      dateModified: MODIFIED,
    },
  },
  {
    id: 'export',
    labelKey: 'nav.export',
    defaultLabel: 'Export & Code',
    icon: 'Code2',
    path: '/export',
    order: 6,
    group: 'tools',
    showInMobileBar: false,
    seo: {
      title: 'Export OKLCH Design Tokens - Tailwind v4 @theme & CSS',
      metaDescription:
        'Export your OKLCH colors as Tailwind CSS v4 @theme blocks, CSS custom properties, or a downloadable stylesheet. Production-ready design tokens.',
      h1: 'Export OKLCH Design Tokens',
      keywords: ['oklch export', 'tailwind v4 @theme export', 'css oklch variables export', 'design token generator'],
      schemaType: 'WebApplication',
      datePublished: PUBLISHED,
      dateModified: MODIFIED,
    },
  },
  {
    id: 'learn',
    labelKey: 'nav.learn',
    defaultLabel: 'What is OKLCH?',
    icon: 'BookOpen',
    path: '/learn/what-is-oklch',
    order: 7,
    group: 'learn',
    showInMobileBar: false,
    seo: {
      title: 'What Is OKLCH? The Modern CSS Color Space Explained',
      metaDescription:
        'OKLCH explained: what L, C and H mean, how it differs from RGB and HSL, browser support, and why Tailwind CSS v4 uses it. With a free converter.',
      h1: 'What is OKLCH? The Modern CSS Color Space',
      keywords: ['what is oklch', 'oklch vs hsl', 'oklch color space guide', 'css color 4 oklch'],
      schemaType: 'Article',
      datePublished: PUBLISHED,
      dateModified: MODIFIED,
    },
  },
  {
    id: 'learn-css-syntax',
    labelKey: 'nav.oklchCssSyntax',
    defaultLabel: 'CSS Syntax',
    icon: 'Code2',
    path: '/learn/oklch-css-syntax',
    order: 8,
    group: 'learn',
    showInMobileBar: false,
    seo: {
      title: 'CSS oklch() Syntax - Values, Alpha & Fallbacks',
      metaDescription:
        'The complete oklch() CSS syntax: lightness, chroma and hue values, alpha after the slash, relative color syntax, progressive fallbacks and browser support.',
      h1: 'CSS oklch() Syntax: Lightness, Chroma, Hue & Alpha',
      keywords: ['css oklch', 'oklch css syntax', 'oklch function', 'css color oklch'],
      schemaType: 'Article',
      // Published with the rest of the Phase 7 content batch.
      datePublished: '2026-10-07',
      dateModified: MODIFIED,
    },
  },
  {
    id: 'learn-tailwind-v4',
    labelKey: 'nav.oklchTailwindV4',
    defaultLabel: 'OKLCH in Tailwind v4',
    icon: 'Palette',
    path: '/learn/oklch-in-tailwind-css-v4',
    order: 9,
    group: 'learn',
    showInMobileBar: false,
    seo: {
      title: 'OKLCH in Tailwind CSS v4 - Colors, Palette & @theme',
      metaDescription:
        'How Tailwind CSS v4 uses OKLCH: the default palette, @theme color variables, migrating from v3, and shipping wide-gamut colors in your design system.',
      h1: 'OKLCH in Tailwind CSS v4: Colors, Palette and @theme',
      keywords: ['tailwind css oklch', 'tailwind v4 colors', 'tailwind oklch palette', 'tailwind @theme oklch'],
      schemaType: 'Article',
      datePublished: '2026-10-07',
      dateModified: MODIFIED,
    },
  },
  {
    id: 'learn-vs-hsl-rgb',
    labelKey: 'nav.oklchVsHslRgb',
    defaultLabel: 'OKLCH vs HSL vs RGB',
    icon: 'BarChart3',
    path: '/learn/oklch-vs-hsl-vs-rgb',
    order: 10,
    group: 'learn',
    showInMobileBar: false,
    seo: {
      title: 'OKLCH vs HSL vs RGB - Which Color Space to Use',
      metaDescription:
        'OKLCH vs HSL vs RGB compared: perceptual uniformity, lightness accuracy, gradients and gamut — with conversion tables and migration guidance for CSS.',
      h1: 'OKLCH vs HSL vs RGB: Which Color Space Should You Use?',
      keywords: ['oklch vs hsl', 'oklch vs rgb', 'hsl vs oklch', 'why use oklch'],
      schemaType: 'Article',
      datePublished: '2026-10-07',
      dateModified: MODIFIED,
    },
  },
];

// Helper to find navigation item by path
export function getNavItemByPath(path: string): NavItem | undefined {
  const normalized = path.replace(/\/$/, '') || '/';
  for (const item of navigationConfig) {
    if ((item.path.replace(/\/$/, '') || '/') === normalized) return item;
    if (item.children) {
      for (const child of item.children) {
        if ((child.path.replace(/\/$/, '') || '/') === normalized) return child;
      }
    }
  }
  return undefined;
}

// Flat list of all indexable pages for sitemap and SEO.
// A parent is skipped only when one of its children shares its path — that was
// the /hex-to-oklch duplicate. Parents with a distinct path (the converter hub)
// are real pages of their own and must appear in the sitemap.
export function getAllNavItemsFlat(): NavItem[] {
  const result: NavItem[] = [];
  for (const item of navigationConfig) {
    if (item.children) {
      const childPaths = item.children.map((c) => c.path.replace(/\/$/, '') || '/');
      const ownPath = item.path.replace(/\/$/, '') || '/';
      if (!childPaths.includes(ownPath)) {
        result.push(item);
      }
      result.push(...item.children);
    } else {
      result.push(item);
    }
  }
  return result;
}
