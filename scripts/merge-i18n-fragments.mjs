// One-shot integrator: deep-merges src/i18n/translations/fragments/*.{en,pt}.json
// into the matching locale dictionary (en.json / pt.json), then verifies that
// every `pages` leaf key and every `seo.*.faqs` key exists in both locales.
// Safe to re-run: existing keys are never overwritten.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const i18nDir = join(root, 'src', 'i18n', 'translations');
const fragDir = join(i18nDir, 'fragments');

/** Deep-merge `src` into `dst` without overwriting existing values. */
function deepMerge(dst, src) {
  for (const [key, value] of Object.entries(src)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!dst[key] || typeof dst[key] !== 'object' || Array.isArray(dst[key])) {
        dst[key] = {};
      }
      deepMerge(dst[key], value);
    } else if (!(key in dst)) {
      dst[key] = value;
    }
  }
  return dst;
}

/** Collect every leaf path under `pages` plus `seo.*.faqs` presence. */
function collectPageKeys(obj, prefix = '', out = []) {
  for (const [key, value] of Object.entries(obj ?? {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      collectPageKeys(value, path, out);
    } else {
      out.push(path);
    }
  }
  return out;
}

function faqSeoKeys(seo) {
  return Object.entries(seo ?? {})
    .filter(([, v]) => v && typeof v === 'object' && Array.isArray(v.faqs))
    .map(([k]) => k);
}

const files = readdirSync(fragDir).filter((f) => f.endsWith('.json'));
const targets = { en: 'en.json', pt: 'pt.json' };
let mergedCount = 0;

for (const [locale, dictFile] of Object.entries(targets)) {
  const dictPath = join(i18nDir, dictFile);
  const dict = JSON.parse(readFileSync(dictPath, 'utf8'));
  const frags = files.filter((f) => f.endsWith(`.${locale}.json`));
  for (const frag of frags) {
    const data = JSON.parse(readFileSync(join(fragDir, frag), 'utf8'));
    const unknown = Object.keys(data).filter((k) => !['pages', 'seo', 'ui'].includes(k));
    if (unknown.length) throw new Error(`${frag}: unexpected top-level sections ${unknown}`);
    deepMerge(dict, data);
    mergedCount++;
    console.log(`merged ${frag} -> ${dictFile}`);
  }
  writeFileSync(dictPath, JSON.stringify(dict, null, 2) + '\n', 'utf8');
}

// Parity verification on the merged dictionaries.
const en = JSON.parse(readFileSync(join(i18nDir, 'en.json'), 'utf8'));
const pt = JSON.parse(readFileSync(join(i18nDir, 'pt.json'), 'utf8'));

const enPages = new Set([...collectPageKeys(en.pages), ...collectPageKeys(en.ui)]);
const ptPages = new Set([...collectPageKeys(pt.pages), ...collectPageKeys(pt.ui)]);
const missingInPt = [...enPages].filter((k) => !ptPages.has(k));
const missingInEn = [...ptPages].filter((k) => !enPages.has(k));

const enFaq = faqSeoKeys(en.seo).sort();
const ptFaq = faqSeoKeys(pt.seo).sort();
const faqMismatch = enFaq.filter((k) => !ptFaq.includes(k)).concat(ptFaq.filter((k) => !enFaq.includes(k)));

console.log(`\nfragments merged: ${mergedCount}`);
console.log(`pages leaves: en=${enPages.size} pt=${ptPages.size}`);
console.log('missing in pt:', missingInPt);
console.log('missing in en:', missingInEn);
console.log(`seo faqs keys: en=[${enFaq}] pt=[${ptFaq}]`);
console.log('faq key mismatch:', faqMismatch);

// FAQ pair-shape check (must be {question, answer} objects, equal counts).
let faqShapeOk = true;
for (const key of enFaq) {
  const a = en.seo[key].faqs ?? [];
  const b = pt.seo[key]?.faqs ?? [];
  const ok =
    a.length === b.length &&
    a.every((f, i) => f.question && f.answer && b[i].question && b[i].answer);
  if (!ok) { faqShapeOk = false; console.log(`faq shape/count mismatch at seo.${key}: en=${a.length} pt=${b.length}`); }
}
console.log('faq shapes ok:', faqShapeOk);

if (missingInPt.length || missingInEn.length || faqMismatch.length || !faqShapeOk) {
  process.exit(1);
}
console.log('MERGE OK');
