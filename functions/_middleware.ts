// functions/_middleware.ts
// Blocks indexing of all *.pages.dev preview/production domains
// while allowing custom domain to be indexed normally.

import type { PagesFunction } from "@cloudflare/workers-types";

export const onRequest: PagesFunction = async (context) => {
  const response = await context.next();
  const url = new URL(context.request.url);

  // Block indexing on any *.pages.dev hostname (preview + production .pages.dev)
  if (url.hostname.endsWith(".pages.dev")) {
    response.headers.set("X-Robots-Tag", "noindex");
  }

  return response;
};