import { useState, useMemo } from 'preact/hooks';
import { Copy, Plus } from 'lucide-preact';
import {
  createOklchColor,
  formatOklch,
  parseAnyToOklch,
  oklchToRgbString,
  oklchToHslString,
  type ColorModel,
} from '../../utils/color';
import { addColorToCart, showToast } from '../../stores/cartStore';
import { useCart } from '../../hooks/useCart';

export type ConverterMode =
  | 'hex-to-oklch'
  | 'oklch-to-hex'
  | 'rgb-to-oklch'
  | 'oklch-to-rgb'
  | 'hsl-to-oklch'
  | 'oklch-to-hsl';

interface ConverterIslandProps {
  initialMode?: ConverterMode;
}

const MODES: { id: ConverterMode; label: string }[] = [
  { id: 'hex-to-oklch', label: 'HEX → OKLCH' },
  { id: 'oklch-to-hex', label: 'OKLCH → HEX' },
  { id: 'rgb-to-oklch', label: 'RGB → OKLCH' },
  { id: 'oklch-to-rgb', label: 'OKLCH → RGB' },
  { id: 'hsl-to-oklch', label: 'HSL → OKLCH' },
  { id: 'oklch-to-hsl', label: 'OKLCH → HSL' },
];

/** Which format each direction *reads* from, keyed by mode. */
const INPUT_SOURCE: Record<ConverterMode, 'oklch' | 'hex' | 'rgb' | 'hsl'> = {
  'hex-to-oklch': 'hex',
  'oklch-to-hex': 'oklch',
  'rgb-to-oklch': 'rgb',
  'oklch-to-rgb': 'oklch',
  'hsl-to-oklch': 'hsl',
  'oklch-to-hsl': 'oklch',
};

/** A per-mode starting point, so every direction opens on a real colour. */
const SEED: Record<ConverterMode, string> = {
  'hex-to-oklch': '#3b82f6',
  'oklch-to-hex': 'oklch(62% 0.19 255)',
  'rgb-to-oklch': 'rgb(59, 130, 246)',
  'oklch-to-rgb': 'oklch(62% 0.19 255)',
  'hsl-to-oklch': 'hsl(217, 91%, 60%)',
  'oklch-to-hsl': 'oklch(62% 0.19 255)',
};

