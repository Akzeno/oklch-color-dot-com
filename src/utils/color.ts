import {
  formatHex,
  formatRgb,
  formatHsl,
  parse,
  oklch,
  rgb,
  p3,
  wcagContrast,
  clampChroma,
  displayable,
  interpolate,
} from 'culori';

export type ShadeStep = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;
export const SHADE_STEPS: ShadeStep[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

/**
 * The step a palette is anchored on.
 *
 * Three things independently need to agree on it, and when they each hardcoded
 * `500` they could silently drift apart:
 *
 *  - `generateFullScaleForRole` generates the 50–950 scale *from* this step.
 *  - The picker inherits hue/chroma/alpha for a new token from this step, so
 *    every hand-authored shade in a role stays on-hue.
 *  - The sidebar's "Add color" button for an empty role writes here.
 *
 * If these ever disagree, "Add color" on an empty role would seed the picker
 * from a slot that does not exist, and the result would not match the colour a
 * subsequent "Full 50–950" generated from.
 */
export const BASE_SHADE_STEP: ShadeStep = 500;

export interface ColorModel {
  l: number;       // Lightness: 0 to 1
  c: number;       // Chroma: 0 to 0.4
  h: number;       // Hue: 0 to 360
  alpha: number;   // Alpha: 0 to 1
  hex: string;     // Hex representation (fallback / sRGB clamped)
  inSRGB: boolean;
  inP3: boolean;
}

// Convert OKLCH parameters to normalized ColorModel
export function createOklchColor(l: number, c: number, h: number, alpha: number = 1): ColorModel {
  const normL = Math.max(0, Math.min(1, Number(l) || 0));
  const normC = Math.max(0, Math.min(0.4, Number(c) || 0));
  const normH = ((Number(h) || 0) % 360 + 360) % 360;
  const normAlpha = Math.max(0, Math.min(1, alpha ?? 1));

  const oklchObj = {
    mode: 'oklch' as const,
    l: normL,
    c: normC,
    h: normH,
    alpha: normAlpha,
  };

  const inSRGB = displayable(oklchObj);
  // Check P3 gamut
  const inP3 = displayable({ ...oklchObj, mode: 'oklch' }); // Culori checks displayable in default RGB; P3 check below
  const p3Color = p3(oklchObj);
  const isP3Displayable =
    p3Color &&
    p3Color.r >= -0.001 && p3Color.r <= 1.001 &&
    p3Color.g >= -0.001 && p3Color.g <= 1.001 &&
    p3Color.b >= -0.001 && p3Color.b <= 1.001;

  // Clamped sRGB hex for display fallbacks
  const clamped = clampChroma(oklchObj, 'oklch');
  const hex = formatHex(clamped) || '#000000';

  return {
    l: Number(normL.toFixed(4)),
    c: Number(normC.toFixed(4)),
    h: Number(normH.toFixed(2)),
    alpha: Number(normAlpha.toFixed(3)),
    hex,
    inSRGB,
    inP3: Boolean(isP3Displayable),
  };
}

// Format as CSS oklch(...) string
export function formatOklch(color: { l: number; c: number; h: number; alpha?: number }): string {
  const lPercent = (color.l * 100).toFixed(1) + '%';
  const cVal = color.c.toFixed(3);
  const hVal = color.h.toFixed(1);
  if (color.alpha !== undefined && color.alpha < 1) {
    return `oklch(${lPercent} ${cVal} ${hVal} / ${color.alpha.toFixed(2)})`;
  }
  return `oklch(${lPercent} ${cVal} ${hVal})`;
}

// Parse any CSS color (Hex, RGB, HSL, OKLCH) into ColorModel
export function parseAnyToOklch(input: string): ColorModel | null {
  try {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const parsed = parse(trimmed);
    if (!parsed) return null;

    const ok = oklch(parsed);
    if (!ok) return null;

    return createOklchColor(
      ok.l ?? 0,
      ok.c ?? 0,
      ok.h ?? 0,
      ok.alpha ?? 1
    );
  } catch {
    return null;
  }
}

// Convert OKLCH to RGB string
export function oklchToRgbString(color: ColorModel): string {
  const oklchObj = { mode: 'oklch' as const, l: color.l, c: color.c, h: color.h, alpha: color.alpha };
  const clamped = clampChroma(oklchObj, 'oklch');
  return formatRgb(clamped) || 'rgb(0, 0, 0)';
}

// Convert OKLCH to HSL string
export function oklchToHslString(color: ColorModel): string {
  const oklchObj = { mode: 'oklch' as const, l: color.l, c: color.c, h: color.h, alpha: color.alpha };
  const clamped = clampChroma(oklchObj, 'oklch');
  return formatHsl(clamped) || 'hsl(0, 0%, 0%)';
}

// Compute standard target lightness for 50-950 scale
export const TARGET_LIGHTNESS: Record<ShadeStep, number> = {
  50: 0.97,
  100: 0.93,
  200: 0.86,
  300: 0.76,
  400: 0.64,
  500: 0.54,
  600: 0.45,
  700: 0.37,
  800: 0.28,
  900: 0.20,
  950: 0.13,
};

// Auto-assign any OKLCH color to the nearest 50-950 shade step by lightness
export function getNearestShadeStep(lightness: number): ShadeStep {
  let closestStep: ShadeStep = 500;
  let minDiff = Infinity;
  for (const step of SHADE_STEPS) {
    const diff = Math.abs(lightness - TARGET_LIGHTNESS[step]);
    if (diff < minDiff) {
      minDiff = diff;
      closestStep = step;
    }
  }
  return closestStep;
}

// Find maximum chroma for given lightness and hue inside sRGB gamut
export function findMaxChromaInSRGB(l: number, h: number): number {
  let low = 0;
  let high = 0.4;
  for (let i = 0; i < 16; i++) {
    const mid = (low + high) / 2;
    if (displayable({ mode: 'oklch', l, c: mid, h })) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return low;
}

// Generate a full, harmonious, gamut-safe 50-950 scale from a single base color
export function generateFullScaleFromColor(base: ColorModel): Record<ShadeStep, ColorModel> {
  const result = {} as Record<ShadeStep, ColorModel>;

  for (const step of SHADE_STEPS) {
    const targetL = TARGET_LIGHTNESS[step];
    // Maximum chroma physically possible in sRGB at this lightness and hue
    const maxChroma = findMaxChromaInSRGB(targetL, base.h);

    // Scaling factor: naturally tapers chroma at extreme highlights (50/100) and deep shadows (900/950)
    let chromaRatio = 1.0;
    if (step === 50) chromaRatio = 0.25;
    else if (step === 100) chromaRatio = 0.50;
    else if (step === 200) chromaRatio = 0.75;
    else if (step === 800) chromaRatio = 0.85;
    else if (step === 900) chromaRatio = 0.65;
    else if (step === 950) chromaRatio = 0.45;

    const desiredChroma = base.c * chromaRatio;
    const finalChroma = Math.min(desiredChroma, maxChroma * 0.98);

    result[step] = createOklchColor(targetL, finalChroma, base.h, base.alpha);
  }

  // Anchor the exact step matching the base color
  const closestStep = getNearestShadeStep(base.l);
  result[closestStep] = base;

  return result;
}

// Generate color harmonies (Complementary, Analogous, Triadic, Split-Complementary)
export function generateHarmonies(base: ColorModel) {
  const rotate = (deg: number) => createOklchColor(base.l, base.c, (base.h + deg) % 360, base.alpha);

  return {
    complementary: [base, rotate(180)],
    analogous: [rotate(-30), base, rotate(30)],
    triadic: [base, rotate(120), rotate(240)],
    splitComplementary: [base, rotate(150), rotate(210)],
    tetradic: [base, rotate(90), rotate(180), rotate(270)],
  };
}

// Contrast calculation: WCAG 2.1 ratio
export function getWcagContrast(fgHex: string, bgHex: string): number {
  try {
    const ratio = wcagContrast(fgHex, bgHex);
    return Number((ratio || 1).toFixed(2));
  } catch {
    return 1;
  }
}

// Approximate APCA contrast score
export function getApcaContrast(fgHex: string, bgHex: string): number {
  // Simplified estimated APCA derived from luminance
  const pFg = parse(fgHex);
  const pBg = parse(bgHex);
  if (!pFg || !pBg) return 0;
  const okFg = oklch(pFg);
  const okBg = oklch(pBg);
  if (!okFg || !okBg) return 0;
  // Perceptual lightness delta scaled to APCA-like -108..+108 range
  const lDelta = (okFg.l - okBg.l) * 110;
  return Math.round(lDelta);
}
