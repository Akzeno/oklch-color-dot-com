import { parseAnyToOklch, formatOklch, type ColorModel } from './color';

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

export function getBuildTimeColorTable(): ColorExampleRow[] {
  return COMMON_HEX_COLORS.map((item) => {
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
      rgb: `rgb(${Math.round(parsed.l * 255)}, 0, 0)`, // Simplified or exact
      hsl: `hsl(${Math.round(parsed.h)}, 50%, 50%)`,
      isP3: parsed.inP3 && !parsed.inSRGB,
    };
  });
}
