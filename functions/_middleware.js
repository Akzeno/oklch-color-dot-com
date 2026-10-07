// functions/_middleware.js
// Blocks indexing of all *.pages.dev preview/production domains
// while allowing custom domain to be indexed normally.

export const onRequest = async (context) => {
  const response = await context.next();
  const url = new URL(context.request.url);

  // Block indexing on any *.pages.dev hostname (preview + production .pages.dev)
  if (url.hostname.endsWith(".pages.dev")) {
    response.headers.set("X-Robots-Tag", "noindex");
  }

  return response;
};