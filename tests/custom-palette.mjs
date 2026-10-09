/**
 * Covers the custom palette: a set of colours that share no scale, each editable
 * in the picker and each emitted as its own variable.
 *
 * WHY IT EXISTS
 *
 * The generator's original tool answers exactly one question — "give me the 50–950
 * scale for this hue" — and a real brand palette is not that. These checks pin the
 * three things that make the custom palette a *different* tool rather than a
 * second mode of the same one:
 *
 *  1. Its rows survive the trip through the colour picker. That trip navigates to
 *     another page and back, and `<ClientRouter />` re-mounts every island, so
 *     component state would come back as defaults after *every* edit. The slot tag
 *     in the handoff is what makes the round trip land on the row that was clicked
 *     instead of on the base colour.
 *  2. Its rows are independent colours, not steps of one hue. A new row is
 *     deliberately hue-rotated away from the row above it.
 *  3. What it emits is a standalone variable per colour, and what it shows is
 *     character-for-character what it copies — including when two rows claim the
 *     same name.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  savePickerHandoff,
  consumePickerHandoff,
  clearPickerHandoff,
  savePickerResult,
  consumePickerResult,
  clearPickerResult,
} from '../src/stores/cartStore.ts';
import {
  customPaletteStore,
  hydrateCustomPaletteFromStorage,
  addPaletteSlot,
  addPaletteSlotWithColor,
  removePaletteSlot,
  renamePaletteSlot,
  setPaletteSlotColor,
  restorePaletteSlot,
  replaceCustomPalette,
  buildPaletteBlock,
  paletteDeclarations,
  paletteVariable,
  sanitizeCustomPalette,
  DEFAULT_CUSTOM_PALETTE,
} from '../src/stores/customPaletteStore.ts';
import { createOklchColor, formatOklch, parseAnyToOklch } from '../src/utils/color.ts';

const PALETTE_KEY = 'oklch_custom_palette_v1';
const ORIGIN = '/oklch-color-palette-generator';

const store = new Map();
globalThis.window = { addEventListener() {}, removeEventListener() {} };
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, v),
  removeItem: (k) => store.delete(k),
};
globalThis.sessionStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, v),
  removeItem: (k) => store.delete(k),
};

const root = process.cwd();
const src = (p) => readFileSync(join(root, p), 'utf8');

let failures = 0;
function check(name, cond, extra = '') {
  if (cond) console.log('PASS  ' + name);
  else {
    failures++;
    console.log('FAIL  ' + name + (extra ? '\n      ' + extra : ''));
  }
}

/* ═══════════════ 1. The defaults are deterministic and genuinely different ═══════════════ */

console.log('=== The palette renders from a deterministic default ===');
// Pinned by `useCustomPalette` so the server HTML and the first client render
// describe the same rows. Two different renderers producing two different sets
// would duplicate the panel instead of hydrating it.
check('four rows ship by default', DEFAULT_CUSTOM_PALETTE.length === 4,
  'got ' + DEFAULT_CUSTOM_PALETTE.length);
check('the store starts from that default',
  customPaletteStore.get().length === DEFAULT_CUSTOM_PALETTE.length);
check('every default row is a different colour',
  new Set(DEFAULT_CUSTOM_PALETTE.map((s) => formatOklch(s.color))).size === 4,
  'values: ' + DEFAULT_CUSTOM_PALETTE.map((s) => formatOklch(s.color)).join(','));
// Not every row needs its own hue — a theme's neutrals deliberately share one —
// but the palette must not open looking like a single-colour scale.
check('the defaults span several hues',
  new Set(DEFAULT_CUSTOM_PALETTE.map((s) => s.color.h)).size >= 3,
  'hues: ' + DEFAULT_CUSTOM_PALETTE.map((s) => s.color.h).join(','));
