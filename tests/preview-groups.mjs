/**
 * Covers the grouped showcase: the group registry, the semantic token layer, the
 * fixture the dummy components live inside, and the "every painted element is
 * selectable" contract.
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
 * A third gap showed up when the showcase was rebuilt as rails of specimen cards:
 * the dummy components were painted on this site's own grey ramp, in this site's
 * own typeface, at this site's own geometry. They read as *part of the product*,
 * which made the page's claim — "these colours survive contact with a real app" —
 * unfalsifiable, because the app it was imitating was the one wrapping it. So the
 * fixture ramp, the shared component kit and the no-motion rule are pinned here
 * alongside the older invariants.
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
  FIXTURE_NEUTRALS,
  PLACEHOLDER_INK,
  accent,
  createPaint,
  fixtureStage,
  resolveSlot,
  scorePair,
  slotInventory,
  tint,
  worstOf,
} from '../src/components/preview/preview/slots.ts';
import { createOklchColor, getWcagContrast } from '../src/utils/color.ts';

let failures = 0;
function check(name, cond, extra = '') {
  if (cond) console.log('PASS  ' + name);
  else {
    failures++;
    console.log('FAIL  ' + name + (extra ? '\n      ' + extra : ''));
  }
}

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8');

/**
 * Every file that can put a colour on the canvas inside a group.
 *
 * Declared up here rather than next to the checks that use it, because several
 * sections below read these files — a source-level rule that only lives next to
 * one assertion is a rule that goes stale when the file it guards is rewritten.
 *
 * `kit.tsx` is in the list, not just the group files: the components were moved
 * out of the groups precisely so one `KitButton` cannot mean two things in two
 * groups, and that move would otherwise leave every colourability check pointing
 * at files that no longer contain a single `Swatch`.
 */
const GROUP_DIR = 'src/components/preview/preview/groups/';
const groupFiles = {
  Navigation: GROUP_DIR + 'NavigationGroup.tsx',
  Buttons: GROUP_DIR + 'ButtonsGroup.tsx',
  Forms: GROUP_DIR + 'FormsGroup.tsx',
  Cards: GROUP_DIR + 'CardsGroup.tsx',
  Lists: GROUP_DIR + 'ListsGroup.tsx',
  Feedback: GROUP_DIR + 'FeedbackGroup.tsx',
  Overlays: GROUP_DIR + 'OverlaysGroup.tsx',
  'Data Viz': GROUP_DIR + 'DataVizGroup.tsx',
  Rail: 'src/components/preview/preview/Specimen.tsx',
  Kit: 'src/components/preview/preview/kit.tsx',
};

/** Strip comments so an explanatory comment can never satisfy an assertion. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/**
 * Elements whose content model is phrasing only.
 *
 * The HTML parser cannot honour this. Given `<span><div>`, it closes the span
 * and re-parents the div as a sibling — so the tree Preact hydrates no longer
 * matches the tree the server sent, and anything inside the div (a slot's label,
 * the div's own click target) ends up detached from the element that owns it.
 * The page still looks right and silently stops working.
 *
 * `Swatch` is in this set because it renders a `<div>` unless a caller passes
 * `as`. So "a `<Swatch>` with no `as=`" and "a literal block tag" are the same
 * finding, reported by the same scan.
 *
 * The built-HTML check below catches this for the group that renders on load.
 * This one covers every other group, present and future, since `dist/` only ever
 * holds the default group's markup.
 */
const INLINE_ROOTS = new Set(['span', 'a', 'button', 'label', 'p', 'strong', 'em', 'b', 'i', 'small', 'code', 'legend']);
const BLOCK_TAGS = new Set(['div', 'section', 'article', 'ul', 'ol', 'table', 'form', 'p', 'dl', 'nav', 'aside']);

/**
 * What each `kit.tsx` export actually renders as its root element.
 *
 * Needed because the components are opaque to a tag scanner: `<KitAvatar />` says
 * nothing about whether it produces a div or a span, and it produced a div. That
 * is not hypothetical — an avatar wrapped in `<span style="margin-left:-10px">`
 * to overlap the stack shipped this way, and only the built-HTML check caught it,
 * because `dist/` holds exactly one group. A guard that only covers the group on
 * load is not a guard.
 *
 * Derived from the kit's own source rather than hand-listed, so a component that
 * changes its root element is re-classified on the next run instead of silently
 * keeping an answer that used to be right. `null` means the root could not be
 * read, which the scan treats as block — the parser can only break markup in one
 * direction, so failing closed is the safe side of the ambiguity.
 */
