/**
 * Covers the "Add color" button shown when a role has no shades at all.
 *
 * WHY IT EXISTS
 *
 * An empty role used to be a dead end. The swatch grid is not rendered when a
 * role has no shades, and the "Full 50-950" / "Delete scale" row is gated
 * behind `hasAnyShades(role)` — so the old "click empty slot or generate scale"
 * hint pointed at two controls that were both absent from the screen. The
 * button is the one guaranteed way forward, and it routes through the same
 * `openPicker` handoff as a swatch click: author a NEW token, then return.
 *
 * WHY IT TARGETS THE BASE STEP
 *
 * Three places independently need to agree on which slot a palette is anchored
 * on: this button, the generator that derives 50-950, and the picker that
 * inherits hue/chroma for a new token. They each hardcoded 500, so the
 * agreement was coincidental; `BASE_SHADE_STEP` makes it explicit. The checks
 * below assert the agreement holds *behaviourally* — add a color, generate the
 * scale, and the scale must be derived from the colour just added.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  savePickerHandoff,
  consumePickerHandoff,
  clearPickerHandoff,
  setRoleShade,
  generateFullScaleForRole,
  cartStore,
} from '../src/stores/cartStore.ts';
import {
  createOklchColor,
  formatOklch,
  TARGET_LIGHTNESS,
  SHADE_STEPS,
  BASE_SHADE_STEP,
} from '../src/utils/color.ts';

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

const sidebar = readFileSync(
  join(process.cwd(), 'src/components/preview/CartSidebar.tsx'), 'utf8'
);

console.log('=== The empty role really is unreachable otherwise ===');
// If `hasAnyShades` ever stops gating the generate button, the "Add color"
// button becomes redundant and this suite should be revisited — but until then
// it is the only affordance on screen for an empty role.
check('the generate/delete row is gated behind hasAnyShades',
  /\{hasAnyShades\(role\) && \(/.test(sidebar));
check('the generate row lives inside that gate',
  sidebar.indexOf('generateFullScaleForRole(role.id)') >
  sidebar.indexOf('{hasAnyShades(role) && ('));

console.log('\n=== The stale hint no longer advertises absent controls ===');
check('"Click empty slot or generate scale" is gone',
  !sidebar.includes('Click empty slot or generate scale'));
check('the empty state offers an "Add color" button',
  /<span>\{t\(locale, 'ui\.preview\.sidebar\.addColor', 'Add color'\)\}<\/span>/.test(sidebar));

console.log('\n=== The button targets the base step with a null colour ===');
check('it calls openPicker(role.id, BASE_SHADE_STEP, null)',
  /openPicker\(role\.id,\s*BASE_SHADE_STEP,\s*null\)/.test(sidebar),
  'expected openPicker(role.id, BASE_SHADE_STEP, null)');
check('CartSidebar imports BASE_SHADE_STEP',
  /import\s*\{[^}]*BASE_SHADE_STEP[^}]*\}\s*from\s*'\.\.\/\.\.\/utils\/color'/.test(sidebar));

console.log('\n=== BASE_SHADE_STEP is a real, sane shade ===');
check('BASE_SHADE_STEP is 500', BASE_SHADE_STEP === 500, 'got ' + BASE_SHADE_STEP);
check('it is a member of SHADE_STEPS', SHADE_STEPS.includes(BASE_SHADE_STEP));
check('a seeded colour at that step is mid-scale, not black or white',
  TARGET_LIGHTNESS[BASE_SHADE_STEP] > 0.4 &&
  TARGET_LIGHTNESS[BASE_SHADE_STEP] < 0.7,
  'got L=' + TARGET_LIGHTNESS[BASE_SHADE_STEP]);

console.log('\n=== Add color → picker → back, on a genuinely empty role ===');
const ROLE = 'danger';
const before = cartStore.get().roles[ROLE].shades;
check(`"${ROLE}" starts with no shades`, Object.keys(before).length === 0,
  'steps: ' + Object.keys(before).join(','));

// 1. /ui-preview — user clicks "Add color" on the empty role.
clearPickerHandoff();
savePickerHandoff({
  roleId: ROLE,
  step: BASE_SHADE_STEP,
  color: null,
  returnTo: '/ui-preview',
});

// 2. / — the picker consumes it and seeds a new colour for that step.
const opened = consumePickerHandoff();
check('picker opened on the base slot of the empty role',
  opened.roleId === ROLE && opened.step === BASE_SHADE_STEP,
  'got ' + opened.roleId + '-' + opened.step);
check('it is reported as an empty slot, not an edit',
  opened.color === null, 'got ' + JSON.stringify(opened.color));
check('the picker is told to come back here', opened.returnTo === '/ui-preview');

// Mirrors the null-colour branch in ColorPickerIsland. The role is empty, so
// there is no base to inherit from and the fallback applies.
const role = cartStore.get().roles[ROLE];
const inherited = role?.shades[BASE_SHADE_STEP]?.color;
const seeded = createOklchColor(
  TARGET_LIGHTNESS[opened.step],
  inherited ? inherited.c : 0.12,
  inherited ? inherited.h : 255,
  inherited ? inherited.alpha : 1
);
check('with nothing to inherit, the fallback is a mid-lightness, in-gamut colour',
  seeded.l === TARGET_LIGHTNESS[BASE_SHADE_STEP] && seeded.c === 0.12 && seeded.h === 255,
  'got ' + formatOklch(seeded));
check('the seeded colour is actually displayable', seeded.inSRGB, formatOklch(seeded));

// 3. User drags the hue and saves.
const edited = createOklchColor(0.55, 0.17, 28);
const destination = opened.returnTo;      // read BEFORE clearing
setRoleShade(opened.roleId, opened.step, edited);
clearPickerHandoff();

const after = cartStore.get().roles[ROLE].shades;
check('the role is no longer empty', Object.keys(after).length === 1,
  'steps: ' + Object.keys(after).join(','));
check('the colour landed in the base slot',
  after[BASE_SHADE_STEP] &&
  formatOklch(after[BASE_SHADE_STEP].color) === formatOklch(edited),
  'got ' + (after[BASE_SHADE_STEP] ? formatOklch(after[BASE_SHADE_STEP].color) : 'unset'));
check('the picker returns to the originating page', destination === '/ui-preview');
check('the handoff was consumed, so the picker will not re-open it',
  consumePickerHandoff() === null);

console.log('\n=== "Full 50-950" then derives from the colour just added ===');
// The agreement BASE_SHADE_STEP exists to guarantee: if the button and the
// generator disagreed on the anchor slot, the generated scale would silently be
// derived from some other shade (or from a hardcoded default).
generateFullScaleForRole(ROLE);
const scale = cartStore.get().roles[ROLE].shades;
check('every shade step is now populated',
  SHADE_STEPS.every((s) => Boolean(scale[s])),
  'missing: ' + SHADE_STEPS.filter((s) => !scale[s]).join(','));
check('the generated base is the colour the user just added',
  formatOklch(scale[BASE_SHADE_STEP].color) === formatOklch(edited),
  'generated ' + formatOklch(scale[BASE_SHADE_STEP].color) +
  ' vs added ' + formatOklch(edited));
// A generator that ignored the anchor would fall back to its own default, or
// pick whichever shade happened to be first in insertion order.
check('it did not fall back to the hardcoded default colour',
  formatOklch(scale[BASE_SHADE_STEP].color) !== formatOklch(createOklchColor(0.62, 0.19, 255)),
  'got ' + formatOklch(scale[BASE_SHADE_STEP].color));

console.log('\n=== The anchor wins over "first available shade" ===');
/*
 * The check above cannot tell the two apart: with only one shade in the role,
 * anchoring at BASE_SHADE_STEP and falling back to the first-inserted shade both
 * resolve to that same slot. To make the anchor observable, the role needs a
 * decoy shade that was inserted FIRST and is not the base step — so the two
 * ladders disagree and the generated scale exposes which one was used.
 */