export default function ConverterIsland({ initialMode = 'hex-to-oklch' }: ConverterIslandProps) {
  const cart = useCart();
  const [mode, setMode] = useState<ConverterMode>(initialMode);
  const [inputValue, setInputValue] = useState(SEED[initialMode]);

  const parsedColor: ColorModel = useMemo(
    () => parseAnyToOklch(inputValue) || createOklchColor(0.62, 0.19, 255),
    [inputValue]
  );

  const oklchOutput = formatOklch(parsedColor);
  const hexOutput = parsedColor.hex;
  const rgbOutput = useMemo(() => oklchToRgbString(parsedColor), [parsedColor]);
  const hslOutput = useMemo(() => oklchToHslString(parsedColor), [parsedColor]);

  /**
   * Every representation, in one list.
   *
   * The previous layout showed the "primary" conversion in its own labelled box
   * *and* then repeated all four values in a grid underneath — so on every page
   * the same number appeared twice at two different sizes, and the user had to
   * work out which one was authoritative. One list, with the direction's target
   * marked, removes the ambiguity and about a third of the height.
   */
  const formats = useMemo(
    () => [
      { key: 'oklch', label: 'OKLCH', value: oklchOutput, target: mode.endsWith('oklch') },
      { key: 'hex', label: 'HEX', value: hexOutput, target: mode === 'oklch-to-hex' },
      { key: 'rgb', label: 'RGB', value: rgbOutput, target: mode === 'oklch-to-rgb' },
      { key: 'hsl', label: 'HSL', value: hslOutput, target: mode === 'oklch-to-hsl' },
    ],
    [oklchOutput, hexOutput, rgbOutput, hslOutput, mode]
  );

  const copy = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    showToast(`${label} copied`);
  };

  /**
   * Switching direction rewrites the input into the new source format, so the
   * colour on screen stays constant across the switch. Reinterpreting the old
   * string instead would silently change the colour the user is looking at.
   */
  const switchMode = (next: ConverterMode) => {
    const current = formats.find((f) => f.key === INPUT_SOURCE[next]);
    setMode(next);
    setInputValue(current?.value ?? SEED[next]);
  };

  const gamut = parsedColor.inSRGB
    ? { dot: 'bg-copy-success', text: 'sRGB' }
    : parsedColor.inP3
      ? { dot: 'bg-gamut-p3', text: 'Display-P3' }
      : { dot: 'bg-gamut-warning', text: 'Clipped to sRGB' };

  return (
    <div class="card !p-4 space-y-4">
      {/* Direction switcher. The chips are the affordance; the removed
          "Conversion Direction" caption only restated them. */}
      <div class="flex flex-wrap gap-1.5" role="group" aria-label="Conversion direction">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => switchMode(m.id)}
            aria-pressed={mode === m.id}
            class="chip"
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Input. The swatch rides inside the field so the user always sees what
          they typed without scrolling up to the preview. */}
      <div class="hud flex items-center gap-3">
        <span
          class="w-5 h-5 rounded-[5px] border border-hairline flex-shrink-0 checker-bg"
          style={{ backgroundColor: oklchOutput }}
          aria-hidden="true"
        />
        <input
          type="text"
          value={inputValue}
          spellcheck={false}
          autocomplete="off"
          autocapitalize="off"
          aria-label="Colour value to convert"
          onInput={(e) => setInputValue((e.target as HTMLInputElement).value)}
          class="flex-1 min-w-0 bg-transparent font-mono text-hud text-ink focus:outline-none"
          placeholder="#3b82f6 · oklch(62% 0.19 255) · rgb(59,130,246)"
        />
      </div>

      {/* Preview canvas. Wide and saturated on purpose — this is where gamut
          clipping becomes visible rather than being something to read about. */}
      <div
        class="relative h-28 rounded-md border border-hairline overflow-hidden checker-bg"
        aria-hidden="true"
      >
        <div class="absolute inset-0" style={{ backgroundColor: oklchOutput }} />

        <div class="absolute top-2 left-2">
          <span class="pill !bg-black/60 backdrop-blur-md !border-white/10">
            <span class={`w-1.5 h-1.5 rounded-full ${gamut.dot}`} />
            {gamut.text}
          </span>
        </div>
      </div>

      {/* All representations. The row matching the current direction is marked,
          which is the only emphasis this list needs. */}
      <ul class="space-y-1.5">
        {formats.map((f) => (
          <li key={f.key}>
            <button
              onClick={() => copy(f.value, f.label)}
              title={`Copy ${f.label}`}
              class={`group flex w-full items-center gap-3 px-3 py-2 rounded-md border bg-canvas-raised transition-colors duration-150 ${
                f.target
                  ? 'border-border-focus'
                  : 'border-hairline hover:border-border-focus'
              }`}
            >
              <span class="eyebrow w-12 shrink-0 text-left">{f.label}</span>
              <span class="flex-1 min-w-0 text-left font-mono text-hud text-ink truncate">
                {f.value}
              </span>
              <Copy
                class="w-3.5 h-3.5 shrink-0 text-faint group-hover:text-ink transition-colors duration-150"
                aria-hidden="true"
              />
            </button>
          </li>
        ))}
      </ul>

      <div class="flex items-center justify-between gap-3 pt-3 border-t border-hairline-subtle flex-wrap">
        <span class="eyebrow">
          L {(parsedColor.l * 100).toFixed(1)}% · C {parsedColor.c.toFixed(3)} · H{' '}
          {parsedColor.h.toFixed(1)}°
        </span>
        <button
          onClick={() => addColorToCart(parsedColor, cart.activeRoleId)}
          class="btn btn-primary"
          title={`Save to --color-${cart.activeRoleId}-*`}
        >
          <Plus class="w-4 h-4" aria-hidden="true" strokeWidth={2.5} />
          Collect
        </button>
      </div>
    </div>
  );
}