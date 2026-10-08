/**
 * JSON-LD structured data, built centrally for every page.
 *
 * Each page emits a single <script type="application/ld+json"> containing an
 * @graph of:
 *   · WebSite + Organization   — sitewide identity, referenced via @id so the
 *                                duplicate nodes collapse into one entity.
 *   · The page's own type      — WebApplication (tools/converters),
 *                                CollectionPage (palette pages) or Article
 *                                (learn guides), keyed off the `schemaType`
 *                                already declared in navigation.ts.
 *   · BreadcrumbList           — derived from the canonical path + nav config;
 *                                omitted on home and noindex (404) pages.
 *
 * All URLs derive from `site` (astro.config.mjs). Names come from navigation.ts
 * or data files — never from per-page literals.
 *
 * FAQPage JSON-LD is intentionally NOT emitted by default: Google dropped FAQ
 * rich results in May 2026, so the visible FAQ sections carry the user value.
 * The `faqs` field in navigation.ts remains supported — if a page populates it,
 * a FAQPage node is appended automatically.
 */

import { getNavItemByPath } from '../config/navigation';
import { PALETTES } from '../data/palettes';
import { getLocaleConfig, type LocaleCode } from '../i18n/config';
import { localizedSeo } from '../i18n/seo';
import { t } from '../i18n/translations';

export type SchemaType = 'WebApplication' | 'CollectionPage' | 'Article';

export interface JsonLdInput {
  site: URL;
  canonicalPath: string;
  canonicalUrl: string;
  title: string;
  description: string;
  schemaType: SchemaType;
  datePublished?: string;
  dateModified?: string;
  faqs?: Array<{ question: string; answer: string }>;
  noindex?: boolean;
  /** Page locale — drives inLanguage, breadcrumb labels and localized URLs. */
  locale?: LocaleCode;
}

const SITE_NAME = 'OKLCH Colors';

/** Segment labels for path levels that have no nav item of their own. */
function segmentLabel(segment: string, locale: LocaleCode): string {
  if (segment === 'learn') return t(locale, 'common.learn', 'Learn');
  return segment;
}

interface Crumb {
  name: string;
  url: string;
}

/**
 * Last breadcrumb label for a path:
 *   · a nav page       → its H1 from navigation.ts (locale-overridden when
 *                        a translation exists)
 *   · a palette detail → the palette's name from palettes.ts
 *   · anything else    → a title-cased final path segment
 */
function lastCrumbLabel(path: string, locale: LocaleCode): string {
  const nav = getNavItemByPath(path);
  if (nav) return localizedSeo(path, locale).h1 || nav.seo.h1;

  const slug = path.replace(/^\/oklch-colors\//, '');
  const palette = PALETTES.find((p) => p.slug === slug);
  if (palette) return palette.name;

  const segment = path.replace(/\/$/, '').split('/').pop() ?? '';
  return segment
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Breadcrumb trail for a canonical path, home first, URLs locale-prefixed. */
function breadcrumbTrail(path: string, site: URL, locale: LocaleCode): Crumb[] {
  const localeConfig = getLocaleConfig(locale);
  const hrefFor = (p: string) =>
    new URL(
      localeConfig.isDefault
        ? p
        : p === '/'
          ? localeConfig.prefix
          : `${localeConfig.prefix}${p}`,
      site
    ).href;

  const root = hrefFor('/');
  const normalized = path.replace(/\/$/, '') || '/';
  // Localized home pages live at non-root routes (/hi, /pt, …), and like every
  // non-root route they carry a BreadcrumbList: a single "Home" crumb pointing
  // at the localized landing page. The English home (the true root) still emits
  // no breadcrumbs by design.
  if (normalized === '/') {
    return localeConfig.isDefault
      ? []
      : [{ name: t(locale, 'common.home', 'Home'), url: root }];
  }

  const segments = normalized.split('/').filter(Boolean);
  const crumbs: Crumb[] = [
    { name: t(locale, 'common.home', 'Home'), url: root },
  ];

  segments.forEach((segment, i) => {
    // The last segment carries the page's own label (H1 / palette name);
    // intermediate segments resolve through the nav config when possible.
    const isLast = i === segments.length - 1;
    const partialPath = '/' + segments.slice(0, i + 1).join('/');
    const nav = getNavItemByPath(partialPath);
    const name = isLast
      ? lastCrumbLabel(normalized, locale)
      : (nav
          ? localizedSeo(partialPath, locale).h1 || nav.seo.h1
          : segmentLabel(segment, locale));
    crumbs.push({ name, url: hrefFor(partialPath) });
  });

  return crumbs;
}

function organizationNode(site: URL) {
  const root = new URL('/', site).href;
  return {
    '@type': 'Organization',
    '@id': `${root}#organization`,
    name: SITE_NAME,
    url: root,
    logo: {
      '@type': 'ImageObject',
      url: new URL('/apple-touch-icon.png', site).href,
      width: 180,
      height: 180,
    },
  };
}

function webSiteNode(site: URL, inLanguage: string) {
  const root = new URL('/', site).href;
  return {
    '@type': 'WebSite',
    '@id': `${root}#website`,
    name: SITE_NAME,
    url: root,
    inLanguage,
    publisher: { '@id': `${root}#organization` },
  };
}

function pageNode(input: JsonLdInput, orgId: string, inLanguage: string) {
  const base = {
    name: input.title,
    url: input.canonicalUrl,
    description: input.description,
    inLanguage,
  };

  if (input.schemaType === 'Article') {
    return {
      '@type': 'Article',
      ...base,
      headline: input.title,
      ...(input.datePublished ? { datePublished: input.datePublished } : {}),
      ...(input.dateModified ? { dateModified: input.dateModified } : {}),
      mainEntityOfPage: input.canonicalUrl,
      author: { '@id': orgId },
      publisher: { '@id': orgId },
      isPartOf: { '@id': new URL('/', input.site).href + '#website' },
    };
  }

  if (input.schemaType === 'CollectionPage') {
    return {
      '@type': 'CollectionPage',
      ...base,
      isPartOf: { '@id': new URL('/', input.site).href + '#website' },
    };
  }

  // WebApplication — the tools and converters. `offers` states the free tier
  // that the pages themselves claim; it is not an invented promotion.
  return {
    '@type': 'WebApplication',
    ...base,
    applicationCategory: 'DesignApplication',
    operatingSystem: 'All',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    publisher: { '@id': orgId },
  };
}

function breadcrumbNode(trail: Crumb[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}

function faqNode(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Build the full JSON-LD graph for one page. Returns the object to stringify
 * into a single <script type="application/ld+json"> tag.
 */
export function buildJsonLdGraph(input: JsonLdInput) {
  const locale = input.locale ?? 'en';
  const inLanguage = getLocaleConfig(locale).locale;
  const org = organizationNode(input.site);
  const graph: object[] = [
    org,
    webSiteNode(input.site, inLanguage),
    pageNode(input, org['@id'], inLanguage),
  ];

  if (!input.noindex) {
    const trail = breadcrumbTrail(input.canonicalPath, input.site, locale);
    if (trail.length > 0) graph.push(breadcrumbNode(trail));
  }

  // Only emitted when a page actually supplies FAQ data (see file header).
  if (input.faqs && input.faqs.length > 0 && !input.noindex) {
    graph.push(faqNode(input.faqs));
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}
