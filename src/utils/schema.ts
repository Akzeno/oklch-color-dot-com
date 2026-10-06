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
}

const SITE_NAME = 'OKLCH Colors';
const IN_LANGUAGE = 'en';

/** Segment labels for path levels that have no nav item of their own. */
const SEGMENT_LABELS: Record<string, string> = {
  learn: 'Learn',
};

interface Crumb {
  name: string;
  url: string;
}

/**
 * Last breadcrumb label for a path:
 *   · a nav page       → its H1 from navigation.ts
 *   · a palette detail → the palette's name from palettes.ts
 *   · anything else    → a title-cased final path segment
 */
function lastCrumbLabel(path: string): string {
  const nav = getNavItemByPath(path);
  if (nav) return nav.seo.h1;

  const slug = path.replace(/^\/oklch-colors\//, '');
  const palette = PALETTES.find((p) => p.slug === slug);
  if (palette) return palette.name;

  const segment = path.replace(/\/$/, '').split('/').pop() ?? '';
  return segment
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Breadcrumb trail for a canonical path, home first. */
function breadcrumbTrail(path: string, site: URL): Crumb[] {
  const root = new URL('/', site).href;
  const normalized = path.replace(/\/$/, '') || '/';
  if (normalized === '/') return [];

  const segments = normalized.split('/').filter(Boolean);
  const crumbs: Crumb[] = [{ name: 'Home', url: root }];

  segments.forEach((segment, i) => {
    // The last segment carries the page's own label (H1 / palette name);
    // intermediate segments resolve through the nav config when possible.
    const isLast = i === segments.length - 1;
    const partialPath = '/' + segments.slice(0, i + 1).join('/');
    const nav = getNavItemByPath(partialPath);
    const name = isLast
      ? lastCrumbLabel(normalized)
      : (nav?.seo.h1 ?? SEGMENT_LABELS[segment] ?? segment);
    crumbs.push({ name, url: new URL(partialPath, site).href });
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

function webSiteNode(site: URL) {
  const root = new URL('/', site).href;
  return {
    '@type': 'WebSite',
    '@id': `${root}#website`,
    name: SITE_NAME,
    url: root,
    inLanguage: IN_LANGUAGE,
    publisher: { '@id': `${root}#organization` },
  };
}

function pageNode(input: JsonLdInput, orgId: string) {
  const base = {
    name: input.title,
    url: input.canonicalUrl,
    description: input.description,
    inLanguage: IN_LANGUAGE,
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
  const org = organizationNode(input.site);
  const graph: object[] = [org, webSiteNode(input.site), pageNode(input, org['@id'])];

  if (!input.noindex) {
    const trail = breadcrumbTrail(input.canonicalPath, input.site);
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
