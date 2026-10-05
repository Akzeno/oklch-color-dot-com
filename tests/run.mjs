/**
 * Test runner.
 *
 * Each suite is a plain Node ESM file that loads the project's TypeScript
 * directly — no bundler, no test framework. The two `--node-option` flags below
 * are what make that possible:
 *
 *  - `--experimental-strip-types` removes the types without transforming code.
 *  - `./tests/register-hook.mjs` installs a resolve hook that maps the app's
 *    extensionless imports (`../stores/cartStore`) onto real files, matching
 *    what Vite/Astro does at build time.
 *
 * Suites run sequentially and in a fresh process each, because they install
 * their own global `window`/`localStorage`/`sessionStorage` fakes and would
 * otherwise contaminate one another.
 *
 * WHY THERE IS A PRE-FLIGHT PARSE
 *
 * Most suites assert on component *source text* rather than on rendered output,
 * because rendering an island needs a bundler and a DOM. A regex cannot tell a
 * file that parses from one that does not, so a suite can pass — confidently,
 * quoting the line it broke — against a component that is no longer valid JSX.
 * That happened: a JSX comment placed inside an arrow's return parentheses made
 * the body two adjacent expressions, and the suite asserting on that very file
 * reported green. `astro build` caught it minutes later.
 *
 * So the runner parses every source file first, using the TypeScript compiler
 * that is already a dependency, and refuses to run a suite against a file that
 * does not parse. It is a syntax check only — no type checking, no resolution —
 * because that is precisely the gap the suites cannot see.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

/** Every `.ts`/`.tsx` under a directory, recursively. */
function sourceFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(p));
    else if (/\.tsx?$/.test(entry.name)) out.push(p);
  }
  return out;
}

console.log('Pre-flight: parsing src/ and tests/ ...');
const broken = [];
for (const file of [...sourceFiles(join(root, 'src')), ...sourceFiles(join(root, 'tests'))]) {
  const text = readFileSync(file, 'utf8');
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.ESNext, true, kind);
  for (const d of source.parseDiagnostics ?? []) {
    const { line } = source.getLineAndCharacterOfPosition(d.start ?? 0);
    broken.push(`  ${relative(root, file)}:${line + 1}  ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
  }
}
if (broken.length) {
  console.error(`\n${broken.length} syntax error(s) — fix these before trusting any suite:\n`);
  console.error(broken.join('\n'));
  process.exit(1);
}
console.log('  all source files parse.\n');

// `--import` wants a specifier Node can resolve as a module. On Windows a bare
// `C:\...` path is read as a `c:` URL scheme and throws ERR_UNSUPPORTED_ESM_URL_SCHEME,
// so hand it a proper file: URL instead.
const registerHook = pathToFileURL(join(here, 'register-hook.mjs')).href;

const SUITES = [
  'cart-hydration-race.mjs',
  'hydration-pinning.mjs',
  'picker-handoff.mjs',
  'custom-palette.mjs',
  'generator-base-color.mjs',
  'empty-role-add-color.mjs',
  'export-shortcut.mjs',
  'swatch-quick-actions.mjs',
  'token-drawer-editing.mjs',
  'swatch-action-menu.mjs',
  'solid-swatches.mjs',
  'form-field-labels.mjs',
  // Reads dist/, so the build must run first — hence `astro build && npm test`.
  'island-hydration.mjs',
  'preview-groups.mjs',
];

let failed = 0;

for (const suite of SUITES) {
  console.log(`\n${'='.repeat(64)}\n  ${suite}\n${'='.repeat(64)}`);
  const res = spawnSync(
    process.execPath,
    ['--experimental-strip-types', '--import', registerHook, join(here, suite)],
    { stdio: 'inherit' }
  );
  if (res.status !== 0) failed++;
}

console.log(
  failed === 0
    ? `\nAll ${SUITES.length} suites passed.`
    : `\n${failed} of ${SUITES.length} suite(s) FAILED.`
);
process.exit(failed === 0 ? 0 : 1);