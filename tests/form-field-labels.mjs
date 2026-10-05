/**
 * Covers the two accessibility findings Chrome reports about form fields, across
 * every component that has one.
 *
 * THE TWO FINDINGS
 *
 *  1. "A form field element has neither an id nor a name attribute."
 *  2. "No label associated with a form field" — a `<label>` with neither a `for`
 *     nor a form control inside it.
 *
 * WHY A WHOLE-SITE SUITE
 *
 * Neither finding is one component's bug; both are the kind that arrive a field at
 * a time and are invisible in review, because the field works. The token surfaces
 * alone accounted for four id-less inputs each, and the picker added one orphan
 * `<label>` per notation — four more, re-rendered on every visit.
 *
 * WHY THE COUNT KEPT CLIMBING
 *
 * Neither finding removes itself, and the audit re-reports on every re-render.
 * Editing a token from the drawer is a *two-hop* trip (`goTo('/')` out, `goTo(origin)`
 * back), so each edit re-mounts every island on two pages, and each re-mount
 * re-reports every violation on it. Nothing accumulates in the DOM — this suite
 * checks the violations are gone at the source instead, which is what stops the
 * count climbing.
 *
 * WHY `<label>` CANNOT SIMPLY BE REMOVED EVERYWHERE
 *
 * A label that *nests* its control is correctly associated, and that is the pattern
 * most of the site already uses. The one genuine orphan captions a readout with no
 * field under it, so it is a heading wearing a label's clothes — see the converter
 * check below.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Every `.tsx` under src/components — the only place markup is authored. */
function componentFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...componentFiles(p));
    else if (p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

const files = componentFiles(join(process.cwd(), 'src/components'));

let failures = 0;
function check(name, cond, extra = '') {
  if (cond) console.log('PASS  ' + name);
  else {
    failures++;
    console.log('FAIL  ' + name + (extra ? '\n      ' + extra : ''));
  }
}

/**
 * Comments mention markup in order to explain it, so a naive scan reads prose as
 * tags — `// ... a `<label>` above the input ...` would count as a label.
 */
const uncommented = (text) => text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

/**
 * Opening tags of one element name.
 *
 * Scans forward to the next `<` rather than the next `>`, deliberately: an
 * `onInput={(e) => ...}` handler contains a `>`, so a `[^>]*` match would cut most
 * attributes off the end and quietly pass fields that do have an `id`.
 */
const tagsOf = (text, tag) =>
  uncommented(text)
    .split('<' + tag)
    .slice(1)
    .map((rest) => rest.split('<')[0]);

/** A `<label>...</label>` pair, as its opening tag plus inner markup. */
const labelPairs = (text) =>
  [...uncommented(text).matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/g)].map((m) => ({
    open: m[0],
    attrs: m[1],
    inner: m[2],
  }));

const pretty = (t) => t.replace(/\s+/g, ' ').trim().slice(0, 95);

console.log('=== Every form field has an id ===');
// Not cosmetic: `id` is also what a `<label for>` points at, so this one attribute
// fixes both findings for a labelled field.
const idless = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const tag of tagsOf(text, 'input')) {
    if (!/\bid=/.test(tag)) idless.push(file.replace(/.*src.components./, '') + ' :: ' + pretty(tag));
  }
}
check('no <input> anywhere in src/components lacks an id', idless.length === 0, idless.join('\n      '));

const idlessSelects = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const tag of tagsOf(text, 'select')) {
    if (!/\bid=/.test(tag)) idlessSelects.push(file.replace(/.*src.components./, '') + ' :: ' + pretty(tag));
  }
}
check('no <select> lacks an id either', idlessSelects.length === 0, idlessSelects.join('\n      '));

console.log('\n=== A label is a label only if it reaches a field ===');
// Chrome accepts `for=` OR a nested control. Note `htmlFor` as well as `for`:
// these are JSX files, so the camelCase spelling is the correct one and a
// `\bfor=` test alone would miss every label on the site.
const reachesField = (l) =>
  /(?:\bfor=|\bhtmlFor=)/.test(l.attrs) || /<(input|select|textarea)\b/.test(l.inner);
