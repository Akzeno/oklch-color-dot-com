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
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

// `--import` wants a specifier Node can resolve as a module. On Windows a bare
// `C:\...` path is read as a `c:` URL scheme and throws ERR_UNSUPPORTED_ESM_URL_SCHEME,
// so hand it a proper file: URL instead.
const registerHook = pathToFileURL(join(here, 'register-hook.mjs')).href;

const SUITES = [
  'cart-hydration-race.mjs',
  'hydration-pinning.mjs',
  'picker-handoff.mjs',
  'empty-role-add-color.mjs',
  'export-shortcut.mjs',
  'swatch-quick-actions.mjs',
  // Reads dist/, so the build must run first — hence `astro build && npm test`.
  'island-hydration.mjs',
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