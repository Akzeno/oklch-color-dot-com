// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
// Redirects for legacy URLs live in public/_redirects so Cloudflare Pages
// serves real 301s instead of Astro's meta-refresh HTML.
export default defineConfig({
  site: 'https://oklchcolors.com',
  integrations: [preact()],
  vite: {
    plugins: [tailwindcss()],
  },
});
