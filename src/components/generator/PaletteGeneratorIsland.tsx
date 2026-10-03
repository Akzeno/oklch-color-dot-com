import { useState, useMemo } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
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
  cartStore,
  addColorToCart,
  generateFullScaleForRole,
  setActiveRole,
  isCartOpenStore,
  showToast,
} from '../../stores/cartStore';

export default function PaletteGeneratorIsland() {
  const cart = useStore(cartStore);

  // Base color state
  const [baseHex, setBaseHex] = useState('#2563eb');
  const [targetRoleId, setTargetRoleId] = useState('primary');

  const baseColor: ColorModel = useMemo(() => {
    return parseAnyToOklch(baseHex) || createOklchColor(0.55, 0.22, 255);
  }, [baseHex]);

  // Generated 50-950 scale
  const fullScale = useMemo(() => {
    return generateFullScaleFromColor(baseColor);
  }, [baseColor]);

  // Generated color harmonies
  const harmonies = useMemo(() => {
    return generateHarmonies(baseColor);
  }, [baseColor]);

  // Single swatch add
  const handleSingleSwatchClick = (color: ColorModel, stepName: string) => {
    const oklchStr = formatOklch(color);
    navigator.clipboard.writeText(oklchStr);
    addColorToCart(color, targetRoleId);
    showToast(`Added ${stepName} to ${targetRoleId}`);
  };

  // Explicit action: fill all 11 steps into selected role
  const handleFillEntireScale = () => {
    generateFullScaleForRole(targetRoleId, baseColor);
  };

  return (
    <div class="space-y-8">
      {/* Base Color Controller Box */}
      <div class="bg-[#141414] border border-[#262626] rounded-xl p-5 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-sm font-semibold text-[#f5f5f5]">Base Color Input</h2>
            <p class="text-xs font-mono text-[#737373] mt-0.5">
              Enter any Hex, RGB, or OKLCH value to synthesize a complete 50–950 design token scale.
            </p>
          </div>

          {/* Quick presets */}
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-[11px] font-mono text-[#737373] mr-1">Presets:</span>
            {[
              { label: 'Blue', hex: '#2563eb' },
              { label: 'Emerald', hex: '#10b981' },
              { label: 'Amber', hex: '#f59e0b' },
              { label: 'Rose', hex: '#f43f5e' },
              { label: 'Violet', hex: '#8b5cf6' },
            ].map((p) => (
              <button
                key={p.hex}
                onClick={() => setBaseHex(p.hex)}
                class="px-2 py-0.5 rounded bg-[#1f1f1f] hover:bg-[#262626] border border-[#262626] text-[11px] font-mono text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Base Swatch Preview */}
          <div class="md:col-span-3 flex items-center gap-3 bg-[#171717] border border-[#262626] p-2.5 rounded-lg">
            <div
              class="w-10 h-10 rounded-md border border-white/20 shadow-inner flex-shrink-0"
              style={{ backgroundColor: formatOklch(baseColor) }}
            />
            <div class="min-w-0">
              <span class="text-xs font-mono text-[#f5f5f5] block truncate font-semibold">
                {baseColor.hex}
              </span>
              <span class="text-[10px] font-mono text-[#737373] block truncate">
                L {(baseColor.l * 100).toFixed(0)}% C {baseColor.c.toFixed(2)} H {baseColor.h.toFixed(0)}°
              </span>
            </div>
          </div>

          {/* Color Input */}
          <div class="md:col-span-4">
            <input
              type="text"
              value={baseHex}
              onInput={(e) => setBaseHex((e.target as HTMLInputElement).value)}
              placeholder="e.g. #2563eb or oklch(62% 0.19 255)"
              class="w-full px-3 py-2 rounded-lg bg-[#171717] border border-[#262626] text-xs font-mono text-[#f5f5f5] focus:outline-none focus:border-[#525252]"
            />
          </div>

          {/* Target Role Dropdown & Fill Scale CTA */}
          <div class="md:col-span-5 flex items-center gap-2">
            <select
              value={targetRoleId}
              onChange={(e) => setTargetRoleId((e.target as HTMLSelectElement).value)}
              class="bg-[#171717] border border-[#262626] rounded-lg px-3 py-2 text-xs font-mono text-[#f5f5f5] focus:outline-none focus:border-[#525252]"
            >
              {Object.values(cart.roles).map((r) => (
                <option key={r.id} value={r.id}>
                  Role: {r.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleFillEntireScale}
              class="touch-target flex-1 py-2 px-3 rounded-lg bg-[#f5f5f5] hover:bg-white text-xs font-mono font-medium text-[#0a0a0a] transition-colors flex items-center justify-center gap-1.5 shadow-md whitespace-nowrap"
            >
              <svg class="w-3.5 h-3.5 text-[#0a0a0a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5v14"/>
              </svg>
              <span>Fill Role with Scale</span>
            </button>
          </div>
        </div>
      </div>

      {/* 50-950 Scale Strip */}
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-mono uppercase tracking-wider text-[#a3a3a3]">
            Synthesized 50–950 OKLCH Scale (Click any swatch to copy & add)
          </h3>
          <span class="text-[11px] font-mono text-[#737373]">11 Steps (Gamut-Clamped)</span>
        </div>

        {/* 11 Steps Grid */}
        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-11 gap-2">
          {SHADE_STEPS.map((step) => {
            const color = fullScale[step];
            const oklchCss = formatOklch(color);

            return (
              <button
                key={step}
                onClick={() => handleSingleSwatchClick(color, `${step}`)}
                class="group bg-[#141414] hover:bg-[#1f1f1f] border border-[#262626] hover:border-[#525252] rounded-lg p-2.5 text-left transition-all duration-150 flex flex-col justify-between h-28"
                aria-label={`Step ${step}: ${oklchCss}. Click to copy and add to cart.`}
              >
                <div class="flex items-center justify-between w-full">
                  <span class="text-xs font-mono font-semibold text-[#f5f5f5]">{step}</span>
                  {color.inP3 && !color.inSRGB && (
                    <span class="text-[9px] font-mono font-bold text-[#06b6d4] px-1 rounded bg-black/40">
                      P3
                    </span>
                  )}
                </div>

                <div
                  class="w-full h-8 rounded border border-white/10 shadow-sm transition-transform group-hover:scale-105"
                  style={{ backgroundColor: oklchCss }}
                />

                <div class="text-[10px] font-mono text-[#737373] group-hover:text-[#a3a3a3] truncate w-full">
                  {color.hex}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Harmonies */}
      <div class="space-y-4 pt-4 border-t border-[#1f1f1f]">
        <h3 class="text-xs font-mono uppercase tracking-wider text-[#a3a3a3]">
          Perceptual Color Harmonies (Hue Rotation in OKLCH)
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Complementary */}
          <div class="bg-[#141414] border border-[#262626] rounded-xl p-3.5 space-y-2">
            <span class="text-xs font-mono text-[#f5f5f5] block">Complementary (180°)</span>
            <div class="flex h-12 rounded-lg overflow-hidden border border-[#262626]">
              {harmonies.complementary.map((c, i) => (
                <button
                  key={i}
                  onClick={() => handleSingleSwatchClick(c, `comp-${i}`)}
                  class="flex-1 h-full hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: formatOklch(c) }}
                  title="Click to copy & add to cart"
                />
              ))}
            </div>
          </div>

          {/* Triadic */}
          <div class="bg-[#141414] border border-[#262626] rounded-xl p-3.5 space-y-2">
            <span class="text-xs font-mono text-[#f5f5f5] block">Triadic (120° / 240°)</span>
            <div class="flex h-12 rounded-lg overflow-hidden border border-[#262626]">
              {harmonies.triadic.map((c, i) => (
                <button
                  key={i}
                  onClick={() => handleSingleSwatchClick(c, `triad-${i}`)}
                  class="flex-1 h-full hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: formatOklch(c) }}
                  title="Click to copy & add to cart"
                />
              ))}
            </div>
          </div>

          {/* Analogous */}
          <div class="bg-[#141414] border border-[#262626] rounded-xl p-3.5 space-y-2">
            <span class="text-xs font-mono text-[#f5f5f5] block">Analogous (±30°)</span>
            <div class="flex h-12 rounded-lg overflow-hidden border border-[#262626]">
              {harmonies.analogous.map((c, i) => (
                <button
                  key={i}
                  onClick={() => handleSingleSwatchClick(c, `analog-${i}`)}
                  class="flex-1 h-full hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: formatOklch(c) }}
                  title="Click to copy & add to cart"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
