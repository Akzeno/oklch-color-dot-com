import { navigate } from 'astro:transitions/client';

/**
 * Move between pages without tearing down the document.
 *
 * With `<ClientRouter />` mounted, Astro intercepts real link clicks and
 * `history.pushState`, but *not* a programmatic `window.location.href = '/…'`.
 * That assignment performs a full document load: the browser discards the DOM,
 * re-fetches and re-parses every script and stylesheet, and re-runs the whole
 * bundle before anything paints. Moving between the UI preview and the color
 * picker that way is what made the hop feel like leaving the site.
 *
 * `navigate()` fetches the destination HTML, swaps the DOM in place and keeps
 * the JavaScript context (so the shared `cartStore` survives the trip — the
 * freshly-saved colour is already there on arrival).
 *
 * The router already degrades to a hard navigation for targets it cannot
 * handle (router not active, different origin), so callers need no
 * feature-detection of their own.
 */
export function goTo(href: string): void {
  navigate(href).catch(() => {
    // An aborted or otherwise failed swap. Fall back to a real navigation so
    // the user still ends up where they were going.
    window.location.assign(href);
  });
}