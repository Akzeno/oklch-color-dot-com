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
import { createOklchColor, formatOklch } from '../src/utils/color.ts';

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

/* ═══════════════ 8. The wiring, read at source level ═══════════════ */

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

console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'));
process.exit(failures === 0 ? 0 : 1);