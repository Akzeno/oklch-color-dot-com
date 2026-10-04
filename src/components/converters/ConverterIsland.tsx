import { useState, useMemo } from 'preact/hooks';
import {
  createOklchColor,
  formatOklch,
  parseAnyToOklch,
  oklchToRgbString,
  oklchToHslString,
  type ColorModel,
} from '../../utils/color';
import {
  addColorToCart,
  showToast,
} from '../../stores/cartStore';
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

export default function ConverterIsland({ initialMode = 'hex-to-oklch' }: ConverterIslandProps) {
  const cart = useCart();
  const [mode, setMode] = useState<ConverterMode>(initialMode);
  const [inputValue, setInputValue] = useState(() => {
    switch (initialMode) {
      case 'hex-to-oklch':
        return '#3b82f6';
      case 'oklch-to-hex':
        return 'oklch(62% 0.19 255)';
      case 'rgb-to-oklch':
        return 'rgb(59, 130, 246)';
      case 'oklch-to-rgb':
        return 'oklch(62% 0.19 255)';
      case 'hsl-to-oklch':
        return 'hsl(217, 91%, 60%)';
      case 'oklch-to-hsl':
        return 'oklch(62% 0.19 255)';
      default:
        return '#3b82f6';
    }
  });

  const parsedColor: ColorModel = useMemo(() => {
    return parseAnyToOklch(inputValue) || createOklchColor(0.62, 0.19, 255);
  }, [inputValue]);

  const oklchOutput = formatOklch(parsedColor);
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

  const copyValue = (val: string, label: string) => {
    navigator.clipboard.writeText(val);
    showToast(`Copied ${label}`);
  };

  return (
    <div class="bg-[#141414] border border-[#262626] rounded-xl p-5 md:p-6 space-y-6">
      {/* Mode Direction Switcher Pills */}
      <div class="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-[#1f1f1f]">
        <span class="text-xs font-mono uppercase tracking-wider text-[#737373]">
          Conversion Direction
        </span>
        <div class="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'hex-to-oklch', label: 'HEX → OKLCH' },
            { id: 'oklch-to-hex', label: 'OKLCH → HEX' },
            { id: 'rgb-to-oklch', label: 'RGB → OKLCH' },
            { id: 'oklch-to-rgb', label: 'OKLCH → RGB' },
            { id: 'hsl-to-oklch', label: 'HSL → OKLCH' },
            { id: 'oklch-to-hsl', label: 'OKLCH → HSL' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setMode(m.id as ConverterMode);
                // switch input to complementary representation
                if (m.id.startsWith('oklch-')) {
                  setInputValue(oklchOutput);
                } else if (m.id.startsWith('hex-')) {
                  setInputValue(hexOutput);
                } else if (m.id.startsWith('rgb-')) {
                  setInputValue(rgbOutput);
                } else if (m.id.startsWith('hsl-')) {
                  setInputValue(hslOutput);
                }
              }}
              class={`px-2.5 py-1 rounded-full text-xs font-mono transition-colors ${
                mode === m.id
                  ? 'bg-[#f5f5f5] text-[#0a0a0a] font-medium'
                  : 'bg-[#171717] text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#262626]'
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
          <label class="text-xs font-mono text-[#a3a3a3] block">
            Input ({mode.split('-to-')[0].toUpperCase()})
          </label>
          <div class="bg-[#171717] border border-[#262626] rounded-lg p-3 focus-within:border-[#525252]">
            <input
              type="text"
              value={inputValue}
              onInput={(e) => setInputValue((e.target as HTMLInputElement).value)}
              class="w-full bg-transparent text-sm font-mono text-[#f5f5f5] focus:outline-none"
              placeholder="Enter color value..."
            />
          </div>
          <span class="text-[11px] font-mono text-[#737373] block">
            Example: {mode.startsWith('oklch-') ? 'oklch(62% 0.19 255)' : '#3b82f6'}
          </span>
        </div>

        {/* Center: Swatch & Gamut Dot */}
        <div class="md:col-span-2 flex flex-col items-center justify-center">
          <div
            class="w-14 h-14 rounded-xl border border-[#262626] shadow-lg relative checker-bg flex items-center justify-center group overflow-hidden"
            title="Preview swatch"
          >
            <div
              class="absolute inset-0 transition-colors"
              style={{ backgroundColor: oklchOutput }}
            />
          </div>
          <div class="mt-2 text-center">
            {parsedColor.inSRGB ? (
              <span class="text-[10px] font-mono text-[#22c55e]">sRGB</span>
            ) : parsedColor.inP3 ? (
              <span class="text-[10px] font-mono text-[#06b6d4]">P3 Gamut</span>
            ) : (
              <span class="text-[10px] font-mono text-[#f59e0b]">Clamped</span>
            )}
          </div>
        </div>

        {/* Right: Primary Converted Output */}
        <div class="md:col-span-5 space-y-2">
          <label class="text-xs font-mono text-[#a3a3a3] block">
            {primaryOutput.label}
          </label>
          <div class="flex items-center justify-between bg-[#171717] border border-[#262626] rounded-lg p-3">
            <span class="text-sm font-mono font-semibold text-[#f5f5f5] truncate pr-2">
              {primaryOutput.value}
            </span>
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => copyValue(primaryOutput.value, primaryOutput.label)}
                class="touch-target px-2.5 py-1 rounded bg-[#262626] hover:bg-[#333333] text-xs font-mono text-[#f5f5f5] transition-colors"
                title="Copy value"
              >
                Copy
              </button>
              <button
                onClick={() => {
                  addColorToCart(parsedColor, cart.activeRoleId);
                }}
                class="touch-target px-2.5 py-1 rounded bg-[#f5f5f5] hover:bg-white text-xs font-mono text-[#0a0a0a] font-medium transition-colors"
                title="Add to cart"
              >
                + Cart
              </button>
            </div>
          </div>
          <span class="text-[11px] font-mono text-[#737373] block">
            Target shade: {Math.round(parsedColor.l * 1000) / 10}% lightness
          </span>
        </div>
      </div>

      {/* All Secondary Representations */}
      <div class="pt-4 border-t border-[#1f1f1f]">
        <span class="text-[11px] font-mono uppercase tracking-wider text-[#737373] block mb-2.5">
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
              class="bg-[#171717] hover:bg-[#1f1f1f] border border-[#262626] p-2.5 rounded-lg flex items-center justify-between text-left transition-colors"
            >
              <div>
                <span class="text-[10px] text-[#737373] block">{item.label}</span>
                <span class="text-[#f5f5f5] truncate block font-medium">{item.val}</span>
              </div>
              <svg class="w-3.5 h-3.5 text-[#737373]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
