import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Check, Copy, Paintbrush, Plus, Trash2 } from 'lucide-preact';
import { formatOklch, parseAnyToOklch, type ColorModel } from '../../utils/color';
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
  setPaletteSlotColor,
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

/**
 * One row's value field, mid-edit.
 *
 * `failed` is separate from the text so a mistake can be reported without
 * reporting it on every keystroke: `oklch(6` is a colour being typed, and a hint
 * that fires while someone is still typing is noise, not feedback. It is set when
 * the field is left or Enter pressed on it — the point at which the user has
 * stopped typing and it is clear it will never parse.
 */
interface PaletteDraft {
  text: string;
  failed: boolean;
}

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
  /**
   * A row that arrived from somewhere else and needs naming — the swatch menu's
   * "Add to custom palette" writes the row, and its name is the one thing about
   * that row the panel cannot infer.
   *
   * Passed in rather than requested from inside, because the row is created by
   * the page: the panel can name a row it added itself, and only knows about the
   * others through the store.
   */
  focusSlot?: string | null;
  /** Tells the page the caret request was honoured, so it is not replayed. */
  onFocusSlot?: (id: string | null) => void;
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
 * EVERY ROW IS EDITABLE, AND THAT MEANS THE PICKER *AND* THE TEXT FIELD
 *
 * Each swatch opens the shared picker preloaded with its own colour and returns
 * to this page tagged with its slot. Nothing here is generated and then frozen:
 * the palette is a starting point to edit, not an output.
 *
 * The value is also a text field, because the fastest way to get a colour into
 * this panel is to paste the one already on screen. The scale directly above
 * shows eleven exact values and the swatch menu can collect one, but a palette is
 * assembled from several sources — a brand sheet, a screenshot's CSS, another
 * tool's output — and asking someone to hand-transcribe `oklch(62.8% 0.216 254)`
 * into a picker is a step with no reason in it. The field takes any format
 * `parseAnyToOklch` does, normalises on commit, and leaves a half-typed value
 * alone rather than guessing at it.
 */
