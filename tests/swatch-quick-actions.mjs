/**
 * Covers the sidebar swatch's two one-click affordances:
 *
 *  1. Clicking a filled swatch reopens the color picker on that exact slot.
 *  2. Right-click (and the hover trash button) removes the shade, recoverably.
 *
 * Removal is deliberately undoable rather than confirmed: a confirm dialog
 * would make every removal two clicks, and the swatch is a small target, so
 * the fast path has to be safe. These checks pin that safety net — if Undo ever
 * loses the token, this fails.
 */
import {
  removeShadeWithUndo,
  removeShadeFromRole,
  setRoleShade,
  toastStore,
  cartStore,
  savePickerHandoff,
  consumePickerHandoff,
} from '../src/stores/cartStore.ts';
import { createOklchColor, formatOklch } from '../src/utils/color.ts';

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

// Record the dismiss delay each toast asks for, so we can prove the actionable
// one stays on screen long enough to actually be clicked.
const delays = [];
const realTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, ms) => {
  delays.push(ms);
  return realTimeout(fn, 0); // never actually wait
};

let failures = 0;
function check(name, cond, extra = '') {
  if (cond) console.log('PASS  ' + name);
  else {
    failures++;
    console.log('FAIL  ' + name + (extra ? '\n      ' + extra : ''));
  }
}

const TRUTHY_500 = createOklchColor(0.55, 0.18, 152);
setRoleShade('trusty-button', 500, TRUTHY_500, { silent: true });
setRoleShade('trusty-button', 300, createOklchColor(0.78, 0.14, 152), { silent: true });

console.log('=== Quick remove detaches the shade ===');
delays.length = 0;
const removed = removeShadeWithUndo('trusty-button', 500);
check('remove reports success', removed === true);
check('step 500 is gone', !cartStore.get().roles['trusty-button'].shades[500]);
check('step 500 was NOT re-slotted to a neighbour',
  !cartStore.get().roles['trusty-button'].shades[400] &&
  !cartStore.get().roles['trusty-button'].shades[600],
  'steps: ' + Object.keys(cartStore.get().roles['trusty-button'].shades).join(','));
check('the other step of the same role is untouched',
  Boolean(cartStore.get().roles['trusty-button'].shades[300]));
check('other roles are untouched', Boolean(cartStore.get().roles['primary']));

console.log('\n=== Removal always offers Undo ===');
const toast = toastStore.get();
check('a toast was raised', toast !== null);
check('it names the exact variable it removed',
  toast.message.includes('--color-trusty-button-500'), 'got: ' + toast.message);
check('it carries an Undo action', Boolean(toast.action));
check('the action is labelled Undo', toast.action?.label === 'Undo');
// 2200ms is the plain-toast life; an actionable toast needs longer to be usable.
check('an actionable toast outlives a plain one',
  delays.length > 0 && delays[delays.length - 1] > 2200,
  'delay was ' + delays[delays.length - 1]);

console.log('\n=== Undo restores the exact token ===');
toast.action.run();
const restored = cartStore.get().roles['trusty-button'].shades;
check('step 500 is back', Boolean(restored[500]));
check('the colour is byte-identical to the original',
  formatOklch(restored[500].color) === formatOklch(TRUTHY_500),
  formatOklch(restored[500]?.color) + ' vs ' + formatOklch(TRUTHY_500));
check('hue survived the round trip', restored[500].color.h === TRUTHY_500.h);
check('chroma survived the round trip', restored[500].color.c === TRUTHY_500.c);
check('alpha survived the round trip', restored[500].color.alpha === TRUTHY_500.alpha);
check('undo did not resurrect anything else',
  Object.keys(restored).length === 2, 'steps: ' + Object.keys(restored).join(','));
check('undo confirms itself with a fresh toast',
  toastStore.get()?.message.includes('Restored --color-trusty-button-500'),
  'got: ' + toastStore.get()?.message);

console.log('\n=== Undo does not re-slott by lightness ===');
// A lightness-based restore would silently relocate the token, so park this one
// at a lightness that genuinely belongs to a DIFFERENT step: l=0.25 is nearer
// TARGET_LIGHTNESS[800] (0.28) than TARGET_LIGHTNESS[900] (0.20). Restoring by
// lightness would therefore drop it in 800 and the slot would stay empty.
setRoleShade('info', 900, createOklchColor(0.25, 0.06, 30), { silent: true });
removeShadeWithUndo('info', 900);
toastStore.get().action.run();
const infoShades = cartStore.get().roles['info'].shades;
check('restored into 900, not into a matching-lightness step',
  Boolean(infoShades[900]) && !infoShades[800] && Object.keys(infoShades).length === 1,
  'steps: ' + Object.keys(infoShades).join(','));

console.log('\n=== Removing something absent is a no-op ===');
toastStore.set(null);
const before = JSON.stringify(cartStore.get().roles);
const noop = removeShadeWithUndo('trusty-button', 950); // never filled
check('reports failure instead of pretending', noop === false);
check('store is untouched', JSON.stringify(cartStore.get().roles) === before);
check('no Undo toast is raised for a no-op', toastStore.get() === null);
check('unknown role is a no-op too', removeShadeWithUndo('no-such-role', 500) === false);

console.log('\n=== silent option suppresses the toast ===');
removeShadeFromRole('trusty-button', 300);
removeShadeWithUndo('trusty-button', 500, { silent: true });
check('nothing was raised', toastStore.get() === null);
check('but the shade was still removed',
  !cartStore.get().roles['trusty-button'].shades[500]);

console.log('\n=== Clicking a swatch hands off its own slot + colour ===');
// Mirrors the swatch's onClick: it must preload the CURRENT colour of THAT slot
// so the picker reopens on the token being edited, not on the role's 500.
setRoleShade('warning', 700, createOklchColor(0.44, 0.15, 65), { silent: true });
savePickerHandoff({ roleId: 'warning', step: 700, color: cartStore.get().roles['warning'].shades[700].color, returnTo: null });
const wb = consumePickerHandoff();
check('handoff targets the clicked step', wb.step === 700, 'got ' + wb.step);
check('handoff preloads the clicked slot colour, not the 500',
  wb.color !== null && wb.color.c === 0.15 && wb.color.h === 65,
  'got ' + (wb.color ? formatOklch(wb.color) : 'null'));

console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'));
process.exit(failures === 0 ? 0 : 1);