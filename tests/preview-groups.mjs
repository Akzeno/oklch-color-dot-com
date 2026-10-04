/**
 * Covers the grouped showcase: the group registry, the semantic token layer, and
 * the "every painted element is selectable" contract.
 *
 * WHY IT EXISTS
 *
 * Two real gaps motivated this layer, and neither was visible from the outside:
 *
 *  1. `secondary`, `background` and `text` existed in the cart and were painted
 *     nowhere. Nothing reported this — the page looked complete.
 *  2. Every painted element hardcoded `data-context-step="500"`, so no element
 *     had a foreground distinct from its own fill, and no surface was distinct
 *     from the canvas behind it. The page therefore *could not* surface the two
 *     classes of bug it exists to catch: unreadable text on a coloured fill, and
 *     surfaces that do not stack.
 *
 * So the invariants below are about structure, not appearance: a slot is painted
 * through one primitive, the primitive always reports which slot it paints, and
 * the inventory of painted slots is derived from the specs rather than
 * hand-maintained. A test that only checked colours would have passed while both
 * gaps were live.
 *
 * The JSX contracts are asserted against source because the project has no
 * server-render dependency; `stripComments` matters — several of these strings
 * appear in the comments that explain the rules.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  GROUPS,
  IMPLEMENTED_GROUPS,
  DEFAULT_GROUP,
  findGroup,
  isGroupId,
} from '../src/components/preview/preview/groups.ts';
import {
  ACCENT,
  ACCENT_ROLES,
  STAGE,
  PLACEHOLDER_INK,
  accent,
  createPaint,
  resolveSlot,
  scorePair,
  slotInventory,
} from '../src/components/preview/preview/slots.ts';
import { createOklchColor, formatOklch } from '../src/utils/color.ts';

let failures = 0;
function check(name, cond, extra = '') {
  if (cond) console.log('PASS  ' + name);
  else {
    failures++;
    console.log('FAIL  ' + name + (extra ? '\n      ' + extra : ''));
  }
}

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8');

/** Strip comments so an explanatory comment can never satisfy an assertion. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/**
 * Report any `Swatch` that sits inside an inline element without declaring `as`.
 *
 * `Swatch` renders a `<div>` unless told otherwise, and the HTML parser cannot
 * keep a `<div>` inside a `<span>`: it closes the span and re-parents the divs
 * as siblings. Preact then hydrates a tree that no longer matches the DOM the
 * server sent, so the fill and its label end up detached from their click
 * targets — the page still looks right and silently stops working.
 *
 * The built-HTML check below catches this for the group that renders on load.
 * This one covers every other group, present and future, since `dist/` only ever
 * holds the default group's markup.
 *
 * A tag scanner rather than a regex: "is this Swatch inside a span" is a question
 * about the tree, and the answer has to survive a Swatch moving one line down.
 */
function inlineSwatches(src) {
  const stack = [];
  const found = [];
  // Attribute values in these files never contain < or >, so a flat tag scan is
  // enough; `style={...}` and `class="..."` are opaque either way.
  for (const m of src.matchAll(/<(\/?)([A-Za-z][\w.]*)([^<>]*)>/g)) {
    const [full, closing, name, attrs] = m;
    if (closing) {
      const i = stack.lastIndexOf(name);
      if (i >= 0) stack.length = i;
      continue;
    }
    if (stack.includes('span') && name === 'Swatch' && !/\bas=/.test(attrs)) {
      found.push(`<Swatch> inside <span> with no as= (line ~${src.slice(0, m.index).split('\n').length})`);
    }
    if (!attrs.trimEnd().endsWith('/')) stack.push(name);
  }
  return found;
}

function swatchesInInlineElements(file) {
  return inlineSwatches(stripComments(read(file)));
}

/** Build a cart without touching the store — these tests are hermetic on purpose. */
function fakeCart(spec) {
  const roles = {};
  for (const [role, shades] of Object.entries(spec)) {
    roles[role] = {
      shades: Object.fromEntries(
        Object.entries(shades).map(([step, color]) => [Number(step), { color }])
      ),
    };
  }
  return { roles };
}

/* ═══════════════════════════════════════════════════════════════════
   The registry is the single source of truth for the tab strip
   ═══════════════════════════════════════════════════════════════════ */
console.log('=== The registry is well formed ===');

check('every group has a unique id',
  new Set(GROUPS.map((g) => g.id)).size === GROUPS.length,
  GROUPS.map((g) => g.id).join(','));
