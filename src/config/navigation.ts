export interface SEOMetadata {
  title: string;
  metaDescription: string;
  h1: string;
  keywords: string[];
  schemaType: 'WebApplication' | 'CollectionPage' | 'Article';
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
      title: 'OKLCH Color Picker & Converter | Real-time P3 & sRGB Gamut',
      metaDescription: 'Interactive OKLCH color picker with live visual slider tracks, Display-P3 gamut clipping boundaries, sRGB fallback, and role-based design token collection.',
      h1: 'OKLCH Color Picker',
      keywords: ['oklch color picker', 'oklch picker', 'css oklch', 'display-p3 color picker', 'perceptual color picker'],
      schemaType: 'WebApplication',
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
      title: 'OKLCH Color Palettes | Curated Design Token Scales',
      metaDescription: 'Browse curated OKLCH color palettes across brand, neutral, success, danger, and dark mode categories. Single-click swatches to collect into your UI roles.',
      h1: 'OKLCH Color Palettes',
      keywords: ['oklch color palettes', 'oklch colors', 'radix oklch', 'tailwind v4 palettes', 'accessible color scales'],
      schemaType: 'CollectionPage',
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
      title: 'OKLCH Color Palette Generator | 50-950 Scales & Harmonies',
      metaDescription: 'Generate perceptually uniform 50-950 color scales and harmonious color palettes using OKLCH color space with automatic gamut-safe chroma clamping.',
      h1: 'OKLCH Color Palette Generator',
      keywords: ['oklch palette generator', 'color scale generator 50-950', 'oklch harmonies', 'tailwind v4 color scale generator'],
      schemaType: 'WebApplication',
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
      title: 'HEX to OKLCH Color Converter | Accurate P3 & sRGB',
      metaDescription: 'Convert HEX color codes to CSS OKLCH format with real-time conversion, gamut verification, and Tailwind v4 CSS variable generation.',
      h1: 'HEX to OKLCH Converter',
      keywords: ['hex to oklch', 'hex to oklch converter', 'convert hex to oklch', 'css oklch converter'],
      schemaType: 'WebApplication',
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
          title: 'HEX to OKLCH Converter | Instant CSS Color Conversion',
          metaDescription: 'Fast, accurate HEX to OKLCH color converter with build-time reference tables, gamut clipping detection, and Tailwind v4 ready export.',
          h1: 'HEX to OKLCH Converter',
          keywords: ['hex to oklch', 'hex to oklch converter', 'convert hex to oklch'],
          schemaType: 'WebApplication',
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
          title: 'OKLCH to HEX Converter | Precise Gamut-Aware Conversion',
          metaDescription: 'Convert OKLCH color values to standard 6-digit or 8-digit HEX with gamut clipping warnings and sRGB fallback computation.',
          h1: 'OKLCH to HEX Converter',
          keywords: ['oklch to hex', 'oklch to hex converter', 'oklch to rgb hex'],
          schemaType: 'WebApplication',
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
          title: 'RGB to OKLCH Converter | Perceptual Color Space Conversion',
          metaDescription: 'Convert standard sRGB or Display-P3 rgb(...) values into modern OKLCH lightness, chroma, and hue angles.',
          h1: 'RGB to OKLCH Converter',
          keywords: ['rgb to oklch', 'convert rgb to oklch', 'srgb to oklch'],
          schemaType: 'WebApplication',
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
          title: 'OKLCH to RGB Converter | Gamut-Accurate Conversion',
          metaDescription: 'Convert OKLCH colors to rgb() and rgba() with high precision and Display-P3 wide color gamut compatibility.',
          h1: 'OKLCH to RGB Converter',
          keywords: ['oklch to rgb', 'oklch to rgba', 'oklch to srgb converter'],
          schemaType: 'WebApplication',
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
          title: 'HSL to OKLCH Converter | Fix Distorted Lightness',
          metaDescription: 'Convert legacy HSL colors to perceptually uniform OKLCH. Fix yellow/blue brightness distortion with true perceptual lightness.',
          h1: 'HSL to OKLCH Converter',
          keywords: ['hsl to oklch', 'convert hsl to oklch', 'hsl oklch comparison'],
          schemaType: 'WebApplication',
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
          title: 'OKLCH to HSL Converter | Backward-Compatible Colors',
          metaDescription: 'Convert OKLCH colors to standard HSL values for legacy browser compatibility with automated gamut mapping.',
          h1: 'OKLCH to HSL Converter',
          keywords: ['oklch to hsl', 'oklch to hsl converter', 'oklch fallback to hsl'],
          schemaType: 'WebApplication',
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
      title: 'UI Component Preview & WCAG / APCA Contrast Matrix',
      metaDescription: 'Live test your collected OKLCH color roles on real-world dummy UI components (buttons, cards, badges, forms, navbars) in dark and light modes.',
      h1: 'UI Component Preview',
      keywords: ['oklch ui preview', 'color contrast checker oklch', 'wcag apca contrast matrix', 'design token preview'],
      schemaType: 'WebApplication',
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
      title: 'Export OKLCH Design Tokens | Tailwind v4 @theme & CSS Variables',
      metaDescription: 'Export your collected OKLCH color tokens directly into Tailwind CSS v4 @theme block, CSS :root custom properties, or download as a .css file.',
      h1: 'Export OKLCH Design Tokens',
      keywords: ['oklch export', 'tailwind v4 @theme export', 'css oklch variables export', 'design token generator'],
      schemaType: 'WebApplication',
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
      title: 'What is OKLCH? | The Definitive Guide to Perceptual CSS Colors',
      metaDescription: 'Learn why OKLCH is superior to RGB and HSL: perceptual lightness uniformity, wide Display-P3 gamut coverage, smooth color blending, and CSS Color Module 4 syntax.',
      h1: 'What is OKLCH? The Modern CSS Color Space',
      keywords: ['what is oklch', 'oklch vs hsl', 'oklch color space guide', 'css color 4 oklch'],
      schemaType: 'Article',
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

// Flat list of all indexable pages for sitemap and SEO
export function getAllNavItemsFlat(): NavItem[] {
  const result: NavItem[] = [];
  for (const item of navigationConfig) {
    result.push(item);
    if (item.children) {
      result.push(...item.children);
    }
  }
  return result;
}