const orphans = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const l of labelPairs(text)) {
    if (!reachesField(l)) orphans.push(file.replace(/.*src.components./, '') + ' :: ' + pretty(l.open));
  }
}
check('every <label> is associated with a field', orphans.length === 0, orphans.join('\n      '));

console.log('\n=== A `for` has to name a field that exists ===');
// A `for` pointing at a missing id is finding (1) wearing a disguise: the browser
// finds nothing to attach the label to, and the audit still complains.
const FOR_TMPL = /(?:\bfor=|\bhtmlFor=)\{`([^`$]+)\$\{([^}]+)\}`\}/;
const idsIn = (text) =>
  [...uncommented(text).matchAll(/\bid=\{`([^`]+)`\}/g)].map((m) => m[1].split('${')[0].trim());
const dangling = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const prefixes = idsIn(text);
  for (const l of labelPairs(text)) {
    const m = l.attrs.match(FOR_TMPL);
    if (!m) continue;
    const [, literal, expr] = m;
    // A literal prefix is only meaningful if some id in this file starts with it.
    if (literal && prefixes.length && !prefixes.some((p) => literal.startsWith(p) || p.startsWith(literal))) {
      dangling.push(file.replace(/.*src.components./, '') + ' :: for={`' + literal + '${' + expr + '}`}');
    }
  }
}
check('no `for` names an id the component never renders', dangling.length === 0, dangling.join('\n      '));

console.log("\n=== The picker's four notations each get their own id ===");
// The format rows all drive the same colour, so it is tempting to share one id or
// to point every label at the first input. Duplicated ids silently retarget the
// other three labels, which is worse than the original finding.
const picker = readFileSync(join(process.cwd(), 'src/components/picker/ColorPickerIsland.tsx'), 'utf8');
check('the id is built per-notation from a stable key',
  /htmlFor=\{`picker-format-\$\{f\.key\}`\}[\s\S]*?id=\{`picker-format-\$\{f\.key\}`\}/.test(picker),
  'expected htmlFor and id to share `picker-format-${f.key}`');
check('and each notation declares that key',
  ['oklch', 'hex', 'rgb', 'hsl'].every((k) => new RegExp(`key: '${k}'`).test(picker)),
  'expected a `key` on every format row');

console.log('\n=== The two token surfaces cannot collide on one page ===');
// `/ui-preview` mounts the drawer *and* the sidebar, so identically named fields
// would produce duplicate ids and a label that quietly retargets.
const prefixesOf = (p) =>
  [...uncommented(readFileSync(join(process.cwd(), p), 'utf8')).matchAll(/\bid=\{?`?(cart-[a-z]+)-/g)].map((m) => m[1]);
const drawerIds = prefixesOf('src/components/cart/CartDrawerIsland.tsx');
const sidebarIds = prefixesOf('src/components/preview/CartSidebar.tsx');
check('the drawer namespaces its ids', drawerIds.includes('cart-drawer'), 'found: ' + [...new Set(drawerIds)].join(', '));
check('the sidebar namespaces its ids differently', sidebarIds.includes('cart-sidebar'), 'found: ' + [...new Set(sidebarIds)].join(', '));
check('so the two sets cannot overlap', sidebarIds.every((p) => !drawerIds.includes(p)));

console.log('\n=== The converter readout is a heading, not a label ===');
// It captions a `<span>` holding the converted value. There is no field beneath it,
// so no amount of `for=` could make it a label — the element itself was wrong.
const converter = readFileSync(join(process.cwd(), 'src/components/converters/ConverterIsland.tsx'), 'utf8');
check('the output caption is not a <label>',
  !/<label\b[^>]*>\s*\{primaryOutput\.label\}\s*<\/label>/.test(uncommented(converter)));
check('and the value it captions is still announced',
  /primaryOutput\.value/.test(converter));

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);