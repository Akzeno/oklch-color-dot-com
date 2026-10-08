/**
 * i18n Configuration
 * Central locale definitions and routing configuration
 */

export type LocaleCode =
  | 'en'
  | 'hi'
  | 'pt'
  | 'zh-CN'
  | 'zh-HK'
  | 'es'
  | 'fr'
  | 'de';

export interface LocaleConfig {
  code: LocaleCode;
  locale: string;           // BCP 47 locale tag (for <html lang>, hreflang)
  name: string;             // Native name
  englishName: string;      // English name
  dir: 'ltr' | 'rtl';       // Text direction
  prefix: string;           // URL prefix (empty for default locale)
  isDefault: boolean;
}

export const LOCALES: LocaleConfig[] = [
  {
    code: 'en',
    locale: 'en-US',
    name: 'English',
    englishName: 'English',
    dir: 'ltr',
    prefix: '',
    isDefault: true,
  },
  {
    code: 'hi',
    locale: 'hi-IN',
    name: 'हिन्दी',
    englishName: 'Hindi',
    dir: 'ltr',
    prefix: '/hi',
    isDefault: false,
  },
  {
    code: 'pt',
    locale: 'pt-BR',
    name: 'Português',
    englishName: 'Portuguese',
    dir: 'ltr',
    prefix: '/pt',
    isDefault: false,
  },
  {
    code: 'zh-CN',
    locale: 'zh-CN',
    name: '中文 (简体)',
    englishName: 'Chinese (Mandarin)',
    dir: 'ltr',
    prefix: '/zh-cn',
    isDefault: false,
  },
  {
    code: 'zh-HK',
    locale: 'zh-HK',
    name: '中文 (繁體/香港)',
    englishName: 'Chinese (Cantonese)',
    dir: 'ltr',
    prefix: '/zh-hk',
    isDefault: false,
  },
  {
    code: 'es',
    locale: 'es-ES',
    name: 'Español',
    englishName: 'Spanish',
    dir: 'ltr',
    prefix: '/es',
    isDefault: false,
  },
  {
    code: 'fr',
    locale: 'fr-FR',
    name: 'Français',
    englishName: 'French',
    dir: 'ltr',
    prefix: '/fr',
    isDefault: false,
  },
  {
    code: 'de',
    locale: 'de-DE',
    name: 'Deutsch',
    englishName: 'German',
    dir: 'ltr',
    prefix: '/de',
    isDefault: false,
  },
];

export const DEFAULT_LOCALE: LocaleConfig = LOCALES.find((l) => l.isDefault)!;

export const LOCALE_CODES = LOCALES.map((l) => l.code) as LocaleCode[];

export const NON_DEFAULT_LOCALES = LOCALES.filter((l) => !l.isDefault);

/**
 * Get locale config by code
 */
export function getLocaleConfig(code: LocaleCode): LocaleConfig {
  const locale = LOCALES.find((l) => l.code === code);
  if (!locale) {
    console.warn(`Unknown locale code: ${code}, falling back to default`);
    return DEFAULT_LOCALE;
  }
  return locale;
}

/**
 * Resolve a LocaleCode from a URL path segment. Astro lowercases route params,
 * so /zh-hk arrives as "zh-hk" while the canonical code is "zh-HK". This maps
 * the lowercase segment back to canonical casing (unmatched -> default).
 */
export function localeCodeFromParam(param: string | undefined): LocaleCode {
  const lower = (param ?? '').toLowerCase();
  const match = LOCALES.find(
    (l) =>
      l.prefix.slice(1).toLowerCase() === lower ||
      l.code.toLowerCase() === lower
  );
  return match ? match.code : DEFAULT_LOCALE.code;
}

/**
 * Get locale config from URL pathname
 * Returns the matched locale and the path without locale prefix
 */
export function parseLocaleFromPath(pathname: string): {
  locale: LocaleConfig;
  pathWithoutLocale: string;
} {
  for (const locale of LOCALES) {
    if (!locale.isDefault) {
      const prefix = locale.prefix;
      if (pathname === prefix || pathname.startsWith(prefix + '/')) {
        return {
          locale,
          pathWithoutLocale: pathname.slice(prefix.length) || '/',
        };
      }
    }
  }
  // Default locale (no prefix)
  return {
    locale: DEFAULT_LOCALE,
    pathWithoutLocale: pathname,
  };
}

/**
 * Build a localized URL path
 */
export function buildLocalizedPath(
  path: string,
  localeCode: LocaleCode
): string {
  const locale = getLocaleConfig(localeCode);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return locale.isDefault ? normalizedPath : `${locale.prefix}${normalizedPath}`;
}

/**
 * Get all localized variants of a path
 */
export function getAllLocalizedPaths(path: string): Array<{
  locale: LocaleConfig;
  path: string;
  url: string; // relative URL with locale prefix
}> {
  return LOCALES.map((locale) => ({
    locale,
    path: buildLocalizedPath(path, locale.code),
    url: buildLocalizedPath(path, locale.code),
  }));
}