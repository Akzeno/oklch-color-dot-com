// Deep-merges a locale's translation work files (i18n-work/<locale>/*.json)
// into src/i18n/translations/<locale>.json and verifies the merged dictionary
// against the English source. Nothing is written unless every check passes.
//
// Usage:
//   node scripts/i18n-merge.mjs <locale> [--check]
//
//   --check   verify only; do not write the merged file
//
// Checks (against en.json + the English base SEO in i18n-work/en/):
//   1. pages.* / ui.*      full key-path parity, types and array lengths
//   2. nav/common/navShort all English keys present
//   3. seo                 all 20 page ids carry title/metaDescription/h1/
//                          keywords; every English FAQ list has a translation
//                          with the same question/answer count
//   4. every shared string keeps its interpolation placeholders and HTML tags
//      (digit runs are reported as warnings only)
//
// Existing locale values always win over work files, so re-running merge is
// idempotent and never clobbers already-reviewed translations.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareNode, leafPaths } from './i18n-checklib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const i18nDir = join(root, 'src', 'i18n', 'translations');
const locale = process.argv[2];
if (!locale) {
  console.error('usage: node scripts/i18n-merge.mjs <locale> [--check]');
  process.exit(2);
}
const checkOnly = process.argv.includes('--check');
const dictPath = join(i18nDir, `${locale}.json`);
const workDir = join(root, 'i18n-work', locale);
const enWorkDir = join(root, 'i18n-work', 'en');

// A locale with no work directory is still checkable against its existing
// dictionary (useful to validate already-translated locales like pt).
const hasWork = existsSync(workDir);

const en = JSON.parse(readFileSync(join(i18nDir, 'en.json'), 'utf8'));
const seoBase = JSON.parse(readFileSync(join(enWorkDir, 'seo-base.json'), 'utf8')).seo;
const dict = existsSync(dictPath) ? JSON.parse(readFileSync(dictPath, 'utf8')) : {};
if (!hasWork && !existsSync(dictPath)) {
  console.error(`neither i18n-work/${locale}/ nor src/i18n/translations/${locale}.json exists`);
  process.exit(2);
}

/** Deep-merge src into dst; conflicting leaves keep dst and are reported. */
function deepMerge(dst, src, prefix, conflicts) {
  for (const [key, value] of Object.entries(src)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!dst[key] || typeof dst[key] !== 'object' || Array.isArray(dst[key])) {
        if (key in dst) conflicts.push(`${path}: replaced ${typeof dst[key]} with object`);
        dst[key] = {};
      }
      deepMerge(dst[key], value, path, conflicts);
    } else if (key in dst && JSON.stringify(dst[key]) !== JSON.stringify(value)) {
      conflicts.push(`${path}: keeping existing value, ignoring work file`);
    } else if (!(key in dst)) {
      dst[key] = value;
    }
  }
  return dst;
}

const conflicts = [];
const workFiles = hasWork
  ? readdirSync(workDir).filter((f) => f.endsWith('.json')).sort()
  : [];
for (const file of workFiles) {
  const data = JSON.parse(readFileSync(join(workDir, file), 'utf8'));
  for (const key of Object.keys(data)) {
    if (!['nav', 'common', 'navShort', 'pages', 'seo', 'ui'].includes(key)) {
      console.error(`${file}: unexpected top-level section "${key}"`);
      process.exit(1);
    }
  }
  deepMerge(dict, data, '', conflicts);
}

const errors = [];
const warnings = [];

// 1 + 2: structural parity for everything except seo (handled below).
for (const section of ['nav', 'common', 'navShort', 'pages', 'ui']) {
  if (!(section in en)) continue;
  if (!(section in dict)) {
    errors.push({ path: section, msg: 'section missing after merge' });
    continue;
  }
  compareNode(en[section], dict[section], section, errors, warnings);
}

// 3a: base SEO fields for every page id.
const seoIds = Object.keys(seoBase);
for (const id of seoIds) {
  const loc = dict.seo?.[id];
  if (!loc) {
    errors.push({ path: `seo.${id}`, msg: 'missing (translate i18n-work/' + locale + '/seo-base.json)' });
    continue;
  }
  for (const field of ['title', 'metaDescription', 'h1']) {
    if (typeof loc[field] !== 'string' || !loc[field].trim()) {
      errors.push({ path: `seo.${id}.${field}`, msg: 'missing or empty' });
    }
  }
  if (!Array.isArray(loc.keywords) || loc.keywords.length === 0 || loc.keywords.some((k) => typeof k !== 'string' || !k.trim())) {
    errors.push({ path: `seo.${id}.keywords`, msg: 'missing, empty, or non-string keyword' });
  }
}
const allowedSeo = new Set([...seoIds, ...Object.keys(en.seo)]);
for (const id of Object.keys(dict.seo ?? {})) {
  if (!allowedSeo.has(id)) errors.push({ path: `seo.${id}`, msg: 'unknown seo id (typo?)' });
}

// 3b: FAQ parity with the English dictionaries.
for (const [id, entry] of Object.entries(en.seo)) {
  const loc = dict.seo?.[id];
  if (!loc) {
    errors.push({ path: `seo.${id}`, msg: 'missing FAQ entry' });
    continue;
  }
  compareNode({ faqs: entry.faqs }, { faqs: loc.faqs }, `seo.${id}`, errors, warnings);
}

// 4: placeholder / HTML-tag parity for shared strings incl. existing content.
// (compareNode already covers sections above; seo base strings come from
// navigation.ts rather than en.json, so check their placeholders/tags here.)
for (const id of seoIds) {
  const loc = dict.seo?.[id];
  if (!loc) continue;
  const src = seoBase[id];
  const fake = { title: src.title, metaDescription: src.metaDescription, h1: src.h1 };
  const got = { title: loc.title, metaDescription: loc.metaDescription, h1: loc.h1 };
  compareNode(fake, got, `seo.${id}`, errors, warnings);
}

// Report.
const uniq = (arr) => [...new Set(arr.map((x) => `${x.path}: ${x.msg}`))];
const w = uniq(warnings);
const e = uniq(errors);
if (w.length) {
  console.log(`warnings (${w.length}):`);
  for (const line of w.slice(0, 30)) console.log(`   ${line}`);
  if (w.length > 30) console.log(`   ... ${w.length - 30} more`);
}
if (e.length) {
  console.log(`\nERRORS (${e.length}):`);
  for (const line of e.slice(0, 60)) console.log(`   ${line}`);
  if (e.length > 60) console.log(`   ... ${e.length - 60} more`);
  console.log('\nmerge aborted: nothing written');
  process.exit(1);
}
if (conflicts.length) {
  console.log(`\ninfo: ${conflicts.length} work-file conflict(s) kept existing values:`);
  for (const line of [...new Set(conflicts)].slice(0, 20)) console.log(`   ${line}`);
}

if (checkOnly) {
  console.log(`\nCHECK OK: ${locale} dictionary passes all parity checks (not written)`);
  process.exit(0);
}

// Stable top-level order mirroring en.json.
const ordered = {};
for (const key of ['nav', 'common', 'navShort', 'pages', 'seo', 'ui']) {
  if (key in dict) ordered[key] = dict[key];
}
for (const key of Object.keys(dict)) if (!(key in ordered)) ordered[key] = dict[key];

writeFileSync(dictPath, JSON.stringify(ordered, null, 2) + '\n', 'utf8');
const leaves = leafPaths(ordered).length;
console.log(`\nMERGED OK: ${locale}.json written (${workFiles.length} work file(s), ${leaves} leaf strings)`);
