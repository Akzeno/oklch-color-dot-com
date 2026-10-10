// Verifies a locale's in-progress work files (i18n-work/<locale>/) against
// their English counterparts (i18n-work/en/). Translation agents run this
// after writing their section files and must fix everything it reports.
//
// Usage:
//   node scripts/i18n-verify-work.mjs <locale> [--files a.json,b.json]
//
// `--files` limits the check to specific work files (useful when several
// agents work on the same locale in parallel); without it every file present
// in the locale directory is checked.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareNode } from './i18n-checklib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const enDir = join(root, 'i18n-work', 'en');
const locale = process.argv[2];
if (!locale) {
  console.error('usage: node scripts/i18n-verify-work.mjs <locale> [--files a.json,b.json]');
  process.exit(2);
}
const locDir = join(root, 'i18n-work', locale);
if (!existsSync(locDir)) {
  console.error(`no work directory: i18n-work/${locale}/`);
  process.exit(2);
}

const fileArg = process.argv.indexOf('--files');
const only = fileArg !== -1 ? new Set(process.argv[fileArg + 1].split(',')) : null;

const allowedTop = new Set(['nav', 'common', 'navShort', 'pages', 'seo', 'ui']);
const enFiles = readdirSync(enDir).filter((f) => f.endsWith('.json'));
const locFiles = readdirSync(locDir).filter((f) => f.endsWith('.json'));

let failed = false;
const checked = [];

for (const file of locFiles) {
  if (only && !only.has(file)) continue;
  checked.push(file);
  const errors = [];
  const warnings = [];

  if (!enFiles.includes(file)) {
    errors.push({ path: file, msg: 'no matching English section file' });
  } else {
    let en, loc;
    try {
      en = JSON.parse(readFileSync(join(enDir, file), 'utf8'));
    } catch (e) {
      errors.push({ path: file, msg: `English file unreadable: ${e.message}` });
    }
    try {
      loc = JSON.parse(readFileSync(join(locDir, file), 'utf8'));
    } catch (e) {
      errors.push({ path: file, msg: `invalid JSON: ${e.message}` });
    }
    if (en && loc) {
      for (const key of Object.keys(loc)) {
        if (!allowedTop.has(key)) errors.push({ path: key, msg: 'unexpected top-level section' });
      }
      compareNode(en, loc, file.replace(/\.json$/, ''), errors, warnings);
    }
  }

  if (errors.length) {
    failed = true;
    console.log(`FAIL ${file}`);
    for (const e of errors.slice(0, 20)) console.log(`   ${e.path}: ${e.msg}`);
    if (errors.length > 20) console.log(`   ... ${errors.length - 20} more`);
  }
}

if (only) {
  for (const f of only) {
    if (!locFiles.includes(f)) {
      failed = true;
      console.log(`FAIL ${f}: expected work file is missing in i18n-work/${locale}/`);
    }
  }
}

if (checked.length === 0) {
  console.log(`no work files found in i18n-work/${locale}/ for the given filter`);
} else if (!failed) {
  console.log(`OK ${checked.length} file(s): ${checked.join(', ')}`);
}
process.exit(failed ? 1 : 0);
