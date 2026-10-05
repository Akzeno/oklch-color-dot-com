/**
 * Covers the palette generator's base colour surviving a reload and the colour
 * picker's round trip.
 *
 * WHY IT EXISTS
 *
 * The base colour used to be plain component state. That is invisible until it
 * is not: `<ClientRouter />` swaps the document on a client-side navigation, so
 * every island on the page is torn down and re-mounted, and the colour picker is
 * exactly such a navigation — editing the base colour goes to `/` and back. The
 * colour therefore came back as its initial value after every edit and every
 * refresh, and the page fell back to the blue preset. The custom palette already
 * had to solve this for the same reason (see `custom-palette.mjs`); this is the
 * same fix for the field the generator is actually named after.
 *
 * What is pinned here:
 *
 *  1. A colour that was chosen is still there after a re-mount, in the notation
 *     the user typed it in.
 *  2. A *partial* value is never persisted. A field is typed into one character
 *     at a time, and storing `#25` would come back as `#25` with the blue fallback
 *     painted beside it — the same broken-looking state, now durable.
 *  3. The first render still matches the server's, so persistence does not
 *     reintroduce the hydration mismatch `useHydratedStore` exists to prevent.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  generatorBaseStore,
  hydrateGeneratorBaseFromStorage,
  sanitizeBaseColorText,
  setGeneratorBaseColor,
  DEFAULT_BASE_COLOR_TEXT,
} from '../src/stores/generatorStore.ts';
import { formatOklch, parseAnyToOklch } from '../src/utils/color.ts';

const STORAGE_KEY = 'oklch_generator_base_v1';

const store = new Map();
globalThis.window = { addEventListener() {}, removeEventListener() {} };
globalThis.localStorage = {
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

/* ═══════════════ 1. The default is deterministic and is the server's ═══════════════ */

console.log('=== The page opens on a fixed colour it can render identically ===');
// The server has no localStorage, so it can only ever render the default. The
// client's first render must describe the same string, or the input's `value`
// attribute disagrees with the DOM Preact is hydrating.
check('the default is a literal string, not a derived colour',
  DEFAULT_BASE_COLOR_TEXT === '#2563eb', DEFAULT_BASE_COLOR_TEXT);
check('the store starts from that default', generatorBaseStore.get() === DEFAULT_BASE_COLOR_TEXT);
check('and it is a colour, so the first render is a real one',
  parseAnyToOklch(DEFAULT_BASE_COLOR_TEXT) !== null);

/* ═══════════════ 2. A chosen colour is kept ═══════════════ */

console.log('\n=== A chosen colour is persisted and read back ===');
check('a preset colour is accepted', setGeneratorBaseColor('#10b981') === true);
check('the store holds it', generatorBaseStore.get() === '#10b981');
check('and so does localStorage', store.get(STORAGE_KEY) === JSON.stringify('#10b981'),
  String(store.get(STORAGE_KEY)));

// The notation is kept as typed. A user who typed `#10b981` must find `#10b981`
// in the box, not `oklch(69.8% 0.166 163.2)` — the text *is* what the field shows.
check('an oklch() notation is stored as typed, not rewritten',
  setGeneratorBaseColor('oklch(62.8% 0.216 254)') === true &&
    generatorBaseStore.get() === 'oklch(62.8% 0.216 254)',
  generatorBaseStore.get());
check('surrounding whitespace is trimmed rather than kept',
  setGeneratorBaseColor('  #f43f5e  ') === true && generatorBaseStore.get() === '#f43f5e',
  generatorBaseStore.get());

console.log('\n=== Every route to a new base colour writes the same way ===');
// The field, the presets, Random and the picker each set the colour separately, so
// one of them bypassing the store would be a colour that silently reverts while
// the others persist.
const island = src('src/components/generator/PaletteGeneratorIsland.tsx');
check('presets set it through the hook’s setter',
  /onClick=\{\(\) => setBaseHex\(p\.hex\)\}/.test(island));
check('Random sets it through the same setter',
  /setBaseHex\(formatOklch\(randomOklchColor\(\)\)\)/.test(island));
check('the picker’s return trip sets it through the same setter',
  /setBaseHex\(formatOklch\(picked\)\)/.test(island));
check('the field sets it through the same setter',
  /onInput=\{\(e\) => setBaseHex\(\(e\.target as HTMLInputElement\)\.value\)\}/.test(island));
check('there is no second, unpersisted base colour in the island',
  !/useState\('#2563eb'\)/.test(island) && /useGeneratorBaseColor\(\)/.test(island));

console.log('\n=== It survives the re-mount that the picker causes ===');
// A module-singleton store is the whole mechanism: the island is thrown away and
// built again, and this is what it reads instead of `useState`'s initial value.
generatorBaseStore.set('#8b5cf6');
check('the store still holds it with no island mounted',
  generatorBaseStore.get() === '#8b5cf6');

/* ═══════════════ 3. A partial value is never persisted ═══════════════ */

