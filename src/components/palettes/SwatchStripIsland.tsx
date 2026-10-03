import { useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import {
  type ColorModel,
  type ShadeStep,
  SHADE_STEPS,
  formatOklch,
} from '../../utils/color';
import {
  cartStore,
  addColorToCart,
  showToast,
} from '../../stores/cartStore';

interface SwatchStripIslandProps {
  shades: Record<ShadeStep, ColorModel>;
  paletteName: string;
}

export default function SwatchStripIsland({ shades, paletteName }: SwatchStripIslandProps) {
  const cart = useStore(cartStore);
  const [hoveredStep, setHoveredStep] = useState<ShadeStep | null>(null);

  const handleSwatchClick = (color: ColorModel, step: ShadeStep) => {
    const oklchStr = formatOklch(color);
    navigator.clipboard.writeText(oklchStr);
    // Add only this single color into the user's active cart role
    const { roleId } = addColorToCart(color, cart.activeRoleId);
    showToast(`Added ${step} to ${cart.roles[roleId]?.name || roleId}`);
  };

  const hoveredColor = hoveredStep ? shades[hoveredStep] : null;

  return (
    <div class="relative group/strip">
      {/* Contiguous Swatch Strip (Height: 48px, rounded 10px, per DESIGN.md) */}
      <div
        class="h-12 w-full rounded-[10px] border border-[#262626] overflow-hidden flex items-stretch shadow-md bg-[#0a0a0a]"
        role="group"
        aria-label={`Color swatches for ${paletteName}`}
      >
        {SHADE_STEPS.map((step) => {
          const color = shades[step];
          if (!color) return null;
          const oklchCss = formatOklch(color);
          const isHovered = hoveredStep === step;

          return (
            <button
              key={step}
              type="button"
              onMouseEnter={() => setHoveredStep(step)}
              onMouseLeave={() => setHoveredStep(null)}
              onClick={() => handleSwatchClick(color, step)}
              class="flex-1 h-full cursor-pointer transition-all duration-150 relative focus:outline-none focus:ring-1 focus:ring-white z-0 hover:z-10 hover:scale-y-105 hover:shadow-lg"
              style={{ backgroundColor: oklchCss }}
              aria-label={`Step ${step}: ${oklchCss}. Click to copy and add to cart.`}
            >
              {/* Gamut alert dot if Display-P3 */}
              {color.inP3 && !color.inSRGB && (
                <span class="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#06b6d4] shadow-sm pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>

      {/* Floating Micro-HUD on Hover */}
      {hoveredColor && hoveredStep && (
        <div class="absolute -top-10 left-1/2 -translate-x-1/2 z-30 px-2.5 py-1 rounded bg-[#171717]/95 border border-[#262626] shadow-xl text-[11px] font-mono text-[#f5f5f5] flex items-center gap-2 whitespace-nowrap pointer-events-none backdrop-blur-md animate-in fade-in duration-100">
          <span class="font-bold text-[#a3a3a3]">{hoveredStep}</span>
          <span class="text-[#f5f5f5]">{formatOklch(hoveredColor)}</span>
          <span class="text-[#737373]">({hoveredColor.hex})</span>
          {hoveredColor.inP3 && !hoveredColor.inSRGB && (
            <span class="text-[#06b6d4] text-[10px] font-bold">P3</span>
          )}
        </div>
      )}
    </div>
  );
}
