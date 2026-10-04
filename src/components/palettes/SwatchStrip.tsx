import { useState } from 'preact/hooks';
import { formatOklch, type ColorModel, type ShadeStep } from '../../utils/color';

/**
 * A contiguous bar of colour — the hero element of this product.
 *
 * Extracted because the palette library and the generator were maintaining two
 * near-identical copies of the same strip, hover scale and readout, and had
 * already drifted: one scaled only on the Y axis, one only on hover.
 *
 * Interaction contract:
 *  - Hover/focus scales the step slightly and lifts it above its neighbours, so
 *    the step under the cursor is never half-covered by the next one.
 *  - Clicking reports the exact colour. What the caller *does* with it (copy,
 *    collect into a role, load the generator from it) is deliberately outside
 *    this component — the same strip serves three pages with different intents.
 */
interface Props {
  shades: Record<ShadeStep, ColorModel>;
  onPick: (color: ColorModel, step: ShadeStep) => void;
  /** Accessible name for the group, e.g. "Emerald Trust swatches". */
  label: string;
  /** Show the mono readout on hover. Off for dense strips. */
  readout?: boolean;
}

export default function SwatchStrip({ shades, onPick, label, readout = true }: Props) {
  const [active, setActive] = useState<ShadeStep | null>(null);
  const hovered = active !== null ? shades[active] : null;

  return (
    <div class="relative">
      <div class="swatch-strip" role="group" aria-label={label}>
        {Object.entries(shades).map(([rawStep, color]) => {
          const step = Number(rawStep) as ShadeStep;
          return (
            <button
              key={step}
              type="button"
              class="swatch-item"
              style={{ backgroundColor: formatOklch(color) }}
              onMouseEnter={() => setActive(step)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(step)}
              onBlur={() => setActive(null)}
              onClick={() => onPick(color, step)}
              aria-label={`Step ${step}: ${formatOklch(color)}, hex ${color.hex}`}
            >
              {/* Gamut state as a dot on the swatch itself. A text badge on a
                  saturated colour is unreadable; a 6px dot is not. */}
              {color.inP3 && !color.inSRGB && (
                <span class="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-gamut-p3 ring-1 ring-black/40" />
              )}
            </button>
          );
        })}
      </div>

      {readout && hovered && active !== null && (
        <div class="absolute -top-8 left-1/2 -translate-x-1/2 z-30 dock !rounded-md !px-2 !py-1 flex items-center gap-2 whitespace-nowrap pointer-events-none animate-fade-in">
          <span class="font-mono text-micro text-body">{active}</span>
          <span class="font-mono text-micro text-ink">{formatOklch(hovered)}</span>
          <span class="font-mono text-micro text-faint">{hovered.hex}</span>
          {hovered.inP3 && !hovered.inSRGB && (
            <span class="font-mono text-micro text-gamut-p3">P3</span>
          )}
        </div>
      )}
    </div>
  );
}