check('every default row has a distinct variable name',
  new Set(DEFAULT_CUSTOM_PALETTE.map((s, i) => paletteVariable(s, i))).size === 4,
  'vars: ' + DEFAULT_CUSTOM_PALETTE.map((s, i) => paletteVariable(s, i)).join(','));

/* ═══════════════ 2. Added rows are different colours ═══════════════ */

console.log('\n=== A new row is a different colour, not another shade ===');
const lastOfDefault = DEFAULT_CUSTOM_PALETTE[DEFAULT_CUSTOM_PALETTE.length - 1].color;
const addedId = addPaletteSlot();
const added = customPaletteStore.get().at(-1);
check('the row was appended', customPaletteStore.get().length === 5);
check('its id is not one already in use',
  new Set(customPaletteStore.get().map((s) => s.id)).size === 5,
  'ids: ' + customPaletteStore.get().map((s) => s.id).join(','));
// The whole premise of the panel: added colours must not read as a near-duplicate
// of the row above them.
check('its hue is far from the row above it',
  Math.abs(((added.color.h - lastOfDefault.h + 540) % 360) - 180) > 100,
  added.color.h + ' vs ' + lastOfDefault.h);
check('it is named automatically so the variable is valid',
  added.name.length > 0 && paletteVariable(added, 4).startsWith('--color-'),
  added.name);

console.log('\n=== Added rows keep their own identity ===');
addPaletteSlot();
addPaletteSlot();
const ids = customPaletteStore.get().map((s) => s.id);
check('three adds produced three unique ids', new Set(ids).size === ids.length,
  'ids: ' + ids.join(','));

/* ═══════════════ 3. The picker round trip lands on the clicked row ═══════════════ */

console.log('\n=== Editing a row comes back to that row, not the base colour ===');
// This is the defect the slot tag exists to prevent: the page holds several free
// colours (the base colour plus every row), the picker hands back a bare colour,
// and an untagged result can only be guessed at.
const beforeEdit = customPaletteStore.get().map((s) => formatOklch(s.color));
const targetId = customPaletteStore.get()[2].id;
const openedColor = customPaletteStore.get()[2].color;
clearPickerHandoff();
savePickerHandoff({
  mode: 'free',
  roleId: 'trusty-button',
  step: 500,
  color: openedColor,
  returnTo: ORIGIN,
  slot: targetId,
});

const opened = consumePickerHandoff();
check('the picker opens preloaded with the clicked row',
  opened.color !== null && formatOklch(opened.color) === formatOklch(openedColor));
check('the handoff names which row is being edited', opened.slot === targetId,
  'got ' + opened.slot);

// The picker echoes it on save, verbatim.
const edited = createOklchColor(0.44, 0.19, 12);
savePickerResult({ color: edited, returnTo: opened.returnTo, slot: opened.slot });
clearPickerHandoff();

const returned = consumePickerResult(ORIGIN);
check('the colour comes back to the originating page', returned !== null);
check('and says which row it was for',
  returned.slot === targetId, 'got ' + JSON.stringify(returned.slot));
setPaletteSlotColor(returned.slot, returned.color);

const afterEdit = customPaletteStore.get();
check('the edit landed on the row that was clicked',
  formatOklch(afterEdit[2].color) === formatOklch(edited),
  afterEdit[2].color.h + ' vs ' + edited.h);
check('every other row is untouched',
  afterEdit.every((s, i) =>
    i === 2 || formatOklch(s.color) === beforeEdit[i]),
  afterEdit.map((s) => s.color.h).join(','));
check('the result is spent', consumePickerResult(ORIGIN) === null);

