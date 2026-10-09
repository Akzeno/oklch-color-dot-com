/**
 * Covers the swatches that used to read as *transparent* and could not be
 * clicked to change.
 *
 * THE DEFECT
 *
 * A swatch was marked as "a swatch" by pairing an inline `background-color`
 * with the global `.checker-bg` class. That pairing is always wrong: CSS paints
 * `background-image` ON TOP of `background-color`, and `.checker-bg`'s four
 * gradient layers are *opaque* `--color-canvas-elevated` (#1f1f1f) squares. So
 * half of every swatch was covered in dark grey and a fully opaque colour read
 * as washed-out and see-through — an unfilled placeholder, not a colour.
 *
 * The checkerboard is only meaningful for a colour that genuinely has alpha,
 * and even then it has to sit *under* the fill. So the fix is structural rather
 * than cosmetic, and the checks below pin the structure:
 *
 *  1. No component anywhere pairs `checker-bg` with a fill. `ColorSwatch` is the
 *     only place the class is used, and only for translucent colours.
 *  2. The swatches the user is invited to click are real `<button>`s, so
 *     "change this colour" is reachable from the colour itself.
 *  3. Clicking one really does open the picker — and for a swatch that is *not*
 *     a cart token, the colour comes *back* to the page instead of being filed
 *     into a `--color-*` variable the page never mentions.
 *
 * Part 3 is why `PickerHandoff.mode` and the picker-result channel exist, and
 * that is where most of this suite lives: `'free'` mode has to round-trip a
 * colour without ever touching the cart, must deliver it only to the page that
 * asked for it, and must survive being read exactly once.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import {
  savePickerHandoff,
  consumePickerHandoff,
  clearPickerHandoff,
  savePickerResult,
  consumePickerResult,
  clearPickerResult,
  setRoleShade,
  cartStore,
} from '../src/stores/cartStore.ts';
import {
  createOklchColor,
  formatOklch,
  parseAnyToOklch,
  oklchToRgbString,
  oklchToHslString,
} from '../src/utils/color.ts';

const PICKER_HANDOFF_KEY = 'oklch_picker_handoff_v1';
const PICKER_RESULT_KEY = 'oklch_picker_result_v1';

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

const root = process.cwd();
const srcRoot = join(root, 'src');

/** Every source file under `src/`, so a re-introduced pair cannot hide. */
function sourceFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(tsx?|astro|css)$/.test(entry)) out.push(full);
  }
  return out;
}

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

const ALL_SOURCE = sourceFiles(srcRoot);
const FILES_WITH_CHECKER_BG = ALL_SOURCE.filter((f) =>
  readFileSync(f, 'utf8').includes('checker-bg')
).map((f) => relative(root, f).split(sep).join('/'));

const colorSwatch = read('src/components/common/ColorSwatch.tsx');
const useOpenInPicker = read('src/hooks/useOpenInPicker.ts');
const cartStoreSrc = read('src/stores/cartStore.ts');
const pickerIsland = read('src/components/picker/ColorPickerIsland.tsx');
const generatorIsland = read('src/components/generator/PaletteGeneratorIsland.tsx');
const converterIsland = read('src/components/converters/ConverterIsland.tsx');
const actionPopover = read('src/components/preview/ColorActionPopover.tsx');
const globalCss = read('src/styles/global.css');

/* ═══════════════ 1. The defect: a checkerboard painted on top of a fill ═══════════════ */

console.log('=== No component pairs the checkerboard with a fill ===');
// If `checker-bg` ever reappears on an element that also carries a
// `background-color`, that element is half-covered in dark grey again. The
// class has exactly one legitimate home — inside ColorSwatch, for alpha.
check('checker-bg is confined to ColorSwatch + the stylesheet',
  FILES_WITH_CHECKER_BG.length === 2 &&
    FILES_WITH_CHECKER_BG.includes('src/components/common/ColorSwatch.tsx') &&
    FILES_WITH_CHECKER_BG.includes('src/styles/global.css'),
  'found in: ' + (FILES_WITH_CHECKER_BG.join(', ') || '(nothing)'));

check('ColorSwatch gates the checkerboard on the colour being translucent',
  /translucent \? 'checker-bg' : ''/.test(colorSwatch),
  "expected: translucent ? 'checker-bg' : ''");
check('translucency is decided by alpha, not by lightness or gamut',
  /color\.alpha < 1/.test(colorSwatch));

