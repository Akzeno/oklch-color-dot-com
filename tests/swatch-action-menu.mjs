/**
 * Covers the per-swatch action menu on the palette generator: clicking a swatch
 * now *asks* which of two very different things to do, instead of guessing.
 *
 * WHY IT EXISTS
 *
 * The click used to be unconditional. Which meant one of two things was always
 * true and invisible to the user: browsing the scale silently rewrote a
 * `--color-*` token, or reading a value silently changed the clipboard. The two
 * intents are real and they are not compatible, so the choice has to be the
 * user's — but only once per click, not once per session via a toggle that is
 * easy to forget is on.
 *
 * The checks below pin the three things that make that choice real rather than
 * decorative:
 *
 *  1. A click acts on nothing. Both the scale strip and the harmony swatches only
 *     *open* the menu, so no store write can happen without the user picking one.
 *  2. The menu reaches the same click handlers through an anchor. A colour cannot
 *     be positioned, so `SwatchStrip` has to hand the element along.
 *  3. The slot the menu *names* is the slot the store *writes*. A harmony swatch
 *     has no step of its own, so its label is derived from lightness — and the
 *     last section proves that derivation and `addColorToCart` agree, which is
 *     the only reason the label can be trusted.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { addColorToCart, cartStore, setRoleShade } from '../src/stores/cartStore.ts';
import { createOklchColor, getNearestShadeStep } from '../src/utils/color.ts';

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

const island = src('src/components/generator/PaletteGeneratorIsland.tsx');
const menu = src('src/components/generator/SwatchActionMenu.tsx');
const stripSrc = src('src/components/palettes/SwatchStrip.tsx');

let failures = 0;
function check(name, cond, extra = '') {
  if (cond) console.log('PASS  ' + name);
  else {
    failures++;
    console.log('FAIL  ' + name + (extra ? '\n      ' + extra : ''));
  }
}

/* ═══════════════ 1. A click asks; it does not act ═══════════════ */

