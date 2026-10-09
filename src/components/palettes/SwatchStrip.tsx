import { useState } from 'preact/hooks';
import type { LocaleCode } from '../../i18n/config';
import { t } from '../../i18n/translations';
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
 *    The clicked element comes along as the third argument because a caller that
 *    opens a menu needs something to anchor it to, and a colour is not an
 *    element.
 */
interface Props {
  shades: Record<ShadeStep, ColorModel>;
  onPick: (color: ColorModel, step: ShadeStep, anchor: HTMLElement) => void;
  /** Accessible name for the group, e.g. "Emerald Trust swatches". */
  label: string;
  /** Show the mono readout on hover. Off for dense strips. */
  readout?: boolean;
  /**
   * Set when a click opens a menu instead of acting on the colour.
   *
   * Then each swatch is a menu trigger and has to say so: `aria-haspopup` tells a
   * screen reader that activating it surfaces choices rather than an effect, and
   * `aria-expanded` on the one step whose menu is actually open is what makes
   * "open" a state that can be left again. `id` is the caller's menu id, so the
   * trigger can point at the thing it controls.
   *
   * Omitted by callers that act on click, where both attributes would be lies.
   */
  menu?: { id: string; openStep: ShadeStep | null };
  /** Locale for the swatch aria-labels. Callers localize `label` themselves. */
  locale?: LocaleCode;
}

export default function SwatchStrip({
  shades,
  onPick,
  label,
  readout = true,
  menu,
  locale = 'en',
}: Props) {
  const [active, setActive] = useState<ShadeStep | null>(null);
  const hovered = active !== null ? shades[active] : null;

  return (
    <div class="relative">
      <div class="swatch-strip" role="group" aria-label={label}>
        {Object.entries(shades).map(([rawStep, color]) => {
          const step = Number(rawStep) as ShadeStep;
          const isOpen = menu?.openStep === step;
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
              onClick={(e) => onPick(color, step, e.currentTarget)}
              aria-label={t(
                locale,
                'ui.swatchStrip.stepAria',
                'Step {step}: {value}, hex {hex}'
              )
                .replace('{step}', String(step))
                .replace('{value}', formatOklch(color))
                .replace('{hex}', color.hex)}
              aria-haspopup={menu ? 'menu' : undefined}
              aria-expanded={menu ? isOpen : undefined}
              aria-controls={isOpen ? menu?.id : undefined}
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