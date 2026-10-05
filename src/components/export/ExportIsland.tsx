import { useState, useMemo } from 'preact/hooks';
import { Check, Copy, Download, Paintbrush, Pencil, Trash2, X } from 'lucide-preact';
import {
  removeShadeWithUndo,
  renameRole,
  savePickerHandoff,
  showToast,
} from '../../stores/cartStore';
import { formatOklch, SHADE_STEPS, type ShadeStep } from '../../utils/color';
import { useCart } from '../../hooks/useCart';
import { goTo } from '../../utils/navigate';

export type ExportFormat = 'tailwind-v4' | 'css-variables' | 'css-fallback' | 'json';

interface CodeLineItem {
  lineNum: number;
  /**
   * The cart coordinates of this line: which role and which shade slot it was
   * derived from.
   *
   * The variable *name* is not enough to act on a line. Renaming, re-colouring
   * and removing all address the cart, not the text, and every one of them needs
   * the `roleId`/`step` pair that produced `--color-<roleId>-<step>`.
   */
  roleId: string;
  step: ShadeStep;
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

/** `brand-primary` → `Brand Primary`. */
function labelFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Normalise typed text into the CSS-identifier form `renameRole` would produce.
 *
 * Duplicated here (rather than left to the store) because the editor needs the
 * result *before* committing: it is what decides whether Save is available at
 * all, and an input that normalises to nothing — all punctuation, say — must not
 * become the store's `"role"` fallback name.
 */
function slugFromInput(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function ExportIsland() {
  const cart = useCart();
  const [activeFormat, setActiveFormat] = useState<ExportFormat>('tailwind-v4');
  const [wrapLines, setWrapLines] = useState(false);
  /**
   * The line whose variable name is being edited, plus the typed slug.
   *
   * A rename rewrites the whole role, so it cannot be scoped to one line — but
   * only one row may show the editor at a time, so the line being edited is
   * tracked separately from the role being changed.
   */
  const [renaming, setRenaming] = useState<{ roleId: string; step: ShadeStep } | null>(null);
  const [slugInput, setSlugInput] = useState('');

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
            roleId: role.id,
            step,
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

  /**
   * Per-variable editing, straight from the export list.
   *
   * The export page is where a token list turns into a file someone else has to
   * live with, so the fixes people make here — "that name is wrong", "that hue
   * is wrong", "that one is not shipping" — used to require a trip to the panel
   * or the picker, and the copy you had already taken was stale by the time you
   * got back. These three keep the list the single place the edit happens: the
   * list re-derives from the cart, so the code well, `Copy all`, `Download` and
   * the JSON tab all reflect the change at once, and there is no state on this
   * page that can disagree with what gets copied.
   */

  /** How many variables a rename of this role will rewrite. */
  const roleVariableCount = (roleId: string) =>
    Object.values(cart.roles[roleId]?.shades ?? {}).length;

  const beginRename = (line: CodeLineItem) => {
    setSlugInput(line.roleId);
    setRenaming({ roleId: line.roleId, step: line.step });
  };

  /*
   * Renaming edits the role *prefix*, and the UI says so.
   *
   * A variable name here is not free text: it is derived as
   * `--color-<role.id>-<step>`, and one role id is shared by every shade in the
   * role — which is exactly what `--color-primary-*` means to Tailwind, and why
   * a per-variable alias would be the wrong tool. A name stored only for the
   * export would give the same token two identities depending on which page you
   * copied from, and nothing else in the app (the panel, the preview, the picker)
   * would know about the alias. So the prefix is the part that can honestly be
   * edited from one row, and it renames every variable of that role; the pencil's
   * tooltip and the resulting `--color-<new>-*` toast both state that count.
   */
  const commitRename = () => {
    if (!renaming) return;
    const slug = slugFromInput(slugInput);
    // An input that normalises to nothing has no name to commit; stay in the
    // editor rather than letting `renameRole`'s `'role'` fallback name it.
    if (!slug) return;
    // A refused rename (the name is taken) leaves the editor open with the typed
    // slug intact, so the fix is a keystroke rather than a retype. The toast says
    // which name collided.
    if (renameRole(renaming.roleId, labelFromSlug(slug))) {
      setRenaming(null);
    }
  };

  /** Send this exact slot to the full colour picker, which returns here on save. */
  const handleEditColor = (line: CodeLineItem) => {
    savePickerHandoff({
      roleId: line.roleId,
      step: line.step,
      color: cart.roles[line.roleId]?.shades[line.step]?.color ?? null,
      returnTo: window.location.pathname,
    });
    goTo('/');
  };

  /**
   * Remove one variable, undoably.
   *
   * `removeShadeWithUndo` rather than a confirm dialog: the target is a 24px icon
   * in a dense list of near-identical rows, so a stray click is more likely than a
   * deliberate one, and the toast's Undo gets the token back in a second instead
   * of making every removal a two-step operation.
   */
  const handleRemoveVariable = (line: CodeLineItem) => {
    removeShadeWithUndo(line.roleId, line.step);
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

              {tokenLines.map((line) => {
                const isRenaming = renaming?.roleId === line.roleId && renaming.step === line.step;
                const variableCount = roleVariableCount(line.roleId);
                return (
                  <div
                    key={`${line.roleId}-${line.step}`}
                    class="group/line flex items-center justify-between gap-3 px-2 py-0.5 rounded hover:bg-canvas-raised transition-colors duration-150"
                  >
                    <div class="flex items-center min-w-0">
                      <span class="w-4 shrink-0 select-none" />
                      {isRenaming ? (
                        /*
                          The name split into its two fixed parts and an editable
                          middle. Editing the whole string in one box would let the
                          `--color-`/`-500` scaffolding be typed away (and would
                          accept a name whose step no longer matched this row), while
                          showing the halves makes it obvious which part renames.
                        */
                        <>
                          <span class="text-ink">--color-</span>
                          <input
                            id="export-slug"
                            type="text"
                            name="slug"
                            value={slugInput}
                            aria-label="Variable name to rename this token to"
                            onInput={(e) => setSlugInput((e.target as HTMLInputElement).value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                commitRename();
                              }
                              if (e.key === 'Escape') setRenaming(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Rename the ${variableCount} --color-${line.roleId}-* variables`}
                            class="w-36 px-1 py-0 rounded bg-canvas-raised border border-hairline text-ink font-mono focus:outline-none focus:border-border-focus"
                            autoFocus
                          />
                          <span class="text-ink">-{line.step}</span>
                        </>
                      ) : (
                        <span class="text-ink">{line.variableName}</span>
                      )}
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

                    {isRenaming ? (
                      /*
                        Only commit/cancel while editing: the row's other actions
                        would either rename a second role behind this one or carry a
                        half-typed name away to the picker.
                      */
                      <div class="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={commitRename}
                          disabled={!slugFromInput(slugInput)}
                          class="icon-btn !h-6 !w-6"
                          title="Save name"
                          aria-label={`Save the new name for --color-${line.roleId}-*`}
                        >
                          <Check class="w-3 h-3" aria-hidden="true" strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => setRenaming(null)}
                          class="icon-btn !h-6 !w-6"
                          title="Cancel"
                          aria-label="Cancel rename"
                        >
                          <X class="w-3 h-3" aria-hidden="true" strokeWidth={1.75} />
                        </button>
                      </div>
                    ) : (
                      /*
                        Hidden until the row is hovered or a button in it takes
                        focus, so the well still reads as a block of code. The
                        `hover: none` case matters because these are the page's
                        primary actions: on a touch device there is no hover, and an
                        invisible-but-tappable button is worse than no button —
                        `focus-within` alone would only reveal them after a blind tap.
                      */
                      <div class="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/line:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-150">
                        <button
                          onClick={() => handleCopyLine(line)}
                          class="icon-btn !h-6 !w-6"
                          title={`Copy ${line.variableName}`}
                          aria-label={`Copy ${line.variableName}`}
                        >
                          <Copy class="w-3 h-3" aria-hidden="true" strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => beginRename(line)}
                          class="icon-btn !h-6 !w-6"
                          title={`Rename --color-${line.roleId}-* (${variableCount} ${
                            variableCount === 1 ? 'variable' : 'variables'
                          })`}
                          aria-label={`Rename the ${variableCount} --color-${line.roleId}-* variables`}
                        >
                          <Pencil class="w-3 h-3" aria-hidden="true" strokeWidth={1.75} />
                        </button>
                        <button
                          onClick={() => handleEditColor(line)}
                          class="icon-btn !h-6 !w-6"
                          title="Edit this colour in the picker"
                          aria-label={`Edit ${line.variableName} in the colour picker`}
                        >
                          <Paintbrush class="w-3 h-3" aria-hidden="true" strokeWidth={1.75} />
                        </button>
                        <button
                          onClick={() => handleRemoveVariable(line)}
                          class="icon-btn !h-6 !w-6"
                          title={`Remove ${line.variableName} (undoable)`}
                          aria-label={`Remove ${line.variableName}`}
                        >
                          <Trash2 class="w-3 h-3" aria-hidden="true" strokeWidth={1.75} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

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