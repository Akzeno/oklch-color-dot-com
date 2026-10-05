import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Check, Copy, Paintbrush, Plus, Trash2 } from 'lucide-preact';
import { formatOklch, type ColorModel } from '../../utils/color';
import { writeClipboard } from '../../utils/clipboard';
import { showToast } from '../../stores/cartStore';
import {
  addPaletteSlot,
  buildPaletteBlock,
  paletteDeclarations,
  paletteVariable,
  removePaletteSlot,
  renamePaletteSlot,
  replaceCustomPalette,
  restorePaletteSlot,
  type CustomPaletteFormat,
  type CustomPaletteSlot,
} from '../../stores/customPaletteStore';
import { useCustomPalette } from '../../hooks/useCustomPalette';
import ColorSwatch from '../common/ColorSwatch';

const FORMATS: { id: CustomPaletteFormat; label: string; filename: string }[] = [
  { id: 'theme', label: '@theme', filename: 'global.css' },
  { id: 'root', label: ':root', filename: 'tokens.css' },
  { id: 'json', label: 'JSON', filename: 'tokens.json' },
];

/** Names offered for a slot that has not been given one yet. */
const NAME_HINTS = [
  'brand',
  'accent',
  'surface',
  'border',
  'text',
  'muted',
  'success',
  'warning',
  'danger',
  'info',
];

export interface CustomPalettePanelProps {
  /**
   * Opens the picker on this exact colour, tagged with the slot it belongs to.
   *
   * The slot is the whole contract. The picker lives on another page and hands
   * back a bare colour, so without the tag there is nothing on the return trip
   * saying which row was being edited — and the panel's colours are not
   * interchangeable the way a scale's steps are.
   */
  onEdit: (color: ColorModel, slotId: string) => void;
}

/**
 * A palette of colours that have nothing to do with each other.
 *
 * WHY THIS IS A SEPARATE TOOL AND NOT A MODE OF THE SCALE
 *
 * The scale above is one hue walked up and down in lightness: one input, eleven
 * outputs, every output predictable from the input. A real brand palette is the
 * opposite — five colours chosen because they belong together, none of them
 * derivable from another. Modelling that as "a scale" would force each colour
 * into a `--color-<name>-<step>` slot chosen by lightness, so two unrelated
 * colours of similar lightness would overwrite each other and the palette could
 * never express "brand" at all.
 *
 * So these are standalone variables, one colour each, named by the user.
 *
 * EVERY ROW IS EDITABLE, AND THAT MEANS THE PICKER
 *
 * Each swatch opens the shared picker preloaded with its own colour and returns
 * to this page tagged with its slot. Nothing here is generated and then frozen:
 * the palette is a starting point to edit, not an output.
 */