export default function CustomPalettePanel({ onEdit, focusSlot, onFocusSlot }: CustomPalettePanelProps) {
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

  /**
   * A row the page created — the swatch menu's "Add to custom palette" — needs
   * the same caret, but the request arrives from outside because the page is what
   * wrote the row. It is reported back as soon as it is honoured, so a later
   * render cannot pull focus out from under a user who has clicked away.
   */
  useEffect(() => {
    if (!focusSlot) return;
    nameFields.current[focusSlot]?.focus();
    onFocusSlot?.(null);
  }, [focusSlot, onFocusSlot]);

  /**
   * Value text that has been typed but not yet committed, per row.
   *
   * Held outside the store on purpose: a half-typed `oklch(6` is not a colour,
   * and the store holds colours that go straight into a CSS declaration. A row's
   * displayed value is its draft if it has one and the stored colour otherwise,
   * so the field is editable without the palette ever being in a state the
   * preview block could emit.
   */
  const [drafts, setDrafts] = useState<Record<string, PaletteDraft>>({});

  const dropDraft = (id?: string) =>
    setDrafts((current) => {
      if (id === undefined) return {};
      if (!(id in current)) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });

  /**
   * Turn typed text into this row's colour.
   *
   * Three outcomes, and the difference matters:
   *
   *  - Nothing typed: no-op, so a blur after a successful commit does not rewrite
   *    the colour that commit just wrote.
   *  - Emptied: the draft is dropped and the stored colour shows again. A blank
   *    field means "never mind", not "this row has no colour" — there is no such
   *    thing as a colourless row in a palette of colours.
   *  - Unparseable: the text stays put and is marked failed, because silently
   *    reverting a value the user just pasted is how that paste gets lost. The
   *    stored colour is untouched either way, so nothing invalid can reach the
   *    block.
   */
  const commitDraft = (slot: CustomPaletteSlot, text: string) => {
    if (drafts[slot.id] === undefined) return;

    if (!text.trim()) {
      dropDraft(slot.id);
      return;
    }

    const parsed = parseAnyToOklch(text);
    if (!parsed) {
      setDrafts((current) => ({
        ...current,
        [slot.id]: { text, failed: true },
      }));
      return;
    }

    dropDraft(slot.id);
    setPaletteSlotColor(slot.id, parsed);
  };

  /** Text that is on screen for a row but is not a colour, so it can say so. */
  const draftProblem = (draft: PaletteDraft | undefined) =>
    draft !== undefined && draft.failed && parseAnyToOklch(draft.text) === null;

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
    dropDraft(slot.id);
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
    dropDraft();
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
            scale · paste a value or click a swatch to edit it
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
          No colours yet. Add one, then paste a value into it — or click its swatch to change it in
          the color picker.
        </p>
      ) : (
        <ul class="space-y-2">
          {slots.map((slot, index) => {
            const value = formatOklch(slot.color);
            const variable = paletteVariable(slot, index);
            const label = slot.name.trim() || variable;
            const draft = drafts[slot.id];
            const shown = draft ? draft.text : value;
            const unparsed = draftProblem(draft);

            return (
              <li key={slot.id} class="flex items-start gap-2">
                <ColorSwatch
                  color={slot.color}
                  onClick={() => {
                    // The picker is about to replace this row's colour from the
                    // other page, so any half-typed value would come back
                    // describing a colour that is no longer stored.
                    dropDraft(slot.id);
                    onEdit(slot.color, slot.id);
                  }}
                  class="w-9 h-9 sm:w-10 sm:h-10 rounded-md border border-hairline shrink-0 hover:border-border-focus focus-visible:border-border-focus focus-visible:outline-none"
                  title={`Edit ${label} in the color picker`}
                  ariaLabel={`Open the color picker to edit ${label}`}
                >
                  {/* Hover-only, like the base swatch: the affordance is
                      discoverable without tinting the colour being judged. The
                      overlay covers the whole swatch, so a plain `:hover` is
                      enough — there is no gap to hover past it. */}
                  <span class="absolute inset-0 flex items-center justify-center bg-black/45 dark-scope opacity-0 transition-opacity duration-150 hover:opacity-100">
                    {/* Matched to the base swatch's hover icon: the two swatches
                        are the same size and say the same thing, so a different
                        glyph size between them reads as an accident. */}
                    <Paintbrush class="w-6 h-6 text-ink" aria-hidden="true" strokeWidth={2} />
                  </span>
                </ColorSwatch>

                <div class="min-w-0 flex-1 space-y-1">
                  <input
                    id={`custom-palette-name-${slot.id}`}
                    type="text"
                    name="variable"
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
                    {/*
                      The value is the field you paste into. A generated row is
                      only a starting point, and the fastest colour to put in a
                      palette is one already on screen somewhere else — the scale
                      above, a brand sheet, another tool's CSS — so any format
                      `parseAnyToOklch` understands is accepted and normalised to
                      the exact text that will be copied.
                    */}
                    <input
                      id={`custom-palette-value-${slot.id}`}
                      type="text"
                      name="value"
                      value={shown}
                      spellcheck={false}
                      autocomplete="off"
                      aria-label={`Colour value for ${label}`}
                      aria-invalid={unparsed ? 'true' : undefined}
                      placeholder="#2563eb · oklch(55% 0.22 255)"
                      onInput={(e) => {
                        const text = (e.target as HTMLInputElement).value;
                        setDrafts((current) => ({
                          ...current,
                          [slot.id]: { text, failed: false },
                        }));
                      }}
                      onKeyDown={(e) => {
                        // Enter commits, so a pasted value does not need a click
                        // somewhere else to become the row's colour.
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          commitDraft(slot, (e.currentTarget as HTMLInputElement).value);
                        }
                      }}
                      onBlur={(e) => commitDraft(slot, (e.currentTarget as HTMLInputElement).value)}
                      // The border is the field's own "this is not a colour" state.
                      // `.hud:focus-within` is a component-layer rule, so a utility
                      // here still wins while the field has focus — which is
                      // exactly when the message is being read.
                      class={`hud !py-1 flex-1 min-w-0 font-mono text-label cursor-text ${
                        unparsed ? 'border-gamut-warning' : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => copyValue(value)}
                      class="icon-btn icon-btn-xs shrink-0"
                      aria-label={`Copy the value of ${label}`}
                      title={`Copy ${value}`}
                    >
                      <Copy class="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
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

                  {/* Only while the text on screen is not a colour. A half-typed
                      `oklch(6` is expected mid-keystroke, so this must not appear
                      on every character — it appears when the field is left or
                      Enter is pressed on something unparseable, i.e. when the user
                      is no longer typing and it is clear it will never parse. */}
                  {unparsed && (
                    <p class="font-mono text-micro text-gamut-warning">
                      Not a colour — paste hex, rgb(), hsl() or oklch(). The row still holds{' '}
                      {value}.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => remove(slot, index)}
                  class="icon-btn icon-btn-xs shrink-0 mt-0.5"
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
