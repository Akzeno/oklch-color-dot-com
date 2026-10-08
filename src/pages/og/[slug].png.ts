import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { getAllNavItemsFlat } from '../../config/navigation';
import { PALETTES } from '../../data/palettes';
import { SHADE_STEPS } from '../../utils/color';
import { buildOgSvg, ogSlugForPath, type OgImageSpec } from '../../utils/ogImage';

/**
 * Build-time 1200x630 Open Graph images, one per indexable page.
 * BaseLayout derives each page's og:image URL from the same slug helper,
 * so adding a route to navigation.ts automatically wires up its image here.
 */
export function getStaticPaths() {
  const paths: { params: { slug: string }; props: { spec: OgImageSpec } }[] = [];

  for (const item of getAllNavItemsFlat()) {
    paths.push({
      params: { slug: ogSlugForPath(item.path) },
      props: {
        spec: {
          title: item.seo.title,
          subtitle: item.seo.metaDescription,
        },
      },
    });
  }

  for (const palette of PALETTES) {
    paths.push({
      params: { slug: ogSlugForPath(`/oklch-colors/${palette.slug}`) },
      props: {
        spec: {
          title: `${palette.name} OKLCH Palette - 50-950, HEX & Tailwind v4`,
          subtitle: palette.description,
          // Real computed shades (hex is universally renderable in rasterized
          // SVG; oklch() would not be understood by librsvg).
          swatches: SHADE_STEPS.map((step) => palette.shades[step].hex),
        },
      },
    });
  }

  // The 404 page still ships og tags; give it a matching image.
  paths.push({
    params: { slug: '404' },
    props: {
      spec: {
        title: 'Page Not Found - OKLCH Color Tools',
        subtitle: 'Pick a tool below to get back to converting OKLCH colors.',
      },
    },
  });

  // Same for the 500 page — its og:image must resolve like every other page's.
  paths.push({
    params: { slug: '500' },
    props: {
      spec: {
        title: 'Something Went Wrong - OKLCH Color Tools',
        subtitle: 'An unexpected error occurred. Pick a tool below to get back to converting OKLCH colors.',
      },
    },
  });

  return paths;
}

export const GET = (async ({ props }) => {
  const svg = buildOgSvg(props.spec);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': String(png.byteLength),
    },
  });
}) satisfies APIRoute;