console.log('\n=== A slot is opaque and bounded, never user text ===');
const BAD_SLOTS = [
  '../../etc/passwd',
  'a b',
  '',
  'x'.repeat(200),
  42,
  null,
  { toString: () => 'ok' },
];
for (const bad of BAD_SLOTS) {
  clearPickerHandoff();
  savePickerHandoff({ mode: 'free', roleId: 'trusty-button', step: 500, color: openedColor, returnTo: ORIGIN, slot: bad });
  check(`slot ${JSON.stringify(bad)?.slice(0, 24)} is dropped`, consumePickerHandoff().slot === null);
}
clearPickerResult();
clearPickerHandoff();
savePickerHandoff({ mode: 'free', roleId: 'trusty-button', step: 500, color: openedColor, returnTo: ORIGIN, slot: 'slot_9-a' });
check('a legitimate id survives', consumePickerHandoff().slot === 'slot_9-a');

/* ═══════════════ 4. Names become variables ═══════════════ */

console.log('\n=== A typed name becomes exactly one variable ===');
const renamedId = customPaletteStore.get()[0].id;
renamePaletteSlot(renamedId, 'Brand Accent');
check('spaces and capitals are slugified, not emitted raw',
  paletteVariable(customPaletteStore.get()[0], 0) === '--color-brand-accent',
  paletteVariable(customPaletteStore.get()[0], 0));
renamePaletteSlot(renamedId, '###');
check('a name that cannot name a variable falls back to a positional one',
  paletteVariable(customPaletteStore.get()[0], 0) === '--color-color-1',
  paletteVariable(customPaletteStore.get()[0], 0));
renamePaletteSlot(renamedId, '');

console.log('\n=== Two rows claiming one name drop the second ===');
// Emitting both would put two identical custom properties in the block, where the
// browser keeps the last and the user cannot tell which they are looking at.
const dupId = addPaletteSlot();
renamePaletteSlot(dupId, 'accent');   // row 1 already answers to "accent"
const withDupe = customPaletteStore.get();
const { lines, duplicates } = paletteDeclarations(withDupe);
check('the clash is reported', duplicates.includes('--color-accent'),
  'reported: ' + duplicates.join(','));
check('only one declaration claims the name',
  lines.filter((l) => l.variable === '--color-accent').length === 1);
check('the surviving declaration is the first row',
  lines.find((l) => l.variable === '--color-accent').slot.id === withDupe[1].id,
  lines.find((l) => l.variable === '--color-accent').slot.id);

/* ═══════════════ 5. What is copied is what is shown ═══════════════ */

console.log('\n=== The block matches the preview, in all three formats ===');
const clean = customPaletteStore.get().map((s, i) => ({
  id: s.id,
  name: i === 0 ? 'brand' : i === 1 ? 'accent' : `role-${i}`,
  color: s.color,
}));
const theme = buildPaletteBlock(clean, 'theme');
check('the @theme block opens and closes as a block',
  theme.startsWith('@theme {') && theme.endsWith('}'), theme);
check('it declares one variable per colour',
  (theme.match(/--color-/g) || []).length === clean.length, theme);
check('every value is the row’s own colour',
  clean.every((s, i) => theme.includes(`${paletteVariable(s, i)}: ${formatOklch(s.color)};`)));
check('the :root block differs only in its selector',
  buildPaletteBlock(clean, 'root') === theme.replace('@theme {', ':root {'));

const json = buildPaletteBlock(clean, 'json');
check('the JSON keys are the same variable names, without the prefix',
  Object.keys(JSON.parse(json)).join(',') === clean.map((s, i) => paletteVariable(s, i).slice(8)).join(','),
  json);
check('the JSON values are the same colour values',
  Object.values(JSON.parse(json)).every((v, i) => v === formatOklch(clean[i].color)));

// A duplicate is dropped from the block too, so the preview never shows a line
// the clipboard will not contain.
const dupeBlock = buildPaletteBlock(withDupe, 'theme');
check('a duplicate name never reaches the copied block',
  (dupeBlock.match(/--color-accent:/g) || []).length === 1, dupeBlock);

console.log('\n=== An empty palette copies nothing rather than an empty block ===');
replaceCustomPalette([]);
check('every format yields an empty string',
  buildPaletteBlock([], 'theme') === '' &&
    buildPaletteBlock([], 'root') === '' &&
    buildPaletteBlock([], 'json') === '');

