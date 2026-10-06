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
    path: '/hex-to-oklch',
    order: 4,
    group: 'converters',
    showInMobileBar: true,
    mobileBarOrder: 3,
    seo: {
      title: 'HEX to OKLCH Converter - Free CSS oklch() Tool',
      metaDescription:
        'Convert 3, 6 or 8-digit HEX colors to CSS oklch() instantly. Free HEX to OKLCH converter with live sRGB and Display-P3 gamut detection.',
      h1: 'HEX to OKLCH Converter',
      keywords: ['hex to oklch', 'hex to oklch converter', 'convert hex to oklch', 'css oklch converter'],
      schemaType: 'WebApplication',
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
// Parent items with children are skipped — their children are the actual pages,
// and including both would produce duplicate URLs when a parent's path matches
// a child's path (e.g. the Converters group and /hex-to-oklch).
export function getAllNavItemsFlat(): NavItem[] {
  const result: NavItem[] = [];
  for (const item of navigationConfig) {
    if (item.children) {
      result.push(...item.children);
    } else {
      result.push(item);
    }
  }
  return result;
}