function kitRootElements(src) {
  const roots = new Map();
  for (const m of src.matchAll(/export function (Kit\w+)\s*\(/g)) {
    const body = src.slice(m.index + m[0].length);
    const ret = body.search(/\breturn\b/);
    // The first tag after `return` is the root of what the component renders;
    // everything before it is types, destructuring and comments.
    const tag = ret === -1 ? null : body.slice(ret).match(/<([A-Za-z][\w.]*)((?:[^<>]|\n)*?)>/);
    if (!tag) { roots.set(m[1], null); continue; }
    const [, name, attrs] = tag;
    if (name === 'Swatch' && /\bas=/.test(attrs)) roots.set(m[1], attrs.match(/as="(\w+)"/)?.[1] ?? null);
    else if (BLOCK_TAGS.has(name)) roots.set(m[1], name);
    else if (INLINE_ROOTS.has(name)) roots.set(m[1], null);
    else roots.set(m[1], name); // another kit component: assume block until proven otherwise
  }
  return roots;
}

/**
 * Report anything that will render as a block inside an element the parser
 * treats as phrasing.
 *
 * A tag scanner rather than a regex: "is this inside a span" is a question about
 * the tree, and the answer has to survive a tag moving one line down.
 */
function inlineBlockRoots(src, kitRoots = new Map()) {
  const stack = [];
  const found = [];
  // Attribute values in these files never contain < or >, so a flat tag scan is
  // enough; `style={...}` and `class="..."` are opaque either way.
  for (const m of src.matchAll(/<(\/?)([A-Za-z][\w.]*)([^<>]*)>/g)) {
    const [full, closing, name, attrs] = m;
    const line = src.slice(0, m.index).split('\n').length;
    if (closing) {
      const i = stack.lastIndexOf(name);
      if (i >= 0) stack.length = i;
      continue;
    }
    const parent = stack.find((t) => INLINE_ROOTS.has(t));
    if (parent) {
      // A `Swatch` is only a block by accident — `as="span"` is the opt-out.
      // So is a kit component: what it renders is resolved from the kit's own
      // source, which is why the map is a parameter rather than a guess.
      const isBlock = name === 'Swatch'
        ? !/\bas=/.test(attrs)
        : BLOCK_TAGS.has(name) || (kitRoots.has(name) && BLOCK_TAGS.has(kitRoots.get(name)));
      if (isBlock) {
        // Line numbers are approximate: callers scan comment-stripped source, so
        // they are a "look around here" pointer, not a file:line.
        found.push(`<${name}> renders a block inside <${parent}> (near line ~${line})`);
      }
    }
    if (!attrs.trimEnd().endsWith('/')) stack.push(name);
  }
  return found;
}

function blocksInInlineElements(file, kitRoots) {
  return inlineBlockRoots(stripComments(read(file)), kitRoots);
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
   The fixture ramp: a foreign backdrop, by construction
   ═══════════════════════════════════════════════════════════════════ */
console.log('\n=== The fixture is a different product, not this site ===');
// The components are imitations of someone else's UI. Painting them on this
// site's own grey ramp made them read as *ours* — so a palette that happened to
// flatter oklchcolor2's chrome flattered itself, and the page's whole claim ("
// these survive contact with a real product") quietly became unfalsifiable.
const stageBacked = Object.keys(STAGE).filter((k) => STAGE[k].neutral);
check('every stage slot that has a site stand-in has a different fixture one',
  stageBacked.every((k) =>
    FIXTURE_NEUTRALS[k] &&
    FIXTURE_NEUTRALS[k].dark !== STAGE[k].neutral.dark &&
    FIXTURE_NEUTRALS[k].light !== STAGE[k].neutral.light),
  stageBacked.filter((k) => !FIXTURE_NEUTRALS[k] ||
    FIXTURE_NEUTRALS[k].dark === STAGE[k].neutral.dark ||
    FIXTURE_NEUTRALS[k].light === STAGE[k].neutral.light).join(','));
// `muted` is the one key the fixture has and the stage does not — and that is
// the design, not an oversight: it is caption ink, the single place the two ramps
// are allowed to blend. Asserted so it stays a decision rather than becoming one
// by accident if `STAGE.muted` ever grows a neutral of its own.
check('the fixture\'s one extra key is caption ink, and nothing else',
  Object.keys(FIXTURE_NEUTRALS).filter((k) => !stageBacked.includes(k)).join(',') === 'muted');
check('and the two themes of the fixture are not the same colour',
  Object.keys(FIXTURE_NEUTRALS).every((k) => FIXTURE_NEUTRALS[k].dark !== FIXTURE_NEUTRALS[k].light));
// It has to be a ramp, not a wall: a canvas and its card surface have to be
// distinguishable, or "do my surfaces stack?" is unanswerable on an empty cart.
// 1.02:1 is a whisker above identical, which is all "visibly different" costs on
// a neutral grey pair — the fixture is deliberately low-contrast, and the point
// of the check is that it is not *zero*.
check('the fixture canvas and surface are distinguishable in both themes',
  ['dark', 'light'].every((t) =>
    getWcagContrast(FIXTURE_NEUTRALS.surface[t], FIXTURE_NEUTRALS.canvas[t]) > 1.02),
  'canvas and surface are the same value');
// Deliberately desaturated. A saturated stand-in would bias every judgement made
// against it — which is the exact failure the chrome ramp was built to avoid.
// Measured as the raw channel spread rather than as HSL saturation because the
// palette is OKLCH-native and this only has to answer "is there a hue here?".
// Cool slate grey peaks around 28; the deepest blue anyone would call a colour
// sits an order of magnitude above it.
check('the fixture stand-ins are low-chroma greys, not hues',
  Object.values(FIXTURE_NEUTRALS).every((n) =>
    [n.dark, n.light].every((hex) =>
      Math.max(...[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))) -
        Math.min(...[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))) <= 40)),
  Object.entries(FIXTURE_NEUTRALS)
    .flatMap(([k, n]) => [n.dark, n.light]
      .filter((hex) => Math.max(...[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))) -
        Math.min(...[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))) > 40)
      .map((hex) => k + ' ' + hex))
    .join(', '));

