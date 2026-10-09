/**
 * Covers the editing affordances on the Design Tokens *drawer* — the modal
 * counterpart to the sidebar panel on `/ui-preview`.
 *
 * WHY THIS EXISTS
 *
 * The drawer was read-only. It listed the filled shades of a role with a copy
 * and a delete button, and its empty branch was the sentence "No shades yet —
 * generate the full scale, or add colors in the picker". That sentence pointed
 * at a page the drawer could not reach, so a role with no colours was a dead end
 * with no button on screen, and a role with colours could not be recoloured
 * without leaving the drawer and hand-picking the slot again on the way back.
 *
 * The drawer now edits, adds, and removes exactly as the sidebar does — same
 * store, same hooks, same undo contract. These checks pin the three behaviours
 * the user can now rely on:
 *
 *  1. Any of the 11 steps is reachable, filled or not, and routes to the picker
 *     on that EXACT slot.
 *  2. Removing a shade is undoable, because it is now a small target in a grid
 *     of 11 rather than one row of a short list.
 *  3. Coming back from the picker reopens the drawer — and, critically, the drawer
 *     never opens itself while the user is on the picker page choosing a colour,
 *     where it would cover the sliders. That case cannot be fixed by comparing
 *     paths: the picker lives at `/` and `/` opens this drawer, so the two are the
 *     same page. It works because the *picker* parks the reopen flag on the way
 *     back, and so nothing exists to claim until a session has finished.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  savePickerHandoff,
  consumePickerHandoff,
  clearPickerHandoff,
  saveCartReopen,
  consumeCartReopen,
  removeShadeWithUndo,
  setRoleShade,
  cartStore,
  isCartOpenStore,
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

// Record the dismiss delay each toast asks for, so the Undo window can be shown
// to outlive a plain one.
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

const src = (p) => readFileSync(join(process.cwd(), p), 'utf8');
const drawer = src('src/components/cart/CartDrawerIsland.tsx');
const sidebar = src('src/components/preview/CartSidebar.tsx');
const hook = src('src/hooks/useShadeEditor.ts');
// Field ids and label association are a whole-site concern, pinned once in
// 'form-field-labels.mjs' rather than repeated here.
const picker = src('src/components/picker/ColorPickerIsland.tsx');

console.log('\n=== An empty role is no longer a dead end ===');
// The dead end was structural: the grid only rendered when `filledShadesCount`
// was positive, so an empty role had no slot to click and no button to press.
check('the dead-end sentence is gone',
  !drawer.includes('No shades yet'));
check('every shade step is rendered, not just the filled ones',
  /SHADE_STEPS\.map\(\(step\) =>/.test(drawer));
check('empty slots are still rendered through the grid',
  /if \(!token\) \{/.test(drawer),
  'expected the empty-slot branch inside the same map');
check('an empty slot is a button that opens the picker',
  /onClick=\{\(\) => openPicker\(activeRole\.id, step, null\)\}/.test(drawer));
check('and it says what it will author',
  /t\(locale, 'ui\.cart\.authorSlotTitle'[\s\S]{0,120}?--color-\$\{activeRole\.id\}-\$\{step\}/.test(drawer));

console.log('\n=== There is also one guaranteed way forward ===');
// The dashed cells are compact; a role with no colours should not have to spot
// one of them. Mirrors the sidebar's empty-role button, on the same base step so
// "Add color" then "Generate scale" derives from the colour just added.
check('the empty role still gets an explicit Add color button',
  /filledShadesCount === 0 && \(\s*<button/.test(drawer));
check('it targets the base step with a null colour',
  /openPicker\(activeRole\.id, BASE_SHADE_STEP, null\)/.test(drawer),
  'expected openPicker(activeRole.id, BASE_SHADE_STEP, null)');
check('BASE_SHADE_STEP is imported by the drawer',
  /import\s*\{[^}]*BASE_SHADE_STEP[^}]*\}\s*from\s*'\.\.\/\.\.\/utils\/color'/.test(drawer));

console.log('\n=== A filled shade can be re-picked without re-finding its slot ===');
check('clicking the swatch opens the picker on that slot',
  /onClick=\{\(\) => openPicker\(activeRole\.id, step, token\.color\)\}/.test(drawer));
check('preloaded with the slot\'s own colour, not the role base',
  (drawer.match(/openPicker\(activeRole\.id, step, token\.color\)/g) || []).length >= 2,
  'the swatch and the paintbrush button must both target the slot');
check('the picker handoff is used, not a bare navigation',
  /savePickerHandoff\(\{ roleId, step, color, returnTo, reopenCart: true \}\)/.test(drawer));
check('the inline editor writes through the store, not a local copy',
  /editor\.changeValue\(activeRole\.id, step/.test(drawer) &&
  /editor\.changeAxis\(activeRole\.id, step/.test(drawer));

console.log('\n=== The drawer and the sidebar cannot drift ===');
// Two copies of the editing logic would drift, and the copy that drifted would
// be the one nobody tested. One hook, consumed by both surfaces.
check('both surfaces use the shared editor hook',
  /useShadeEditor\(\)/.test(drawer) && /useShadeEditor\(\)/.test(sidebar));
check('neither keeps its own axis handler',
  !/function handleLCHChange/.test(drawer) && !/function handleLCHChange/.test(sidebar));
check('neither keeps its own parse-and-write handler',
  !/parseAnyToOklch/.test(drawer) && !/parseAnyToOklch/.test(sidebar));
check('the hook is where the store write lives',
  /setRoleShade\(roleId, step, parsed, \{ silent: true \}\)/.test(hook));

console.log('\n=== Escape closes the editor before the drawer ===');
// Both react to Escape. Without ordering, one press would end the edit AND close
// the modal around it, which is two actions from one key.
check('the hook captures Escape and stops it there',
  /addEventListener\('keydown', onKeyDown, true\)/.test(hook) &&
  /e\.stopPropagation\(\)/.test(hook));
check('the drawer listens in the bubble phase, so it never sees that press',
  /window\.addEventListener\('keydown', handleKeyDown\);/.test(drawer) &&
  !/addEventListener\('keydown', handleKeyDown, true\)/.test(drawer));
// The old per-field onBlur could not answer "did the user leave the editor",
// only "did this one field lose focus" — so focusing an L/C/H input blurred the
// text field, which unmounted the inputs the user had just clicked.
check('closing is driven by a press outside the editor, not a field blur',
  /onMouseDown/.test(hook) && !/onBlur=/.test(drawer) && !/onBlur=/.test(sidebar));

console.log('\n=== Clicking a filled swatch hands off its own slot + colour ===');
const ROLE = 'info';
const TRUTHY_700 = createOklchColor(0.44, 0.15, 65);
setRoleShade(ROLE, 700, TRUTHY_700, { silent: true });

clearPickerHandoff();
savePickerHandoff({
  roleId: ROLE,
  step: 700,
  color: cartStore.get().roles[ROLE].shades[700].color,
  returnTo: '/export',
});
const opened = consumePickerHandoff();
check('handoff targets the clicked step', opened.step === 700, 'got ' + opened.step);
check('handoff preloads that slot\'s colour',
  opened.color !== null && formatOklch(opened.color) === formatOklch(TRUTHY_700),
  'got ' + (opened.color ? formatOklch(opened.color) : 'null'));
check('it is a token write, not a free colour', opened.mode === 'token');
check('it returns to the page the drawer was opened on', opened.returnTo === '/export');

console.log('\n=== Removal is undoable from the drawer too ===');
// It is now one of eleven small cells rather than a row in a short list, so the
// fast path has to be safe. The store contract is shared, so this is really a
// check that the drawer did not reach for the confirm-less `removeShadeFromRole`.
check('the drawer removes with undo, not silently',
  /removeShadeWithUndo\(activeRole\.id, step\)/.test(drawer));
check('and does not call the non-undoable remover',
  !/removeShadeFromRole/.test(drawer));
check('the swatch is a right-click target too',
  /onContextMenu/.test(drawer));

delays.length = 0;
const removed = removeShadeWithUndo(ROLE, 700);
check('remove reports success', removed === true);
check('step 700 is gone', !cartStore.get().roles[ROLE].shades[700]);
check('an actionable toast outlives a plain one',
  delays.length > 0 && delays[delays.length - 1] > 2200,
  'delay was ' + delays[delays.length - 1]);

console.log('\n=== The drawer shuts itself before handing off to the picker ===');
// `isCartOpenStore` is a module singleton, so it survives the client-side
// navigation to `/` — and `/` mounts this same drawer in its layout. Left open, it
// followed the user there: drawn shut for one frame (the hydration pin renders the
// server's value first), then springing open over the picker. That is the whole of
// the "it closes itself and reopens itself, picker stuck behind it" report.
check('openPicker closes the drawer', /const openPicker[\s\S]*?isCartOpenStore\.set\(false\);/.test(drawer));
check('and it closes it before the navigation, not after',
  drawer.indexOf('isCartOpenStore.set(false);\n    savePickerHandoff') !== -1 ||
  /isCartOpenStore\.set\(false\);[\s\S]{0,200}savePickerHandoff/.test(drawer),
  'expected the close to precede the handoff');
// Checked against the call, not the identifier: the drawer's comments name
// `saveCartReopen` to explain why it is *not* the one calling it.
check('the drawer never parks the reopen flag itself',
  !/saveCartReopen\s*\(/.test(drawer.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')),
  'saveCartReopen is the picker\'s to call, on the way back');

console.log('\n=== The return trip reopens the drawer, but not on the picker ===');
// The picker parks the flag when a session finishes, so the picker page has
// nothing to claim while the user is still choosing a colour. This was the second
// half of the report, and it is the half that cannot be fixed with path matching:
// the picker lives at `/` AND `/` opens this drawer, so when the user starts on the
// picker page itself, `returnTo === '/'` and "the flag names this page" is the
// same statement as "this page is the picker". Only parking the flag on the return
// leg makes the two distinguishable.
// picker is read at the top, with the other surfaces.
check('the picker parks the flag, and only on the return leg',
  /reopenOnReturn\) saveCartReopen\(destination\);\s*goTo\(destination\)/.test(picker),
  'expected saveCartReopen(destination) immediately before goTo(destination)');
check('it parks only for a token write that asked to be restored',
  /handoff\.mode === 'token' && handoff\.reopenCart === true/.test(picker));
check('the drawer asks via the handoff',
  /savePickerHandoff\(\{[^}]*reopenCart: true/.test(drawer));
check('the sidebar does not ask, so it never gets a modal over its panel',
  !/reopenCart/.test(sidebar));

console.log('\n=== reopenCart survives the trip, and only as an explicit yes ===');
// It rides the handoff for the same reason `returnTo` does: the picker is not the
// thing that knows which surface sent the user. It also decides whether a modal
// opens itself on arrival, so it is read out of sessionStorage and has to be
// pinned to strict `true` like `mode` is.
savePickerHandoff({ roleId: 'primary', step: 500, color: null, returnTo: '/', reopenCart: true });
check('an explicit yes comes back as true', consumePickerHandoff()?.reopenCart === true);
savePickerHandoff({ roleId: 'primary', step: 500, color: null, returnTo: '/', reopenCart: false });
check('an explicit no comes back as false', consumePickerHandoff()?.reopenCart === false);
savePickerHandoff({ roleId: 'primary', step: 500, color: null, returnTo: '/ui-preview' });
check('an absent flag degrades to false, which is every existing caller',
  consumePickerHandoff()?.reopenCart === false);
savePickerHandoff({ roleId: 'primary', step: 500, color: null, returnTo: '/', reopenCart: 'yes' });
check('a non-boolean is not coerced into consent',
  consumePickerHandoff()?.reopenCart === false);

console.log('\n=== Nothing to claim until a session has actually finished ===');
// The load-bearing property of parking on the return leg: an outbound trip from the
// picker page itself must leave nothing that could reopen the drawer there.
store.delete('oklch_reopen_cart_v1');
check('the picker page has no flag to find while the user is picking',
  consumeCartReopen('/') === false);
check('and the modal is not resurrected on a later visit either',
  consumeCartReopen('/') === false);

console.log('\n=== The flag is addressed, spent, and single-use ===');
saveCartReopen('/export');
check('the picker page does not claim a flag meant for another page',
  consumeCartReopen('/') === false);
check('and it is still there afterwards', consumeCartReopen('/export') === true);
check('it is spent once claimed, so a later visit cannot reopen the drawer',
  consumeCartReopen('/export') === false);

console.log('\n=== The reported round trip, replayed end to end ===');
// The bug this section exists for: opening the drawer, tapping a swatch, and
// finding the modal had shut itself and sprung back open over the picker.
//
// Replaying the sequence the components actually perform, rather than asserting on
// any one line of it, because every earlier check here passed while the round trip
// was still broken — the two causes (a singleton left open across the navigation,
// and a flag parked on the outbound leg) were each individually reasonable and
// only wrong together, and neither was visible from the surface.
//
// `mountDrawer` stands in for the island's mount effect, which runs on every page
// including the picker — that is the whole problem, since it is a no-op on any page
// but the destination only by accident of what the flag happens to name.
let PAGE = { pathname: '/', pickerReady: false };
const mountDrawer = () => {
  if (consumeCartReopen(PAGE.pathname)) isCartOpenStore.set(true);
  return isCartOpenStore.get();
};

const openFromDrawer = (roleId, step) => {
  // CartDrawerIsland.openPicker
  const returnTo = PAGE.pathname;
  isCartOpenStore.set(false);
  savePickerHandoff({ roleId, step, color: null, returnTo, reopenCart: true });
  PAGE.pathname = '/';                       // goTo('/')
  PAGE.pickerReady = true;                   // island remount on arrival
};

// The picker page for origin '/': the case that broke. The picker lives at `/` AND
// `/` opens the drawer, so the origin page and the picker are the same page and no
// path comparison can separate "arrived to pick" from "returned from picking".
PAGE = { pathname: '/' };
isCartOpenStore.set(true);                    // "Tokens" on the picker page
check('the drawer opens on the picker page itself', mountDrawer() === true);

openFromDrawer('primary', 600);
check('the drawer is shut before the navigation, so it cannot follow the user',
  isCartOpenStore.get() === false);
check('and it is still shut once the picker page mounts over it',
  mountDrawer() === false,
  'this is the reported bug: the modal reopened on top of the picker');
check('the picker got its handoff and is ready to author the slot',
  (PAGE.pickerReady && consumePickerHandoff()?.step === 600) === true);

// ColorPickerIsland.handleAddToCart, on save.
PAGE.pickerReady = false;
check('nothing was parked while the user was picking',
  consumeCartReopen('/') === false,
  'the flag cannot exist before the user commits to a colour');

const saved = { roleId: 'primary', step: 600, color: createOklchColor(0.55, 0.16, 264) };
setRoleShade(saved.roleId, saved.step, saved.color);
saveCartReopen('/');                          // parked on the way BACK
PAGE.pathname = '/';                           // goTo('/') — same URL, still swaps
check('and it comes back on arrival, showing the colour just saved',
  mountDrawer() === true);
check('the token really was written', (() => {
  const written = cartStore.get().roles[saved.roleId].shades[saved.step]?.color;
  return written && formatOklch(written) === formatOklch(saved.color);
})());

// Same journey from a page that is not the picker, which is the case that worked.
PAGE = { pathname: '/export' };
store.delete('oklch_reopen_cart_v1');
isCartOpenStore.set(true);
openFromDrawer('primary', 500);
check('the picker page leaves the drawer shut', mountDrawer() === false);
const back = consumePickerHandoff();
check('and the handoff names where the user is going back to', back.returnTo === '/export');
saveCartReopen('/export');
PAGE.pathname = '/export';
check('the drawer returns on the originating page', mountDrawer() === true);

// And the sidebar's identical journey must NOT pop the modal over its own panel.
PAGE = { pathname: '/ui-preview' };
store.delete('oklch_reopen_cart_v1');
savePickerHandoff({ roleId: 'primary', step: 500, color: null, returnTo: '/ui-preview' });
const sidebarLeg = consumePickerHandoff();
if (sidebarLeg.mode === 'token' && sidebarLeg.reopenCart === true) saveCartReopen('/ui-preview');
check('a sidebar round trip asks for no drawer', consumeCartReopen('/ui-preview') === false);

console.log('\n=== A stale flag cannot hijack a later visit ===');
// The flag is meant to survive one two-hop trip, which takes seconds. A user who
// wanders off and comes back later should not have a modal open itself.
saveCartReopen('/export');
const rawFlag = JSON.parse(store.get('oklch_reopen_cart_v1'));
rawFlag.at = Date.now() - 6 * 60 * 1000;      // older than the 5-minute budget
store.set('oklch_reopen_cart_v1', JSON.stringify(rawFlag));
check('an expired flag is ignored', consumeCartReopen('/export') === false);
check('and is cleaned up rather than re-read', consumeCartReopen('/export') === false);

console.log('\n=== Only the page that asked gets the drawer back ===');
saveCartReopen('/ui-preview');
check('an unrelated page leaves it alone', consumeCartReopen('/export') === false);
check('the asking page still claims it', consumeCartReopen('/ui-preview') === true);

console.log('\n=== A flag naming somewhere off-origin is refused ===');
// It is a navigation target, so it goes through the same guard as the picker's
// `returnTo`. `saveCartReopen` records nothing rather than storing a path no
// page could ever match.
saveCartReopen('//evil.example/steal');
check('a protocol-relative path is not recorded',
  !JSON.parse(store.get('oklch_reopen_cart_v1') || '{"path":"none"}').path.startsWith('//'));

console.log('\n=== An empty slot seeds a colour that suits its step ===');
// The picker does the seeding, but the drawer is what routes to it now, so pin
// the two properties a hand-authored slot depends on: lightness comes from the
// step, so 950 opens dark and 50 light; hue and chroma are inherited from the
// role's own base, so a scale generated afterwards stays on-hue rather than
// snapping to the picker's arbitrary default.
const BASE_ROLE = 'warning';
const anchor = createOklchColor(0.45, 0.19, 28);
setRoleShade(BASE_ROLE, BASE_SHADE_STEP, anchor, { silent: true });

const emptyStep = 950;
check('every step is a legal target for an empty slot', SHADE_STEPS.includes(emptyStep));
const seeded = createOklchColor(TARGET_LIGHTNESS[emptyStep], anchor.c, anchor.h);
check('lightness comes from the step', seeded.l === TARGET_LIGHTNESS[emptyStep],
  'L=' + seeded.l + ' vs ' + TARGET_LIGHTNESS[emptyStep]);
check('950 seeds dark', TARGET_LIGHTNESS[emptyStep] < 0.3, 'L=' + TARGET_LIGHTNESS[emptyStep]);
check('50 seeds light', TARGET_LIGHTNESS[50] > 0.9, 'L=' + TARGET_LIGHTNESS[50]);
check('hue is inherited from the role base, so a generated scale stays on-hue',
  seeded.h === anchor.h, 'got ' + seeded.h + ' vs ' + anchor.h);
check('chroma is inherited too', seeded.c === anchor.c);
check('the base step is a member of the scale', SHADE_STEPS.includes(BASE_SHADE_STEP));

// The seeded colour can land outside sRGB — that is the picker's whole gamut
// affordance, not a defect — but it must never be silent about it, or the swatch
// would show a clamped colour that is not the token's value.
check('the seeded colour reports its gamut honestly',
  typeof seeded.inSRGB === 'boolean' && typeof seeded.inP3 === 'boolean');
check('and carries a display fallback',
  /^#[0-9a-f]{6}$/i.test(seeded.hex), 'got ' + seeded.hex);

console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'));
process.exit(failures === 0 ? 0 : 1);