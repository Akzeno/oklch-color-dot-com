import { useState, useMemo } from 'preact/hooks';
import { Plus } from 'lucide-preact';
import {
  createOklchColor,
  formatOklch,
  parseAnyToOklch,
  generateFullScaleFromColor,
  generateHarmonies,
  SHADE_STEPS,
  type ColorModel,
  type ShadeStep,
} from '../../utils/color';
import {
  addColorToCart,
  generateFullScaleForRole,
  setActiveRole,
  showToast,
} from '../../stores/cartStore';
import { useCart } from '../../hooks/useCart';
import SwatchStrip from '../palettes/SwatchStrip';

const PRESETS = [
  { label: 'Blue', hex: '#2563eb' },
  { label: 'Emerald', hex: '#10b981' },
  { label: 'Amber', hex: '#f59e0b' },
  { label: 'Rose', hex: '#f43f5e' },
  { label: 'Violet', hex: '#8b5cf6' },
];

export default function PaletteGeneratorIsland() {
  const cart = useCart();
  const [baseHex, setBaseHex] = useState('#2563eb');
  const [targetRoleId, setTargetRoleId] = useState('primary');

  const baseColor: ColorModel = useMemo(
    () => parseAnyToOklch(baseHex) || createOklchColor(0.55, 0.22, 255),
    [baseHex]
  );

  const fullScale = useMemo(() => generateFullScaleFromColor(baseColor), [baseColor]);
  const harmonies = useMemo(() => generateHarmonies(baseColor), [baseColor]);

  /**
   * Shared by both the scale strip and the harmony strips: copy the value and
   * file it into the target role, with one toast naming both.
   */
  const collect = (color: ColorModel, stepLabel: string) => {
    const value = formatOklch(color);
    navigator.clipboard.writeText(value);
    const { roleId } = addColorToCart(color, targetRoleId);
    showToast(`${value} → ${cart.roles[roleId]?.name ?? roleId}-${stepLabel}`);
  };

  /**
   * The scale is rendered as one contiguous 48px bar rather than eleven separate
   * bordered cards. The card version spent more ink on borders and per-swatch
   * captions than on the colours themselves, and the borders fought the thing
   * being judged — a grid of boxes makes a smooth scale look like a set of
   * unrelated colours.
   */
  const scaleRecord = useMemo(() => {
    const out = {} as Record<ShadeStep, ColorModel>;
    for (const step of SHADE_STEPS) out[step] = fullScale[step];
    return out;
  }, [fullScale]);

  const harmonyGroups = [
    { label: 'Complementary', note: '180°', colors: harmonies.complementary },
    { label: 'Triadic', note: '±120°', colors: harmonies.triadic },
    { label: 'Analogous', note: '±30°', colors: harmonies.analogous },
  ];

  return (
    <div class="space-y-6">
      {/* ── Base colour ── */}
      <div class="card !p-4 space-y-3">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="eyebrow mr-1">Presets</span>
          {PRESETS.map((p) => (
            <button
              key={p.hex}
              onClick={() => setBaseHex(p.hex)}
              aria-pressed={baseHex.toLowerCase() === p.hex}
              class="chip !py-1 !px-2.5 !text-micro"
            >
              <span
                class="w-2.5 h-2.5 rounded-full border border-hairline"
                style={{ backgroundColor: p.hex }}
                aria-hidden="true"
              />
              {p.label}
            </button>
          ))}
        </div>

        <div class="grid sm:grid-cols-[auto_1fr] lg:grid-cols-[auto_1fr_auto] gap-2 items-center">
          <span
            class="w-10 h-10 rounded-md border border-hairline checker-bg"
            style={{ backgroundColor: formatOklch(baseColor) }}
            aria-hidden="true"
          />

          <div class="hud flex items-center gap-2">
            <input
              type="text"
              value={baseHex}
              spellcheck={false}
              autocomplete="off"
              aria-label="Base colour in any format"
              onInput={(e) => setBaseHex((e.target as HTMLInputElement).value)}
              class="flex-1 min-w-0 bg-transparent font-mono text-hud text-ink focus:outline-none"
              placeholder="#2563eb · oklch(55% 0.22 255)"
            />
            <span class="eyebrow shrink-0 hidden sm:inline">
              L {(baseColor.l * 100).toFixed(0)} · C {baseColor.c.toFixed(2)} · H{' '}
              {baseColor.h.toFixed(0)}
            </span>
          </div>

          <label class="flex items-center gap-2 lg:ml-auto">
            <span class="eyebrow shrink-0 lg:sr-only">Role</span>
            <select
              value={targetRoleId}
              onChange={(e) => {
                setTargetRoleId((e.target as HTMLSelectElement).value);
                setActiveRole((e.target as HTMLSelectElement).value);
              }}
              class="hud !py-1.5 font-mono text-label min-w-0 cursor-pointer"
            >
              {Object.values(cart.roles).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          onClick={() => generateFullScaleForRole(targetRoleId, baseColor)}
          class="btn btn-primary w-full sm:w-auto"
        >
          <Plus class="w-4 h-4" aria-hidden="true" strokeWidth={2.5} />
          Fill {cart.roles[targetRoleId]?.name ?? targetRoleId} with all {SHADE_STEPS.length} steps
        </button>
      </div>

      {/* ── Generated scale ── */}
      <div>
        <div class="flex items-baseline justify-between gap-3 mb-2">
          <span class="eyebrow">50–950 scale</span>
          <span class="eyebrow">gamut-clamped</span>
        </div>
        <SwatchStrip
          shades={scaleRecord}
          onPick={(color, step) => collect(color, String(step))}
          label="Generated scale"
        />
        <p class="mt-2 font-mono text-micro text-mute">
          Click a step to copy it and file it to the selected role.
        </p>
      </div>

      {/* ── Harmonies ── */}
      <div>
        <div class="mb-2">
          <span class="eyebrow">Hue harmonies</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {harmonyGroups.map((g) => (
            <div key={g.label} class="min-w-0">
              <div class="flex items-baseline justify-between gap-2 mb-1.5">
                <span class="font-mono text-label text-ink">{g.label}</span>
                <span class="eyebrow">{g.note}</span>
              </div>
              {/* Same contiguous-strip treatment as the scale, at a shorter
                  height because three hues read faster than eleven steps. */}
              <div class="swatch-strip !h-10">
                {g.colors.map((color, i) => (
                  <button
                    key={i}
                    type="button"
                    class="swatch-item"
                    style={{ backgroundColor: formatOklch(color) }}
                    onClick={() => collect(color, `${g.label.toLowerCase()}-${i + 1}`)}
                    title={`${g.label} ${i + 1} — click to copy and collect`}
                    aria-label={`${g.label} ${i + 1}: ${formatOklch(color)}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}