/* ═══════════════ 6. Removal is reversible ═══════════════ */

console.log('\n=== Removing a row can be undone, in place ===');
replaceCustomPalette(DEFAULT_CUSTOM_PALETTE);
const doomed = customPaletteStore.get()[1];
removePaletteSlot(doomed.id);
check('the row is gone', customPaletteStore.get().length === 3);
restorePaletteSlot(doomed, 1);
const restored = customPaletteStore.get();
check('it is back', restored.length === 4);
check('at the position it was removed from', restored[1].id === doomed.id,
  restored.map((s) => s.id).join(','));
check('with its colour intact',
  formatOklch(restored[1].color) === formatOklch(doomed.color));

/* ═══════════════ 7. Persistence ═══════════════ */

console.log('\n=== The palette is persisted, because islands re-mount ===');
// Editing a row navigates to `/` and back. `<ClientRouter />` swaps the document,
// so a palette held in component state would revert to its defaults on every
// single edit. That is what the store is for.
check('the palette is written to localStorage',
  store.has(PALETTE_KEY) && JSON.parse(store.get(PALETTE_KEY)).length === 4);

console.log('\n=== A persisted palette is read back after mount ===');
replaceCustomPalette(DEFAULT_CUSTOM_PALETTE);   // what the store looks like pre-hydration
hydrateCustomPaletteFromStorage();
check('the persisted rows are restored',
  customPaletteStore.get().length === 4,
  'rows: ' + customPaletteStore.get().length);
// A second hydrate must not re-read localStorage: the user has been editing the
// live palette since, and re-reading would undo those edits under them.
replaceCustomPalette([]);
hydrateCustomPaletteFromStorage();
check('a later hydrate does not clobber edits made since',
  customPaletteStore.get().length === 0,
  'rows: ' + customPaletteStore.get().length);
store.set(PALETTE_KEY, JSON.stringify(DEFAULT_CUSTOM_PALETTE));

console.log('\n=== A corrupt payload cannot resurrect nonsense ===');
// localStorage is user-writable, so this is the same attacker-reachable input the
// cart store already defends against. The sanitize step is called directly here
// because the hydrate flag above is deliberately one-shot per session.
for (const [label, payload] of [
  ['not json at all', '{nope'],
  ['an object', '{"a":1}'],
  ['a string', '"hello"'],
  ['null', 'null'],
  ['a number', '7'],
]) {
  let slots;
  check(`${label} is rejected without throwing`, (() => {
    try {
      slots = sanitizeCustomPalette(payload);
      return slots === null;
    } catch {
      return false;
    }
  })());
}

console.log('\n=== Malformed entries inside a valid array are dropped, not rendered ===');
const salvaged = sanitizeCustomPalette([
  { id: 'kept-1', name: 'brand', color: { l: 0.5, c: 0.2, h: 250, alpha: 1, hex: '#00f', inSRGB: true, inP3: true } },
  { id: 'kept-2', name: 'accent', color: { l: 0.7, c: 0.15, h: 90 } },
  { id: 'no colour', name: 'broken' },
  { id: 'bad colour', name: 'broken', color: { l: 'x', c: {}, h: [] } },
  'not an object',
  null,
]);
check('two good rows and four broken ones leave exactly two',
  salvaged !== null && salvaged.length === 2,
  'rows: ' + (salvaged ? salvaged.length : null));
check('the good row survives intact, colour and all',
  salvaged[0].id === 'kept-1' &&
    salvaged[0].color.h === 250 &&
    salvaged[0].color.hex === '#00f');
check('a row with no hex still loads, with the fallback',
  salvaged[1].color.hex === '#000000' && salvaged[1].color.h === 90);
check('a stored colour is coerced, not trusted',
  sanitizeCustomPalette([{ id: 'a', name: 'a', color: { l: 9, c: -3, h: 725 } }])[0].color.l === 1);

