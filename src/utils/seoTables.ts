import { parseAnyToOklch, formatOklch, oklchToRgbString, oklchToHslString, type ColorModel } from './color';

export interface ColorExampleRow {
  name: string;
  hex: string;
  oklch: string;
  rgb: string;
  hsl: string;
  isP3: boolean;
}

export const COMMON_HEX_COLORS = [
  { name: 'Pure White', hex: '#ffffff' },
  { name: 'Pure Black', hex: '#000000' },
  { name: 'Tailwind Blue 500', hex: '#3b82f6' },
  { name: 'Tailwind Indigo 600', hex: '#4f46e5' },
  { name: 'Emerald 500', hex: '#10b981' },
  { name: 'Red 500 (Danger)', hex: '#ef4444' },
  { name: 'Amber 500 (Warning)', hex: '#f59e0b' },
  { name: 'Cyan 500 (Info)', hex: '#06b6d4' },
  { name: 'Neutral Gray 500', hex: '#737373' },
  { name: 'Dark Slate 900', hex: '#0f172a' },
  { name: 'Purple 500', hex: '#a855f7' },
  { name: 'Pink 500', hex: '#ec4899' },
  { name: 'Rose 600', hex: '#e11d48' },
  { name: 'Sky 400', hex: '#38bdf8' },
  { name: 'Teal 500', hex: '#14b8a6' },
  { name: 'Lime 500', hex: '#84cc16' },
  { name: 'Orange 500', hex: '#f97316' },
  { name: 'Fuchsia 500', hex: '#d946ef' },
];

// Varied color sets per converter page to avoid near-duplicate content
const CONVERTER_COLOR_SETS: Record<string, Array<{ name: string; hex: string }>> = {
  'hex-to-oklch': [
    { name: 'Pure White', hex: '#ffffff' },
    { name: 'Pure Black', hex: '#000000' },
    { name: 'Tailwind Blue 500', hex: '#3b82f6' },
    { name: 'Tailwind Indigo 600', hex: '#4f46e5' },
    { name: 'Emerald 500', hex: '#10b981' },
    { name: 'Red 500 (Danger)', hex: '#ef4444' },
    { name: 'Amber 500 (Warning)', hex: '#f59e0b' },
    { name: 'Cyan 500 (Info)', hex: '#06b6d4' },
    { name: 'Neutral Gray 500', hex: '#737373' },
    { name: 'Dark Slate 900', hex: '#0f172a' },
    { name: 'Purple 500', hex: '#a855f7' },
    { name: 'Pink 500', hex: '#ec4899' },
  ],
  'oklch-to-hex': [
    { name: 'Pure White', hex: '#ffffff' },
    { name: 'Pure Black', hex: '#000000' },
    { name: 'OKLCH Blue 500', hex: '#3b82f6' },
    { name: 'OKLCH Indigo 600', hex: '#4f46e5' },
    { name: 'OKLCH Emerald 500', hex: '#10b981' },
    { name: 'OKLCH Red 500', hex: '#ef4444' },
    { name: 'OKLCH Amber 500', hex: '#f59e0b' },
    { name: 'OKLCH Cyan 500', hex: '#06b6d4' },
    { name: 'OKLCH Gray 500', hex: '#737373' },
    { name: 'OKLCH Slate 900', hex: '#0f172a' },
    { name: 'OKLCH Purple 500', hex: '#a855f7' },
    { name: 'OKLCH Pink 500', hex: '#ec4899' },
  ],
  'rgb-to-oklch': [
    { name: 'Pure White', hex: '#ffffff' },
    { name: 'Pure Black', hex: '#000000' },
    { name: 'RGB Blue 500', hex: '#3b82f6' },
    { name: 'RGB Indigo 600', hex: '#4f46e5' },
    { name: 'RGB Emerald 500', hex: '#10b981' },
    { name: 'RGB Red 500', hex: '#ef4444' },
    { name: 'RGB Amber 500', hex: '#f59e0b' },
    { name: 'RGB Cyan 500', hex: '#06b6d4' },
    { name: 'RGB Gray 500', hex: '#737373' },
    { name: 'RGB Slate 900', hex: '#0f172a' },
    { name: 'RGB Purple 500', hex: '#a855f7' },
    { name: 'RGB Pink 500', hex: '#ec4899' },
  ],
  'oklch-to-rgb': [
    { name: 'Pure White', hex: '#ffffff' },
    { name: 'Pure Black', hex: '#000000' },
    { name: 'sRGB Blue 500', hex: '#3b82f6' },
    { name: 'sRGB Indigo 600', hex: '#4f46e5' },
    { name: 'sRGB Emerald 500', hex: '#10b981' },
    { name: 'sRGB Red 500', hex: '#ef4444' },
    { name: 'sRGB Amber 500', hex: '#f59e0b' },
    { name: 'sRGB Cyan 500', hex: '#06b6d4' },
    { name: 'sRGB Gray 500', hex: '#737373' },
    { name: 'sRGB Slate 900', hex: '#0f172a' },
    { name: 'sRGB Purple 500', hex: '#a855f7' },
    { name: 'sRGB Pink 500', hex: '#ec4899' },
  ],
  'hsl-to-oklch': [
    { name: 'Pure White', hex: '#ffffff' },
    { name: 'Pure Black', hex: '#000000' },
    { name: 'HSL Blue 500', hex: '#3b82f6' },
    { name: 'HSL Indigo 600', hex: '#4f46e5' },
    { name: 'HSL Emerald 500', hex: '#10b981' },
    { name: 'HSL Red 500', hex: '#ef4444' },
    { name: 'HSL Amber 500', hex: '#f59e0b' },
    { name: 'HSL Cyan 500', hex: '#06b6d4' },
    { name: 'HSL Gray 500', hex: '#737373' },
    { name: 'HSL Slate 900', hex: '#0f172a' },
    { name: 'HSL Purple 500', hex: '#a855f7' },
    { name: 'HSL Pink 500', hex: '#ec4899' },
  ],
  'oklch-to-hsl': [
    { name: 'Pure White', hex: '#ffffff' },
    { name: 'Pure Black', hex: '#000000' },
    { name: 'HSL Blue 500', hex: '#3b82f6' },
    { name: 'HSL Indigo 600', hex: '#4f46e5' },
    { name: 'HSL Emerald 500', hex: '#10b981' },
    { name: 'HSL Red 500', hex: '#ef4444' },
    { name: 'HSL Amber 500', hex: '#f59e0b' },
    { name: 'HSL Cyan 500', hex: '#06b6d4' },
    { name: 'HSL Gray 500', hex: '#737373' },
    { name: 'HSL Slate 900', hex: '#0f172a' },
    { name: 'HSL Purple 500', hex: '#a855f7' },
    { name: 'HSL Pink 500', hex: '#ec4899' },
  ],
};

export function getBuildTimeColorTable(converterType?: string): ColorExampleRow[] {
  const colors = (converterType && CONVERTER_COLOR_SETS[converterType]) || COMMON_HEX_COLORS;
  return colors.map((item) => {
    const parsed = parseAnyToOklch(item.hex);
    if (!parsed) {
      return {
        name: item.name,
        hex: item.hex,
        oklch: 'oklch(0% 0 0)',
        rgb: 'rgb(0, 0, 0)',
        hsl: 'hsl(0, 0%, 0%)',
        isP3: false,
      };
    }
    return {
      name: item.name,
      hex: item.hex,
      oklch: formatOklch(parsed),
      rgb: oklchToRgbString(parsed),
      hsl: oklchToHslString(parsed),
      isP3: parsed.inP3 && !parsed.inSRGB,
    };
  });
}
