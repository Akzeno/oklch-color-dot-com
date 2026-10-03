import { useState, useMemo } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { cartStore, showToast } from '../../stores/cartStore';
import { formatOklch, SHADE_STEPS, type ShadeStep } from '../../utils/color';

export type ExportFormat = 'tailwind-v4' | 'css-variables' | 'css-fallback' | 'json';

interface CodeLineItem {
  lineNum: number;
  variableName: string;
  colorValue: string;
  fallbackValue?: string;
  rawLine: string;
}

export default function ExportIsland() {
  const cart = useStore(cartStore);
  const [activeFormat, setActiveFormat] = useState<ExportFormat>('tailwind-v4');
  const [wrapLines, setWrapLines] = useState(false);

  // Generate tokens from cart roles
  const tokenLines: CodeLineItem[] = useMemo(() => {
    const lines: CodeLineItem[] = [];
    let lineIdx = 1;

    Object.values(cart.roles).forEach((role) => {
      SHADE_STEPS.forEach((step) => {
        const token = role.shades[step];
        if (token) {
          const varName = `--color-${role.id}-${step}`;
          const oklchVal = formatOklch(token.color);
          const hexVal = token.color.hex;
          lines.push({
            lineNum: lineIdx++,
            variableName: varName,
            colorValue: oklchVal,
            fallbackValue: hexVal,
            rawLine: `  ${varName}: ${oklchVal};`,
          });
        }
      });
    });

    return lines;
  }, [cart]);

  // Generate raw plaintext code for copying and download (zero HTML, zero swatches)
  const fullRawCode = useMemo(() => {
    if (tokenLines.length === 0) {
      return '/* No colors in cart yet. Add swatches or generate scales first! */';
    }

    if (activeFormat === 'tailwind-v4') {
      return `@theme {\n${tokenLines.map((l) => `  ${l.variableName}: ${l.colorValue};`).join('\n')}\n}`;
    }

    if (activeFormat === 'css-variables') {
      return `:root {\n${tokenLines.map((l) => `  ${l.variableName}: ${l.colorValue};`).join('\n')}\n}`;
    }

    if (activeFormat === 'css-fallback') {
      return `:root {\n${tokenLines
        .map((l) => `  ${l.variableName}: ${l.fallbackValue};\n  ${l.variableName}: ${l.colorValue};`)
        .join('\n')}\n}`;
    }

    if (activeFormat === 'json') {
      const obj: Record<string, Record<string, string>> = {};
      Object.values(cart.roles).forEach((role) => {
        obj[role.id] = {};
        SHADE_STEPS.forEach((step) => {
          if (role.shades[step]) {
            obj[role.id][step] = formatOklch(role.shades[step]!.color);
          }
        });
      });
      return JSON.stringify(obj, null, 2);
    }

    return '';
  }, [tokenLines, activeFormat, cart]);

  // Copy Entire Block
  const handleCopyAll = () => {
    navigator.clipboard.writeText(fullRawCode);
    showToast('Copied full code block to clipboard');
  };

  // Copy Single Line
  const handleCopyLine = (line: CodeLineItem) => {
    const text = activeFormat === 'tailwind-v4' || activeFormat === 'css-variables'
      ? `${line.variableName}: ${line.colorValue};`
      : `${line.variableName}: ${line.fallbackValue};\n${line.variableName}: ${line.colorValue};`;
    navigator.clipboard.writeText(text);
    showToast(`Copied ${line.variableName}`);
  };

  // Copy Individual Value
  const handleCopyValueOnly = (val: string) => {
    navigator.clipboard.writeText(val);
    showToast(`Copied value: ${val}`);
  };

  // Download .css file
  const handleDownloadFile = () => {
    const blob = new Blob([fullRawCode], { type: 'text/css;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeFormat === 'json' ? 'oklch-tokens.json' : 'oklch-tokens.css';
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${link.download}`);
  };

  return (
    <div class="space-y-6">
      {/* Top Toolbar */}
      <div class="bg-[#141414] border border-[#262626] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        {/* Format Selector Tabs */}
        <div class="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'tailwind-v4', label: 'Tailwind v4 @theme' },
            { id: 'css-variables', label: 'CSS :root Variables' },
            { id: 'css-fallback', label: 'HEX Fallback + OKLCH' },
            { id: 'json', label: 'JSON Tokens' },
          ].map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => setActiveFormat(fmt.id as ExportFormat)}
              class={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                activeFormat === fmt.id
                  ? 'bg-[#f5f5f5] text-[#0a0a0a] font-semibold'
                  : 'bg-[#171717] text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#262626]'
              }`}
            >
              {fmt.label}
            </button>
          ))}
        </div>

        {/* Global Actions */}
        <div class="flex items-center gap-2">
          {/* Wrap toggle */}
          <button
            onClick={() => setWrapLines(!wrapLines)}
            class={`touch-target px-2.5 py-1.5 rounded-lg border border-[#262626] text-xs font-mono transition-colors ${
              wrapLines ? 'bg-[#262626] text-white' : 'text-[#737373] hover:text-[#f5f5f5]'
            }`}
            title="Toggle word wrap"
          >
            Wrap
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownloadFile}
            class="touch-target px-3 py-1.5 rounded-lg bg-[#1f1f1f] hover:bg-[#262626] border border-[#262626] text-xs font-mono text-[#f5f5f5] transition-colors flex items-center gap-1.5"
            title="Download file"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
            </svg>
            <span class="hidden sm:inline">Download</span>
          </button>

          {/* Copy All Button */}
          <button
            onClick={handleCopyAll}
            class="touch-target px-4 py-1.5 rounded-lg bg-[#f5f5f5] hover:bg-white text-xs font-mono text-[#0a0a0a] font-medium transition-colors flex items-center gap-1.5 shadow"
            id="export-copy-all-btn"
          >
            <svg class="w-3.5 h-3.5 text-[#0a0a0a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
            </svg>
            <span>Copy All</span>
          </button>
        </div>
      </div>

      {/* Code Display Container */}
      <div class="bg-[#0e0e0e] border border-[#262626] rounded-xl overflow-hidden shadow-2xl">
        {/* Code Header Bar */}
        <div class="px-4 py-2.5 bg-[#141414] border-b border-[#262626] flex items-center justify-between text-xs font-mono text-[#737373]">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
            <span class="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
            <span class="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
            <span class="ml-2 text-[#a3a3a3]">
              {activeFormat === 'tailwind-v4'
                ? 'global.css (@theme)'
                : activeFormat === 'json'
                ? 'tokens.json'
                : 'tokens.css'}
            </span>
          </div>
          <span>{tokenLines.length} tokens defined</span>
        </div>

        {/* Code Content with VS Code Inline Color Squares */}
        <div class={`p-4 font-mono text-xs text-[#f5f5f5] overflow-x-auto ${wrapLines ? 'whitespace-pre-wrap' : 'whitespace-pre'}`}>
          {activeFormat === 'json' ? (
            <pre class="m-0">{fullRawCode}</pre>
          ) : (
            <div class="space-y-0.5 leading-6">
              {/* Opening Block Tag */}
              <div class="text-[#737373]">{activeFormat === 'tailwind-v4' ? '@theme {' : ':root {'}</div>

              {/* Token Lines */}
              {tokenLines.map((line) => (
                <div
                  key={line.variableName}
                  class="group/line flex items-center justify-between hover:bg-[#171717] px-2 py-0.5 rounded transition-colors"
                >
                  <div class="flex items-center flex-wrap">
                    {/* Indentation */}
                    <span class="w-4 inline-block select-none" />

                    {/* CSS Variable Name */}
                    <span class="text-[#93c5fd] font-medium">{line.variableName}</span>
                    <span class="text-[#737373] mx-1">:</span>

                    {/* If fallback mode: show hex fallback line */}
                    {activeFormat === 'css-fallback' && (
                      <span class="mr-2 text-[#a3a3a3]">
                        <span
                          class="vscode-color-decorator"
                          aria-hidden="true"
                          style={{ '--swatch-color': line.fallbackValue }}
                        />
                        <span
                          onClick={() => handleCopyValueOnly(line.fallbackValue!)}
                          class="cursor-pointer hover:underline"
                          title="Click to copy HEX fallback"
                        >
                          {line.fallbackValue}
                        </span>
                        <span class="text-[#737373]">;</span>
                        <span class="mx-2 text-[#404040]">|</span>
                      </span>
                    )}

                    {/* VS Code Style Color Decorator Square (aria-hidden, unselectable, excluded from copy) */}
                    <span
                      class="vscode-color-decorator"
                      aria-hidden="true"
                      style={{ '--swatch-color': line.colorValue }}
                    />

                    {/* The Color Value (Clickable to copy) */}
                    <span
                      onClick={() => handleCopyValueOnly(line.colorValue)}
                      class="text-[#86efac] cursor-pointer hover:underline"
                      title="Click to copy value"
                    >
                      {line.colorValue}
                    </span>
                    <span class="text-[#737373]">;</span>
                  </div>

                  {/* Per-Line Copy Button (Desktop hover / Always visible on mobile) */}
                  <button
                    onClick={() => handleCopyLine(line)}
                    class="touch-target px-2 py-0.5 rounded text-[11px] text-[#737373] hover:text-[#f5f5f5] bg-transparent group-hover/line:bg-[#262626] transition-colors opacity-70 group-hover/line:opacity-100 flex items-center gap-1"
                    title="Copy this token line"
                  >
                    <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                    </svg>
                    <span class="hidden md:inline">Copy</span>
                  </button>
                </div>
              ))}

              {/* Closing Block Tag */}
              <div class="text-[#737373]">{'}'}</div>
            </div>
          )}
        </div>
      </div>

      {/* Usage Guide in Tailwind v4 */}
      <div class="bg-[#141414] border border-[#262626] rounded-xl p-5 space-y-3">
        <h3 class="text-sm font-semibold text-[#f5f5f5]">
          How to Use in Tailwind CSS v4
        </h3>
        <p class="text-xs font-mono text-[#a3a3a3] leading-relaxed">
          In Tailwind v4, defining custom properties inside <code class="text-[#f5f5f5] bg-[#1a1a1a] px-1 py-0.5 rounded">@theme &#123; --color-* &#125;</code> automatically generates all corresponding utility classes across backgrounds, text, borders, and rings:
        </p>
        <div class="p-3 rounded-lg bg-[#0a0a0a] border border-[#262626] font-mono text-xs text-[#a3a3a3] space-y-1">
          <div><span class="text-[#60a5fa]">&lt;button</span> <span class="text-[#fde047]">class</span>=<span class="text-[#86efac]">"bg-trusty-button-500 hover:bg-trusty-button-600 text-white px-4 py-2 rounded-lg"</span><span class="text-[#60a5fa]">&gt;</span></div>
          <div class="pl-4">Submit Action</div>
          <div><span class="text-[#60a5fa]">&lt;/button&gt;</span></div>
        </div>
      </div>
    </div>
  );
}
