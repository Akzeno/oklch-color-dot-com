import { useState, useMemo } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import {
  createOklchColor,
  formatOklch,
  parseAnyToOklch,
  oklchToRgbString,
  oklchToHslString,
  type ColorModel,
} from '../../utils/color';
import {
  cartStore,
  addColorToCart,
  showToast,
} from '../../stores/cartStore';

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

const DEFAULT_COLOR = createOklchColor(0.62, 0.19, 255);

const MODE_EXAMPLES: Record<string, string> = {
  hex: '#3b82f6',
  oklch: 'oklch(62% 0.19 255)',
  rgb: 'rgb(59, 130, 246)',
  hsl: 'hsl(217, 91%, 60%)',
};

const MODES: { id: ConverterMode; label: string }[] = [
  { id: 'hex-to-oklch', label: 'HEX → OKLCH' },
  { id: 'oklch-to-hex', label: 'OKLCH → HEX' },
  { id: 'rgb-to-oklch', label: 'RGB → OKLCH' },
  { id: 'oklch-to-rgb', label: 'OKLCH → RGB' },
  { id: 'hsl-to-oklch', label: 'HSL → OKLCH' },
  { id: 'oklch-to-hsl', label: 'OKLCH → HSL' },
];

export default function ConverterIsland({ initialMode = 'hex-to-oklch' }: ConverterIslandProps) {
  const cart = useStore(cartStore);
  const [mode, setMode] = useState<ConverterMode>(initialMode);

  const inputFormat = mode.split('-to-')[0]; // 'hex', 'oklch', 'rgb', or 'hsl'

  const [inputValue, setInputValue] = useState<string>(
    () => MODE_EXAMPLES[inputFormat] ?? MODE_EXAMPLES.hex
  );

  // Validate and parse color input
  const { parsedColor, isValidInput } = useMemo(() => {
    const result = parseAnyToOklch(inputValue);
    if (result) {
      return { parsedColor: result, isValidInput: true };
    }
    return { parsedColor: DEFAULT_COLOR, isValidInput: false };
  }, [inputValue]);

  const oklchOutput = useMemo(() => formatOklch(parsedColor), [parsedColor]);
  const hexOutput = parsedColor.hex;
  const rgbOutput = useMemo(() => oklchToRgbString(parsedColor), [parsedColor]);
  const hslOutput = useMemo(() => oklchToHslString(parsedColor), [parsedColor]);

  // Determine primary output based on mode
  const primaryOutput = useMemo(() => {
    switch (mode) {
      case 'hex-to-oklch':
      case 'rgb-to-oklch':
      case 'hsl-to-oklch':
        return { label: 'OKLCH Output', value: oklchOutput };
      case 'oklch-to-hex':
        return { label: 'HEX Output', value: hexOutput };
      case 'oklch-to-rgb':
        return { label: 'RGB Output', value: rgbOutput };
      case 'oklch-to-hsl':
        return { label: 'HSL Output', value: hslOutput };
    }
  }, [mode, oklchOutput, hexOutput, rgbOutput, hslOutput]);

  const copyValue = async (val: string, label: string) => {
    try {
      await navigator.clipboard.writeText(val);
      showToast(`Copied ${label}`);
    } catch {
      showToast(`Failed to copy ${label}`);
    }
  };

  const handleModeChange = (newMode: ConverterMode) => {
    setMode(newMode);

    // Switch input value to complementary representation of current parsed color
    if (newMode.startsWith('oklch-')) {
      setInputValue(oklchOutput);
    } else if (newMode.startsWith('hex-')) {
      setInputValue(hexOutput);
    } else if (newMode.startsWith('rgb-')) {
      setInputValue(rgbOutput);
    } else if (newMode.startsWith('hsl-')) {
      setInputValue(hslOutput);
    }
  };

  return (
    <div class="bg-canvas-card border border-hairline rounded-xl p-5 md:p-6 space-y-6">
      {/* Mode Direction Switcher Pills */}
      <div class="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-hairline">
        <span class="text-xs font-mono uppercase tracking-wider text-mute">
          Conversion Direction
        </span>
        <div class="flex items-center gap-1.5 flex-wrap" role="tablist" aria-label="Conversion modes">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => handleModeChange(m.id)}
              aria-pressed={mode === m.id}
              class={`px-2.5 py-1 rounded-full text-xs font-mono transition-colors ${mode === m.id
                ? 'bg-ink text-ink-inverse font-medium'
                : 'bg-canvas-raised text-body hover:text-ink hover:bg-hairline'
                }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Conversion Grid */}
      <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left: Input */}
        <div class="md:col-span-5 space-y-2">
          <div class="flex items-center justify-between">
            <label for="color-input" class="text-xs font-mono text-body block">
              Input ({inputFormat.toUpperCase()})
            </label>
            {!isValidInput && (
              <span class="text-[10px] font-mono text-gamut-warning">Invalid syntax</span>
            )}
          </div>
          <div
            class={`bg-canvas-raised border rounded-lg p-3 transition-colors ${isValidInput
              ? 'border-hairline focus-within:border-border-focus'
              : 'border-gamut-warning/50 focus-within:border-gamut-warning'
              }`}
          >
            <input
              id="color-input"
              type="text"
              value={inputValue}
              onInput={(e) => setInputValue((e.target as HTMLInputElement).value)}
              class="w-full bg-transparent text-sm font-mono text-ink focus:outline-none"
              placeholder="Enter color value..."
            />
          </div>
          <span class="text-[11px] font-mono text-mute block">
            Example: {MODE_EXAMPLES[inputFormat] ?? MODE_EXAMPLES.hex}
          </span>
        </div>

        {/* Center: Swatch & Gamut Dot */}
        <div class="md:col-span-2 flex flex-col items-center justify-center">
          <div
            class="w-14 h-14 rounded-xl border border-hairline shadow-lg relative checker-bg flex items-center justify-center group overflow-hidden"
            title="Preview swatch"
          >
            <div
              class="absolute inset-0 transition-colors"
              style={{ backgroundColor: oklchOutput }}
            />
          </div>
          <div class="mt-2 text-center">
            {parsedColor.inSRGB ? (
              <span class="text-[10px] font-mono text-copy-success">sRGB</span>
            ) : parsedColor.inP3 ? (
              <span class="text-[10px] font-mono text-gamut-p3">P3 Gamut</span>
            ) : (
              <span class="text-[10px] font-mono text-gamut-warning">Clamped</span>
            )}
          </div>
        </div>

        {/* Right: Primary Converted Output */}
        <div class="md:col-span-5 space-y-2">
          {/*
            Not a `<label>`: this captions a readout, and there is no field
            below it for a label to be associated with. As a `<label>` Chrome
            reported an unlabelled form field on every converter page, six times
            over, for a control that does not exist.
          */}
          <span class="text-xs font-mono text-body block">
            {primaryOutput.label}
          </span>
          <div class="flex items-center justify-between bg-canvas-raised border border-hairline rounded-lg p-3">
            <span class="text-sm font-mono font-semibold text-ink truncate pr-2">
              {primaryOutput.value}
            </span>
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => copyValue(primaryOutput.value, primaryOutput.label)}
                class="touch-target px-2.5 py-1 rounded bg-canvas-elevated hover:bg-hairline text-xs font-mono text-ink transition-colors"
                title="Copy value"
              >
                Copy
              </button>
              <button
                onClick={() => addColorToCart(parsedColor, cart.activeRoleId)}
                class="touch-target px-2.5 py-1 rounded bg-ink hover:bg-ink-hover text-xs font-mono text-ink-inverse font-medium transition-colors"
                title="Add to cart"
              >
                + Cart
              </button>
            </div>
          </div>
          <span class="text-[11px] font-mono text-mute block">
            Target shade: {Math.round(parsedColor.l * 1000) / 10}% lightness
          </span>
        </div>
      </div>

      {/* All Secondary Representations */}
      <div class="pt-4 border-t border-hairline">
        <span class="text-[11px] font-mono uppercase tracking-wider text-mute block mb-2.5">
          All Equivalent Formats (Click to copy)
        </span>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 font-mono text-xs">
          {[
            { label: 'OKLCH', val: oklchOutput },
            { label: 'HEX', val: hexOutput },
            { label: 'RGB', val: rgbOutput },
            { label: 'HSL', val: hslOutput },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => copyValue(item.val, item.label)}
              class="bg-canvas-raised hover:bg-canvas-elevated border border-hairline p-2.5 rounded-lg flex items-center justify-between text-left transition-colors"
            >
              <div>
                <span class="text-[10px] text-mute block">{item.label}</span>
                <span class="text-ink truncate block font-medium">{item.val}</span>
              </div>
              <svg
                class="w-3.5 h-3.5 text-mute"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}