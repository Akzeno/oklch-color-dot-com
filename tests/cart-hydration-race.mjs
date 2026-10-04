/**
 * Reproduces the "UI preview breaks on refresh" race.
 *
 * A page mounts several independent `client:load` islands that all read the
 * single shared `cartStore` singleton. If an earlier island hydrates
 * localStorage before the UI preview island renders, the preview's FIRST client
 * render describes the persisted cart while the server HTML described the
 * defaults -> Preact hydration mismatch -> stale class/title/style.
 *
 * This asserts the first render is byte-identical to the server output no
 * matter what state the shared store is in at that moment.
 */
import { render } from 'preact-render-to-string';
import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import {
  cartStore,
  hydrateCartFromStorage,
  setRoleShade,
} from '../src/stores/cartStore.ts';
import { createOklchColor, formatOklch } from '../src/utils/color.ts';
import { useCart } from '../src/hooks/useCart.ts';

const STORAGE_KEY = 'oklch_cart_v1';

// Minimal localStorage stub.
const store = new Map();
globalThis.window = {
  set innerWidth(v) {},
  get innerWidth() { return 1440; },
  addEventListener() {},
  removeEventListener() {},
};
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, v),
  removeItem: (k) => store.delete(k),
};
globalThis.sessionStorage = globalThis.localStorage;

// --- A component shaped like CartSidebar's shade grid -----------------------
function Slot({ step, has }) {
  if (!has) {
    return h(
      'div',
      { key: step, class: 'relative group min-w-0' },
      h('div', { class: 'h-10 w-full rounded-lg bg-[#0a0a0a] flex items-center justify-center' },
        h('span', null, step)),
      h('div', { class: 'mt-1 text-center' }, step)
    );
  }
  return h(
    'div',
    { key: step, class: 'relative group min-w-0' },
    h('div', { class: 'h-10 w-full rounded-lg', style: { backgroundColor: 'oklch(86.0% 0.107 70.1)' } }),
    h('div', { class: 'mt-1 text-center' }, step),
    h('div', { class: 'mt-1 truncate' }, 'oklch(86.0% 0.107 70.1)')
  );
}

function Grid() {
  const cart = useCart();
  const role = cart.roles['success'];
  const has = Boolean(role && role.shades[200]);
  return h(
    'div',
    { class: 'grid grid-cols-4' },
    [50, 100, 200, 300].map((s) => h(Slot, { key: s, step: s, has: has && s === 200 }))
  );
}

/** Render exactly one pass, i.e. the hydration render, with no effects run. */
function renderFirstPass() {
  return render(h(Grid));
}

let failures = 0;
function check(name, cond, extra = '') {
  if (cond) {
    console.log('PASS  ' + name);
  } else {
    failures++;
    console.log('FAIL  ' + name + (extra ? '\n      ' + extra : ''));
  }
}

console.log('=== Scenario A: clean load (no stored cart) ===');
store.clear();
cartStore.set(cartStore.get()); // reset store to module default
const serverA = renderFirstPass();
console.log('      server HTML length: ' + serverA.length);

// --- The race: another island hydrates localStorage FIRST -------------------
console.log('\n=== Scenario B: sibling island hydrates storage before this one renders ===');
store.clear();
// Seed a persisted cart that differs a lot from the defaults.
const persisted = {
  activeRoleId: 'success',
  roles: {
    success: {
      id: 'success',
      name: 'Success',
      isDefault: true,
      shades: {
        200: { id: 'x', step: 200, color: { l: 0.86, c: 0.107, h: 70.1, alpha: 1, hex: '#ffd9a3', inSRGB: true, inP3: true } },
      },
    },
  },
};
store.set(STORAGE_KEY, JSON.stringify(persisted));

// Sibling island mounts first and hydrates the SHARED singleton.
hydrateCartFromStorage();

const firstPass = renderFirstPass();
check('first render still matches server HTML (no mismatch)',
  firstPass === serverA,
  firstPass === serverA ? '' : 'server : ' + serverA + '\n      first  : ' + firstPass);

check('first render does NOT contain the persisted shade',
  !firstPass.includes('oklch(86.0%'), 'leaked persisted state into the hydration render');

check('wrapper classes are identical for empty and filled slots',
  (firstPass.match(/relative group min-w-0/g) || []).length === 4,
  'found ' + (firstPass.match(/relative group min-w-0/g) || []).length + ' of 4');

check('no slot leaks a flex-row wrapper that would stretch w-full children',
  !/justify-center[^>]*><div class="h-10 w-full[^"]*"[^>]*style="background-color/.test(firstPass));

// After mount the live store must be what the UI reads. `render-to-string`
// never runs effects, so `mounted` can never flip here — asserting on rendered
// output would be meaningless. Instead assert on the store, which is what
// `useCart` returns once `mounted` is true.
setRoleShade('success', 200, createOklchColor(0.86, 0.107, 70.1));
const live = cartStore.get();
check('live store holds the shade for post-mount render',
  Boolean(live.roles['success'].shades[200]));
check('live store uses the canonical formatOklch percent form',
  formatOklch(live.roles['success'].shades[200].color) === 'oklch(86.0% 0.107 70.1)',
  'got ' + formatOklch(live.roles['success'].shades[200].color));
check('live store role order still starts with the default roles',
  Object.keys(live.roles).slice(0, 3).join(',') === 'primary,secondary,trusty-button',
  'got ' + Object.keys(live.roles).join(','));

console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'));
console.log('NOTE: post-mount *rendering* needs effects, which require a DOM;');
console.log('      it is covered by the live page, not this Node harness.');
process.exit(failures === 0 ? 0 : 1);