check('an opaque swatch emits no background-image at all',
  /style=\{translucent \? undefined : fillStyle\}/.test(colorSwatch),
  'expected the root style to be skipped when the fill is opaque');
check('a translucent swatch puts the fill on a layer ABOVE the checkerboard',
  /translucent && \(\s*\/\/[\s\S]*?<span class="absolute inset-0" style=\{fillStyle\} \/>/.test(colorSwatch),
  'expected an absolute inset-0 fill layer');
// Order matters: the checkerboard is on the root (painted first), the fill is a
// positioned child. Reversing them would put the translucent colour underneath
// the opaque squares and hide the checkerboard entirely — the one thing the
// class is for.
check('the fill layer comes after the checkerboard is declared',
  colorSwatch.indexOf("translucent ? 'checker-bg' : ''") <
    colorSwatch.indexOf('<span class="absolute inset-0" style={fillStyle} />'));

console.log('\n=== The stylesheet says why, so it is not re-introduced ===');
check('global.css documents the never-pair rule',
  /NEVER put this on the same element as an inline `background-color`/.test(globalCss));
check('the comment names the actual failure (image paints over colour)',
  /background-image` paints ON TOP of `background-color`/.test(globalCss));
check('the comment points at the component that replaces the pattern',
  /components\/common\/ColorSwatch\.tsx/.test(globalCss));

console.log('\n=== The reported markup is gone, replaced by the component ===');
// The exact shape the bug report named: a 10x10 checker-bg span with an inline
// oklch() fill on the palette generator.
check('the generator no longer writes a w-10 h-10 checker-bg span',
  !/w-10 h-10[^\n]*checker-bg/.test(generatorIsland) &&
    !/class="w-10 h-10[^"]*checker-bg/.test(generatorIsland));
check('no component still writes `checker-bg` together with a `backgroundColor` style',
  !ALL_SOURCE.some((f) => {
    const src = readFileSync(f, 'utf8');
    return src.includes('checker-bg') && src.includes('backgroundColor') &&
      !f.endsWith('ColorSwatch.tsx');
  }),
  'checker-bg + backgroundColor both present outside ColorSwatch');
check('no component still writes `checker-bg` together with a `background-color` CSS string',
  !ALL_SOURCE.some((f) => {
    const src = readFileSync(f, 'utf8');
    return src.includes('checker-bg') && /background-color\s*:/.test(src) &&
      !f.endsWith('ColorSwatch.tsx') && !f.endsWith('global.css');
  }));

/* ═══════════════ 2. The swatches are clickable controls ═══════════════ */

console.log('\n=== An interactive swatch is a real button ===');
check('ColorSwatch renders <button> when it has an onClick',
  /const El = \(interactive \? 'button' : 'div'\)/.test(colorSwatch));
check('the button is type="button" (these sit inside forms)',
  /type: 'button' as const/.test(colorSwatch));
check('the button carries an accessible name',
  /'aria-label': ariaLabel \?\? title/.test(colorSwatch));
check('a decorative swatch stays hidden from assistive tech',
  /'aria-hidden': 'true' as const/.test(colorSwatch));
// Regression: the picker canvas is a childless-looking swatch that layers real
// buttons inside it. Marking it aria-hidden hid those buttons from screen
// readers and stranded keyboard focus outside the a11y tree on click, which
// Chrome reports as "Blocked aria-hidden ... descendant retained focus".
check('a swatch that layers children is never marked aria-hidden',
  /const decorative = !interactive && !layered/.test(colorSwatch) &&
    /decorative\s*\?\s*\{\s*'aria-hidden': 'true' as const\s*\}/.test(colorSwatch));
// Tailwind v4 does not give `button` a pointer cursor, so a swatch that is a
// button without one reads as unclickable even though it is.
check('the button gets cursor-pointer',
  /interactive \? 'cursor-pointer' : ''/.test(colorSwatch));
check('a null colour paints fallbackCss rather than nothing',
  /fallbackCss = 'var\(--color-canvas-sunken\)'/.test(colorSwatch) &&
    /const css = color \? formatOklch\(color\) : fallbackCss/.test(colorSwatch));

const CLICKABLE = [
  ['generator base swatch', generatorIsland],
  ['converter input swatch', converterIsland],
  ['converter preview canvas', converterIsland],
  ['preview popover chip', actionPopover],
];
for (const [label, src] of CLICKABLE) {
  check(`${label} is a ColorSwatch with an onClick`,
    /<ColorSwatch[\s\S]{0,400}?onClick=\{/.test(src));
}
check('picker banner chip is rendered as a ColorSwatch',
  /<ColorSwatch[^>]*color=\{color\}/.test(pickerIsland));
check('the generator swatch opens the picker on the base colour itself',
  /onClick=\{\(\) => openInPicker\(baseColor\)\}/.test(generatorIsland));
check('the converter swatches open the picker on the parsed input',
  (converterIsland.match(/onClick=\{\(\) => openInPicker\(parsedColor\)\}/g) || []).length === 2);
check('the preview popover chip opens the picker on the target token',
  /onClick=\{\(\) => onOpenInPicker\(targetColor\)\}/.test(actionPopover));

check('every interactive swatch names itself for assistive tech',
  CLICKABLE.every(([, src]) => /ariaLabel=/.test(src)));

/* ═══════════════ 3. 'free' mode: the colour comes back to the page ═══════════════ */

console.log('\n=== A swatch that is not a token round-trips its colour ===');
/*
 * Mirrors the full trip for the palette generator's base swatch, which is
 * component state rather than a cart token. This is the whole reason `'free'`
 * mode exists: writing it into a token slot would leave the generator showing a
 * base colour that had silently become some role's 500.
 */
const BASE = createOklchColor(0.546, 0.215, 262.9);      // the reported colour
const ORIGIN = '/palette-generator';
const cartBefore = JSON.stringify(cartStore.get().roles);

// 1. Generator renders. User clicks the base swatch.
savePickerHandoff({
  mode: 'free',
  roleId: 'trusty-button',                              // useOpenInPicker's fallback
  step: 500,
  color: BASE,
  returnTo: ORIGIN,
});

// 2. Picker opens on exactly the colour under the cursor.
const opened = consumePickerHandoff();
check('the handoff is in free mode', opened.mode === 'free', 'got ' + opened.mode);
check('the picker preloads the exact clicked colour',
  opened.color !== null && formatOklch(opened.color) === formatOklch(BASE),
  opened.color ? formatOklch(opened.color) : 'null');

// 3. User drags the sliders and saves. This is `handleAddToCart`'s free branch.
const edited = createOklchColor(0.6, 0.18, 280);
savePickerResult({ color: edited, returnTo: opened.returnTo });
clearPickerHandoff();
check("free mode writes no cart slot", JSON.stringify(cartStore.get().roles) === cartBefore,
  'roles changed: ' + cartStore.get().activeRoleId);
check("free mode leaves the fallback role untouched too",
  Object.keys(cartStore.get().roles['trusty-button'].shades).length ===
    Object.keys(JSON.parse(cartBefore)['trusty-button'].shades).length,
  'steps: ' + Object.keys(cartStore.get().roles['trusty-button'].shades).join(','));

// 4. Back on the generator, the mount effect hands the colour to `onPicked`.
// The whole result comes back, not a bare colour: `slot` is part of what was
// asked for, and a page holding several free colours needs to see which one.
const picked = consumePickerResult(ORIGIN);
check('the page receives the colour the user saved',
  picked !== null && formatOklch(picked.color) === formatOklch(edited),
  picked ? formatOklch(picked.color) : 'null');
check('an unslotted free colour comes back tagged as such',
  picked !== null && picked.slot === null,
  'got ' + JSON.stringify(picked?.slot));

// `setBaseHex(formatOklch(picked))` — the value must survive being formatted
// and re-parsed, because that string is the field's entire source of truth.
const written = formatOklch(picked.color);
const reparsed = parseAnyToOklch(written);
check('the returned colour re-parses into the same colour',
  reparsed !== null &&
    reparsed.l === picked.color.l &&
    reparsed.c === picked.color.c &&
    reparsed.h === picked.color.h,
  written + ' -> ' + (reparsed ? formatOklch(reparsed) : 'unparseable'));

console.log('\n=== A returned colour is spent exactly once ===');
check('a second mount does not re-apply it', consumePickerResult(ORIGIN) === null);

console.log('\n=== A result is delivered only to the page that asked for it ===');
savePickerResult({ color: edited, returnTo: ORIGIN });
check('another page gets nothing', consumePickerResult('/ui-preview') === null);
check('a query string makes it a different page', consumePickerResult(ORIGIN + '?a=1') === null);
check('the root page gets nothing either', consumePickerResult('/') === null);
// A result addressed elsewhere is still SPENT: leaving it behind would let it be
// applied later by whichever page it was actually meant for, long after the user
// moved on.
check('an undelivered result is consumed, not left parked',
  consumePickerResult(ORIGIN) === null);
check('and nothing is left in session storage',
  !store.has(PICKER_RESULT_KEY));

/* ═══════════════ 4. mode is allow-listed, and degrades to 'token' ═══════════════ */

console.log('\n=== `mode` is allow-listed on read ===');
check('an absent mode is a token handoff (pre-mode payloads still work)', (() => {
  clearPickerHandoff();
  savePickerHandoff({ roleId: 'primary', step: 500, color: null, returnTo: null });
  return consumePickerHandoff().mode === 'token';
})());
for (const good of ['token', 'free']) {
  check(`mode "${good}" survives the trip`, (() => {
    clearPickerHandoff();
    savePickerHandoff({ roleId: 'primary', step: 500, color: null, returnTo: null, mode: good });
    return consumePickerHandoff().mode === good;
  })());
}
// `mode` arrives from sessionStorage, which any script on the origin can write.
// It decides whether saving mutates the cart, so an unrecognised value must not
// be able to fake itself into either branch — it degrades to the pre-existing
// token behaviour rather than being rejected.
const BAD_MODES = ['FREE', 'Token', 'free ', 'free\t', ' token', 'null', 'true', '0', 1, 0, true, false, {}, [], '', null, undefined];
for (const bad of BAD_MODES) {
  store.set(PICKER_HANDOFF_KEY, JSON.stringify({
    roleId: 'danger', step: 700, color: null, returnTo: null, mode: bad,
  }));
  check(`mode ${JSON.stringify(bad) ?? 'undefined'} degrades to 'token'`,
    consumePickerHandoff()?.mode === 'token');
}
check('a bad mode does not reject the rest of the payload', (() => {
  store.set(PICKER_HANDOFF_KEY, JSON.stringify({
    roleId: 'danger', step: 700, color: null, returnTo: '/ui-preview', mode: 'evil',
  }));
  const got = consumePickerHandoff();
  return got?.roleId === 'danger' && got?.step === 700 && got?.returnTo === '/ui-preview';
})());

/* ═══════════════ 5. Token mode is unchanged ═══════════════ */

console.log("\n=== 'token' mode still writes the exact slot ===");
const TOKEN = createOklchColor(0.51, 0.16, 300);
clearPickerHandoff();
savePickerHandoff({ mode: 'token', roleId: 'success', step: 600, color: TOKEN, returnTo: '/ui-preview' });
const tok = consumePickerHandoff();
setRoleShade(tok.roleId, tok.step, edited);
const tokShades = cartStore.get().roles['success'].shades;
check('the edit landed in the requested step', Boolean(tokShades[600]));
check('no neighbouring step was touched', !tokShades[500] && !tokShades[700],
  'steps: ' + Object.keys(tokShades).join(','));
check("token mode parks no result for the originating page",
  !store.has(PICKER_RESULT_KEY));

/* ═══════════════ 6. Hardening of the result channel ═══════════════ */

console.log('\n=== returnTo is sanitised on the way in, not just on read ===');
savePickerResult({ color: edited, returnTo: '//evil.example' });
check('a protocol-relative path is neutralised before it is stored',
  JSON.parse(store.get(PICKER_RESULT_KEY)).returnTo === null,
  'stored: ' + store.get(PICKER_RESULT_KEY));
check('so it can never be delivered to any page',
  consumePickerResult('//evil.example') === null);
savePickerResult({ color: edited, returnTo: 'javascript:alert(1)' });
check('a scheme-looking path is rejected too',
  consumePickerResult('javascript:alert(1)') === null);

console.log('\n=== Malformed results do not throw ===');
store.set(PICKER_RESULT_KEY, '{not json');
check('corrupt JSON is swallowed', consumePickerResult(ORIGIN) === null);
check('and it is still cleared', !store.has(PICKER_RESULT_KEY));
store.set(PICKER_RESULT_KEY, JSON.stringify({ returnTo: ORIGIN }));
check('a result with no colour yields nothing', consumePickerResult(ORIGIN) === null);
store.set(PICKER_RESULT_KEY, JSON.stringify({ color: { l: 900, c: 'nope', h: {} }, returnTo: ORIGIN }));
check('a nonsense colour is sanitised away', consumePickerResult(ORIGIN) === null);

console.log('\n=== Cancelling discards the pending colour too ===');
savePickerResult({ color: edited, returnTo: ORIGIN });
clearPickerResult();
check('cancelled: nothing is delivered back', consumePickerResult(ORIGIN) === null);
// The banner's Cancel must not leave a result parked for some later page to pick
// up: the user abandoned this edit.
check('Cancel clears both channels',
  /const cancelHandoff = \(\) => \{[\s\S]*?clearPickerHandoff\(\);[\s\S]*?clearPickerResult\(\);/.test(pickerIsland));
check("free mode never claims the picker's active role",
  /if \(pending\.mode !== 'free'\) setActiveRole\(pending\.roleId\)/.test(pickerIsland),
  'claiming the role would silently re-point "Add to cart"');

/* ═══════════════ 7. The wiring, read at source level ═══════════════ */

console.log('\n=== The hook routes by whether the swatch is a token ===');
check('a roleId means token mode',
  /mode: options\.roleId \? 'token' : 'free'/.test(useOpenInPicker));
check('no roleId means the colour is handed back instead',
  /options\.roleId \? 'token' : 'free'/.test(useOpenInPicker));
check('the hook reads the result off the current path',
  /consumePickerResult\(window\.location\.pathname\)/.test(useOpenInPicker));
check('it navigates to the picker page',
  /goTo\('\/'\)/.test(useOpenInPicker));
check('it defaults the return path to the current one',
  /options\.returnTo \?\? returnTo \?\? window\.location\.pathname/.test(useOpenInPicker));
check('every call site routes through the shared hook', [
  generatorIsland, converterIsland,
].every((s) => /import \{ useOpenInPicker \} from '\.\.\/\.\.\/hooks\/useOpenInPicker'/.test(s)));
check('each call site renders the result through ColorSwatch', [
  generatorIsland, converterIsland,
].every((s) => /import ColorSwatch from '\.\.\/common\/ColorSwatch'/.test(s)));

console.log('\n=== The converter writes back in the notation it reads ===');
// A hex-to-oklch field fed an `oklch(...)` string would parse fine but leave the
// chip and the field disagreeing about what was typed.
const NOTATION = [
  ['hex', (c) => c.hex],
  ['rgb', (c) => oklchToRgbString(c)],
  ['hsl', (c) => oklchToHslString(c)],
  ['oklch', (c) => formatOklch(c)],
];
for (const [name, format] of NOTATION) {
  const text = format(edited);
  const back = parseAnyToOklch(text);
  check(`a ${name} round trip returns the same colour`,
    back !== null &&
      Math.abs(back.l - edited.l) < 0.01 &&
      Math.abs(back.c - edited.c) < 0.01 &&
      Math.abs(back.h - edited.h) < 1,
    text + ' -> ' + (back ? formatOklch(back) : 'unparseable'));
}
check('the converter picks the notation from the direction it is in',
  /formatForSource\(picked, INPUT_SOURCE\[initialMode\]\)/.test(converterIsland));

console.log('\n=== The picker says something true in free mode ===');
check("a free handoff does not name a --color-* slot it cannot write",
  /handoffIsFree \? \([\s\S]*?colour sent from/.test(pickerIsland));
check('the button promises the colour goes back, not that a token was saved',
  /handoffIsFree\s*\?\s*t\(locale, 'ui\.picker\.useColour', 'Use colour'\)/.test(pickerIsland));
check("token mode keeps its original wording",
  /const handoffActionLabel = handoffIsFree\s*\?\s*t\(locale, 'ui\.picker\.useColour', 'Use colour'\)\s*:\s*handoffReturnTo\s*\?\s*t\(locale, 'ui\.picker\.saveAndReturn', 'Save & return'\)\s*:\s*t\(locale, 'ui\.picker\.save', 'Save'\)/.test(pickerIsland));
check('the save button branches on free mode before touching the cart', (() => {
  const write = pickerIsland.indexOf(
  'savePickerResult({ color, returnTo: destination, slot: handoff.slot ?? null })'
);
  const slot = pickerIsland.indexOf('setRoleShade(handoff.roleId, handoff.step, color)');
  return write > 0 && slot > write;
})());
check('the picker canvas keeps its id (it is a known landmark)',
  /id: 'picker-swatch-canvas'/.test(pickerIsland));

console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'));
process.exit(failures === 0 ? 0 : 1);