console.log('\n=== Half-typed text is shown but not stored ===');
// A field is typed into one character at a time; most keystrokes are mid-edit.
// Persisting those would restore a partial value beside the blue fallback — the
// exact state this change exists to remove, only now surviving a reload.
const BEFORE = generatorBaseStore.get();
for (const partial of ['#2', '#25', 'oklch(', 'oklch(6', '', '   ', 'not a colour', 'rgb(']) {
  check(`"${partial}" is refused`, setGeneratorBaseColor(partial) === false);
  check(`"${partial}" left the stored colour alone`, generatorBaseStore.get() === BEFORE);
}
check('nothing partial reached localStorage',
  store.get(STORAGE_KEY) === JSON.stringify('#f43f5e'),
  String(store.get(STORAGE_KEY)));
// Three-digit hexes are the trap: `#256` really is a colour, so a partially typed
// 6-digit value can legitimately become the stored one on the way to `#2563eb`.
check('a 3-digit hex is a real colour and is accepted', setGeneratorBaseColor('#256') === true);
check('finishing the value overwrites it',
  setGeneratorBaseColor('#2563eb') === true && generatorBaseStore.get() === '#2563eb');

/* ═══════════════ 4. Hydration reads what was stored, once ═══════════════ */

console.log('\n=== A reload restores the colour that was stored ===');
store.set(STORAGE_KEY, JSON.stringify('oklch(45% 0.157 258.4)'));
generatorBaseStore.set(DEFAULT_BASE_COLOR_TEXT);   // what the store looks like pre-hydration
hydrateGeneratorBaseFromStorage();
check('the stored colour is restored',
  generatorBaseStore.get() === 'oklch(45% 0.157 258.4)', generatorBaseStore.get());
check('it is the colour the user was working with',
  formatOklch(parseAnyToOklch(generatorBaseStore.get())) ===
    formatOklch(parseAnyToOklch('oklch(45% 0.157 258.4)')));

// A second hydrate must not re-read localStorage: the user has been changing the
// colour since, and re-reading would undo those changes under them.
setGeneratorBaseColor('#f59e0b');
hydrateGeneratorBaseFromStorage();
check('a later hydrate does not clobber a colour chosen since',
  generatorBaseStore.get() === '#f59e0b', generatorBaseStore.get());

console.log('\n=== A corrupt payload cannot resurrect a non-colour ===');
// localStorage is user-writable, so this is the same attacker-reachable input the
// cart and the custom palette already defend against. The guard is called
// directly here because the hydrate flag above is deliberately one-shot per
// session, exactly as `sanitizeCustomPalette` is exercised in `custom-palette.mjs`.
for (const [label, payload] of [
  ['a plain sentence', 'just some text'],
  ['a partly typed hex', '#25'],
  ['an empty string', ''],
  ['a whitespace-only string', '   '],
  ['an object', { a: 1 }],
  ['a number', 7],
  ['null', null],
  ['an array', ['#fff']],
  ['a value that is not a string at all', 12345],
  ['a declaration trying to escape the declaration', 'red; background: url(x)'],
  ['a very long string of nonsense', 'lorem ipsum '.repeat(200)],
]) {
  check(`${label} is refused`, sanitizeBaseColorText(payload) === null,
    String(sanitizeBaseColorText(payload)).slice(0, 40));
}

const storeSrc = src('src/stores/generatorStore.ts');
const hydrateBody = storeSrc.slice(storeSrc.indexOf('export function hydrateGeneratorBaseFromStorage'));
check('the payload is read inside a try, so broken JSON cannot throw out of hydrate',
  hydrateBody.includes('try {') && hydrateBody.includes('} catch'));
check('and nothing is written back unless the guard accepted it',
  /const text = sanitizeBaseColorText\(JSON\.parse\(raw\)\);\s*\n\s*if \(text\) generatorBaseStore\.set\(text\);/.test(
    storeSrc
  ));

console.log('\n=== A valid payload survives the same guard ===');
check('a stored hex is accepted, trimmed, as typed',
  sanitizeBaseColorText('  #f43f5e  ') === '#f43f5e',
  String(sanitizeBaseColorText('  #f43f5e  ')));
check('a stored oklch() is accepted verbatim',
  sanitizeBaseColorText('oklch(45% 0.157 258.4)') === 'oklch(45% 0.157 258.4)');
check('a payload cannot come back unbounded',
  (() => {
    const long = sanitizeBaseColorText('#'.padEnd(5000, 'f'));
    return long === null || long.length <= 120;
  })());

console.log('\n=== The first render still matches the server ===');
// Persistence must not reintroduce the hydration mismatch `useHydratedStore`
// exists to prevent: after a navigation the store holds the persisted colour while
// the server sent the default, and an unpinned read would describe a different
// tree than the DOM it is hydrating.
const hookSrc = src('src/hooks/useGeneratorBaseColor.ts');
check('the stored colour is pinned to the default for the first render',
  /useHydratedStore\(generatorBaseStore, DEFAULT_BASE_COLOR_TEXT\)/.test(hookSrc));
check('hydration runs in an effect, never during render',
  /useEffect\(\(\) => \{\s*\n\s*\/\/ A no-op[\s\S]*?hydrateGeneratorBaseFromStorage\(\);/.test(hookSrc));
check('a draft is shown while typing but never reaches the store directly',
  /const \[draft, setDraft\] = useState<string \| null>\(null\)/.test(hookSrc) &&
    /return \[draft \?\? stored, setText\];/.test(hookSrc) &&
    !/setGeneratorBaseStore|setGeneratorBaseColor\(draft/.test(hookSrc));

console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'));
process.exit(failures === 0 ? 0 : 1);