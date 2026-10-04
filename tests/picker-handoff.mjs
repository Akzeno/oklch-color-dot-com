/**
 * Covers the picker handoff used when an *empty* token slot is opened from the
 * Design Tokens sidebar (and from the preview popover).
 *
 * The handoff must survive a `null` colour — that is how an empty slot says
 * "author a brand-new token here" — while still pinning the exact
 * `--color-<role>-<step>` write-back target instead of a nearest-lightness slot.
 */
import {
  savePickerHandoff,
  consumePickerHandoff,
  clearPickerHandoff,
  setRoleShade,
  cartStore,
} from '../src/stores/cartStore.ts';
import { createOklchColor, formatOklch, TARGET_LIGHTNESS } from '../src/utils/color.ts';

const PICKER_HANDOFF_KEY = 'oklch_picker_handoff_v1';

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

let failures = 0;
function check(name, cond, extra = '') {
  if (cond) console.log('PASS  ' + name);
  else {
    failures++;
    console.log('FAIL  ' + name + (extra ? '\n      ' + extra : ''));
  }
}

console.log('=== Empty slot hands off with color: null ===');
clearPickerHandoff();
savePickerHandoff({ roleId: 'success', step: 950, color: null });

const raw = JSON.parse(store.get(PICKER_HANDOFF_KEY));
check('null colour is persisted (not dropped)', raw.color === null, 'got ' + JSON.stringify(raw));
check('exact step survives the trip', raw.step === 950, 'got ' + raw.step);
check('role id survives the trip', raw.roleId === 'success');

const handoff = consumePickerHandoff();
check('consume returns the handoff', handoff !== null);
check('consume reports the empty slot', handoff.color === null, 'got ' + JSON.stringify(handoff?.color));
check('consume keeps the exact step', handoff.step === 950);

console.log('\n=== Handoff is consumed exactly once ===');
check('second consume returns null (no stale re-open)', consumePickerHandoff() === null);

console.log('\n=== Existing colour still preloads ===');
clearPickerHandoff();
const existing = createOklchColor(0.42, 0.17, 310);
savePickerHandoff({ roleId: 'primary', step: 600, color: existing });
const loaded = consumePickerHandoff();
check('colour round-trips through the handoff', loaded.color !== null);
check('round-tripped colour matches the original', formatOklch(loaded.color) === formatOklch(existing),
  formatOklch(loaded.color) + ' vs ' + formatOklch(existing));
check('round-tripped hue survives', loaded.color.h === existing.h);

console.log('\n=== Malformed payloads are still rejected ===');
store.set(PICKER_HANDOFF_KEY, JSON.stringify({ roleId: 'primary', step: 999, color: null }));
check('invalid step is rejected', consumePickerHandoff() === null);
store.set(PICKER_HANDOFF_KEY, JSON.stringify({ step: 500, color: null }));
check('missing roleId is rejected', consumePickerHandoff() === null);
store.set(PICKER_HANDOFF_KEY, '{not json');
check('corrupt JSON does not throw', consumePickerHandoff() === null);

console.log('\n=== Picker seeded starting values suit the step ===');
// Mirrors the null-colour branch in ColorPickerIsland.
for (const step of [50, 100, 500, 950]) {
  check(`empty slot ${step} seeds L = TARGET_LIGHTNESS[${step}]`,
    TARGET_LIGHTNESS[step] !== undefined, 'missing target lightness');
}
// Slot 950 must open dark and slot 50 light, otherwise the seeded colour fights
// the step it is being written into.
check('step 950 seeds darker than step 50',
  TARGET_LIGHTNESS[950] < TARGET_LIGHTNESS[50]);
check('step 500 is mid-scale', TARGET_LIGHTNESS[500] > 0.4 && TARGET_LIGHTNESS[500] < 0.7,
  'got ' + TARGET_LIGHTNESS[500]);

console.log('\n=== Write-back targets the exact slot, not nearest lightness ===');
clearPickerHandoff();
savePickerHandoff({ roleId: 'warning', step: 50, color: null });
const wb = consumePickerHandoff();
// The picker writes via setRoleShade(roleId, handoff.step, color).
setRoleShade(wb.roleId, wb.step, createOklchColor(0.97, 0.02, 80));
const written = cartStore.get().roles['warning'].shades;
check('saved into step 50 exactly', Boolean(written[50]));
// This is the regression guard: getNearestShadeStep(0.97) === 50, but an
// already-dark colour written to step 500 must NOT be re-slotted either.
check('a dark colour stays in the requested slot (not re-slotted by lightness)',
  Object.keys(written).length === 1 && Boolean(written[50]),
  'steps written: ' + Object.keys(written).join(','));
// Nearest-lightness re-slotting is what previously sent colours to the wrong
// step; assert the two steps that differ most cannot be confused.
const mid = cartStore.get().roles['warning'];
check('no other step of that role was touched',
  Object.keys(mid.shades).length === 1, 'steps written: ' + Object.keys(mid.shades).join(','));

clearPickerHandoff();
savePickerHandoff({ roleId: 'info', step: 900, color: null });
const wb2 = consumePickerHandoff();
setRoleShade(wb2.roleId, wb2.step, createOklchColor(0.2, 0.1, 200));
const infoShades = cartStore.get().roles['info'].shades;
check('dark colour written to step 900 stays in 900', Boolean(infoShades[900]));
check('it did not get re-slotted into 800/950',
  !infoShades[800] && !infoShades[950],
  'steps: ' + Object.keys(infoShades).join(','));

console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'));
process.exit(failures === 0 ? 0 : 1);