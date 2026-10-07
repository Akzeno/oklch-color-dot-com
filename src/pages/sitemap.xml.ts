import type { APIRoute } from 'astro';
import { execFileSync } from 'node:child_process';
import { getAllNavItemsFlat } from '../config/navigation';
import { PALETTES } from '../data/palettes';

/**
 * Truthful <lastmod> comes from `git log -1` on each page's source/data file.
 * Never today's date: a page whose files have not changed keeps its real last
 * change date, and if git is unavailable (shallow CI checkout, archive copy)
 * the <lastmod> element is omitted entirely rather than fabricated.
 */

/** Source files whose content feeds a given canonical path. */
function sourceFilesFor(path: string): string[] {
  if (path === '/') return ['src/pages/index.astro'];
  if (path === '/oklch-colors') return ['src/pages/oklch-colors/index.astro'];
  if (path.startsWith('/oklch-colors/')) {
    return ['src/pages/oklch-colors/[slug].astro', 'src/data/palettes.ts'];
  }
  if (path.startsWith('/learn/')) return [`src/pages${path}.astro`];
  // Tool pages live at src/pages/<slug>.astro
  return [`src/pages${path}.astro`];
}

let gitAvailable: boolean | null = null;

function lastModified(files: string[]): string | null {
  if (gitAvailable === null) {
    try {
      execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { stdio: 'pipe' });
      gitAvailable = true;
    } catch {
      gitAvailable = false;
    }
  }
  if (!gitAvailable) return null;

  try {
    // `git log -1 --format=%aI -- files...` gives the author date of the most
    // recent commit touching any of the files.
    const out = execFileSync(
      'git',
      ['log', '-1', '--format=%aI', '--', ...files],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    )
      .toString()
      .trim();
    if (!out) return null;
    const date = new Date(out);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
}

/** Non-indexable paths that should never appear in the sitemap. */
const EXCLUDED_PATHS = new Set(['/404', '/500']);

/** Crawl hints: how often a page changes and its relative importance. */
function crawlHints(path: string): { changefreq: string; priority: string } {
  if (path === '/') return { changefreq: 'daily', priority: '1.0' };
  if (path.startsWith('/oklch-colors')) return { changefreq: 'monthly', priority: '0.7' };
  if (path.startsWith('/learn/')) return { changefreq: 'monthly', priority: '0.7' };
  if (path.startsWith('/privacy') || path.startsWith('/about') || path.startsWith('/terms') || path.startsWith('/contact')) {
    return { changefreq: 'yearly', priority: '0.3' };
  }
  // Tool pages (converters, picker, generator, preview, export).
  return { changefreq: 'monthly', priority: '0.8' };
}

export const GET: APIRoute = ({ site }) => {
  if (!site) {
    throw new Error('astro.config.mjs must define `site` — sitemap URLs derive from it.');
  }

  const paths: string[] = [];

  // Main navigation items (parents with children are already skipped).
  for (const item of getAllNavItemsFlat()) {
    if (!EXCLUDED_PATHS.has(item.path)) {
      paths.push(item.path);
    }
  }

  // Individual palette detail pages.
  for (const palette of PALETTES) {
    const path = `/oklch-colors/${palette.slug}`;
    if (!EXCLUDED_PATHS.has(path)) {
      paths.push(path);
    }
  }

  const entries = paths
    .map((path) => {
      const loc = new URL(path, site).href;
      const lastmod = lastModified(sourceFilesFor(path));
      const { changefreq, priority } = crawlHints(path);
      return `  <url>\n    <loc>${loc}</loc>${
        lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''
      }\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
    })
    .join('\n');

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;

  return new Response(sitemapXml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