console.log('\n=== The fixture asks for the same tokens, in a different dress ===');
// The point of `Paint.fixture` is to be the *same* tokens: a second, independent
// spec is a second thing to keep in sync, and the two would drift the first time
// someone changed a step.
const fx = fixtureStage(bare, 'canvas', 'dark');
check('it requests the identical role and step as the stage',
  fx !== null && fx.role === STAGE.canvas.role && fx.requested === STAGE.canvas.steps.dark);
check('but resolves to the foreign stand-in instead',
  fx.css === FIXTURE_NEUTRALS.canvas.dark && fx.onNeutral === true);
check('and discloses that it is a stand-in, same as any other',
  fx.substituted === false && fx.hex === null);
check('a set token still wins over the foreign stand-in',
  // `cart` deliberately leaves `background` empty, so this needs its own: the
  // foreign ramp is a *placeholder*, and a placeholder that outranked a real
  // token would mean the fixture quietly overrode the user's palette.
  fixtureStage(fakeCart({ background: { 950: createOklchColor(0.2, 0.03, 250) } }),
    'canvas', 'dark').onNeutral === false);
check('every stage slot has a fixture counterpart except the foregrounds',
  ['canvas', 'surface', 'raised', 'border', 'divider', 'muted']
    .every((k) => FIXTURE_NEUTRALS[k] !== undefined) &&
  FIXTURE_NEUTRALS.text === undefined);
check('so Paint.fixture carries no text, by design',
  !('text' in createPaint(bare, 'dark').fixture),
  'an unset foreground must stay unset on both ramps');
check('and its caption ink falls back only after the real token is absent',
  createPaint(fakeCart({ text: { 400: createOklchColor(0.5, 0.02, 250) } }), 'dark').fixture.ink !== FIXTURE_NEUTRALS.muted.dark);

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

console.log('\n=== A rail reports its worst pair, not its unscored one ===');
// The rail header carries one number. Which pair it picks is therefore load
// bearing: rank an unscored pair as if it were 0:1 and every rail whose first
// role happens to be unset reads "Fail" no matter how good the other five are —
// which teaches the reader that unset means failing, when the opposite is true.
const goodPair = scorePair('good', dark.on, dark.fill);
const badPair = scorePair('bad', dark.fill, dark.fill);
check('the fixture pairs can produce a real range', goodPair.wcag > 1 && badPair.wcag === 1);
check('worstOf picks the lowest scored ratio',
  worstOf([goodPair, badPair, goodPair])?.label === 'bad');
check('and it ignores an unscored pair entirely',
  worstOf([null, goodPair, null])?.label === 'good',
  'an unscored pair was ranked, so an unset role could outrank a failing one');