check('every group has a label and a blurb',
  GROUPS.every((g) => g.label.trim() && g.blurb.trim()));
check('at least one group ships in this slice', IMPLEMENTED_GROUPS.length >= 1);
check('every implemented group is in the registry',
  IMPLEMENTED_GROUPS.every((g) => GROUPS.includes(g)));
check('every group that paints declares the slots it is the reason to set',
  GROUPS.every((g) => g.slots.length > 0));
// The default is stated, not inherited from list order — so reordering the
// registry for reading convenience cannot silently change the landing tab.
check('the default group is one that exists',
  GROUPS.some((g) => g.id === DEFAULT_GROUP), DEFAULT_GROUP);
check('the default group is actually implemented',
  IMPLEMENTED_GROUPS.some((g) => g.id === DEFAULT_GROUP),
  'default is ' + DEFAULT_GROUP + ', which is not built yet');
check('the declared slots are all real role ids',
  GROUPS.every((g) => g.slots.every((s) => s === 'background' || s === 'text' || ACCENT_ROLES.includes(s))),
  GROUPS.flatMap((g) => g.slots).filter((s) => s !== 'background' && s !== 'text' && !ACCENT_ROLES.includes(s)).join(','));
check('no group declares the same slot twice',
  GROUPS.every((g) => new Set(g.slots).size === g.slots.length),
  GROUPS.filter((g) => new Set(g.slots).size !== g.slots.length).map((g) => g.id).join(','));
// 'border' is not a role — a hairline comes from a step of `background`. Letting
// the registry name a step where it means a role made PlannedGroup report a
// permanently 0/1 "coverage" for a slot that does not exist.
check('no group invents a "border" role',
  GROUPS.every((g) => !g.slots.includes('border')));

console.log('\n=== An unknown or missing group id falls back, never blank ===');
check(`findGroup(null) is the default (${DEFAULT_GROUP})`,
  findGroup(null).id === DEFAULT_GROUP);
check(`findGroup("nope") is the default`, findGroup('nope').id === DEFAULT_GROUP);
check(`findGroup("") is the default`, findGroup('').id === DEFAULT_GROUP);
check('findGroup("buttons") is Buttons', findGroup('buttons').id === 'buttons');
// "overview" used to be a real group; a stale bookmark or cached URL carrying it
// must land on the default rather than on a blank canvas.
check('the removed "overview" id falls back too',
  findGroup('overview').id === DEFAULT_GROUP);

/* ═══════════════════════════════════════════════════════════════════
   The semantic pair: the fix for "everything was painted at 500"
   ═══════════════════════════════════════════════════════════════════ */
console.log('\n=== An accent pairs its fill with the far end of its own scale ===');

check('every accent fill is the 500 step',
  ACCENT.fill.dark === 500 && ACCENT.fill.light === 500);
check('the accent foreground is 50 on a dark surface',
  ACCENT.on.dark === 50, 'got ' + ACCENT.on.dark);
check('the accent foreground is 950 on a light surface',
  ACCENT.on.light === 950, 'got ' + ACCENT.on.light);
check('the two themes ask for genuinely different steps',
  ACCENT.on.dark !== ACCENT.on.light,
  'both are ' + ACCENT.on.dark);

const red = createOklchColor(0.55, 0.19, 28);
// A role with only 500 set would leave every `on-*` unresolved, so the complete
// pair needs both ends of the scale present — which is the whole point of a
// generated 50–950 scale.
const paleRed = createOklchColor(0.96, 0.02, 28);
const cart = fakeCart({
  primary: { 50: paleRed, 500: red },
  background: {},
  text: {},
});

const dark = accent(cart, 'primary', 'dark');
check('the foreground comes from the SAME role as the fill',
  dark.fill.role === 'primary' && dark.on.role === 'primary');
check('the foreground resolves at the light end in dark',
  dark.on.requested === 50 && dark.on.role === 'primary');
check('both halves resolved', dark.fill !== null && dark.on !== null);
check('a complete pair is not flagged incomplete', dark.incomplete === false);

console.log('\n=== A missing foreground is reported, not guessed or substituted ===');
const halfCart = fakeCart({ primary: { 500: red } });
const half = accent(halfCart, 'primary', 'dark');
check('the fill still resolves', half.fill !== null);
check('the foreground is null, not a white fallback', half.on === null);
check('and the pair says so', half.incomplete === true);
// The specific regression the resolver could reintroduce: asked for primary-50
// with only primary-500 set, the substitution ladder used to return 500 — so the
// foreground became the same colour as its own fill, the pair graded 1:1, and
// the absent token was invisible. Exactly the defect this page exists to catch.
check('the foreground did NOT substitute down to the fill step',
  half.on === null && !halfCart.roles.primary.shades[50],
  'on resolved to step ' + (half.on && half.on.step));
