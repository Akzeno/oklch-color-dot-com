import fs from 'node:fs';
import path from 'node:path';

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const pages = walk('dist').filter((p) => !p.includes('hex-to-oklch-converter'));
for (const p of pages) {
  const html = fs.readFileSync(p, 'utf8');
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  const h1s = [...html.matchAll(/<h1[^>]*>(.*?)<\/h1>/g)].map((m) =>
    m[1].replace(/<[^>]*>/g, '').trim()
  );
  const canonical = (html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1] || '';
  const ogImage = (html.match(/<meta property="og:image" content="([^"]*)"/) || [])[1] || '';
  const twitterImage = (html.match(/<meta name="twitter:image" content="([^"]*)"/) || [])[1] || '';
  const ogType = (html.match(/<meta property="og:type" content="([^"]*)"/) || [])[1] || '';
  const ogSiteName = (html.match(/<meta property="og:site_name" content="([^"]*)"/) || [])[1] || '';
  const ogLocale = (html.match(/<meta property="og:locale" content="([^"]*)"/) || [])[1] || '';
  const themeColor = (html.match(/<meta name="theme-color" content="([^"]*)"/) || [])[1] || '';
  const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const jsonLdTypes = jsonLd.map((j) => {
    try {
      return JSON.parse(j)['@type'];
    } catch {
      return 'PARSE_ERROR';
    }
  });
  const noindex = html.includes('noindex');
  const text = html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = text.split(' ').filter((w) => w.length > 0).length;
  const imgs = [...html.matchAll(/<img[^>]*>/g)];
  const imgsNoAlt = imgs.filter((m) => !m[0].includes('alt=')).length;
  const rel = p.replace(/\\/g, '/').replace(/^dist/, '').replace(/\/index\.html$/, '/') || '/';
  console.log(
    JSON.stringify({
      page: rel,
      title,
      titleLen: title.length,
      descLen: desc.length,
      h1s,
      canonical,
      ogImage,
      twitterImage,
      ogType,
      ogSiteName,
      ogLocale,
      themeColor,
      jsonLdTypes,
      noindex,
      words,
      imgs: imgs.length,
      imgsNoAlt,
    })
  );
}
