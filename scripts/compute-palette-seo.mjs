// Compute WCAG AA shade data for each palette — used to verify unique descriptions.
import { PALETTES } from '../src/data/palettes.ts';
import { SHADE_STEPS, getWcagContrast } from '../src/utils/color.ts';

for (const p of PALETTES) {
  const aaWhite = [];
  const aaBlack = [];
  for (const step of SHADE_STEPS) {
    const c = p.shades[step];
    if (getWcagContrast(c.hex, '#ffffff') >= 4.5) aaWhite.push(step);
    if (getWcagContrast(c.hex, '#000000') >= 4.5) aaBlack.push(step);
  }
  const hue = Math.round(p.baseColor.h);
  console.log(`${p.slug} | hue=${hue} | aaWhite=[${aaWhite.join(',')}] | aaBlack=[${aaBlack.join(',')}]`);
}