check('nor did the fill substitute up',
  half.fill.step === 500);
// The stage, by contrast, substitutes on purpose.
const stageSub = resolveSlot(oneShadeLater(), 'background', 950, 'dark', STAGE.canvas.neutral);
check('the stage still substitutes', stageSub !== null && stageSub.substituted === true);
function oneShadeLater() {
  return fakeCart({ background: { 700: createOklchColor(0.3, 0.02, 250) } });
}

/* ═══════════════════════════════════════════════════════════════════
   The fallback rule is deliberately asymmetric
   ═══════════════════════════════════════════════════════════════════ */
console.log('\n=== The stage falls back; foregrounds never do ===');

check('the canvas has a neutral stand-in', Boolean(STAGE.canvas.neutral));
check('a card surface has a neutral stand-in', Boolean(STAGE.surface.neutral));
check('a border has a neutral stand-in', Boolean(STAGE.border.neutral));
check('primary text has NO stand-in', !STAGE.text.neutral,
  'a stand-in here would hide unreadable text');
check('muted text has NO stand-in', !STAGE.muted.neutral);

const bare = fakeCart({ background: {}, text: {} });
const bareCanvas = resolveSlot(bare, 'background', 950, 'dark', STAGE.canvas.neutral);
check('an empty canvas still paints something judgeable', bareCanvas !== null);
check('and discloses that it is a stand-in', bareCanvas.onNeutral === true);
check('a stand-in carries no hex, so it cannot be scored',
  bareCanvas.hex === null);
check('empty primary text resolves to nothing at all',
  resolveSlot(bare, 'text', 100, 'dark', undefined) === null);
check('an unset accent resolves to nothing at all',
  resolveSlot(bare, 'primary', 500, 'dark', undefined) === null);

console.log('\n=== Placeholder ink is disclosure chrome, not a fallback ===');
// A button label with no `--color-primary-50` still has to be legible, or the
// button renders as an empty box and you cannot tell "Save changes" from
// "Delete". The answer is NOT to give STAGE.text a neutral — that would put a
// stand-in behind real content and hide the exact bug the page exists to find.
check('it is not a stand-in on the text slot', !STAGE.text.neutral);
check('it is not a stand-in on the muted slot', !STAGE.muted.neutral);
check('it is a named constant, not a stray literal', Boolean(PLACEHOLDER_INK));
check('defined for both themes',
  PLACEHOLDER_INK.dark && PLACEHOLDER_INK.light &&
    PLACEHOLDER_INK.dark !== PLACEHOLDER_INK.light);