console.log('=== Clicking a swatch only opens the menu ===');
check('the scale strip hands its click to openMenu',
  /onPick=\{\(color, step, anchor\) =>\s*\n?\s*openMenu\(\{/.test(island));
// A regression here is invisible in review and bad in use: browsing the scale
// would quietly rewrite tokens again.
check('no immediate cart write survives in a click handler',
  !/onClick=\{\(\) => (collect|file|saveOnly|addColorToCart|setRoleShade)\(/.test(island));
// Exactly two entry points: the scale strip and the harmony map. A third would be
// a strip whose swatches act on click while the others ask.
check('both swatch groups route through openMenu, and nothing else does',
  (island.match(/openMenu\(\{/g) || []).length === 2, 'found ' + (island.match(/openMenu\(\{/g) || []).length);
check('a harmony swatch is handed no step, so it slots by lightness instead',
  (island.match(/step: null/g) || []).length === 1);
check('the harmony swatch passes the clicked element as the anchor',
  /anchor: e\.currentTarget/.test(island));

// The "On click" toggle was the previous way to express this choice. It is gone
// because the choice is now made per click; a surviving copy of it would be two
// controls that disagree about the same thing.
check('the session-wide "On click" toggle is gone', !/pickAction|PICK_ACTIONS|On click/.test(island));
check('the scale hint now promises both destinations',
  /Click a step to copy its value or save it as/.test(island));

console.log('\n=== The strip hands the anchor along, because a menu needs one ===');
check('SwatchStrip reports the clicked element to the caller',
  /onClick=\{\(e\) => onPick\(color, step, e\.currentTarget\)\}/.test(stripSrc));
check('its prop type carries that third argument',
  /onPick: \(color: ColorModel, step: ShadeStep, anchor: HTMLElement\) => void/.test(stripSrc));
check('a strip whose click opens a menu marks its swatches as triggers',
  /aria-haspopup=\{menu \? 'menu' : undefined\}/.test(stripSrc));
check('exactly one swatch reports itself as expanded',
  /aria-expanded=\{menu \? isOpen : undefined\}/.test(stripSrc) &&
    /const isOpen = menu\?\.openStep === step/.test(stripSrc));

/* ═══════════════ 2. Both destinations are one click away ═══════════════ */

console.log('\n=== The menu offers copy and save as separate choices ===');
check('the OKLCH value is copyable', /item\('Copy OKLCH', value, Copy/.test(menu));
check('the hex is copyable', /item\('Copy hex', hex, Copy/.test(menu));
check('the variable is saveable', /item\('Save to variable', variable, Plus/.test(menu));
check('both at once is still one click', /item\('Copy and save'/.test(menu));
check('the destination is named, not described',
  /const variable = `--color-\$\{targetSlug\}-\$\{destination\}`/.test(menu));
check('every row shows the value it acts on', (menu.match(/item\('[^']+', [a-z`]/g) || []).length === 5);

console.log('\n=== The third destination: collecting a swatch into the palette ===');
// The scale and the custom palette below it are built the same way, so filing a
// step could have been treated as saving it. They are different requests: a scale
// slot is one step of a generated ramp and needs a role, while a palette row is a
// standalone variable the user picked. Collecting has to be its own action.
check('the menu can add the swatch to the custom palette',
  /item\('Add to custom palette'/.test(menu));
check('the action is optional, because not every page has a palette panel',
  /onAddToPalette\?: \(\) => void/.test(menu) && /\{onAddToPalette && \(/.test(menu));
check('it is the only action that runs without a value of its own',
  /\{item\('Add to custom palette', `\$\{value\} → new row`, Palette, onAddToPalette\)\}/.test(menu));
check('the island supplies the handler', /onAddToPalette=\{addToPalette\}/.test(island));
check('it is a store write, not a clipboard one',
  /addPaletteSlotWithColor\(color\)/.test(island));
// Collect is the one menu action with a visible consequence off-screen: a new row
// appears in a panel below the fold. Without the toast it would look like nothing
// happened, and without Undo a mis-click is unrecoverable.
check('it says where the colour went',
  /added to the custom palette/.test(island));
check('it is undoable, and the undo removes the row it added',
  /label: 'Undo',[\s\S]*removePaletteSlot\(slotId\)/.test(island));
check('the new row is left needing a name, so the caret goes there',
  /setPendingFocusId\(slotId\)/.test(island) &&
    /focusSlot=\{pendingFocusId\}/.test(island) &&
    /onFocusSlot=\{clearPendingFocus\}/.test(island));
check('the caret request is reported back, so it cannot be replayed',
  /nameFields\.current\[focusSlot\]\?\.focus\(\);\s*\n\s*onFocusSlot\?\.\(null\)/.test(
    src('src/components/generator/CustomPalettePanel.tsx')
  ));

console.log('\n=== The menu can always be dismissed ===');
check('Escape closes it', /e\.key === 'Escape'/.test(menu));
check('Escape returns focus to the swatch it came from', /anchor\.focus\(\)/.test(menu));
check('a press outside dismisses it', /document\.addEventListener\('mousedown', onPointerDown\)/.test(menu));
check('a press on the anchor does not dismiss it', /anchor\.contains\(e\.target as Node\)/.test(menu));
// Scroll re-anchors instead of dismissing: a menu pinned to the click coordinate
// detaches from its swatch the moment the page moves, and the page moves here.
check('scroll re-measures the anchor rather than dismissing', /document\.addEventListener\('scroll', onScroll, true\)/.test(menu));
check('and dismisses only once the swatch has left the viewport', /if \(gone\) onClose\(\)/.test(menu));

/* ═══════════════ 3. The slot the menu names is the slot the store writes ═══════════════ */

console.log('\n=== A scale step is written to the step that was clicked ===');
setRoleShade('primary', 50, createOklchColor(0.97, 0.029, 158.4), { silent: true });
check('step 50 did not drift to a matching-lightness step',
  Boolean(cartStore.get().roles['primary'].shades[50]) &&
    !cartStore.get().roles['primary'].shades[100] &&
    !cartStore.get().roles['primary'].shades[950]);

console.log('\n=== A harmony swatch is slotted exactly as its label claims ===');
const HARMONY = createOklchColor(0.544, 0.116, 158.4);
const predicted = getNearestShadeStep(HARMONY.l);
addColorToCart(HARMONY, 'primary');
const written = Object.entries(cartStore.get().roles['primary'].shades)
  .filter(([, token]) => token.color.h === HARMONY.h && token.color.c === HARMONY.c)
  .map(([step]) => Number(step));
// The menu labels this colour `--color-<slug>-<predicted>` using the same call,
// so if the store ever disagreed with `getNearestShadeStep` the menu would
// promise a variable it does not write.
check('the colour landed in the slot the menu names',
  written.includes(predicted),
  'menu would say ' + predicted + ', store wrote ' + written.join(','));
check('the base lightness of a harmony is not near the ends of the scale',
  predicted === 500, 'got ' + predicted);

console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'));
process.exit(failures === 0 ? 0 : 1);