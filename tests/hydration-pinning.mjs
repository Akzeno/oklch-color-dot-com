/**
 * Behavioural test for `useHydratedStore`.
 *
 * This is the fix for the Preact hydration failure that appeared once
 * `<ClientRouter />` was switched on:
 *
 *   Expected a DOM node of type "div" but found "" as available DOM-node(s)
 *
 * WHY THE BUG HAPPENED
 *
 * `useStore` returns `store.get()` on the very first render, on the server and
 * on the client alike. A nanostore is a module singleton, so it survives a
 * client-side navigation while the markup for the destination page comes fresh
 * from the server. When the store holds something the server did not render —
 * e.g. `setRoleShade` fires a toast and the picker then navigates back to
 * /ui-preview — the island's first client render describes a different tree
 * from the DOM it is hydrating. Preact adopts nodes positionally, finds no node
 * to match, and calls `options.__m`.
 *
 * WHAT IS ASSERTED HERE
 *
 * That the first render is pinned to the server's value even while the store
 * holds something else, and that the live value takes over once mounted.
 *
 * `preact-render-to-string` is used deliberately: it never runs effects, so it
 * models the pre-mount render exactly — which is the render that has to match
 * the server's HTML.
 */
import { h } from 'preact';
import { render } from 'preact-render-to-string';
import { atom } from 'nanostores';
import { useStore } from '@nanostores/preact';
import { useHydratedStore } from '../src/hooks/useHydratedStore.ts';

let failures = 0;
function check(name, cond, extra = '') {
  if (cond) console.log('PASS  ' + name);
  else {
    failures++;
    console.log('FAIL  ' + name + (extra ? '\n      ' + extra : ''));
  }
}

/** Mirrors the shape of Toast / CartDrawerIsland: a stable root, live children. */
function Overlay({ store, serverValue, pinned }) {
  const live = pinned ? useHydratedStore(store, serverValue) : useStore(store);
  return h('div', { class: 'root' }, live == null || live === false ? null : h('span', null, String(live)));
}

/** What a bare `useStore` island does — the thing that used to crash. */
function Unpinned({ store }) {
  const live = useStore(store);
  return h('div', { class: 'root' }, live == null || live === false ? null : h('span', null, String(live)));
}

console.log('=== The store really does leak across a navigation ===');
// Reproduce the exact reported sequence: an action fires a toast, then the page
// navigates, so the island hydrates the server's markup while this is set.
const toastStore = atom(null);
const SERVER_MARKUP = render(h(Overlay, { store: toastStore, serverValue: null, pinned: true }));

toastStore.set('Removed --color-danger-500');
check('store is non-empty, simulating a surviving singleton', toastStore.get() !== null);

const crashedRender = render(h(Unpinned, { store: toastStore }));
check('an unpinned island renders DIFFERENT markup than the server sent',
  crashedRender !== SERVER_MARKUP,
  'both were: ' + SERVER_MARKUP);
check('...and that difference is exactly the extra child',
  crashedRender.includes('<span>Removed --color-danger-500</span>') &&
  !SERVER_MARKUP.includes('<span>'),
  'server: ' + SERVER_MARKUP + '\n      client: ' + crashedRender);

console.log('\n=== Pinning makes the first render identical to the server ===');
const pinnedRender = render(h(Overlay, { store: toastStore, serverValue: null, pinned: true }));
check('pinned markup === server markup', pinnedRender === SERVER_MARKUP,
  'server: ' + SERVER_MARKUP + '\n      pinned: ' + pinnedRender);
check('pinned markup contains no toast child',
  !pinnedRender.includes('<span>'), 'got ' + pinnedRender);
check('the root element is still present (island is not empty)',
  pinnedRender.includes('class="root"'), 'got ' + pinnedRender);

console.log('\n=== Same guarantee for boolean overlay state (the cart drawer) ===');
const openStore = atom(false);
const DRAWER_MARKUP = render(h(Overlay, { store: openStore, serverValue: false, pinned: true }));
check('closed drawer matches the server', DRAWER_MARKUP === '<div class="root"></div>', 'got ' + DRAWER_MARKUP);
openStore.set(true);
const drawerRender = render(h(Overlay, { store: openStore, serverValue: false, pinned: true }));
check('open drawer still matches the server on first render',
  drawerRender === DRAWER_MARKUP, 'got ' + drawerRender);

console.log('\n=== A non-empty server value is pinned too ===');
// Not every store is an overlay: prove the hook is not hardcoded to null/false.
const seeded = atom('initial');
const SEEDED_MARKUP = render(h(Overlay, { store: seeded, serverValue: 'initial', pinned: true }));
seeded.set('changed');
const seededRender = render(h(Overlay, { store: seeded, serverValue: 'initial', pinned: true }));
check('a seeded value is held, not overwritten by null',
  SEEDED_MARKUP.includes('initial'), 'got ' + SEEDED_MARKUP);
check('it stays pinned after the store changes',
  seededRender === SEEDED_MARKUP, 'server: ' + SEEDED_MARKUP + '\n      client: ' + seededRender);

console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'));
process.exit(failures === 0 ? 0 : 1);