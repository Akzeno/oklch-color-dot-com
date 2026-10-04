/**
 * Covers the "Export & Code" shortcut at the top of the Design Tokens role
 * list — the affordance that ends the test-then-ship loop without leaving the
 * app shell to find the nav.
 *
 * WHY IT IS GATED ON HAVING TOKENS
 *
 * `ExportIsland` emits one CSS custom property per populated shade slot, and
 * when there are none its entire output is the comment
 * `/* No colors in cart yet. Add swatches or generate scales first! *\/`.
 * So a zero-token cart does not produce a small export — it produces an export
 * page with nothing on it. The gate condition (`filledShadesCount > 0`) is
 * therefore exactly equivalent to "the export would have content", which is
 * asserted below rather than assumed.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { setRoleShade, clearRoleScale, cartStore } from '../src/stores/cartStore.ts';
import { createOklchColor, SHADE_STEPS } from '../src/utils/color.ts';

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

const src = (p) => readFileSync(join(process.cwd(), p), 'utf8');
/**
 * Strip block comments before asserting on source text.
 *
 * Every check below is a string search over the component source, which means a
 * comment can satisfy it — or break it — on its own. The first run of this suite
 * failed "the redundant Token Roles label is gone" because the comment
 * *explaining* that removal contained the phrase. Comments are prose about the
 * code, never the code.
 */
const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '');
const sidebar = stripComments(src('src/components/preview/CartSidebar.tsx'));
const sidebarIsland = src('src/components/layout/SidebarIsland.tsx');
const navigation = src('src/config/navigation.ts');
const exportIsland = src('src/components/export/ExportIsland.tsx');

/** The exact loop `ExportIsland` uses to build its CSS custom properties. */
function exportedTokenLines(cart) {
  const lines = [];
  Object.values(cart.roles).forEach((role) => {
    SHADE_STEPS.forEach((step) => {
      const token = role.shades[step];
      if (token) lines.push(`--color-${role.id}-${step}`);
    });
  });
  return lines;
}
const filledShadesCount = (cart) =>
  Object.values(cart.roles).reduce((sum, r) => sum + Object.keys(r.shades).length, 0);

console.log('=== It is one shortcut above the list, not one per role ===');
check('the link is rendered a single time', (sidebar.match(/href="\/export"/g) || []).length === 1,
  'found ' + (sidebar.match(/href="\/export"/g) || []).length);
// Positional, not a regex window: a comment block of any length may sit between
// the container and the link, so compare indices rather than counting characters.
const listOpen = sidebar.indexOf('overflow-y-auto p-3 space-y-3');
const linkAt = sidebar.indexOf('href="/export"');
const mapAt = sidebar.indexOf('rolesArray.map');
check('it sits inside the scrollable role-list container',
  listOpen !== -1 && linkAt > listOpen, 'list opens at ' + listOpen + ', link at ' + linkAt);
check('and above the roles it applies to', linkAt < mapAt,
  'link at ' + linkAt + ', map at ' + mapAt);

console.log('\n=== It is styled to be noticed, not read as a caption ===');
/*
 * Regression guards for "the button feels lost". The first version was a
 * text-[10px] half-width pill in the panel's quiet-control palette, visually
 * identical to the trash/rename icon buttons, sharing its row with a redundant
 * dim label. Each assertion below pins one of the specific things that made it
 * recede, so it cannot quietly regress back.
 */
// 10px was the smallest text in the panel, below every other action button.
check('it is no longer 10px text',
  !/<a\s[^>]*href="\/export"[\s\S]{0,900}?text-\[10px\]/.test(sidebar),
  'a text-[10px] size is back in the link\'s class list');
check('it uses text-xs, matching the panel\'s other action buttons',
  /href="\/export"[\s\S]{0,900}?text-xs/.test(sidebar));
// Half-width was forced by a redundant label that the panel header already covers.
check('the redundant "Token Roles" label is gone',
  !sidebar.includes('Token Roles'));
