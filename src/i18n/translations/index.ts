/**
 * Translation dictionaries + type-safe lookup.
 *
 * `en.json` defines the shape of every translation key on the site; `t()` is
 * typed against it, so a typo like `t(locale, 'nav.pikcer')` is a compile
 * error rather than a silently-rendered key path at runtime.
 *
 * English (default locale) strings live in `en.json` for the shell — nav
 * labels, shared UI text. English *SEO* text stays in `config/navigation.ts`,
 * which remains the single source of truth for titles/descriptions/H1s/FAQs;
 * the non-English dictionaries carry `seo` overrides that replace those
 * fields when present (see `i18n/seo.ts`). A missing key anywhere falls back
 * to English, so a half-translated locale file is safe to ship.
 */

import type { LocaleCode } from '../config';
import en from './en.json' with { type: 'json' };
import hi from './hi.json' with { type: 'json' };
import pt from './pt.json' with { type: 'json' };
import zhCN from './zh-CN.json' with { type: 'json' };
import zhHK from './zh-HK.json' with { type: 'json' };
import es from './es.json' with { type: 'json' };
import fr from './fr.json' with { type: 'json' };
import de from './de.json' with { type: 'json' };

export type EnTranslations = typeof en;

/** Every valid dot-path into en.json, e.g. 'nav.picker' | 'common.more'. */
type PathsOf<T> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string
        ? K
        : T[K] extends object
          ? `${K}.${PathsOf<T[K]>}`
          : never;
    }[keyof T & string];

export type TranslationKey = PathsOf<EnTranslations>;

export interface SeoOverride {
  title?: string;
  metaDescription?: string;
  h1?: string;
  keywords?: string[];
  /** Localized FAQ pairs for the FAQPage JSON-LD node. */
  faqs?: Array<{ question: string; answer: string }>;
}

/**
 * A locale file = partial English shell translations + optional per-page SEO
 * overrides keyed by the ids in `i18n/seo.ts` (`index`, `palettes`, …).
 */
export interface LocaleDictionary {
  nav?: Partial<EnTranslations['nav']>;
  common?: Partial<EnTranslations['common']>;
  navShort?: Partial<EnTranslations['navShort']>;
  seo?: Record<string, SeoOverride>;
  pages?: EnTranslations['pages'];
  /** Interactive-island UI strings (`ui.<island>.*`), localized per island. */
  ui?: EnTranslations['ui'];
}

const dictionaries: Record<LocaleCode, LocaleDictionary> = {
  en: en as LocaleDictionary,
  hi: hi as LocaleDictionary,
  pt: pt as LocaleDictionary,
  'zh-CN': zhCN as LocaleDictionary,
  'zh-HK': zhHK as LocaleDictionary,
  es: es as LocaleDictionary,
  fr: fr as LocaleDictionary,
  de: de as LocaleDictionary,
};

export function getDictionary(locale: LocaleCode): LocaleDictionary {
  return dictionaries[locale] ?? dictionaries.en;
}

function lookupDeep(dict: unknown, keyPath: string): string | string[] | undefined {
  let node: unknown = dict;
  for (const segment of keyPath.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[segment];
  }
  return typeof node === 'string' || Array.isArray(node)
    ? (node as string | string[])
    : undefined;
}

/**
 * Look up a key for a locale, falling back to English. Returns `undefined`
 * when neither locale nor English has the key (callers decide the last
 * resort).
 */
export function translate(
  locale: LocaleCode,
  key: TranslationKey | string
): string | string[] | undefined {
  const localized = lookupDeep(dictionaries[locale], key);
  if (localized !== undefined) return localized;
  if (locale !== 'en') return lookupDeep(dictionaries.en, key);
  return undefined;
}

/**
 * `t()` — translate with an explicit fallback string. The fallback is what
 * keeps untranslated pages honest: config/navigation.ts labels and inline
 * page copy pass their English text as the last argument.
 */
export function t(
  locale: LocaleCode,
  key: TranslationKey | string,
  fallback?: string
): string {
  const value = translate(locale, key);
  if (typeof value === 'string') return value;
  if (fallback !== undefined) return fallback;
  // Unknown key: render the key path rather than an empty string — it is
  // ugly on purpose so it gets noticed and fixed.
  return key;
}

/** Translate a key that resolves to a string array (currently none, reserved). */
export function tArray(
  locale: LocaleCode,
  key: TranslationKey | string,
  fallback: string[] = []
): string[] {
  const value = translate(locale, key);
  return Array.isArray(value) ? value : fallback;
}
