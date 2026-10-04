import { useState, useMemo, useEffect } from 'preact/hooks';
import {
  createOklchColor,
  formatOklch,
  parseAnyToOklch,
  oklchToRgbString,
  oklchToHslString,
  findMaxChromaInSRGB,
  getNearestShadeStep,
  TARGET_LIGHTNESS,
  type ColorModel,
} from '../../utils/color';
import {
  addColorToCart,
  cartStore,
  setActiveRole,
  setRoleShade,
  isCartOpenStore,
  showToast,
  consumePickerHandoff,
  clearPickerHandoff,
  type PickerHandoff,
} from '../../stores/cartStore';
import { useCart } from '../../hooks/useCart';

export default function ColorPickerIsland() {
  const cart = useCart();

  // Picker internal state
  const [l, setL] = useState(0.62);
  const [c, setC] = useState(0.19);
  const [h, setH] = useState(255);
  const [alpha, setAlpha] = useState(1);

  /**
   * Handoff coming from the UI preview ("Color Picker" action on a clicked
   * element). When present the sliders open preloaded with that token's color
   * and saving writes back to the exact --color-<role>-<step> slot.
   */
  const [handoff, setHandoff] = useState<PickerHandoff | null>(null);

  useEffect(() => {
    const pending = consumePickerHandoff();
    if (!pending) return;
    setHandoff(pending);
    setActiveRole(pending.roleId);

    if (pending.color) {
      setL(pending.color.l);
      setC(pending.color.c);
      setH(pending.color.h);
      setAlpha(pending.color.alpha);
      return;
    }

    // Empty slot: author a new token that already suits its step, instead of
    // opening on the picker's arbitrary default (which ignored the slot).
    // Chroma/hue are inherited from the role's own 500 so a generated scale stays
    // on-hue; lightness comes from the step so slot 950 opens dark and 50 light.
    const role = cartStore.get().roles[pending.roleId];
    const base = role?.shades[500]?.color;
    setL(TARGET_LIGHTNESS[pending.step]);
    setC(base ? base.c : 0.12);
    setH(base ? base.h : 255);
    setAlpha(base ? base.alpha : 1);
  }, []);

  // Current active color model
  const color: ColorModel = useMemo(() => {
    return createOklchColor(l, c, h, alpha);
  }, [l, c, h, alpha]);

  const oklchString = formatOklch(color);
  const rgbString = useMemo(() => oklchToRgbString(color), [color]);
  const hslString = useMemo(() => oklchToHslString(color), [color]);
  const maxChroma = useMemo(() => findMaxChromaInSRGB(l, h), [l, h]);
  const nearestStep = useMemo(() => getNearestShadeStep(l), [l]);

  // Dynamic slider track gradient calculations
  const lTrackGradient = useMemo(() => {
    const stops = [0, 0.25, 0.5, 0.75, 1]
      .map((stepL) => `oklch(${(stepL * 100).toFixed(0)}% ${c.toFixed(3)} ${h.toFixed(1)})`)
      .join(', ');
    return `linear-gradient(to right, ${stops})`;
  }, [c, h]);

  const cTrackGradient = useMemo(() => {
    const stops = [0, 0.1, 0.2, 0.3, 0.4]
      .map((stepC) => `oklch(${(l * 100).toFixed(0)}% ${stepC.toFixed(3)} ${h.toFixed(1)})`)
      .join(', ');
    return `linear-gradient(to right, ${stops})`;
  }, [l, h]);

  const hTrackGradient = useMemo(() => {
    const stops = [0, 60, 120, 180, 240, 300, 360]
      .map((stepH) => `oklch(${(l * 100).toFixed(0)}% ${Math.min(c, 0.2).toFixed(3)} ${stepH})`)
      .join(', ');
    return `linear-gradient(to right, ${stops})`;
  }, [l, c]);

  const alphaTrackGradient = useMemo(() => {
    return `linear-gradient(to right, transparent, oklch(${(l * 100).toFixed(0)}% ${c.toFixed(3)} ${h.toFixed(1)}))`;
  }, [l, c, h]);

  // Input sync handler
  const handleInputChange = (raw: string) => {
    const parsed = parseAnyToOklch(raw);
    if (parsed) {
      setL(parsed.l);
      setC(parsed.c);
      setH(parsed.h);
      setAlpha(parsed.alpha);
    }
  };

  // Quick Randomize
  const randomizeColor = () => {
    setL(Number((0.3 + Math.random() * 0.55).toFixed(3)));
    setC(Number((0.08 + Math.random() * 0.22).toFixed(3)));
    setH(Math.round(Math.random() * 360));
  };

  // Add to cart
  const handleAddToCart = () => {
    if (handoff) {
      // Handoff: write to the exact slot the color came from
      setRoleShade(handoff.roleId, handoff.step, color);
      setHandoff(null);
      clearPickerHandoff();
      return;
    }
    addColorToCart(color, cart.activeRoleId);
  };

  const handoffRole = handoff ? cart.roles[handoff.roleId] : undefined;

  const activeRole = cart.roles[cart.activeRoleId] || Object.values(cart.roles)[0];

  return (
    <div class="space-y-6">
      {/* Handoff banner: opened from a specific token in the UI preview */}
      {handoff && (
        <div class="flex items-center justify-between flex-wrap gap-3 bg-[#141414] border border-[#3b82f6]/40 rounded-xl px-4 py-3">
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="w-8 h-8 rounded-lg border border-[#262626] flex-shrink-0"
              style={{ backgroundColor: oklchString }}
              aria-hidden="true"
            />
            <div class="min-w-0">
              <p class="text-xs font-semibold text-[#f5f5f5] truncate">
                {handoff.color ? 'Editing' : 'Creating'}{' '}
                <span class="font-mono text-[#86efac]">
                  --color-{handoff.roleId}-{handoff.step}
                </span>
              </p>
              <p class="text-[11px] font-mono text-[#737373] truncate">
                {handoff.color ? (
                  <>
                    Loaded from {handoffRole?.name ?? handoff.roleId} · saving replaces
                    that exact token
                  </>
                ) : (
                  <>
                    New token in {handoffRole?.name ?? handoff.roleId} · saving creates
                    that exact slot
                  </>
                )}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <a
              href="/ui-preview"
              class="px-3 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#222222] border border-[#262626] text-[11px] font-mono text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors"
            >
              Back to preview
            </a>
            <button
              onClick={() => {
                setHandoff(null);
                clearPickerHandoff();
              }}
              class="px-3 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] border border-[#262626] text-[11px] font-mono text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddToCart}
              class="px-3 py-1.5 rounded-lg bg-[#f5f5f5] hover:bg-white text-[11px] font-mono font-semibold text-[#0a0a0a] transition-colors shadow-lg shadow-white/5"
            >
              Save to token
            </button>
          </div>
        </div>
      )}
      {/* Top Hero Section: Swatch Preview & Primary HUD */}
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Large Color Canvas */}
        <div class="lg:col-span-7 flex flex-col">
          <div
            class="relative w-full h-64 md:h-80 rounded-xl border border-[#262626] overflow-hidden shadow-2xl flex flex-col justify-between p-4 checker-bg group"
            id="picker-swatch-canvas"
          >
            {/* The Actual Color Layer */}
            <div
              class="absolute inset-0 transition-colors duration-75"
              style={{ backgroundColor: oklchString }}
            />

            {/* Top Badges Overlay */}
            <div class="relative z-10 flex items-center justify-between">
              {/* Gamut Indicator Pill */}
              <div class="flex items-center gap-1.5">
                {color.inSRGB ? (
                  <span class="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-mono text-[#22c55e] border border-white/10 flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                    sRGB Gamut
                  </span>
                ) : color.inP3 ? (
                  <span class="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-mono text-[#06b6d4] border border-white/10 flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-[#06b6d4]" />
                    Display-P3 Wide Gamut
                  </span>
                ) : (
                  <span class="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-mono text-[#f59e0b] border border-white/10 flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                    Out of Gamut (Clamped)
                  </span>
                )}

                {/* Nearest Shade Step Hint */}
                <span class="hidden sm:inline px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-mono text-[#a3a3a3] border border-white/10">
                  Target Shade: {nearestStep}
                </span>
              </div>

              {/* Randomize Button */}
              <button
                onClick={randomizeColor}
                class="touch-target px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md hover:bg-black/80 text-[11px] font-mono text-[#f5f5f5] border border-white/10 transition-colors flex items-center gap-1.5"
                title="Randomize color"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m21.5 2-5 5M21.5 2H16M21.5 2v5.5M2.5 22l5-5M2.5 22H8M2.5 22v-5.5M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                </svg>
                <span>Random</span>
              </button>
            </div>

            {/* Bottom HUD: Live Value & Quick Copy */}
            <div class="relative z-10 flex items-center justify-between bg-black/75 backdrop-blur-md border border-white/10 p-2.5 rounded-lg">
              <div class="font-mono text-xs md:text-sm text-[#f5f5f5] font-semibold truncate pr-2">
                {oklchString}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(oklchString);
                  showToast(`Copied ${oklchString}`);
                }}
                class="touch-target px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-xs font-mono text-[#f5f5f5] transition-colors flex items-center gap-1.5"
                title="Copy oklch string"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                </svg>
                <span>Copy</span>
              </button>
            </div>
          </div>

          {/* Quick Role & Add to Cart Action Bar */}
          <div class="mt-3 p-3 bg-[#141414] border border-[#262626] rounded-xl flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono text-[#737373]">Role:</span>
              <select
                value={cart.activeRoleId}
                onChange={(e) => setActiveRole((e.target as HTMLSelectElement).value)}
                class="bg-[#171717] border border-[#262626] rounded px-2.5 py-1 text-xs font-mono text-[#f5f5f5] focus:outline-none focus:border-[#525252]"
              >
                {Object.values(cart.roles).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} (--color-{r.id}-*)
                  </option>
                ))}
              </select>
            </div>

            <div class="flex items-center gap-2">
              <button
                onClick={handleAddToCart}
                class="touch-target px-4 py-2 rounded-lg bg-[#f5f5f5] hover:bg-white text-xs font-mono font-medium text-[#0a0a0a] transition-colors flex items-center gap-2 shadow-lg"
                id="picker-add-to-cart-btn"
              >
                <svg class="w-4 h-4 text-[#0a0a0a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5v14"/>
                </svg>
                <span>
                  {handoff
                    ? `Save to --color-${handoff.roleId}-${handoff.step}`
                    : `Add to Cart (${activeRole?.name}-${nearestStep})`}
                </span>
              </button>
              <button
                onClick={() => isCartOpenStore.set(true)}
                class="touch-target px-3 py-2 rounded-lg bg-[#1f1f1f] hover:bg-[#262626] border border-[#262626] text-xs font-mono text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors"
                title="Open Cart"
              >
                View Cart
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Sliders Stack */}
        <div class="lg:col-span-5 bg-[#141414] border border-[#262626] rounded-xl p-5 space-y-5">
          <div class="flex items-center justify-between pb-2 border-b border-[#1f1f1f]">
            <h3 class="text-xs font-mono uppercase tracking-wider text-[#a3a3a3]">OKLCH Parameters</h3>
            <span class="text-[11px] font-mono text-[#737373]">Live Dynamic Tracks</span>
          </div>

          {/* Lightness Slider */}
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-xs font-mono">
              <span class="text-[#a3a3a3]">Lightness (L)</span>
              <span class="text-[#f5f5f5] font-semibold">{(l * 100).toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.005"
              value={l}
              onInput={(e) => setL(parseFloat((e.target as HTMLInputElement).value))}
              style={{ '--track-gradient': lTrackGradient }}
              class="w-full"
              aria-label="Lightness slider"
            />
          </div>

          {/* Chroma Slider */}
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-xs font-mono">
              <span class="text-[#a3a3a3]">Chroma (C)</span>
              <div class="flex items-center gap-2">
                <span class="text-[11px] text-[#737373]">(max sRGB: {maxChroma.toFixed(3)})</span>
                <span class="text-[#f5f5f5] font-semibold">{c.toFixed(3)}</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="0.37"
              step="0.002"
              value={c}
              onInput={(e) => setC(parseFloat((e.target as HTMLInputElement).value))}
              style={{ '--track-gradient': cTrackGradient }}
              class="w-full"
              aria-label="Chroma slider"
            />
          </div>

          {/* Hue Slider */}
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-xs font-mono">
              <span class="text-[#a3a3a3]">Hue (H)</span>
              <span class="text-[#f5f5f5] font-semibold">{h.toFixed(1)}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              step="1"
              value={h}
              onInput={(e) => setH(parseFloat((e.target as HTMLInputElement).value))}
              style={{ '--track-gradient': hTrackGradient }}
              class="w-full"
              aria-label="Hue slider"
            />
          </div>

          {/* Alpha Slider */}
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-xs font-mono">
              <span class="text-[#a3a3a3]">Alpha (Opacity)</span>
              <span class="text-[#f5f5f5] font-semibold">{Math.round(alpha * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={alpha}
              onInput={(e) => setAlpha(parseFloat((e.target as HTMLInputElement).value))}
              style={{ '--track-gradient': alphaTrackGradient }}
              class="w-full"
              aria-label="Alpha opacity slider"
            />
          </div>

          {/* Fallback & Technical Stats */}
          <div class="pt-3 border-t border-[#1f1f1f] grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div class="bg-[#171717] p-2 rounded border border-[#262626]">
              <span class="text-[#737373] block mb-0.5">sRGB Fallback Hex</span>
              <span class="text-[#f5f5f5] font-semibold">{color.hex}</span>
            </div>
            <div class="bg-[#171717] p-2 rounded border border-[#262626]">
              <span class="text-[#737373] block mb-0.5">Display Gamut</span>
              <span class={color.inSRGB ? 'text-[#22c55e]' : color.inP3 ? 'text-[#06b6d4]' : 'text-[#f59e0b]'}>
                {color.inSRGB ? 'Standard sRGB' : color.inP3 ? 'Wide Display-P3' : 'Out of Gamut'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Synchronized Format Input Group */}
      <div class="bg-[#141414] border border-[#262626] rounded-xl p-4">
        <h4 class="text-xs font-mono uppercase tracking-wider text-[#737373] mb-3">
          Synchronized Color Formats (Type or Paste any format)
        </h4>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
          {/* OKLCH */}
          <div class="space-y-1">
            <label class="text-[#737373] text-[11px] block">OKLCH</label>
            <div class="flex items-center bg-[#171717] border border-[#262626] rounded px-2.5 py-1.5 focus-within:border-[#525252]">
              <input
                type="text"
                value={oklchString}
                onChange={(e) => handleInputChange((e.target as HTMLInputElement).value)}
                class="bg-transparent text-[#f5f5f5] w-full focus:outline-none"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(oklchString);
                  showToast('Copied OKLCH');
                }}
                class="text-[#737373] hover:text-[#f5f5f5] ml-1.5"
                title="Copy"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                </svg>
              </button>
            </div>
          </div>

          {/* HEX */}
          <div class="space-y-1">
            <label class="text-[#737373] text-[11px] block">HEX (sRGB)</label>
            <div class="flex items-center bg-[#171717] border border-[#262626] rounded px-2.5 py-1.5 focus-within:border-[#525252]">
              <input
                type="text"
                value={color.hex}
                onChange={(e) => handleInputChange((e.target as HTMLInputElement).value)}
                class="bg-transparent text-[#f5f5f5] w-full focus:outline-none"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(color.hex);
                  showToast('Copied HEX');
                }}
                class="text-[#737373] hover:text-[#f5f5f5] ml-1.5"
                title="Copy"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                </svg>
              </button>
            </div>
          </div>

          {/* RGB */}
          <div class="space-y-1">
            <label class="text-[#737373] text-[11px] block">RGB</label>
            <div class="flex items-center bg-[#171717] border border-[#262626] rounded px-2.5 py-1.5 focus-within:border-[#525252]">
              <input
                type="text"
                value={rgbString}
                onChange={(e) => handleInputChange((e.target as HTMLInputElement).value)}
                class="bg-transparent text-[#f5f5f5] w-full focus:outline-none"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(rgbString);
                  showToast('Copied RGB');
                }}
                class="text-[#737373] hover:text-[#f5f5f5] ml-1.5"
                title="Copy"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                </svg>
              </button>
            </div>
          </div>

          {/* HSL */}
          <div class="space-y-1">
            <label class="text-[#737373] text-[11px] block">HSL</label>
            <div class="flex items-center bg-[#171717] border border-[#262626] rounded px-2.5 py-1.5 focus-within:border-[#525252]">
              <input
                type="text"
                value={hslString}
                onChange={(e) => handleInputChange((e.target as HTMLInputElement).value)}
                class="bg-transparent text-[#f5f5f5] w-full focus:outline-none"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(hslString);
                  showToast('Copied HSL');
                }}
                class="text-[#737373] hover:text-[#f5f5f5] ml-1.5"
                title="Copy"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
