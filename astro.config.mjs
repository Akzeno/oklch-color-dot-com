// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
// Redirects for legacy URLs live in public/_redirects so Cloudflare Pages
// serves real 301s instead of Astro's meta-refresh HTML.
export default defineConfig({
  site: 'https://oklchcolor.com',
  integrations: [preact()],
  // Inline critical CSS to eliminate render-blocking stylesheet
  build: {
    inlineStylesheets: 'always',
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      // Prevent duplicate modules across chunks
      modulePreload: {
        polyfill: false,
      },
      rollupOptions: {
        output: {
          // Deduplicate common modules (preact, lucide, etc.) into shared chunks
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('preact') || id.includes('jsx-runtime')) {
                return 'vendor-preact';
              }
              if (id.includes('lucide-preact')) {
                return 'vendor-lucide';
              }
              if (id.includes('astro')) {
                return 'vendor-astro';
              }
              return 'vendor';
            }
          },
        },
      },
    },
  },
});