console.log('\n=== Ids from storage are de-duplicated and re-minted ===');
// Two rows sharing an id would make a picker edit change the wrong colour, with
// nothing on screen to explain it.
const reIded = sanitizeCustomPalette([
  { id: 'dup', name: 'a', color: { l: 0.5, c: 0.2, h: 10 } },
  { id: 'dup', name: 'b', color: { l: 0.6, c: 0.1, h: 20 } },
  { id: 'bad id!', name: 'c', color: { l: 0.7, c: 0.1, h: 30 } },
]);
const reIdedIds = reIded.map((s) => s.id);
check('no two rows share an id', new Set(reIdedIds).size === reIdedIds.length,
  reIdedIds.join(','));
check('a malformed id is replaced rather than trusted',
  reIdedIds.every((id) => /^[A-Za-z0-9_-]+$/.test(id)), reIdedIds.join(','));
check('all three colours survived', reIded.length === 3);
check('a stored id is kept, not renumbered on load',
  // Ids address rows across a picker round trip, so re-minting a perfectly good
  // one on every reload would break an edit that is already in flight.
  reIded[0].id === 'dup');

console.log('\n=== An empty palette is a decision, not "no payload" ===');
// Hydration must not undo the user emptying it, which would make "remove every
// row" impossible to keep.
const emptied = sanitizeCustomPalette([]);
check('an empty array is an empty palette, not a rejected payload',
  emptied !== null && emptied.length === 0,
  'got ' + JSON.stringify(emptied));

console.log('\n=== A newly added row never reuses an id from storage ===');
const reused = sanitizeCustomPalette([
  { id: 'slot-5', name: 'brand', color: { l: 0.5, c: 0.2, h: 250 } },
]);
replaceCustomPalette(reused);
const freshId = addPaletteSlot();
check('the minted id is distinct from the stored one',
  freshId !== 'slot-5', 'got ' + freshId);

/* ═══════════════ 8. Collecting a swatch is a copy, not an approximation ═══════════════ */

console.log('\n=== A collected swatch keeps the exact colour that was collected ===');
// `addPaletteSlot` deliberately hue-rotates away from its neighbour, because a
// generated row is a guess. A collected row is the opposite: the user pointed at a
// specific swatch, and an approximation of it would collect a colour nobody asked
// for. Same store, two routes, and the difference has to be in the value.
replaceCustomPalette(DEFAULT_CUSTOM_PALETTE);
const STEP_600 = createOklchColor(0.45, 0.157, 258.4);
const collectedId = addPaletteSlotWithColor(STEP_600);
const collected = customPaletteStore.get().at(-1);
check('it is appended, not inserted', customPaletteStore.get().length === 5);
check('it is that exact colour, to the digit',
  collected.color.l === STEP_600.l &&
    collected.color.c === STEP_600.c &&
    collected.color.h === STEP_600.h,
  formatOklch(collected.color));
check('alpha came with it', collected.color.alpha === STEP_600.alpha);
check('it did not get the generated row’s hue rotation',
  collected.color.h === STEP_600.h &&
    formatOklch(collected.color) === formatOklch(STEP_600));
check('it is a new id, distinct from every row already there',
  new Set(customPaletteStore.get().map((s) => s.id)).size === 5,
  customPaletteStore.get().map((s) => s.id).join(','));

// An unnamed row would emit an invalid variable, exactly as for a generated one.
check('it is named automatically so the variable is valid',
  collected.name.length > 0 && paletteVariable(collected, 4).startsWith('--color-'),
  collected.name);

console.log('\n=== A collected row is persisted and reversible like any other ===');
check('the collected colour is what reaches localStorage',
  store.has(PALETTE_KEY) &&
    formatOklch(JSON.parse(store.get(PALETTE_KEY)).at(-1).color) === formatOklch(STEP_600),
  JSON.stringify(JSON.parse(store.get(PALETTE_KEY)).at(-1)?.color));
