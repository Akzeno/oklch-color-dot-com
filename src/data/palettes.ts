import {
  type ShadeStep,
  type ColorModel,
  createOklchColor,
  SHADE_STEPS,
  generateFullScaleFromColor,
} from '../utils/color';

export interface PaletteItem {
  id: string;
  name: string;
  slug: string;
  category: 'brand' | 'neutral' | 'success-trust' | 'danger' | 'warning' | 'info' | 'dark-mode';
  categoryLabel: string;
  description: string;
  baseColor: ColorModel;
  shades: Record<ShadeStep, ColorModel>;
}

// Helper to construct a palette from a base color
function makePalette(
  id: string,
  name: string,
  slug: string,
  category: PaletteItem['category'],
  categoryLabel: string,
  description: string,
  baseL: number,
  baseC: number,
  baseH: number
): PaletteItem {
  const base = createOklchColor(baseL, baseC, baseH);
  const shades = generateFullScaleFromColor(base);
  return {
    id,
    name,
    slug,
    category,
    categoryLabel,
    description,
    baseColor: base,
    shades,
  };
}

export const CATEGORIES = [
  { id: 'all', label: 'All Palettes' },
  { id: 'brand', label: 'Brand & Playful' },
  { id: 'neutral', label: 'Neutral & Grayscale' },
  { id: 'success-trust', label: 'Success & Trust' },
  { id: 'danger', label: 'Danger & Alerts' },
  { id: 'warning', label: 'Warning & Amber' },
  { id: 'info', label: 'Info & Cyan' },
  { id: 'dark-mode', label: 'Dark Mode Surfaces' },
] as const;

export const PALETTES: PaletteItem[] = [
  // Neutral
  makePalette(
    'gray',
    'Neutral Gray',
    'gray',
    'neutral',
    'Neutral',
    'Perceptually uniform neutral gray scale without chromatic tint, ideal for UI canvases and text hierarchies.',
    0.55,
    0.005,
    260
  ),
  makePalette(
    'slate',
    'Slate Cold Gray',
    'slate',
    'neutral',
    'Neutral',
    'Cool-undertone slate scale providing crisp contrast for modern developer tools and dashboard interfaces.',
    0.54,
    0.02,
    240
  ),
  makePalette(
    'zinc',
    'Zinc Industrial',
    'zinc',
    'neutral',
    'Neutral',
    'Deep industrial zinc with minimal warm-cool variance, designed for dark-mode cards and high-density layouts.',
    0.52,
    0.012,
    275
  ),

  // Brand / Playful
  makePalette(
    'trusty-blue',
    'Trusty Blue',
    'trusty-blue',
    'brand',
    'Brand & Playful',
    'The canonical primary action color with high sRGB clarity and stable hue under extreme lightness transformations.',
    0.58,
    0.19,
    255
  ),
  makePalette(
    'electric-indigo',
    'Electric Indigo',
    'electric-indigo',
    'brand',
    'Brand & Playful',
    'Vibrant high-contrast indigo engineered for primary CTA buttons and focus states in modern web apps.',
    0.55,
    0.23,
    285
  ),
  makePalette(
    'violet-pulse',
    'Violet Pulse',
    'violet-pulse',
    'brand',
    'Brand & Playful',
    'Rich royal purple with wide-gamut Display-P3 chromatic depth, tailored for creative portfolios and SaaS branding.',
    0.56,
    0.24,
    305
  ),

  // Success / Trust
  makePalette(
    'emerald-trust',
    'Emerald Trust',
    'emerald-trust',
    'success-trust',
    'Success & Trust',
    'Accessible emerald green optimized for positive checkout confirmations, health metrics, and verified status badges.',
    0.62,
    0.17,
    155
  ),
  makePalette(
    'forest-calm',
    'Forest Calm',
    'forest-calm',
    'success-trust',
    'Success & Trust',
    'Natural organic green scale with balanced chroma for sustainability platforms and finance dashboards.',
    0.56,
    0.14,
    140
  ),

  // Danger
  makePalette(
    'crimson-danger',
    'Crimson Danger',
    'crimson-danger',
    'danger',
    'Danger & Alerts',
    'High-visibility crimson red for error boundaries, destructive modal actions, and system alert banners.',
    0.56,
    0.22,
    25
  ),
  makePalette(
    'rose-signal',
    'Rose Signal',
    'rose-signal',
    'danger',
    'Danger & Alerts',
    'Modern warm rose red balancing urgent feedback with non-abrasive visual aesthetics.',
    0.58,
    0.20,
    15
  ),

  // Warning
  makePalette(
    'amber-warning',
    'Amber Warning',
    'amber-warning',
    'warning',
    'Warning & Amber',
    'High-luminance amber warning scale with zero perceptual muddying, meeting strict WCAG contrast against dark backgrounds.',
    0.72,
    0.18,
    75
  ),
  makePalette(
    'sunfire-orange',
    'Sunfire Orange',
    'sunfire-orange',
    'warning',
    'Warning & Amber',
    'Vibrant citrus orange for cautionary alerts, pending statuses, and attention-drawing pill badges.',
    0.65,
    0.20,
    55
  ),

  // Info
  makePalette(
    'cyan-info',
    'Cyan Info',
    'cyan-info',
    'info',
    'Info & Cyan',
    'Crisp cyan info scale engineered for notification banners, informational tooltips, and live data telemetry.',
    0.68,
    0.16,
    215
  ),
  makePalette(
    'sky-breeze',
    'Sky Breeze',
    'sky-breeze',
    'info',
    'Info & Cyan',
    'Airy azure blue scale for subtle informational panels and secondary tag pills.',
    0.66,
    0.14,
    235
  ),

  // Dark Mode
  makePalette(
    'obsidian-dark',
    'Obsidian Dark',
    'obsidian-dark',
    'dark-mode',
    'Dark Mode Surfaces',
    'A specialized dark-mode canvas and border palette ranging from oklch(0.12 0 0) to oklch(0.35 0 0) for pristine zero-distortion dark UIs.',
    0.22,
    0.004,
    260
  ),
  makePalette(
    'midnight-slate',
    'Midnight Slate',
    'midnight-slate',
    'dark-mode',
    'Dark Mode Surfaces',
    'Deep midnight surface tones providing subtle elevation layers (canvas-card, canvas-elevated) without chromatic pollution.',
    0.20,
    0.015,
    250
  ),
];

// Helper to look up palette by slug
export function getPaletteBySlug(slug: string): PaletteItem | undefined {
  return PALETTES.find((p) => p.slug === slug);
}

// Helper to filter palettes by category
export function getPalettesByCategory(category: string): PaletteItem[] {
  if (!category || category === 'all') return PALETTES;
  return PALETTES.filter((p) => p.category === category);
}
