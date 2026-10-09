/**
 * Localized SEO metadata.
 *
 * `config/navigation.ts` stays the single source of truth for the English
 * title / description / H1 / keywords of every page. Locale dictionaries may
 * override any of those fields per page under `seo.<key>`; the ids below are
 * the contract shared with the translation files. When an override is absent
 * the English value is served unchanged, so partial translations ship safely.
 */

import { getNavItemByPath, type SEOMetadata } from '../config/navigation';
import type { LocaleCode } from './config';
import { getDictionary } from './translations';

/** Canonical path → the `seo` key used in locale dictionaries. */
const SEO_KEYS: Record<string, string> = {
  '/': 'index',
  '/oklch-colors': 'palettes',
  '/oklch-color-palette-generator': 'generator',
  '/oklch-converter': 'converterHub',
  '/hex-to-oklch': 'hexToOklch',
  '/oklch-to-hex': 'oklchToHex',
  '/rgb-to-oklch': 'rgbToOklch',
  '/oklch-to-rgb': 'oklchToRgb',
  '/hsl-to-oklch': 'hslToOklch',
  '/oklch-to-hsl': 'oklchToHsl',
  '/ui-preview': 'preview',
  '/export': 'export',
  '/learn/what-is-oklch': 'whatIsOklch',
  '/learn/oklch-css-syntax': 'cssSyntax',
  '/learn/oklch-in-tailwind-css-v4': 'tailwindV4',
  '/learn/oklch-vs-hsl-vs-rgb': 'vsHslRgb',
  '/about': 'about',
  '/contact': 'contact',
  '/privacy': 'privacy',
  '/terms': 'terms',
};

export function seoKeyForPath(canonicalPath: string): string | undefined {
  const normalized = canonicalPath.replace(/\/$/, '') || '/';
  return SEO_KEYS[normalized];
}

/**
 * SEO metadata for a page in a locale: the nav config's English metadata
 * with any locale overrides applied field-by-field.
 *
 * `fallback` covers pages with no nav entry (rare); pages that pass neither
 * get an empty record only when the nav lookup also misses.
 */
export function localizedSeo(
  canonicalPath: string,
  locale: LocaleCode,
  fallback?: SEOMetadata
): SEOMetadata {
  const base: SEOMetadata | undefined =
    getNavItemByPath(canonicalPath)?.seo ?? fallback;
  if (!base) {
    return (
      fallback ?? {
        title: '',
        metaDescription: '',
        h1: '',
        keywords: [],
        schemaType: 'WebApplication',
      }
    );
  }

  const key = seoKeyForPath(canonicalPath);
  const override = key ? getDictionary(locale).seo?.[key] : undefined;
  if (!override) return base;

  return {
    ...base,
    ...(override.title ? { title: override.title } : {}),
    ...(override.metaDescription ? { metaDescription: override.metaDescription } : {}),
    ...(override.h1 ? { h1: override.h1 } : {}),
    ...(override.keywords ? { keywords: override.keywords } : {}),
    ...(override.faqs ? { faqs: override.faqs } : {}),
  };
}