check('and it is an opaque colour, so a pending label is really readable',
  /^#[0-9a-f]{6}$/i.test(PLACEHOLDER_INK.dark) &&
  /^#[0-9a-f]{6}$/i.test(PLACEHOLDER_INK.light));
// It must contrast enough with each theme's canvas to be worth painting, or the
// whole justification collapses. ~5:1 and ~7:1 against #0f0f0f / #ffffff.
const inkOnCanvas = scorePair('placeholder ink on canvas',
  { css: PLACEHOLDER_INK.dark, hex: PLACEHOLDER_INK.dark },
  { css: '#0f0f0f', hex: '#0f0f0f' });
check('so it is legible on the dark canvas',
  inkOnCanvas !== null && (inkOnCanvas.wcag ?? 0) >= 4.5,
  'dark ink on #0f0f0f: ' + (inkOnCanvas ? inkOnCanvas.wcag + ':1' : 'unscored'));
check('and on the light canvas', (() => {
  const p = scorePair('placeholder ink on canvas',
    { css: PLACEHOLDER_INK.light, hex: PLACEHOLDER_INK.light },
    { css: '#ffffff', hex: '#ffffff' });
  return p !== null && (p.wcag ?? 0) >= 4.5;
})());

console.log('\n=== The stage substitutes rather than failing, and says so ===');
const oneShade = fakeCart({ background: { 700: createOklchColor(0.3, 0.02, 250) } });
const substituted = resolveSlot(oneShade, 'background', 950, 'dark', STAGE.canvas.neutral);
check('it fell back to the only shade available', substituted.step === 700);
check('and flagged the substitution', substituted.substituted === true);
check('while still reporting the step that was asked for',
  substituted.requested === 950 && substituted.step === 700);
check('a substituted value is a real token, not a stand-in',
  substituted.onNeutral === false && substituted.hex !== null);

/* ═══════════════════════════════════════════════════════════════════
   Contrast refuses to grade a colour the user never chose
   ═══════════════════════════════════════════════════════════════════ */
console.log('\n=== A pair is only graded when both halves are real ===');

const scored = scorePair('primary content on fill', dark.on, dark.fill);
check('a real pair is graded', scored !== null);
check('and the grade matches the ratio', scored.grade !== null && scored.wcag !== null);
check('APCA is reported alongside WCAG', scored.apca !== null);

const againstStandIn = scorePair('muted content on canvas', null, bareCanvas);
check('a pair with an unset half is not scored', againstStandIn === null);
const canvasStandIn = scorePair('primary content on canvas', dark.fill, bareCanvas);
check('a pair against a placeholder neutral is not scored', canvasStandIn === null,
  'a confident grade here would be evidence for a colour nobody picked');

/* ═══════════════════════════════════════════════════════════════════
   The inventory is derived, so it cannot drift from what is painted
   ═══════════════════════════════════════════════════════════════════ */
console.log('\n=== The inventory is derived from the specs ===');

const inv = slotInventory(cart, 'dark');
const keys = inv.map((i) => `${i.role}-${i.step}`);

check('every accent role contributes a fill and a foreground',
  ACCENT_ROLES.every((r) => keys.includes(`${r}-500`) && keys.includes(`${r}-50`)),
  ACCENT_ROLES.filter((r) => !keys.includes(`${r}-500`) || !keys.includes(`${r}-50`)).join(','));
check('primary content and muted content are both in the inventory',
  keys.includes('text-100') && keys.includes('text-400'));
check('the canvas and a card surface are distinct slots',
  keys.includes('background-950') && keys.includes('background-900'));

console.log('\n=== Duplicates are merged so the counts stay meaningful ===');
// raised, border and divider all request background-800 in dark. Listing one
// token three times would read as "set, set, set" and hide what is missing.
check('the three background-800 consumers collapse to one row',
  keys.filter((k) => k === 'background-800').length === 1,
  'found ' + keys.filter((k) => k === 'background-800').length);
const mergedRow = inv.find((i) => i.role === 'background' && i.step === 800);
// Asserted on the three distinguishing phrases rather than the STAGE key names,
// because the key is 'raised' while its purpose reads "Nested surface".
check('the merged row keeps all three purposes',
  /Nested surface/.test(mergedRow.purpose) &&
  /Hairline edges/.test(mergedRow.purpose) &&
  /Separator rules/.test(mergedRow.purpose),
  mergedRow.purpose);
check('the merged row keeps every consumer group',
  mergedRow.usedBy.length > 1, mergedRow.usedBy.join(','));
check('the inventory has no duplicate role-step pairs',
  new Set(keys).size === keys.length);

console.log('\n=== The inventory is theme-aware ===');
const lightInv = slotInventory(cart, 'light');
const lightKeys = lightInv.map((i) => `${i.role}-${i.step}`);
check('light asks for the dark end of the accent scale', lightKeys.includes('primary-950'));
check('light does not ask for the light end', !lightKeys.includes('primary-50'));
check('light asks for light-surface steps',
  lightKeys.includes('background-50') && lightKeys.includes('text-900'));
check('light asks for a light border step', lightKeys.includes('background-200'));

console.log('\n=== Coverage states are honest ===');
const setSlot = inv.find((i) => i.role === 'primary' && i.step === 500);
check('a real token reads as set', setSlot.state === 'set');
const standInSlot = inv.find((i) => i.role === 'background' && i.step === 950);
check('a stand-in reads as placeholder, not set',
  standInSlot.state === 'placeholder', standInSlot.state);
const missingSlot = inv.find((i) => i.role === 'danger' && i.step === 500);
check('an absent accent reads as missing', missingSlot.state === 'missing', missingSlot.state);
check('a missing slot paints nothing', missingSlot.slot === null);

console.log('\n=== Nothing hand-maintains a list of painted slots ===');
const slotsSrc = stripComments(read('src/components/preview/preview/slots.ts'));
check('the old hand-written inventory table is gone',
  !/SLOT_INTENTS/.test(slotsSrc));
check('inventory is produced by a function over the specs',
  /export function slotInventory/.test(slotsSrc));
// A reintroduced literal table would be the exact drift this replaced.
check('no literal array of { role, step } pairs in the token layer',
  !/\{\s*role:\s*'[a-z-]+',\s*step:\s*\d+/.test(slotsSrc));

console.log('\n=== createPaint resolves the whole set once ===');
const paint = createPaint(cart, 'dark');
check('it resolves the stage slots that have stand-ins', paint.canvas !== null);
// `paint.text` is null here on purpose: text has no stand-in and the fake cart
// sets none, so an assertion demanding a value would be asserting the very
// fallback rule the layer exists to avoid.
check('it leaves unset foregrounds unresolved rather than standing them in',
  paint.text === null && paint.muted === null,
  'canvas ' + paint.canvas.onNeutral + ', text ' + paint.text);
check('it carries a pair for every accent role',
  ACCENT_ROLES.every((r) => paint.accents[r] !== undefined));
// The one colour Paint hands out that is not a resolved slot — and it is a
// separate field precisely so no consumer can mistake it for one.
check('it carries placeholder ink, and it is never a resolved slot',
  paint.pendingInk === PLACEHOLDER_INK.dark && !('pendingInk' in paint.canvas));
check('which tracks the theme',
  createPaint(cart, 'light').pendingInk === PLACEHOLDER_INK.light);
check('it carries the same inventory the coverage report uses',
  paint.inventory.length === inv.length);
check('the inventory and the resolved stage agree',
  paint.canvas.requested === STAGE.canvas.steps.dark);

/* ═══════════════════════════════════════════════════════════════════
   Colourability is structural
   ═══════════════════════════════════════════════════════════════════ */
console.log('\n=== One primitive is the only way a colour reaches the canvas ===');

const swatchSrc = stripComments(read('src/components/preview/preview/Swatch.tsx'));
check('Swatch writes data-context-role', /data-context-role=\{slot\.role\}/.test(swatchSrc));
check('Swatch writes data-context-step', /data-context-step=\{slot\.requested\}/.test(swatchSrc));
// The pixel, the tooltip and the click target all read one value. `effective` is
// that value, with exactly one documented exception.
check('each part paints the one resolved value',
  /backgroundColor: effective/.test(swatchSrc) &&
  /borderColor: effective/.test(swatchSrc) &&
  /color: effective/.test(swatchSrc),
  'expected all three painted properties to read `effective`');
// That exception — an unset *foreground* borrowing readable chrome — is the only
// way a painted colour can differ from the resolved slot, so it is pinned here.
// The `!_slot` guard is the load-bearing part: without it a real, chosen colour
// could be masked by the placeholder, which is the one outcome this primitive
// exists to prevent.
check('the only exception is an unset foreground borrowing chrome',
  /const effective = pending && isForeground && !_slot\s*\n?\s*\?\s*\(pendingCss \?\? 'transparent'\)\s*\n?\s*:\s*slot\.css;/.test(swatchSrc),
  swatchSrc.match(/const effective[\s\S]{0,120}/)?.[0]);
// Last step: the placeholder must not itself reach the DOM. It has to be pulled
// out of props before `...rest`, or Preact spreads `pendingCss="#0f0f0f"` onto
// the element as an invalid attribute.
check('and the placeholder never reaches the DOM',
  /pendingCss,\s*\n\s*\.\.\.rest/.test(swatchSrc),
  swatchSrc.match(/pendingCss[\s\S]{0,40}/)?.[0]);
check('a caller style cannot override the painted colour',
  /\{\s*\.\.\.style,\s*\.\.\.painted\s*\}/.test(swatchSrc));

console.log('\n=== An unset slot is still clickable ===');
// The core promise: authoring a token is the primary action on this page, so a
// dashed hole that ignores clicks would make the empty slots the least
// reachable part of the interface.
check('Swatch accepts a null slot', /slot:\s*SlotValue \| null/.test(swatchSrc));
check('and requires the role it would author', /role\?:\s*string/.test(swatchSrc));
check('and the step it would author', /step\?:\s*ShadeStep/.test(swatchSrc));
check('a null slot is synthesised into a real target',
  /_role && _step/.test(swatchSrc) && /requested:\s*_step/.test(swatchSrc));
check('a synthesised target is not a colour', /css:\s*'transparent'/.test(swatchSrc));
check('the pending state is announced', /data-pending/.test(swatchSrc));
check('and told apart from a neutral stand-in',
  /data-on-neutral=\{unset && !pending/.test(swatchSrc));
check('the tooltip offers to author it', /click to author it/.test(swatchSrc));

console.log('\n=== Groups paint through the primitive ===');
const groupFiles = {
  Buttons: 'src/components/preview/preview/groups/ButtonsGroup.tsx',
  Forms: 'src/components/preview/preview/groups/FormsGroup.tsx',
};
for (const [name, file] of Object.entries(groupFiles)) {
  const src = stripComments(read(file));
  check(`${name} imports Swatch`, /from '\.\.\/Swatch'/.test(src));
  check(`${name} never hardcodes a painted step`,
    !/data-context-step="\d+"/.test(src),
    'hardcoded step found — steps must come from the slot');
}

console.log('\n=== Nested swatches resolve to the innermost slot ===');
const islandSrc = stripComments(read('src/components/preview/UIPreviewIsland.tsx'));
const pageSrc = stripComments(read('src/pages/ui-preview.astro'));
check('the click handler walks up with closest()',
  /closest\('\[data-context-role\]'\)/.test(islandSrc));
check('so a fill containing a label routes to the label',
  /closest/.test(islandSrc) && /data-context-role/.test(islandSrc));
check('preventDefault only fires once a slot was hit',
  /if \(!target\) return;[\s\S]{0,80}e\.preventDefault\(\)/.test(islandSrc));

/* ═══════════════════════════════════════════════════════════════════
   The shell: tabs, URL, and honest "planned" groups
   ═══════════════════════════════════════════════════════════════════ */
console.log('\n=== The tab strip is driven by the registry ===');
check('the shell imports GROUPS', /import\s*\{[^}]*GROUPS[^}]*\}\s*from\s*'\.\/preview\/groups'/.test(islandSrc));
check('tabs are mapped from GROUPS', /GROUPS\.map\(\(g\)/.test(islandSrc));
check('the strip is a real tablist', /role="tablist"/.test(islandSrc));
check('tabs carry aria-selected', /aria-selected=\{on\}/.test(islandSrc));
check('and a roving tabindex', /tabIndex=\{on \? 0 : -1\}/.test(islandSrc));
check('arrow keys move between tabs', /ArrowRight/.test(islandSrc) && /ArrowLeft/.test(islandSrc));

console.log('\n=== Every implemented group is actually wired in ===');
// Matched loosely because the JSX wraps some branches in a paren before the tag.
const wired = [...islandSrc.matchAll(/activeGroup === '([a-z]+)'[\s\S]{0,60}?<(\w+)/g)].map((m) => m[1]);
for (const g of IMPLEMENTED_GROUPS) {
  check(`${g.id} renders a component`,
    wired.includes(g.id), 'wired: ' + wired.join(','));
}
check('no unimplemented group renders a component',
  GROUPS.filter((g) => !g.implemented).every((g) => !wired.includes(g.id)));

console.log('\n=== There is no Overview group to maintain ===');
// It reported on tokens rather than previewing components, and it made the
// showcase open on a report. Its one useful idea — which slots are still unset —
// survives as an inline "Awaiting Tokens" frame in the groups that need them.
check('no group is called overview',
  !GROUPS.some((g) => g.id === 'overview'));
check('the Overview group file is gone',
  !existsSync(join(process.cwd(), 'src/components/preview/preview/groups/OverviewGroup.tsx')));
check('the shell does not import it',
  !/OverviewGroup/.test(islandSrc));
check('the unset-slot report survives inline in the buttons group',
  /Awaiting Tokens/.test(stripComments(read('src/components/preview/preview/groups/ButtonsGroup.tsx'))));

console.log('\n=== The showcase stays plain ===');
// A previous version captioned six identical buttons "Hover", "Focus-visible" and
// "Active" without applying any such state. On a page whose job is to report
// colours truthfully, a caption the DOM does not support is the worst output it
// can produce.
for (const [name, file] of Object.entries(groupFiles)) {
  const src = stripComments(read(file));
  check(`${name} captions no state it does not apply`,
    !/\b(Hover|Focus-visible|Active|Loading)\b\s*<\/|<(Button|SolidButton)[^>]*label="(Hover|Focus-visible|Active|Loading)"/.test(src),
    'found a state caption with no state behind it');
}
check('no placeholder icon-button filler',
  !/\{?\['S',\s*'B',\s*'U'\]/.test(stripComments(read('src/components/preview/preview/groups/ButtonsGroup.tsx'))));

console.log('\n=== A Swatch inside an inline element declares `as` ===');
// `Swatch` renders a <div> by default, and the parser cannot re-parent a <div>
// back into a <span>. This bug shipped once already: the button fill and label
// were detached from their click targets by hydration while still looking right.
for (const [name, file] of Object.entries(groupFiles)) {
  const offenders = swatchesInInlineElements(file);
  check(`${name} has no undeclared Swatch in an inline parent`, offenders.length === 0,
    offenders.join('; '));
}
// A guard that cannot fail is not a guard, so re-introduce the exact regression
// and confirm it is caught.
{
  const src = stripComments(read('src/components/preview/preview/groups/ButtonsGroup.tsx'));
  const mutated = src.replace('as="span"\n        class="self-stretch"', 'class="self-stretch"');
  check('it fires when `as` is removed again',
    mutated !== src && inlineSwatches(mutated).length > 0,
    'the mutation did not apply, so the guard is untested');
}

console.log('\n=== An unimplemented group shows a planned panel, not a blank ===');
check('the planned panel is rendered for unimplemented groups',
  /!active\.implemented && <PlannedGroup/.test(islandSrc));
check('and it says plainly that the group is not built',
  /Planned — not built/.test(islandSrc));
check('it names the group rather than showing a generic message',
  /label=\{group\.label\}/.test(islandSrc) && /\{group\.blurb\}/.test(islandSrc));
check('the planned panel reports real coverage, not a canned message',
  /paint\.inventory/.test(islandSrc));

console.log('\n=== The tab is shareable without spamming history ===');
check('a group id in the URL is validated against the registry',
  /isGroupId\(raw\)/.test(islandSrc));
// The fallback is the one named default, not a duplicated literal — so the
// default cannot be changed in the registry and forgotten in the router.
check('an unknown id cannot reach the router',
  /\?\s*raw\s*:\s*DEFAULT_GROUP\b/.test(islandSrc),
  islandSrc.match(/return isGroupId[\s\S]{0,60}/)?.[0]);
check('validation is one shared predicate, not a local copy',
  /import[^}]*isGroupId[^}]*} from '\.\/preview\/groups'/.test(islandSrc));
