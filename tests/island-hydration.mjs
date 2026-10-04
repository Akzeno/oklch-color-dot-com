/**
 * Structural invariant for Astro islands: **an island's server output must never
 * be empty.**
 *
 * WHY
 *
 * With `<ClientRouter />`, a route change fetches the destination from the
 * server and hydrates the islands inside that markup. Any store an island reads
 * is a module singleton, so it survives the navigation — meaning the client's
 * first render can disagree with the markup that just arrived.
 *
 * An island that renders `null` produces *zero bytes* of SSR output, so the
 * crash case is "empty container, non-empty tree", and Preact dies with
 * `Cannot read properties of null (reading 'map')`. This is not theoretical: it
 * shipped because both `Toast` and `CartDrawerIsland` did
 * `if (!state) return null`, and it only reproduced when you navigated while a
 * toast was showing or the cart drawer was open — i.e. exactly the "sometimes"
 * class of report that is miserable to track down.
 *
 * The fix is always the same: render a stable root element unconditionally and
 * vary only the children. Preact hydrates differing children happily; it cannot
 * hydrate a container with no root at all.
 *
 * This walks the real production build rather than grepping source, because the
 * thing being asserted is a property of the rendered HTML. Requires `dist/`, so
 * the npm `test` script builds first.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = join(process.cwd(), 'dist');

if (!existsSync(DIST)) {
  console.error('dist/ not found — run `npm run build` before this suite.');
  process.exit(1);
}

function htmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...htmlFiles(full));
    else if (entry.endsWith('.html')) out.push(full);
  }
  return out;
}

const ISLAND = /<astro-island([^>]*)>([\s\S]*?)<\/astro-island>/g;
const nameOf = (attrs) =>
  ((attrs.match(/component-url="([^"]+)"/) || attrs.match(/component-export="([^"]+)"/) || [])[1] || '?')
    .split('/')
    .pop();

let failures = 0;
const offenders = new Set();

for (const file of htmlFiles(DIST)) {
  const html = readFileSync(file, 'utf8');
  let m;
  while ((m = ISLAND.exec(html))) {
    const name = nameOf(m[1]);
    if (m[2].length === 0) {
      offenders.add(name);
      console.log(`FAIL  ${name} renders 0 bytes of SSR output on ${file}`);
      failures++;
    }
  }
}

console.log(`\nChecked every island in ${htmlFiles(DIST).length} built pages.`);

if (failures > 0) {
  console.log(
    `\n${failures} island/page combination(s) SSR to nothing.\n` +
      `Each of these hydrates from an empty container, which Preact cannot do.\n` +
      `Affected components: ${[...offenders].join(', ')}\n` +
      'Render a stable root element unconditionally instead of returning null.'
  );
}

// The two islands that actually regressed, pinned by name so a future rename
// or a re-introduction of `return null` cannot slip through unnoticed.
const EXPECTED_ROOTS = ['Toast', 'CartDrawerIsland'];
const indexHtml = readFileSync(join(DIST, 'index.html'), 'utf8');
for (const expected of EXPECTED_ROOTS) {
  const found = [...indexHtml.matchAll(ISLAND)].find((m) => nameOf(m[1]).startsWith(expected));
  if (!found) {
    console.log(`FAIL  ${expected} island not found in dist/index.html`);
    failures++;
  } else if (found[2].length === 0) {
    console.log(`FAIL  ${expected} island still renders nothing`);
    failures++;
  } else {
    console.log(`PASS  ${expected} ships a stable SSR root (${found[2].length} bytes)`);
  }
}

// A regression guard on top of the structural check: if someone reintroduces the
// early return, the wrapper goes with it and the island empties out again.
//
// Comments are stripped first, because the guard's own explanatory comments
// quote the very expression being searched for — searching raw source made the
// file's documentation fail its own test. (The stripping is line/block-comment
// only and would misread a `//` inside a string literal; neither file has one,
// and the structural check above is the real guard anyway.)
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

const drawerCode = stripComments(
  readFileSync(join(process.cwd(), 'src/components/cart/CartDrawerIsland.tsx'), 'utf8')
);
if (/if\s*\(\s*!isOpen\s*\)\s*return null/.test(drawerCode)) {
  console.log('FAIL  CartDrawerIsland re-introduced the "closed means render nothing" early return');
  failures++;
} else {
  console.log('PASS  CartDrawerIsland has no render-nothing early return');
}

const toastCode = stripComments(
  readFileSync(join(process.cwd(), 'src/components/common/Toast.tsx'), 'utf8')
);
if (/if\s*\(\s*!toast\s*\)\s*return null/.test(toastCode)) {
  console.log('FAIL  Toast re-introduced the "no toast means render nothing" early return');
  failures++;
} else {
  console.log('PASS  Toast has no render-nothing early return');
}

// Second half of the same bug. An unconditional root fixes the *shape* of the
// island but not its *children*: if the island reads a module-singleton store
// directly, its first client render still describes whatever the user was doing
// on the previous page, and Preact hydration fails on the child instead. Both
// islands must therefore read their overlay state through `useHydratedStore`.
// `tests/hydration-pinning.mjs` proves the hook behaves; this catches someone
// swapping it back for a bare `useStore`.
const PINNED = [
  ['src/components/common/Toast.tsx', 'useHydratedStore(toastStore, null)'],
  ['src/components/cart/CartDrawerIsland.tsx', 'useHydratedStore(isCartOpenStore, false)'],
];
for (const [file, expected] of PINNED) {
  const code = stripComments(readFileSync(join(process.cwd(), file), 'utf8'));
  const name = file.split('/').pop();
  if (!code.includes(expected)) {
    console.log(`FAIL  ${name} no longer reads its store via \`${expected}\``);
    failures++;
  } else {
    console.log(`PASS  ${name} pins its first render via useHydratedStore`);
  }
  // A bare useStore read of the same store would defeat the pin.
  const bareRead = code.match(/useStore\(\s*(toastStore|isCartOpenStore)/);
  if (bareRead) {
    console.log(`FAIL  ${name} reads ${bareRead[1]} directly, bypassing the pin`);
    failures++;
  } else {
    console.log(`PASS  ${name} has no direct useStore read of its overlay state`);
  }
}

console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'));
process.exit(failures === 0 ? 0 : 1);