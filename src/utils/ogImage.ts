/**
 * Build-time Open Graph image generator.
 *
 * Each indexable page gets a real 1200x630 PNG rendered from an SVG string
 * by the static endpoint in `src/pages/og/[slug].png.ts`. Palette pages render
 * their actual 11-step swatch strip; every other page gets a branded gradient
 * rule. Text is escaped because titles contain `&`, `(` and `()` freely.
 *
 * The font stack lists Segoe UI first (Windows, where the owner builds) then
 * DejaVu/Liberation (the usual Linux CI fonts) so the same SVG renders legibly
 * on Cloudflare Pages' build image as well as locally.
 */

export interface OgImageSpec {
  /** Page title — kept <= 60 chars by the site-wide title rules. */
  title: string;
  /** Short subtitle: the first sentence of the meta description. */
  subtitle?: string;
  /** Palette pages pass their 11 shade colors (50..950) for a swatch strip. */
  swatches?: string[];
}

const WIDTH = 1200;
const HEIGHT = 630;

const SANS = "Segoe UI, DejaVu Sans, Liberation Sans, Arial, sans-serif";
const MONO = "DejaVu Sans Mono, Consolas, Liberation Mono, monospace";

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (!line) {
      line = word;
    } else if (line.length + 1 + word.length <= maxChars) {
      line += ' ' + word;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** First sentence (or hard cut) of the subtitle, kept to ~110 chars. */
function shortSubtitle(subtitle: string): string {
  const sentence = subtitle.split(/(?<=\.)\s/)[0] ?? subtitle;
  if (sentence.length <= 110) return sentence;
  const cut = sentence.slice(0, 107);
  return cut.slice(0, cut.lastIndexOf(' ')) + '…';
}

/**
 * Map a canonical page path to the single-segment OG image slug.
 * `/` → `home`, `/hex-to-oklch` → `hex-to-oklch`,
 * `/oklch-colors/trusty-blue` → `oklch-colors-trusty-blue`.
 * BaseLayout uses this for the og:image URL and the endpoint uses it for
 * getStaticPaths, so the two can never drift apart.
 */
export function ogSlugForPath(path: string): string {
  const trimmed = path.replace(/^\/+|\/+$/g, '');
  return trimmed === '' ? 'home' : trimmed.replace(/\//g, '-');
}

/** Public URL path of a page's OG image: `/og/<slug>.png`. */
export function ogImagePathFor(path: string): string {
  return `/og/${ogSlugForPath(path)}.png`;
}

export function buildOgSvg(spec: OgImageSpec): string {
  // Pick a size that wraps the title into at most three lines.
  let fontSize = 72;
  let maxChars = 24;
  if (spec.title.length > 64) {
    fontSize = 44;
    maxChars = 40;
  } else if (spec.title.length > 24) {
    fontSize = 56;
    maxChars = 32;
  }
  const lines = wrap(spec.title, maxChars);

  const titleTop = 170;
  const titleElements = lines
    .map(
      (line, i) =>
        `<text x="80" y="${titleTop + fontSize * 0.8 + i * fontSize * 1.18}" font-family="${SANS}" font-size="${fontSize}" font-weight="700" fill="#fafafa">${esc(line)}</text>`
    )
    .join('\n  ');
  const lastBaseline = titleTop + fontSize * 0.8 + (lines.length - 1) * fontSize * 1.18;

  const subtitle = spec.subtitle
    ? `\n  <text x="80" y="${lastBaseline + 56}" font-family="${SANS}" font-size="28" fill="#a1a1aa">${esc(shortSubtitle(spec.subtitle))}</text>`
    : '';

  let bottom = '\n  <rect x="0" y="620" width="1200" height="10" fill="url(#brand)" />';
  if (spec.swatches && spec.swatches.length > 0) {
    const sw = WIDTH / spec.swatches.length;
    const strip = spec.swatches
      .map(
        (c, i) =>
          `<rect x="${(i * sw).toFixed(2)}" y="534" width="${sw.toFixed(2)}" height="96" fill="${esc(c)}" />`
      )
      .join('\n  ');
    bottom = `\n  ${strip}\n  <rect x="0" y="620" width="1200" height="10" fill="url(#brand)" />`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="brand" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#06b6d4" />
      <stop offset="50%" stop-color="#22c55e" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#0a0a0a" />
  <rect x="80" y="56" width="44" height="44" rx="12" fill="none" stroke="url(#brand)" stroke-width="3" />
  <text x="102" y="86" font-family="${MONO}" font-size="20" font-weight="700" fill="#f5f5f5" text-anchor="middle">ok</text>
  <text x="140" y="87" font-family="${MONO}" font-size="26" fill="#a1a1aa">oklchcolors.com</text>
  ${titleElements}${subtitle}${bottom}
</svg>`;
}