check('order does not matter',
  worstOf([goodPair, badPair])?.label === worstOf([badPair, goodPair])?.label);
check('nothing scorable returns null, not a fabricated zero',
  worstOf([null, null]) === null);
check('a rail with no accents therefore says "set an accent to score"',
  // The exact phrase the Buttons rail prints, because a rail must never show a
  // grade it could not compute — alongside the bare ratio it prints when it can.
  /\$\{worst\.wcag\}:1/.test(read(groupFiles.Buttons)) &&
  /'set an accent to score'/.test(read(groupFiles.Buttons)));
check('a rail reports a ratio, never a verdict',
  // `worst 3.45:1 · Fail` said in six words what the number already says, and
  // its fail state dressed the pill in the hover fill plus the focus-ring
  // border — an interactive state drawn permanently, which read as something
  // stuck rather than as a report. No group prints a grade any more.
  Object.values(groupFiles).every((f) => !read(f).includes('${worst.grade}')),
  Object.values(groupFiles)
    .filter((f) => read(f).includes('${worst.grade}'))
    .join(','),
  );

console.log('\n=== A tint is a derivative, never a new token ===');
// Tinted fills are everywhere in the fixture: a slider track, a soft badge, a
// row hover. Each one is a `color-mix` of a token, so nothing new enters the
// palette — which is the whole reason the helper exists instead of each widget
// hand-writing its own mix.
check('it wraps the slot in a color-mix', /^color-mix\(in oklab, /.test(tint('#ff0000', 0.16)));
check('at the requested alpha, as a percentage',
  tint('#ff0000', 0.16).includes('16%') && tint('#ff0000', 1).includes('100%'));
check('and hands the colour through untouched',
  tint('#ff0000', 0.5).includes('#ff0000'));
check('a widget cannot invent an opacity the layer does not name',
  // The rounded percentage is the tell: `0.161` and `0.16` cannot produce two
  // different mixes, so the helper has to quantise rather than pass through.
  tint('#ff0000', 0.161).includes('16%'));
check('no group or the kit hand-writes a color-mix',
  Object.values(groupFiles).every((f) =>
    !/color-mix\(/.test(stripComments(read(f)))),
  Object.entries(groupFiles)
    .filter(([, f]) => /color-mix\(/.test(stripComments(read(f))))
    .map(([n]) => n).join(','));

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
const kitSrc = stripComments(read(groupFiles.Kit));
const kitRoots = kitRootElements(kitSrc);
check('the kit\'s root elements were all readable', kitRoots.size > 20,
  'only found ' + kitRoots.size + ' components — the extraction has drifted');

for (const [name, file] of Object.entries(groupFiles)) {
  check(`${name} file exists`, existsSync(join(process.cwd(), file)));
  const src = stripComments(read(file));
  // A group paints by *reaching* a `Swatch`, which it may do directly or through
  // the kit. Asserting the import directly — as this did when there were only
  // two group files and both painted their own components — would have failed
  // every file except the two that happen to paint a dashed hole by hand.
  check(`${name} reaches Swatch, directly or through the kit`,
    /from '(\.\.?\/)+Swatch'/.test(src) || /from '(\.\.?\/)+kit'/.test(src),
    'neither `Swatch` nor the kit is imported, so nothing here can paint a slot');
  check(`${name} never hardcodes a painted step`,
    !/data-context-step="\d+"/.test(src),
    'hardcoded step found — steps must come from the slot');
}
// …and the transitively important half: the kit itself is the only file that
// defines components, so it must be doing the painting.
check('the kit is where the painting happens', /<Swatch/.test(kitSrc));

console.log('\n=== The fixture invents no colours ===');
// Every fill, edge and piece of ink is a `Swatch` over a slot. A raw hex or a
// `color-mix` inline would be a colour on the canvas that clicking cannot reach —
// the one failure this whole layer exists to make impossible. The three named
// shadows are the exemption, and it is stated once rather than at each call site,
// so it can be counted rather than remembered.
check('no file in the fixture hardcodes a hex colour',
  Object.entries(groupFiles).every(([n, f]) => {
    const hits = [...stripComments(read(f)).matchAll(/#[0-9a-fA-F]{3,8}\b/g)];
    return hits.length === 0;
  }),
  Object.entries(groupFiles)
    .flatMap(([n, f]) => [...stripComments(read(f)).matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => `${n}: ${m[0]}`))
    .join(', '));
check('no file writes a literal colour function outside the named shadows',
  Object.entries(groupFiles).every(([n, f]) => {
    // Every `rgba(`/`hsl(` in the fixture must sit in a `const NAME = '…'`
    // declaration, i.e. be one of the exemptions rather than an inline colour
    // written at a call site. Counting the declarations, not the uses, is the
    // point: a shadow used in eleven places is still one invented value.
    const strays = [...stripComments(read(f)).matchAll(/^[^\n]*\b(?:rgba?|hsla?)\([^\n]*$/gm)]
      .map((m) => m[0].trim())
      .filter((line) => !/^const [A-Z_]+ = '.*(?:rgba?|hsla?)\(.*';$/.test(line));
    return strays.length === 0;
  }),
  Object.entries(groupFiles)
    .flatMap(([n, f]) => [...stripComments(read(f)).matchAll(/^[^\n]*\b(?:rgba?|hsla?)\([^\n]*$/gm)]
      .map((m) => m[0].trim())
      .filter((line) => !/^const [A-Z_]+ = '.*(?:rgba?|hsla?)\(.*';$/.test(line))
      .map((line) => `${n}: ${line}`))
    .join(' | '));
check('so the only non-token values are the three named shadows',
  (kitSrc.match(/rgba\(/g) ?? []).length === 3 &&
    /const RAISED_EDGE = .*rgba\(/.test(kitSrc) &&
    /const LIFTED = .*rgba\(/.test(kitSrc) &&
    /const LIFTED_HARD = .*rgba\(/.test(kitSrc),
  (kitSrc.match(/rgba\(/g) ?? []).length + ' rgba() literals, expected the three named shadows');
check('and each is actually used',
  [ 'RAISED_EDGE', 'LIFTED', 'LIFTED_HARD' ].every((n) =>
    (kitSrc.match(new RegExp(`\\b${n}\\b`, 'g')) ?? []).length >= 2),
  'a named shadow with no use is an exemption that has quietly grown');

console.log('\n=== One vocabulary, so one button cannot mean two things ===');
// The components were pulled out of the group files precisely to stop that. The
// rule is not "no group may touch Swatch" — a group legitimately paints a slot of
// its own, like the dashed "not set" card in Buttons. The rule is that it does so
// with the shared components and does not define its own.
const kitExports = new Set([...kitSrc.matchAll(/export function (Kit\w+)/g)].map((m) => m[1]));
check('no component is defined twice in the kit',
  kitExports.size === [...kitSrc.matchAll(/export function (Kit\w+)/g)].length,
  'a duplicate export means two groups get different behaviour from one name');
for (const [name, file] of Object.entries(groupFiles)) {
  if (name === 'Kit' || name === 'Rail') continue;
  const src = stripComments(read(file));
  const imported = [...(src.match(/import\s*\{([^}]*)\}\s*from '\.\.\/kit'/) ?? [null, ''])[1]
    .split(',')]
    .map((s) => s.trim().replace(/^type\s+/, ''))
    .filter(Boolean);
  check(`${name} builds on the shared kit`, imported.some((n) => n.startsWith('Kit')),
    'it imports nothing from ../kit, so it is reinventing components');
  check(`${name} only names components the kit exports`,
    imported.every((n) => n.startsWith('Kit') ? kitExports.has(n) : true),
    'not exported by the kit: ' + imported.filter((n) => n.startsWith('Kit') && !kitExports.has(n)).join(','));
}
check('the rail is shared too, so no group invents its own card',
  Object.entries(groupFiles)
    .filter(([n]) => n !== 'Rail' && n !== 'Kit')
    .every(([, f]) => /import\s*\{[^}]*Specimen[^}]*\}\s*from '(\.\.\/)+Specimen'/.test(stripComments(read(f)))),
  Object.entries(groupFiles)
    .filter(([n, f]) => n !== 'Rail' && n !== 'Kit' && !/Specimen/.test(stripComments(read(f))))
    .map(([n]) => n).join(','));

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
// Captured as a map rather than a set of ids, because the tag name is what the
// next assertion needs: an id present but pointing at the wrong component would
// pass a membership check and render the wrong group.
const wiredMap = new Map(
  [...islandSrc.matchAll(/activeGroup === '([a-z]+)'[\s\S]{0,60}?<(\w+)/g)].map((m) => [m[1], m[2]])
);
const wired = [...wiredMap.keys()];
for (const g of IMPLEMENTED_GROUPS) {
  check(`${g.id} renders a component`,
    wired.includes(g.id), 'wired: ' + wired.join(','));
}
check('no unimplemented group renders a component',
  GROUPS.filter((g) => !g.implemented).every((g) => !wired.includes(g.id)));
// Each branch must render *its own* group file. A copy-paste error here would
// show the same rail under two tabs, which reads as "these are all the same".
const misrouted = IMPLEMENTED_GROUPS.filter((g) => {
  const tag = wiredMap.get(g.id);
  return tag && !new RegExp(`import\\s*\\{[^}]*\\b${tag}\\b[^}]*\\}\\s*from '\\./preview/groups/${tag}'`).test(islandSrc);
});
check('every branch renders the component its own id names',
  misrouted.length === 0,
  misrouted.map((g) => `${g.id} → ${wiredMap.get(g.id)}`).join(', '));

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
  /Awaiting Tokens/.test(stripComments(read(groupFiles.Buttons))));

console.log('\n=== The showcase stays plain ===');
// A previous version captioned six identical buttons "Hover", "Focus-visible" and
// "Active" without applying any such state. On a page whose job is to report
// colours truthfully, a caption the DOM does not support is the worst output it
// can produce.
for (const [name, file] of Object.entries(groupFiles)) {
  const src = stripComments(read(file));
  check(`${name} captions no state it does not apply`,
    !/\b(Hover|Focus-visible|Active|Loading)\b\s*<\/|<(Kit)?(Button|SolidButton)[^>]*label="(Hover|Focus-visible|Active|Loading)"/.test(src),
    'found a state caption with no state behind it');
  // The second half of the same rule, and the part that is easy to reintroduce:
  // a *depiction* of a state is fine ("Rest", "Not set"), a control that fakes
  // one is not — the fixture is a still frame, never an interactive surface.
  check(`${name} draws no fake focus or active ring`,
    !/\b(focus-visible:|ring-\[|ring-offset|focus:ring)/.test(src),
    'a fixture that renders its own focus ring is asserting something it cannot');
}
check('no placeholder icon-button filler',
  !/\{?\['S',\s*'B',\s*'U'\]/.test(stripComments(read(groupFiles.Buttons))));
// An icon button's glyph has to be a glyph. One-letter filler ("S", "B", "U")
// is what the old grid used to pad the row out, and it is unreadable as a
// control — you cannot tell a settings icon from an undo icon.
check('icon buttons use real glyph names, not letter filler',
  /glyph="[a-z-]{3,}"/.test(stripComments(read(groupFiles.Buttons))),
  'expected at least one glyph="…" of three or more characters');

console.log('\n=== Nothing in the fixture moves ===');
// The reference markup this replaced carried `transition-all duration-1000` and a
// drifting marquee. That is disqualifying here rather than merely tasteful: a
// component caught halfway through a colour interpolation would have its
// contrast graded against a colour nobody could see, so the page would report a
// number for a state that does not exist.
for (const [name, file] of Object.entries(groupFiles)) {
  const src = stripComments(read(file));
  check(`${name} sets no animation or transition`,
    !/\b(animate-[a-z]|transition(-[a-z]+)?(?=[\s"'`\/]|"|`)|duration-\d+|marquee)\b/.test(src),
    'found a motion class');
}
// ...and the frame is still: a card cannot resize itself either, or two components
// in a rail would stop being comparable at a glance.
check('the specimen card is a fixed square',
  /const CARD = 'w-\[13rem\] h-\[13rem\] shrink-0'/.test(
    stripComments(read('src/components/preview/preview/Specimen.tsx'))));

console.log('\n=== A block element is never nested inside an inline one ===');
// `Swatch` renders a <div> by default, and neither the parser nor Preact can keep
// a <div> inside a <span>. This bug shipped once already: the button fill and
// label were detached from their click targets by hydration while still looking
// right — and it happened a second time in this rewrite, as an avatar inside a
// `<span style="margin-left:-10px">`, which is why the scan is no longer about
// `as=` specifically.
for (const [name, file] of Object.entries(groupFiles)) {
  const offenders = blocksInInlineElements(file, kitRoots);
  check(`${name} nests nothing block-level inside an inline parent`, offenders.length === 0,
    offenders.join('; '));
}
// A guard that cannot fail is not a guard, so feed the scanner both shapes that
// actually broke this page and confirm each is caught. Written as literal JSX
// rather than as a mutation of a real file: the point under test is the scanner,
// and a mutation silently stops applying the day someone reformats the line it
// targeted — which is how a guard rots into a no-op that still prints PASS.
check('it fires on a Swatch with no `as` inside a span',
  inlineBlockRoots('<span><Swatch slot={s} role="primary" step={500} /></span>').length === 1);
check('and on a Swatch that declares `as="span"` in the same place',
  inlineBlockRoots('<span><Swatch as="span" slot={s} /></span>').length === 0);
check('it fires on a div-rooted component wrapped in a span',
  // The regression that shipped this round: `KitAvatarStack` wrapped an avatar in
  // `<span style="margin-left:-10px">` to overlap it, and `KitAvatar`'s root is a
  // div — so the parser hoisted it out and the avatar lost its slot's click
  // target while still rendering in the right place. Note this only fires because
  // the kit's roots are resolved; a scanner that reads `KitAvatar` as an unknown
  // tag would have passed it, which is precisely what the first version did.
  inlineBlockRoots('<span style={{ marginLeft: -10 }}><KitAvatar paint={paint} /></span>',
    kitRoots).length === 1);
check('and the kit really does resolve KitAvatar to a block root',
  kitRoots.get('KitAvatar') === 'div',
  'got ' + kitRoots.get('KitAvatar') + ' — either the component changed or the extraction did');
check('and it clears a component whose root is a span',
  // The complement of the case above: resolving "unknown" as block would make the
  // scan cry wolf on every inline helper, and a guard that always fires is a guard
  // nobody reads.
  kitRoots.get('KitText') === null || kitRoots.get('KitText') === 'span',
  'got ' + kitRoots.get('KitText'));
check('it survives nesting depth, not just one level down',
  // Three, not one: the whole ancestor chain is still phrasing context, so a
  // scan that only inspected the immediate parent would have found the section
  // legal because it sits inside a div.
  inlineBlockRoots('<span><div><p><section /></p></div></span>').length === 3);
check('a sibling span does not make it a child',
  inlineBlockRoots('<span /><div />').length === 0);
check('block inside block is fine',
  inlineBlockRoots('<div><section><div /></section></div>').length === 0);

console.log('\n=== A planned group is a live path, not dead code ===');
// Nothing in this slice reaches it, so the whole forward-compat story lives in
// one branch. It is asserted rather than deleted because the alternative —
// registering a ninth group and shipping a blank tab — is exactly what the
// panel exists to prevent.
check('the planned panel is rendered for unimplemented groups',
  /!active\.implemented && <PlannedGroup/.test(islandSrc));
check('and it says plainly that the group is not built',
  /Planned — not built/.test(islandSrc));
check('it names the group rather than showing a generic message',
  /label=\{group\.label\}/.test(islandSrc) && /\{group\.blurb\}/.test(islandSrc));
check('the planned panel reports real coverage, not a canned message',
  /paint\.inventory/.test(islandSrc));
// The registry is the only thing that decides, and every entry states it
// explicitly — so registering a ninth group as planned is one boolean, and
// forgetting to state it is a type error rather than a silent default.
const registrySrc = read('src/components/preview/preview/groups.ts');
check('every group states its implemented flag explicitly',
  (registrySrc.match(/^\s*implemented: (true|false),$/gm) ?? []).length === GROUPS.length,
  (registrySrc.match(/^\s*implemented: (true|false),$/gm) ?? []).length + ' flags for ' +
  GROUPS.length + ' groups');
check('and the type does not make it optional',
  /implemented:\s*boolean;/.test(registrySrc));

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
// Once per theme rather than once per render of the active theme: each
// specimen card pins its own Dark/Light setting (see `Specimen`) and needs the
// *other* theme's paint at the moment it renders. Resolving that inside the
// cards would redo the whole slot inventory 80-odd times per render — so the
// island builds both, memoised on the cart, and hands the pair down.
check('createPaint is memoised on the cart, once per theme',
  /useMemo\(\(\) => createPaint\(cart, 'dark', locale\), \[cart, locale\]\)/.test(islandSrc) &&
    /useMemo\(\(\) => createPaint\(cart, 'light', locale\), \[cart, locale\]\)/.test(islandSrc),
  islandSrc.match(/useMemo\(\(\) => createPaint[\s\S]{0,70}/)?.[0]);
check('the pair the cards read is memoised too',
  /useMemo<PaintPair>/.test(islandSrc));
// Every implemented group, not a sample of two: a group that took the raw cart
// would have to re-resolve slots per element, which is the cost `createPaint`
// exists to remove, and would be invisible until the page got slow.
const rawCartGroups = IMPLEMENTED_GROUPS.filter((g) => {
  const branch = islandSrc.match(
    new RegExp(`activeGroup === '${g.id}'[\\s\\S]{0,60}?<\\w+([^>]*)/`)
  );
  return !branch || !/\bpaint=\{paint\}/.test(branch[1]);
});
check('every group receives Paint, not the raw cart',
  rawCartGroups.length === 0,
  rawCartGroups.map((g) => g.id).join(','));
// The groups stack in a single column. It was a `@3xl` two-column grid of frames,
// which is the wrong shape for a rail: a rail wants the full width and scrolls,
// so halving it would have hidden half of every row behind a fold and broken
// the left-to-right reading order the comparison depends on.
check('groups stack in one full-width column',
  /<div class="space-y-8">\s*\n\s*\{!active\.implemented/.test(islandSrc),
  islandSrc.match(/<div class="space-y-8">[\s\S]{0,60}/)?.[0]);
check('and no group frame is dropped into a container-query grid',
  !/@3xl:grid-cols/.test(islandSrc));

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
  // interpolated text (so `>Buttons<` never appears) and escapes `&`
  // ("Lists & Data" ships as "Lists &amp; Data").
  const escaped = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  check('every group tab is server-rendered',
    GROUPS.every((g) => html.includes(escaped(g.label))),
    GROUPS.filter((g) => !html.includes(escaped(g.label))).map((g) => g.label).join(','));

  // The default group is Buttons, and Buttons opens on the variant rail — so the
  // caption is the thing to look for. Asserted on the caption's `title`, because
  // the visible text is split across two elements (`Button` + ` · Classic`) and
  // only the title keeps the two halves adjacent; it is also the accessible name,
  // so a caption that renders as one string is one that reads as one string.
  check(`the default tab is ${DEFAULT_GROUP}`,
    html.includes('title="Button · Classic') && html.includes('title="Button · Ghost'),
    'expected the Buttons variant captions to be server-rendered');
  check('specimens are captioned `Component · Variant`, not a bare step',
    (html.match(/title="[A-Z][^"]* · [^"]* — click any part to edit its token"/g) ?? []).length > 4,
    'a caption the reader cannot parse as "component, variant" defeats the rail');
  // Every rail in the default group, so a rail dropped by accident is visible in
  // the output rather than as a mysteriously shorter page.
  for (const rail of ['Variants', 'Sizes &amp; Icon Buttons', 'Same Pair, Other Shapes', 'Every Accent Role']) {
    check(`the "${rail}" rail ships`, html.includes(rail));
  }

  // `Swatch` renders a <div> by default, and a <div> cannot live inside a <span>:
  // the parser closes the span and re-parents the divs as siblings. The
  // server-rendered DOM then no longer matches the tree Preact hydrates, so the
  // fill and the label get detached from their click targets — the page looks
  // right and stops working. Asserted on the output, because that mismatch is
  // only observable in the parsed DOM, not in the source.
  //
  // Kept in step with `BLOCK_TAGS` above on purpose: the source scan covers the
  // seven groups `dist/` never renders, and this covers the one it does, so a
  // change to either list has to be made in both.
  const blockInSpan = [...html.matchAll(/<span[^>]*>\s*<(div|section|article|ul|ol|table|form|p|h[1-6])[\s>]/g)];
  check('no block element is nested inside an inline one',
    blockInSpan.length === 0,
    blockInSpan.length + ' found, first: ' + (blockInSpan[0]?.[0]?.slice(0, 80) ?? ''));

  // The original bug: everything painted at one step.
  const steps = new Set(slots.map((m) => m[1]));
  check('painted elements span more than one step', steps.size > 1,
    'steps: ' + [...steps].join(','));
  const paintedRoles = new Set(slots.map((m) => m[0]));
  check('and more than one role', paintedRoles.size > 1,
    'roles: ' + [...paintedRoles].join(','));

  // The fixture has to be its own ramp. If the foreign neutrals ever collapsed
  // onto the site's own stage ramp, every card would adopt this site's chrome and
  // the page would start grading a palette against the product it ships inside —
  // which is the claim it exists to avoid.
  check('the unset fixture canvas is not this site\'s canvas',
    html.includes('background-color:#161a21') && !html.includes('background-color:#0f0f0f'),
    'expected the fixture stand-in #161a21 and no #0f0f0f on the preview canvas');

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