check('and it is emitted in the block, verbatim',
  buildPaletteBlock(customPaletteStore.get(), 'theme')
    .includes(`${paletteVariable(collected, 4)}: ${formatOklch(STEP_600)};`));
// The action behind it is one click, so Undo is the only thing standing between a
// mis-click and a palette the user has to rebuild by hand.
removePaletteSlot(collectedId);
check('it can be taken back out', customPaletteStore.get().length === 4);
restorePaletteSlot(collected, 4);
check('and restored in place, with its colour intact',
  customPaletteStore.get().length === 5 &&
    customPaletteStore.get()[4].id === collectedId &&
    formatOklch(customPaletteStore.get()[4].color) === formatOklch(STEP_600));

addPaletteSlotWithColor(createOklchColor(0.5, 0.1, 20), 'Brand Accent');
check('a caller-supplied name is honoured instead',
  paletteVariable(customPaletteStore.get().at(-1), 5) === '--color-brand-accent',
  paletteVariable(customPaletteStore.get().at(-1), 5));

console.log('\n=== A colour is coerced on the way in, like every other entry point ===');
// The panel renders `slot.color` straight into a CSS declaration, and this route
// arrives from a UI callback rather than from `createOklchColor`.
const wild = addPaletteSlotWithColor({ l: 9, c: -3, h: 725, alpha: 5 });
const wildSlot = customPaletteStore.get().at(-1);
check('the row is still created', wildSlot.id === wild);
check('its out-of-range channels are clamped, not emitted',
  wildSlot.color.l === 1 && wildSlot.color.c === 0 && wildSlot.color.alpha === 1,
  JSON.stringify(wildSlot.color));
check('its hue is normalised into range', wildSlot.color.h === 5, wildSlot.color.h);

/* ═══════════════ 9. The wiring, read at source level ═══════════════ */

console.log('\n=== The page wires the panel to the picker it already had ===');
const island = src('src/components/generator/PaletteGeneratorIsland.tsx');
const panel = src('src/components/generator/CustomPalettePanel.tsx');
const picker = src('src/components/picker/ColorPickerIsland.tsx');

// The generator already had a 'free' picker for its base colour. The panel must
// reuse that one handler rather than opening a second, competing trip.
check('the panel is rendered by the generator island',
  /<CustomPalettePanel/.test(island));
check('its swatch opens the picker tagged with the row',
  /onEdit=\{\(color, slotId\) => openInPicker\(color, \{ slot: slotId \}\)\}/.test(island));