const DECOY_ROLE = 'info';
check(`"${DECOY_ROLE}" is untouched and empty`,
  Object.keys(cartStore.get().roles[DECOY_ROLE].shades).length === 0,
  'steps: ' + Object.keys(cartStore.get().roles[DECOY_ROLE].shades).join(','));

const decoy = createOklchColor(0.76, 0.15, 145);      // greenish, inserted first
const real = createOklchColor(0.54, 0.19, 28);        // the base step's colour
setRoleShade(DECOY_ROLE, 300, decoy, { silent: true });
setRoleShade(DECOY_ROLE, BASE_SHADE_STEP, real, { silent: true });
check('the decoy really is first in insertion order',
  Object.keys(cartStore.get().roles[DECOY_ROLE].shades)[0] === '300',
  'order: ' + Object.keys(cartStore.get().roles[DECOY_ROLE].shades).join(','));

generateFullScaleForRole(DECOY_ROLE);
const anchored = cartStore.get().roles[DECOY_ROLE].shades;
check('the scale is derived from the base step, not the first shade',
  formatOklch(anchored[BASE_SHADE_STEP].color) === formatOklch(real),
  'generated ' + formatOklch(anchored[BASE_SHADE_STEP].color) +
  ' (decoy was ' + formatOklch(decoy) + ')');
check('it is definitively not the decoy colour',
  formatOklch(anchored[BASE_SHADE_STEP].color) !== formatOklch(decoy));

console.log('\n=== A later new token inherits from that same slot ===');
// Mirrors ColorPickerIsland: chroma/hue/alpha come from the role's base step so
// hand-authored shades stay on-hue, while lightness comes from the target step.
// Use the anchored role above, where the base slot is now non-trivially set.
const anchor = cartStore.get().roles[DECOY_ROLE].shades[BASE_SHADE_STEP].color;
for (const step of [100, 900]) {
  const l = TARGET_LIGHTNESS[step];
  check(`step ${step} inherits the anchor's hue`, anchor.h === real.h,
    'anchor hue ' + anchor.h);
  check(`step ${step} inherits the anchor's chroma`, anchor.c === real.c,
    'anchor chroma ' + anchor.c);
  check(`step ${step} takes its own lightness`,
    l !== TARGET_LIGHTNESS[BASE_SHADE_STEP],
    'both are ' + l);
  // Saving it must not disturb the anchor, or every new shade would rewrite
  // the base the generator reads.
  setRoleShade(DECOY_ROLE, step, createOklchColor(l, anchor.c, anchor.h), { silent: true });
}
const grown = cartStore.get().roles[DECOY_ROLE].shades;
check('the anchor survived the extra writes',
  formatOklch(grown[BASE_SHADE_STEP].color) === formatOklch(real),
  'got ' + formatOklch(grown[BASE_SHADE_STEP].color));

console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'));
process.exit(failures === 0 ? 0 : 1);
