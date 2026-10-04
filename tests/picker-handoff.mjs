/**
 * Covers the picker handoff used when an *empty* token slot is opened from the
 * Design Tokens sidebar (and from the preview popover).
 *
 * The handoff must survive a `null` colour — that is how an empty slot says
 * "author a brand-new token here" — while still pinning the exact
 * `--color-<role>-<step>` write-back target instead of a nearest-lightness slot.
 *
 * It also carries `returnTo`, the page the picker sends the user back to once
 * they save, so preview → pick → preview reads as one task.
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
savePickerHandoff({ roleId: 'success', step: 950, color: null, returnTo: null });

const raw = JSON.parse(store.get(PICKER_HANDOFF_KEY));
check('null colour is persisted (not dropped)', raw.color === null, 'got ' + JSON.stringify(raw));
check('exact step survives the trip', raw.step === 950, 'got ' + raw.step);
check('role id survives the trip', raw.roleId === 'success');

const handoff = consumePickerHandoff();
/** Stands in for the picker's local `setHandoff(null)`. */
const setHandoffNull = () => {};
check('consume returns the handoff', handoff !== null);
check('consume reports the empty slot', handoff.color === null, 'got ' + JSON.stringify(handoff?.color));
check('consume keeps the exact step', handoff.step === 950);

console.log('\n=== Handoff is consumed exactly once ===');
check('second consume returns null (no stale re-open)', consumePickerHandoff() === null);

console.log('\n=== Existing colour still preloads ===');
clearPickerHandoff();
const existing = createOklchColor(0.42, 0.17, 310);
savePickerHandoff({ roleId: 'primary', step: 600, color: existing, returnTo: null });
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
savePickerHandoff({ roleId: 'warning', step: 50, color: null, returnTo: null });
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
savePickerHandoff({ roleId: 'info', step: 900, color: null, returnTo: null });
const wb2 = consumePickerHandoff();
setRoleShade(wb2.roleId, wb2.step, createOklchColor(0.2, 0.1, 200));
const infoShades = cartStore.get().roles['info'].shades;
check('dark colour written to step 900 stays in 900', Boolean(infoShades[900]));
check('it did not get re-slotted into 800/950',
  !infoShades[800] && !infoShades[950],
  'steps: ' + Object.keys(infoShades).join(','));

console.log('\n=== returnTo survives the round trip ===');
clearPickerHandoff();
savePickerHandoff({ roleId: 'primary', step: 500, color: null, returnTo: '/ui-preview' });
check('a real return path is preserved',
  consumePickerHandoff().returnTo === '/ui-preview',
  'got ' + consumePickerHandoff()?.returnTo);

clearPickerHandoff();
savePickerHandoff({ roleId: 'primary', step: 500, color: null, returnTo: '/ui-preview?panel=tokens#shades' });
check('query + hash are preserved',
  consumePickerHandoff().returnTo === '/ui-preview?panel=tokens#shades');

clearPickerHandoff();
savePickerHandoff({ roleId: 'primary', step: 500, color: null, returnTo: null });
check('null returnTo stays null (picker opened directly)',
  consumePickerHandoff().returnTo === null);
check('an absent returnTo degrades to null, not undefined',
  (() => {
    clearPickerHandoff();
    savePickerHandoff({ roleId: 'primary', step: 500, color: null });
    return consumePickerHandoff().returnTo === null;
  })());

console.log('\n=== returnTo cannot be used to bounce the user off-site ===');
// `returnTo` comes back out of sessionStorage and is handed straight to the
// router as a navigation target, so it is untrusted input. A plain
// `startsWith('/')` guard would accept every one of these.
const HOSTILE = [
  '//evil.example/steal',
  '///evil.example',
  '\\\\evil.example',
  '/\\evil.example',
  '/\\/evil.example',
  'https://evil.example',
  'http://evil.example',
  'javascript:alert(1)',
  'JaVaScRiPt:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'vbscript:msgbox(1)',
  'ui-preview',           // relative — would resolve against the current path
  '',
  '   /ui-preview',
];
for (const bad of HOSTILE) {
  clearPickerHandoff();
  savePickerHandoff({ roleId: 'primary', step: 500, color: null, returnTo: bad });
  const got = consumePickerHandoff().returnTo;
  check(`rejected: ${JSON.stringify(bad)}`, got === null, 'got ' + JSON.stringify(got));
}

console.log('\n=== returnTo does not break the rest of the payload ===');
// The guard must reject only the path, never the role/step target — losing the
// exact-slot write-back would be a worse bug than a leaked navigation.
clearPickerHandoff();
store.set(PICKER_HANDOFF_KEY, JSON.stringify({
  roleId: 'danger', step: 700, color: null, returnTo: '//evil.example',
}));
const partial = consumePickerHandoff();
check('hostile returnTo dropped, handoff still usable',
  partial !== null && partial.returnTo === null, 'got ' + JSON.stringify(partial?.returnTo));
check('the exact slot survives a rejected returnTo',
  partial.roleId === 'danger' && partial.step === 700,
  'got ' + partial.roleId + '-' + partial.step);
check('the colour is still reported as empty', partial.color === null);

console.log('\n=== Full round trip: preview → picker → back to preview ===');
// Mirrors the two islands. The ordering matters and is easy to get wrong: the
// picker must read `returnTo` off the handoff *before* clearing it, because
// `clearPickerHandoff()` is what stops the banner re-opening on the next mount.
setRoleShade('success', 600, createOklchColor(0.5, 0.14, 145), { silent: true });

// 1. /ui-preview — user clicks the step-600 swatch.
const clicked = cartStore.get().roles['success'].shades[600].color;
savePickerHandoff({ roleId: 'success', step: 600, color: clicked, returnTo: '/ui-preview' });

// 2. / — the picker island consumes it on mount.
const opened = consumePickerHandoff();
check('picker opened on the clicked slot', opened.roleId === 'success' && opened.step === 600);
check('picker preloaded the clicked colour',
  formatOklch(opened.color) === formatOklch(clicked), formatOklch(opened.color));

// 3. User nudges the sliders and saves. This is `handleAddToCart` verbatim.
const edited = createOklchColor(0.47, 0.16, 148);
const destination = opened.returnTo;            // read BEFORE clearing
setRoleShade(opened.roleId, opened.step, edited);
setHandoffNull();
clearPickerHandoff();

// 4. Back on /ui-preview the slot shows the new colour, in that exact slot.
const back = cartStore.get().roles['success'].shades;
check('picker returns to the originating page', destination === '/ui-preview',
  'got ' + destination);
check('the edit landed in step 600',
  back[600] && formatOklch(back[600].color) === formatOklch(edited),
  'got ' + (back[600] ? formatOklch(back[600].color) : 'unset'));
check('no neighbouring step was touched', !back[500] && !back[700],
  'steps: ' + Object.keys(back).join(','));
check('the handoff was consumed, so the picker will not re-open it',
  consumePickerHandoff() === null);

console.log('\n=== Opening the picker directly still works (no forced redirect) ===');
check('no handoff means no redirect', consumePickerHandoff() === null);

console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'));
process.exit(failures === 0 ? 0 : 1);