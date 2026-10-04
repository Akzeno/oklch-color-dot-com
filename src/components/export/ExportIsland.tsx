import { useState, useMemo } from 'preact/hooks';
import { Copy, Download } from 'lucide-preact';
import { showToast } from '../../stores/cartStore';
import { formatOklch, SHADE_STEPS, type ShadeStep } from '../../utils/color';
import { useCart } from '../../hooks/useCart';

export type ExportFormat = 'tailwind-v4' | 'css-variables' | 'css-fallback' | 'json';

interface CodeLineItem {
  lineNum: number;
  variableName: string;
  colorValue: string;
  fallbackValue?: string;
  rawLine: string;
}

const FORMATS: { id: ExportFormat; label: string; filename: string }[] = [
  { id: 'tailwind-v4', label: '@theme', filename: 'global.css' },
  { id: 'css-variables', label: ':root', filename: 'tokens.css' },
  { id: 'css-fallback', label: 'Fallback', filename: 'tokens.css' },
  { id: 'json', label: 'JSON', filename: 'tokens.json' },
];

export default function ExportIsland() {
  const cart = useCart();
  const [activeFormat, setActiveFormat] = useState<ExportFormat>('tailwind-v4');
  const [wrapLines, setWrapLines] = useState(false);

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

  /** Generate raw plaintext code for copying and download (zero HTML, zero swatches) */
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

  const handleCopyAll = () => {
    navigator.clipboard.writeText(fullRawCode);
    showToast('Code block copied');
  };

  const handleCopyLine = (line: CodeLineItem) => {
    const text =
      activeFormat === 'tailwind-v4' || activeFormat === 'css-variables'
        ? `${line.variableName}: ${line.colorValue};`
        : `${line.variableName}: ${line.fallbackValue};\n${line.variableName}: ${line.colorValue};`;
    navigator.clipboard.writeText(text);
    showToast(`${line.variableName} copied`);
  };

  const handleCopyValueOnly = (val: string) => {
    navigator.clipboard.writeText(val);
    showToast('Value copied');
  };

  const handleDownloadFile = () => {
    const isJson = activeFormat === 'json';
    const blob = new Blob([fullRawCode], {
      type: isJson ? 'application/json' : 'text/css;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = isJson ? 'oklch-tokens.json' : 'oklch-tokens.css';
    link.click();
    URL.revokeObjectURL(url);
    showToast(`${link.download} downloaded`);
  };

  const meta = FORMATS.find((f) => f.id === activeFormat)!;

  return (
    <div class="space-y-4">
      {/* Toolbar. Format chips read as a segmented control rather than four
          primary-weight buttons, which is what they are: one of the four is
          selected at a time. */}
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Export format">
          {FORMATS.map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => setActiveFormat(fmt.id)}
              aria-pressed={activeFormat === fmt.id}
              class="chip"
              title={
                fmt.id === 'css-fallback'
                  ? 'Emit a HEX line before each OKLCH line for older browsers'
                  : undefined
              }
            >
              {fmt.label}
            </button>
          ))}
        </div>

        <div class="flex items-center gap-1.5">
          <button
            onClick={() => setWrapLines(!wrapLines)}
            aria-pressed={wrapLines}
            class="chip"
            title="Toggle line wrapping"
          >
            Wrap
          </button>
          <button onClick={handleDownloadFile} class="btn btn-quiet !min-h-9 !px-3">
            <Download class="w-4 h-4" aria-hidden="true" strokeWidth={2} />
            <span class="hidden sm:inline">Download</span>
          </button>
          <button onClick={handleCopyAll} class="btn btn-primary !min-h-9 !px-4" id="export-copy-all-btn">
            <Copy class="w-4 h-4" aria-hidden="true" strokeWidth={2} />
            Copy all
          </button>
        </div>
      </div>

      {/*
        The code well.

        The three coloured circles at the top of this panel were a window
        ornament, not information. Syntax tinting is likewise reduced to the ink
        ladder: the previous palette painted variable names blue and values green,
        which introduced two saturated colours roughly 300px from the swatch they
        describe — the precise confusion DESIGN.md's neutral-canvas rule exists
        to prevent. Colour now comes only from the inline swatch decorators.
      */}
      <div class="well overflow-hidden">
        <div class="flex items-center justify-between gap-3 px-4 py-2 bg-canvas-card border-b border-hairline">
          <span class="font-mono text-micro text-mute">{meta.filename}</span>
          <span class="eyebrow">{tokenLines.length} tokens</span>
        </div>

        <div
          class={`p-4 font-mono text-label text-ink overflow-x-auto ${
            wrapLines ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
          }`}
        >
          {activeFormat === 'json' ? (
            <pre class="m-0 text-body">{fullRawCode}</pre>
          ) : (
            <div class="space-y-px">
              <div class="text-mute">{activeFormat === 'tailwind-v4' ? '@theme {' : ':root {'}</div>

              {tokenLines.map((line) => (
                <div
                  key={line.variableName}
                  class="group/line flex items-center justify-between gap-3 px-2 py-0.5 rounded hover:bg-canvas-raised transition-colors duration-150"
                >
                  <div class="flex items-center min-w-0">
                    <span class="w-4 shrink-0 select-none" />
                    <span class="text-ink">{line.variableName}</span>
                    <span class="text-faint mx-1">:</span>

                    {/* If fallback mode: show hex fallback line */}
                    {activeFormat === 'css-fallback' && (
                      <span class="mr-2 flex items-center">
                        <span
                          class="vscode-color-decorator"
                          aria-hidden="true"
                          style={{ '--swatch-color': line.fallbackValue }}
                        />
                        <button
                          onClick={() => handleCopyValueOnly(line.fallbackValue!)}
                          class="text-body hover:text-ink transition-colors duration-150"
                          title="Copy HEX fallback"
                        >
                          {line.fallbackValue}
                        </button>
                        <span class="text-faint">;</span>
                        <span class="mx-2 text-faint">|</span>
                      </span>
                    )}

                    {/* VS Code style color decorator square (aria-hidden,
                        unselectable, excluded from every copy path) */}
                    <span
                      class="vscode-color-decorator"
                      aria-hidden="true"
                      style={{ '--swatch-color': line.colorValue }}
                    />

                    <button
                      onClick={() => handleCopyValueOnly(line.colorValue)}
                      class="text-ink hover:underline underline-offset-4 decoration-hairline transition-colors duration-150"
                      title="Copy value"
                    >
                      {line.colorValue}
                    </button>
                    <span class="text-faint">;</span>
                  </div>

                  <button
                    onClick={() => handleCopyLine(line)}
                    class="icon-btn !h-6 !w-6 shrink-0 opacity-0 group-hover/line:opacity-100 focus-visible:opacity-100 transition-opacity duration-150"
                    title={`Copy ${line.variableName}`}
                    aria-label={`Copy ${line.variableName}`}
                  >
                    <Copy class="w-3 h-3" aria-hidden="true" strokeWidth={2} />
                  </button>
                </div>
              ))}

              <div class="text-mute">{'}'}</div>
            </div>
          )}
        </div>
      </div>

      {/*
        The Tailwind v4 note used to be a heading, a paragraph explaining what
        `@theme` does, and a fenced example. The mechanism is one fact and the
        example says it; the paragraph restated the example. Kept as a single
        mono line, and dismissible because it is only relevant while wiring up.
      */}
      <details class="group border border-hairline rounded-md">
        <summary class="flex items-center gap-2 px-4 py-2.5 cursor-pointer list-none font-mono text-label text-body hover:text-ink transition-colors duration-150">
          <svg
            class="w-3 h-3 transition-transform duration-150 group-open:rotate-90"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
          Using these in Tailwind v4
        </summary>
        <div class="px-4 pb-4 space-y-2">
          <p class="prose-hud">
            Anything declared in <code>@theme</code> as <code>--color-*</code> becomes a utility
            automatically — no config file, no plugin.
          </p>
          <pre class="well !rounded-sm p-3 font-mono text-micro text-body overflow-x-auto">
<code>&lt;button class="bg-primary-500 text-white hover:bg-primary-600
  px-4 py-2 rounded-md"&gt;</code>
          </pre>
        </div>
      </details>
    </div>
  );
}