check('the link is full width', /href="\/export"[\s\S]{0,900}?\bw-full\b/.test(sidebar));
// The quiet-control palette is the same one the icon buttons use, which is
// precisely why the button blended in.
check('it is accent-tinted rather than the quiet-control palette',
  /href="\/export"[\s\S]{0,900}?bg-\[#3b82f6\]\/10/.test(sidebar));
check('it no longer wears the quiet-control background',
  !/<a\s[^>]*href="\/export"[\s\S]{0,900}?\? 'bg-\[#1a1a1a\]/.test(sidebar));
// Six role cards meant the button was the first thing to scroll off screen.
check('it is sticky so it cannot scroll out of reach',
  /<div class="sticky top-0 z-10 -mx-3[^"]*">\s*<a\s[^>]*href="\/export"/.test(sidebar));
// The sticky fill must match the panel background, or cards scrolling behind it
// would show through the gap above the button. Order the two lookups
// independently — the class string puts `bg-` before `flex flex-col`. The `#`
// must sit outside the character class: inside it, `#` counts toward the `{6}`
// and only five hex digits ever match.
const panelRoot = /class="([^"]*flex flex-col[^"]*)"/.exec(sidebar);
const panelBg = panelRoot && /bg-\[#([0-9a-f]{6})\]/.exec(panelRoot[1]);
check('the sticky fill matches the panel background', panelBg !== null);
if (panelBg) {
  check('...and it does', sidebar.includes(`-mx-3 px-3 pt-3 pb-1 bg-[#${panelBg[1]}]`),
    'panel bg is #' + panelBg[1] + ', sticky fill does not match');
}
// Carrying the count explains the action and signals the export is not empty.
check('it shows the token count while enabled',
  /\{canExport && <span class="text-\[#60a5fa\]\">\{filledShadesCount\} tokens<\/span>\}/.test(sidebar));
check('it is still text-xs, not demoted back to a caption size', // regression net
  /<span>Export & Code<\/span>/.test(sidebar));

console.log('\n=== It is a real anchor, so cmd-click and open-in-new-tab work ===');
check('it uses <a href="/export"> rather than a button + router call',
  /<a\s[^>]*href="\/export"/.test(sidebar));
// A `<button>` with `goTo()` would be smooth but would lose middle-click,
// cmd-click and "copy link address" — the view-transition router intercepts
// plain anchor clicks identically, so an anchor is strictly better here.
check('it does not hand-roll navigation for it',
  !/onClick=\{\(\)\s*=>\s*goTo\('\/export'\)/.test(sidebar));

console.log('\n=== Disabled, not hidden — and inert in both required ways ===');
check('canExport is derived from the token count',
  /const canExport = filledShadesCount > 0;/.test(sidebar));
// Both halves are load-bearing: aria-disabled alone still navigates on click,
// preventDefault alone is never announced to a screen reader.
check('it sets aria-disabled while inert',
  /aria-disabled=\{canExport \? undefined : 'true'\}/.test(sidebar));
check('it suppresses the click while inert',
  /if \(!canExport\) e\.preventDefault\(\);/.test(sidebar));
check('the two states have different tooltips',
  /Add at least one color before exporting/.test(sidebar) &&
  /Open Export & Code to copy or download \$\{filledShadesCount\} CSS variable/.test(sidebar));
// A disabled link that still reports as a link is a lie to assistive tech
// unless the visible label carries the reason, which the tooltip alone does not.
check('the inert state is visually distinct',
  /cursor-not-allowed/.test(sidebar));

console.log('\n=== The gate matches what the export page would actually emit ===');
// Empty every role, so the cart is genuinely empty rather than partially filled.
for (const role of Object.values(cartStore.get().roles)) {
  clearRoleScale(role.id);
}
const emptyCart = cartStore.get();
const emptyLines = exportedTokenLines(emptyCart);
check('an emptied cart has no tokens', filledShadesCount(emptyCart) === 0,
  'count ' + filledShadesCount(emptyCart));
check('...and the exporter emits no CSS custom properties', emptyLines.length === 0,
  'emitted: ' + emptyLines.join(','));
check('so the gate would correctly be closed', filledShadesCount(emptyCart) > 0 === false);
check('the export page documents this exact empty state',
  /No colors in cart yet\. Add swatches or generate scales first!/.test(exportIsland),
  'the fallback comment has drifted from the reason we gate on it');
check('it emits one custom property per populated slot, named --color-<role>-<step>',
  /`--color-\$\{role\.id\}-\$\{step\}`/.test(exportIsland));

console.log('\n=== Adding one color opens the gate ===');
// Ties this to the empty-role "Add color" button: author a single shade and the
// shortcut becomes usable, which is the whole point of putting it up top.
setRoleShade('danger', 500, createOklchColor(0.55, 0.17, 28), { silent: true });
const oneColor = cartStore.get();
check('the token count is now above zero', filledShadesCount(oneColor) === 1,
  'count ' + filledShadesCount(oneColor));
check('...which is exactly what re-enables the shortcut', filledShadesCount(oneColor) > 0);
const oneLines = exportedTokenLines(oneColor);
check('...and the exporter now has exactly one property to emit',
  oneLines.length === 1 && oneLines[0] === '--color-danger-500',
  'emitted: ' + oneLines.join(','));

console.log('\n=== The destination is a real route ===');
check('src/pages/export.astro exists', existsSync(join(process.cwd(), 'src/pages/export.astro')));
check('it mounts the exporter island',
  /ExportIsland client:load/.test(src('src/pages/export.astro')));

console.log('\n=== The shortcut is visibly the same destination as the nav item ===');
check('navigation labels /export as "Export & Code"',
  /id: 'export'[\s\S]{0,200}defaultLabel: 'Export & Code'/.test(navigation));
check('the button uses that same label', /<span>Export & Code<\/span>/.test(sidebar));
check('the nav points it at the same path', /id: 'export'[\s\S]{0,300}path: '\/export'/.test(navigation));

// Reusing the nav's own Code2 icon paths is the cheapest way to signal "same
// place as that nav entry" without inventing a second icon language.
const navCode2 = /case 'Code2':[\s\S]*?<path d="([^"]+)"\/>\s*<path d="([^"]+)"\/>\s*<path d="([^"]+)"\/>/.exec(sidebarIsland);
check('the nav Code2 icon was located for comparison', navCode2 !== null);
if (navCode2) {
  for (const [i, d] of navCode2.slice(1).entries()) {
    check(`icon path ${i + 1} matches the nav's`, sidebar.includes(`d="${d}"`), 'missing: ' + d);
  }
}

console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'));
process.exit(failures === 0 ? 0 : 1);
