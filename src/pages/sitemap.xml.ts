import type { APIRoute } from 'astro';
import { getAllNavItemsFlat } from '../config/navigation';
import { PALETTES } from '../data/palettes';

export const GET: APIRoute = async () => {
  const siteUrl = 'https://oklchcolors.com';
  const navItems = getAllNavItemsFlat();

  const urls: { loc: string; priority: string; changefreq: string }[] = [];

  // Main navigation items
  navItems.forEach((item) => {
    urls.push({
      loc: `${siteUrl}${item.path}`,
      priority: item.path === '/' ? '1.0' : '0.8',
      changefreq: 'weekly',
    });
  });

  // Individual palette detail pages
  PALETTES.forEach((p) => {
    urls.push({
      loc: `${siteUrl}/oklch-colors/${p.slug}`,
      priority: '0.7',
      changefreq: 'monthly',
    });
  });

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(sitemapXml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