check('switching tabs replaces rather than pushes',
  /replaceState/.test(islandSrc) && !/pushState/.test(islandSrc));
check('the default group keeps the URL clean',
  /url\.searchParams\.delete\('group'\)/.test(islandSrc));

console.log('\n=== The first render must match the server\'s ===');
// The site is statically prerendered, so `Astro.url` arrives with no query string:
// a `?group=forms` link cannot be server-rendered as Forms without an SSR
// adapter. (Verified — `Astro.url.search` is empty on this page.) So the island
// cannot read the URL during render without disagreeing with the markup it was
// handed, which costs a hydration mismatch and a throwaway render of every
// swatch on every shared link.
check('the initial state is the default, not window.location',
  /useState<GroupId>\(DEFAULT_GROUP\)/.test(islandSrc) &&
  !/useState<GroupId>\(readGroupFromUrl\)/.test(islandSrc),
  'the seed has to be the value the server rendered');
check('the page therefore passes no group prop',
  !/initialGroup/.test(pageSrc));
check('and does not pretend to read the query string server-side',
  !/Astro\.url\.searchParams/.test(pageSrc),
  'Astro.url has no query on a prerendered page — this would silently always take the fallback');
check('the URL is adopted in a layout effect, so the swap is never painted',
  /useLayoutEffect\(\(\) => \{\s*\n\s*const sync = \(\) => setActiveGroup\(readGroupFromUrl\(\)\);\s*\n\s*sync\(\);/.test(islandSrc),
  islandSrc.match(/useLayoutEffect[\s\S]{0,90}/)?.[0]);
check('and still listens for the back button',
  /popstate/.test(islandSrc));
// Behaviour, not shape: the predicate is what the island and the router share.
check('isGroupId accepts a real id', isGroupId('buttons') === true);
check('rejects an unknown one', isGroupId('nope') === false);
check('rejects a removed one', isGroupId('overview') === false,
  'a stale bookmark to a deleted group must not count as valid');
check('rejects a missing one', isGroupId(null) === false && isGroupId(undefined) === false);
check('and rejects anything that is not an exact id',
  GROUPS.every((g) => isGroupId(g.id)) &&
  ['Buttons', 'buttons ', ' buttons', 'BUTTONS'].every((v) => !isGroupId(v)));

console.log('\n=== The island resolves every slot once per render ===');
check('createPaint is memoised on cart and theme',
  /useMemo\(\(\) => createPaint\(cart, previewTheme\), \[cart, previewTheme\]\)/.test(islandSrc));
check('groups receive Paint, not the raw cart',
  /<ButtonsGroup paint=\{paint\}/.test(islandSrc) &&
  /<FormsGroup paint=\{paint\}/.test(islandSrc));

/* ═══════════════════════════════════════════════════════════════════
   SSR: the page must work before hydration
   ═══════════════════════════════════════════════════════════════════ */
console.log('\n=== The built page ships real, clickable content ===');
const distPage = join(process.cwd(), 'dist/ui-preview/index.html');
if (!existsSync(distPage)) {
  check('dist/ui-preview exists (run `npm test`, which builds first)', false);
} else {
  const html = readFileSync(distPage, 'utf8');
  const slots = [...html.matchAll(/<[a-z]+ [^>]*data-context-role="([^"]*)"[^>]*>/g)];

  check('the island is not server-rendered empty', html.length > 20000);
  check('it ships colourable elements before hydration', slots.length > 20,
    'found ' + slots.length);
  // Matched on the label alone, and HTML-escaped: JSX puts newlines around the
  // interpolated text (so `>Overview<` never appears) and escapes `&`
  // ("Lists & Data" ships as "Lists &amp; Data").
  const escaped = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  check('every group tab is server-rendered',
    GROUPS.every((g) => html.includes(escaped(g.label))),
    GROUPS.filter((g) => !html.includes(escaped(g.label))).map((g) => g.label).join(','));
  check(`the default tab is ${DEFAULT_GROUP}`, html.includes('>Solid<') || html.includes('Solid'));

  // `Swatch` renders a <div> by default, and a <div> cannot live inside a <span>:
  // the parser closes the span and re-parents the divs as siblings. The
  // server-rendered DOM then no longer matches the tree Preact hydrates, so the
  // fill and the label get detached from their click targets — the page looks
  // right and stops working. Asserted on the output, because that mismatch is
  // only observable in the parsed DOM, not in the source.
  const blockInSpan = [...html.matchAll(/<span[^>]*>\s*<(div|section|article|ul|ol|table|form|p|h[1-6])[\s>]/g)];
  check('no block element is nested inside an inline one',
    blockInSpan.length === 0,
    blockInSpan.length + ' found, first: ' + (blockInSpan[0]?.[0]?.slice(0, 80) ?? ''));

  // The original bug: everything painted at one step.
  const steps = new Set(slots.map((m) => m[1]));
  check('painted elements span more than one step', steps.size > 1,
    'steps: ' + [...steps].join(','));
  check('and more than one role', new Set(slots.map((m) => m[0])).size > 1);

  // Every unset element must still be reachable.
  const pending = [...html.matchAll(/<[a-z]+ [^>]*data-pending="true"[^>]*>/g)];
  check('unset slots are rendered, not hidden', pending.length > 0);
  check('and every one of them still names its slot',
    pending.every((m) => m[0].includes('data-context-role')),
    pending.filter((m) => !m[0].includes('data-context-role')).length + ' without a role');
  check('and every one still offers to be authored',
    pending.every((m) => m[0].includes('click to author it')),
    pending.filter((m) => !m[0].includes('click to author it')).length + ' without the prompt');

  // An unset slot must not look like a chosen one. The strict case is a *fill*:
  // it paints transparent, so a missing accent can never masquerade as a real
  // colour and get graded against its own label.
  const pendingFill = pending.filter((m) => m[0].includes('data-swatch-part="bg"'));
  check('an unset fill paints nothing at all',
    pendingFill.length > 0 &&
      pendingFill.every((m) => m[0].includes('background-color:transparent')),
    pendingFill.filter((m) => !m[0].includes('background-color:transparent')).length +
      ' of ' + pendingFill.length + ' painted a colour');

  // A pending *foreground* is the one deliberate exception. A button label has to
  // be legible or you cannot tell "Save changes" from "Delete", so it falls back
  // to readable chrome — which means the disclosure has to carry the honesty
  // instead: dashed edge, data-pending, and a tooltip naming the missing token.
  const pendingText = pending.filter((m) => m[0].includes('data-swatch-part="text"'));
  check('an unset label is readable, so it must be visibly unset',
    pendingText.length > 0 && pendingText.every((m) => m[0].includes('border-style:dashed')),
    pendingText.filter((m) => !m[0].includes('border-style:dashed')).length +
      ' of ' + pendingText.length + ' look filled-in');
}

console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'));
process.exit(failures === 0 ? 0 : 1);