check('a tagged colour is written to that row, and an untagged one to the base',
  /if \(slot\) \{\s*\n\s*setPaletteSlotColor\(slot, picked\);/.test(island) &&
    /setBaseHex\(formatOklch\(picked\)\)/.test(island));
check('the base swatch still opens untagged',
  /onClick=\{\(\) => openInPicker\(baseColor\)\}/.test(island));
check('the panel hands over both the colour and the row it belongs to',
  /onEdit: \(color: ColorModel, slotId: string\) => void/.test(panel) &&
    /onEdit\(slot\.color, slot\.id\)/.test(panel));
check('the picker echoes the slot instead of choosing one',
  /slot: handoff\.slot \?\? null/.test(picker));
check('each row can be copied on its own as well as all together',
  /copyValue\(value\)/.test(panel) && /copyBlock/.test(panel));

console.log('\n=== A row’s value is a text field, so a colour can be pasted in ===');
// The panel's rows were generated, then editable only through a round trip to
// another page. But the palette is assembled from wherever colours happen to be —
// the scale directly above it, a brand sheet, another tool's CSS — and asking
// someone to retype `oklch(62.8% 0.216 254)` into a picker is a step with no
// reason in it.
check('the value is an input, not a label',
  /aria-label=\{t\(\s*locale,\s*'ui\.generator\.panel\.colourValueAria',\s*'Colour value for \{label\}'\s*\)/.test(panel) &&
    /value=\{shown\}/.test(panel));
check('it is parsed with the same reader as the base colour field',
  /parseAnyToOklch\(draft\.text\)/.test(panel) && /parseAnyToOklch\(text\)/.test(panel) &&
    /parseAnyToOklch\(baseHex\) \|\|/.test(island));
check('Enter commits, so a paste does not need a second click',
  /if \(e\.key === 'Enter'\) \{\s*\n\s*e\.preventDefault\(\);\s*\n\s*commitDraft/.test(panel));
check('leaving the field commits too',
  /onBlur=\{\(e\) => commitDraft/.test(panel));
check('a commit normalises to the exact text that gets copied',
  /dropDraft\(slot\.id\);\s*\n\s*setPaletteSlotColor\(slot\.id, parsed\)/.test(panel));
// A half-typed `oklch(6` is a colour being written, not a mistake. The store only
// ever holds colours, so the text has to live outside it and come back as a claim
// about what is stored.
check('uncommitted text lives in the panel, never in the store',
  /useState<Record<string, PaletteDraft>>/.test(panel) &&
    !/setPaletteSlotColor\(slot\.id, text\)/.test(panel));
check('the row still shows its stored colour while the text is being typed',
  /const shown = draft \? draft\.text : value;/.test(panel));
check('clearing the field restores the stored colour instead of emptying the row',
  /if \(!text\.trim\(\)\) \{\s*\n\s*dropDraft\(slot\.id\);\s*\n\s*return;/.test(panel));
check('an unparseable paste is kept on screen, not silently reverted',
  /\[slot\.id\]: \{ text, failed: true \}/.test(panel));
check('and it is only reported once typing is over, not on every keystroke',
  /draft !== undefined && draft\.failed/.test(panel) &&
    /\{ text, failed: false \}/.test(panel));
check('the copy affordance survived becoming a field',
  /aria-label=\{t\(\s*locale,\s*'ui\.generator\.panel\.copyValueAria',\s*'Copy the value of \{label\}'\s*\)/.test(panel));
// A picker round trip replaces the row from another page; a draft describing the
// old colour would come back describing a colour that is no longer stored.
check('opening the picker drops any half-typed value for that row',
  /dropDraft\(slot\.id\);\s*\n\s*onEdit\(slot\.color, slot\.id\)/.test(panel));

console.log('\n=== Every format `parseAnyToOklch` reads, the field accepts ===');
// The panel's field has no parser of its own, so "paste any colour" is exactly as
// good as this reader. The claim worth pinning is that the notations a palette is
// actually pasted from — hex off a brand sheet, rgb() out of devtools, hsl() out
// of a config file — are all understood and all agree.
for (const text of ['#2563eb', '#abc', 'rgb(37 99 235)', 'hsl(221 83% 53%)', 'oklch(55% 0.22 255)']) {
  check(`"${text}" parses`, parseAnyToOklch(text) !== null);
}
const sameColour = (a, b) =>
  Math.abs(a.l - b.l) < 0.01 && Math.abs(a.c - b.c) < 0.01 && Math.abs(a.h - b.h) < 1;
const HEX = parseAnyToOklch('#2563eb');
check('rgb() of the same colour lands on the same colour',
  sameColour(HEX, parseAnyToOklch('rgb(37 99 235)')));
check('hsl() of the same colour lands on the same colour',
  sameColour(HEX, parseAnyToOklch('hsl(221 83% 53%)')));
const OKLCH = parseAnyToOklch('oklch(55% 0.22 255)');
check('an oklch() paste is taken literally, not rounded into sRGB first',
  OKLCH.l === 0.55 && OKLCH.c === 0.22 && OKLCH.h === 255,
  `${OKLCH.l} ${OKLCH.c} ${OKLCH.h}`);
check('something that is not a colour does not parse', parseAnyToOklch('not a colour') === null);
check('a blank field does not parse either', parseAnyToOklch('   ') === null);

console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'));
process.exit(failures === 0 ? 0 : 1);