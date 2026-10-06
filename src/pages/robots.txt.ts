import type { APIRoute } from 'astro';

/**
 * robots.txt derived from `site` in astro.config.mjs — the same single source
 * of truth as canonicals, OG URLs and the sitemap. Allows everything (the
 * sitemap is the only thing search engines need pointing at) and never blocks
 * /_astro/, which is where hashed JS/CSS lives.
 */
export const GET: APIRoute = ({ site }) => {
  if (!site) {
    throw new Error('astro.config.mjs must define `site` — robots.txt derives its Sitemap line from it.');
  }

  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${new URL('/sitemap.xml', site).href}`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
