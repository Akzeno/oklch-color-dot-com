import { useState } from 'preact/hooks';
import { Check, Copy, Download } from 'lucide-preact';
import { formatOklch, SHADE_STEPS, type ColorModel, type ShadeStep } from '../../utils/color';
import { addColorToCart, showToast } from '../../stores/cartStore';
import { useCart } from '../../hooks/useCart';
import SwatchStrip from './SwatchStrip';

interface SwatchStripIslandProps {
  shades: Record<ShadeStep, ColorModel>;
  paletteName: string;
  paletteSlug: string;
}

export default function SwatchStripIsland({
  shades,
  paletteName,
  paletteSlug,
}: SwatchStripIslandProps) {
  const cart = useCart();
  const [copied, setCopied] = useState(false);

  /**
   * One click does two things: copy the value, and file it into the active role.
   *
   * That double action is the product's core loop, so it stays — but it is now
   * *stated*. Previously the clipboard write was silent and only the cart side
   * raised a toast, so a user who clicked to copy got no confirmation and a user
   * who clicked to file saw a message that never mentioned the copy.
   *
   * `addColorToCart` toasts on its own; the toast raised immediately after
   * supersedes it, so exactly one message appears and it names both outcomes.
   */
  const handlePick = (color: ColorModel, step: ShadeStep) => {
    const value = formatOklch(color);
    navigator.clipboard.writeText(value);
    const { roleId } = addColorToCart(color, cart.activeRoleId);
    showToast(`${value} → ${cart.roles[roleId]?.name ?? roleId}-${step}`);
  };

  const cssBlock = `@theme {\n${SHADE_STEPS.map(
    (s) => `  --color-${paletteSlug}-${s}: ${formatOklch(shades[s])};`
  ).join('\n')}\n}`;

  const copyCss = () => {
    navigator.clipboard.writeText(cssBlock);
    setCopied(true);
    showToast('@theme block copied');
    // Back to the copy glyph after the confirmation has been seen.
    setTimeout(() => setCopied(false), 1400);
  };

  const downloadJson = () => {
    const tokens = Object.fromEntries(
      SHADE_STEPS.map((s) => [String(s), formatOklch(shades[s])])
    );
    const blob = new Blob([JSON.stringify({ [paletteSlug]: tokens }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${paletteSlug}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`${paletteSlug}.json downloaded`);
  };

  return (
    <div class="space-y-3">
      <SwatchStrip shades={shades} onPick={handlePick} label={`${paletteName} swatches`} />

      {/*
        Footer actions. Each does one specific thing to the whole scale, which is
        the level the swatch bar operates at — the previous footer instead showed
        the base colour's L/C/H as a line of prose, information the strip itself
        already communicates.
      */}
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <a href={`/oklch-colors/${paletteSlug}`} class="link-hud flex items-center gap-1.5">
          <span>All {SHADE_STEPS.length} steps</span>
          <svg
            class="w-3 h-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </a>

        <div class="flex items-center gap-3">
          <button onClick={copyCss} class="link-hud flex items-center gap-1.5" title="Copy as a Tailwind v4 @theme block">
            {copied ? (
              <Check class="w-3.5 h-3.5 text-copy-success" aria-hidden="true" strokeWidth={2.5} />
            ) : (
              <Copy class="w-3.5 h-3.5" aria-hidden="true" strokeWidth={2} />
            )}
            <span>{copied ? 'Copied' : 'Copy CSS'}</span>
          </button>
          <button onClick={downloadJson} class="link-hud flex items-center gap-1.5" title="Download as JSON tokens">
            <Download class="w-3.5 h-3.5" aria-hidden="true" strokeWidth={2} />
            <span>JSON</span>
          </button>
        </div>
      </div>
    </div>
  );
}