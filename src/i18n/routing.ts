/**
 * i18n Routing Helpers
 * URL manipulation, locale detection, and navigation helpers
 */

import type { APIRoute } from 'astro';
import {
  LOCALES,
  NON_DEFAULT_LOCALES,
  DEFAULT_LOCALE,
  getLocaleConfig,
  parseLocaleFromPath,
  buildLocalizedPath,
  type LocaleCode,
  type LocaleConfig,
} from './config';

/**
 * Extract locale from Astro request URL
 */
export function getLocaleFromRequest(request: Request): LocaleConfig {
  const url = new URL(request.url);
  return parseLocaleFromPath(url.pathname).locale;
}

/**
 * Get locale from Astro.url (for use in .astro files)
 */
export function getLocaleFromAstroUrl(url: URL): LocaleConfig {
  return parseLocaleFromPath(url.pathname).locale;
}

/**
 * Get current locale code from Astro.url
 */
export function getLocaleCodeFromAstroUrl(url: URL): LocaleCode {
  return getLocaleFromAstroUrl(url).code;
}

/**
 * Middleware helper: redirect root to localized version based on Accept-Language
 * Returns the redirect Response or null if no redirect needed
 */
export function maybeRedirectToPreferredLocale(
  request: Request,
  site: URL
): Response | null {
  const url = new URL(request.url);

  // Only redirect on root path
  if (url.pathname !== '/' && url.pathname !== '') {
    return null;
  }

  // Don't redirect if already on a localized path
  for (const locale of LOCALES) {
    if (!locale.isDefault && url.pathname.startsWith(locale.prefix)) {
      return null;
    }
  }

  // Check Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  if (!acceptLanguage) {
    return null;
  }

  // Parse Accept-Language (simple parsing, first match wins)
  const preferredLocale = parseAcceptLanguage(acceptLanguage);
  if (preferredLocale && !preferredLocale.isDefault) {
    const redirectUrl = new URL(preferredLocale.prefix, site);
    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl.href,
        'Cache-Control': 'no-store',
        Vary: 'Accept-Language',
      },
    });
  }

  return null;
}

/**
 * Parse Accept-Language header and match to supported locales
 * Returns the best matching locale config or null
 */
function parseAcceptLanguage(header: string): LocaleConfig | null {
  // Parse quality values: "en-US,en;q=0.9,hi;q=0.8"
  const entries = header
    .split(',')
    .map((part) => {
      const [lang, q] = part.split(';').map((s) => s.trim());
      const quality = q?.startsWith('q=') ? parseFloat(q.slice(2)) : 1.0;
      return { lang: lang.toLowerCase(), quality };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const entry of entries) {
    // Try exact match first
    let match = LOCALES.find((l) => l.locale.toLowerCase() === entry.lang);
    if (match) return match;

    // Try prefix match (e.g., "en" matches "en-US")
    match = LOCALES.find((l) => l.locale.toLowerCase().startsWith(entry.lang + '-'));
    if (match) return match;

    // Try language code only (e.g., "zh" matches "zh-CN" and "zh-HK")
    const langCode = entry.lang.split('-')[0];
    match = LOCALES.find((l) => l.code.startsWith(langCode));
    if (match) return match;
  }

  return null;
}

/**
 * Generate hreflang entries for a given canonical path
 */
export function generateHreflangEntries(
  canonicalPath: string,
  site: URL
): Array<{ locale: string; url: string }> {
  // Canonical convention across the site: no trailing slash except root.
  // `/` stays `/`, so the English home alternate is the bare origin; every
  // other path is emitted unprefixed-slash-free (`/hex-to-oklch`, never
  // `/hex-to-oklch/`), matching the canonical <link> on each page.
  const normalize = (p: string) => (p.length > 1 ? p.replace(/\/$/, '') : p);

  const entries = LOCALES.map((locale) => ({
    locale: locale.locale,
    url: new URL(normalize(buildLocalizedPath(canonicalPath, locale.code)), site).href,
  }));

  // Add x-default (points to default locale version)
  entries.push({
    locale: 'x-default',
    url: new URL(normalize(buildLocalizedPath(canonicalPath, DEFAULT_LOCALE.code)), site).href,
  });

  return entries;
}

/**
 * Generate alternate link tags for <head>
 */
export function generateAlternateLinks(
  canonicalPath: string,
  site: URL
): string {
  const entries = generateHreflangEntries(canonicalPath, site);
  return entries
    .map(
      ({ locale, url }) =>
        `<link rel="alternate" hreflang="${locale}" href="${url}" />`
    )
    .join('\n');
}

/**
 * Create a localized URL for use in navigation
 * Handles both relative paths and full URLs
 */
export function createLocalizedUrl(
  path: string,
  localeCode: LocaleCode,
  baseUrl?: string
): string {
  const localizedPath = buildLocalizedPath(path, localeCode);
  if (baseUrl) {
    return new URL(localizedPath, baseUrl).href;
  }
  return localizedPath;
}

/**
 * Get the canonical path (without locale prefix) from a localized path.
 * Trailing slashes are stripped (the site's canonical convention) so a
 * transient `/foo/` URL always resolves to the same canonical `/foo`;
 * the root path `/` is left untouched.
 */
export function getCanonicalPath(localizedPath: string): string {
  const path = parseLocaleFromPath(localizedPath).pathWithoutLocale;
  return path.length > 1 ? path.replace(/\/$/, '') : path;
}

/**
 * Check if a path is the default locale (no prefix)
 */
export function isDefaultLocalePath(pathname: string): boolean {
  return parseLocaleFromPath(pathname).locale.isDefault;
}

/**
 * Get all locale codes except default
 */
export function getNonDefaultLocaleCodes(): LocaleCode[] {
  return NON_DEFAULT_LOCALES.map((l) => l.code);
}

/**
 * Navigation helper: create language switcher URLs
 */
export function createLanguageSwitcherUrls(
  currentPath: string,
  site: URL
): Array<{ locale: LocaleConfig; url: string; isCurrent: boolean }> {
  const { locale: currentLocale, pathWithoutLocale } = parseLocaleFromPath(currentPath);

  return LOCALES.map((locale) => ({
    locale,
    url: new URL(buildLocalizedPath(pathWithoutLocale, locale.code), site).href,
    isCurrent: locale.code === currentLocale.code,
  }));
}