export default function CustomPalettePanel({ onEdit }: CustomPalettePanelProps) {
  const slots = useCustomPalette();
  const [format, setFormat] = useState<CustomPaletteFormat>('theme');
  const [copied, setCopied] = useState(false);
  /**
   * The row that was just added, so its name field can take the caret.
   *
   * "Add colour" is not finished when the row appears — the next thing the user
   * does is name it — so leaving the caret wherever it was means a row they
   * cannot tell is new, and no prompt to name it. Cleared as soon as focus lands,
   * so it never fires on a later render.
   */
  const [focusId, setFocusId] = useState<string | null>(null);
  const nameFields = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!focusId) return;
    nameFields.current[focusId]?.focus();
    setFocusId(null);
  }, [focusId]);

  const { lines, duplicates } = useMemo(() => paletteDeclarations(slots), [slots]);
  const block = useMemo(() => buildPaletteBlock(slots, format), [slots, format]);
  const meta = FORMATS.find((f) => f.id === format)!;

  /**
   * Copy one value, saying what was copied.
   *
   * The value is the row's own text, so the toast can name it without the caller
   * having to describe where it came from.
   */
  const copyValue = async (value: string) => {
    const copiedOk = await writeClipboard(value);
    showToast(
      copiedOk ? `Copied ${value}` : 'Clipboard blocked by the browser',
      copiedOk ? 'success' : 'info'
    );
  };

  const copyBlock = async () => {
    if (!block) return;
    const copiedOk = await writeClipboard(block);
    showToast(
      copiedOk
        ? `Copied ${lines.length} ${lines.length === 1 ? 'variable' : 'variables'}`
        : 'Clipboard blocked by the browser',
      copiedOk ? 'success' : 'info'
    );
    // The confirmation is short-lived, and the button keeps its real label after
    // it: a permanently changed label would leave no way to tell the last copy
    // from a stale one.
    if (copiedOk) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  };

  /**
   * Remove a row, with Undo.
   *
   * One click on a 36px target is an easy mistake, and there is nothing here
   * worth a confirm dialog — so the removal is immediate and reversible, which
   * is cheaper than being asked "are you sure?" about a colour row.
   */
  const remove = (slot: CustomPaletteSlot, index: number) => {
    const variable = paletteVariable(slot, index);
    removePaletteSlot(slot.id);
    showToast(`Removed ${variable}`, 'success', {
      label: 'Undo',
      run: () => {
        restorePaletteSlot(slot, index);
        showToast(`Restored ${variable}`);
      },
    });
  };

  /** Emptying every row is the one action undo has to restore wholesale. */
  const clearAll = () => {
    if (slots.length === 0) return;
    const snapshot = slots;
    replaceCustomPalette([]);
    showToast(`Cleared ${snapshot.length} colours`, 'success', {
      label: 'Undo',
      run: () => {
        replaceCustomPalette(snapshot);
        showToast('Palette restored');
      },
    });
  };

  return (
    <div class="card !p-4 space-y-3">
      <div class="flex items-start justify-between gap-3 flex-wrap">
        <div class="space-y-1">
          <span class="eyebrow">Custom palette</span>
          <p class="font-mono text-micro text-faint">
            {slots.length} independent {slots.length === 1 ? 'colour' : 'colours'} · no shared
            scale · click a swatch to edit it
          </p>
        </div>

        <div class="flex items-center gap-1.5">
          <button
            onClick={() => setFocusId(addPaletteSlot())}
            class="chip !py-1 !px-2.5 !text-micro"
            title="Add a colour to the palette"
          >
            <Plus class="w-3 h-3" aria-hidden="true" strokeWidth={2.5} />
            Add colour
          </button>
          {slots.length > 0 && (
            <button onClick={clearAll} class="chip !py-1 !px-2.5 !text-micro" title="Remove every colour from this palette">
              Clear
            </button>
          )}
        </div>
      </div>

      {/*
        Names are suggestions, not a `<select>`: the whole point is that the user
        types whatever their own system calls these colours. The datalist offers
        the obvious ones without taking the field away.
      */}
      <datalist id="custom-palette-name-hints">
        {NAME_HINTS.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {slots.length === 0 ? (
        <p class="font-mono text-micro text-mute">
          No colours yet. Add one, then click its swatch to change it in the color picker.
        </p>
      ) : (
        <ul class="space-y-2">
          {slots.map((slot, index) => {
            const value = formatOklch(slot.color);
            const variable = paletteVariable(slot, index);
            const label = slot.name.trim() || variable;

            return (
              <li key={slot.id} class="flex items-center gap-2">
                <ColorSwatch
                  color={slot.color}
                  onClick={() => onEdit(slot.color, slot.id)}
                  class="w-9 h-9 sm:w-10 sm:h-10 rounded-md border border-hairline shrink-0 hover:border-border-focus focus-visible:border-border-focus focus-visible:outline-none"
                  title={`Edit ${label} in the color picker`}
                  ariaLabel={`Open the color picker to edit ${label}`}
                >
                  {/* Hover-only, like the base swatch: the affordance is
                      discoverable without tinting the colour being judged. The
                      overlay covers the whole swatch, so a plain `:hover` is
                      enough — there is no gap to hover past it. */}
                  <span class="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-150 hover:opacity-100">
                    <Paintbrush class="w-3.5 h-3.5 text-ink" aria-hidden="true" strokeWidth={2} />
                  </span>
                </ColorSwatch>

                <div class="min-w-0 flex-1 space-y-1">
                  <input
                    type="text"
                    list="custom-palette-name-hints"
                    ref={(el) => {
                      nameFields.current[slot.id] = el;
                    }}
                    value={slot.name}
                    spellcheck={false}
                    autocomplete="off"
                    aria-label={`Variable name for ${label}`}
                    placeholder="brand"
                    onInput={(e) => renamePaletteSlot(slot.id, (e.target as HTMLInputElement).value)}
                    class="hud !py-1 w-full font-mono text-label cursor-text"
                  />

                  <div class="flex items-center gap-2 min-w-0">
                    {/* The value doubles as its own copy target: it is the thing
                        being judged, so putting the copy affordance on the thing
                        being judged beats a third button per row. */}
                    <button
                      type="button"
                      onClick={() => copyValue(value)}
                      class="font-mono text-micro text-ink hover:underline underline-offset-4 decoration-hairline transition-colors duration-150 truncate min-w-0 text-left"
                      title={`Copy ${value}`}
                    >
                      {value}
                    </button>
                    <span class="font-mono text-micro text-faint truncate shrink-0">
                      {variable}
                    </span>
                    {slot.color.inP3 && !slot.color.inSRGB && (
                      <span class="font-mono text-micro text-gamut-p3 shrink-0" title="Inside Display-P3, outside sRGB">
                        P3
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => remove(slot, index)}
                  class="icon-btn icon-btn-xs shrink-0"
                  aria-label={`Remove ${variable}`}
                  title={`Remove ${variable}`}
                >
                  <Trash2 class="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/*
        Format chips are a segmented control, not three primary buttons: exactly
        one of them is selected at a time, and the preview below always shows the
        format that will be copied.
      */}
      {slots.length > 0 && (
        <>
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div class="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Palette format">
              {FORMATS.map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => setFormat(fmt.id)}
                  aria-pressed={format === fmt.id}
                  class="chip"
                >
                  {fmt.label}
                </button>
              ))}
            </div>

            <button
              onClick={copyBlock}
              disabled={!block}
              class="btn btn-quiet !min-h-9 !px-3"
              title={`Copy ${lines.length} ${lines.length === 1 ? 'variable' : 'variables'} as ${meta.label}`}
            >
              {copied ? (
                <Check class="w-4 h-4 text-copy-success" aria-hidden="true" strokeWidth={2.5} />
              ) : (
                <Copy class="w-4 h-4" aria-hidden="true" strokeWidth={2} />
              )}
              <span>{copied ? 'Copied' : 'Copy all'}</span>
            </button>
          </div>

          {/*
            Two rows typed as the same name would emit two identical custom
            properties, where the browser keeps the last and the user is left
            wondering which one they are actually looking at. The duplicate is
            dropped from the block rather than merged, so the preview below is
            exactly what lands on the clipboard.
          */}
          {duplicates.length > 0 && (
            <p class="font-mono text-micro text-mute">
              Duplicate name dropped from the block:{' '}
              <span class="text-body">{duplicates.join(', ')}</span>
            </p>
          )}

          <div class="well overflow-hidden">
            <div class="flex items-center justify-between gap-3 px-3 py-2 bg-canvas-card border-b border-hairline">
              <span class="font-mono text-micro text-mute">{meta.filename}</span>
              <span class="eyebrow">
                {lines.length} {lines.length === 1 ? 'variable' : 'variables'}
              </span>
            </div>
            <pre class="m-0 p-3 font-mono text-micro text-ink whitespace-pre overflow-x-auto">
              {block}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}