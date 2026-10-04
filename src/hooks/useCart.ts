import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import {
  cartStore,
  hydrateCartFromStorage,
  DEFAULT_CART_SNAPSHOT,
  type CartState,
} from '../stores/cartStore';

/**
 * Read the cart store and hydrate it from localStorage *after* mount.
 *
 * The store intentionally starts from deterministic defaults so the SSR HTML
 * matches the first client render. Every component that displays cart data
 * must go through this hook (instead of a bare `useStore(cartStore)`) so the
 * persisted tokens get applied in an effect, where a state change is safe.
 *
 * WHY THIS ALSO PINS THE FIRST RENDER:
 * `cartStore` is a module singleton, but a page mounts many independent
 * `client:load` islands (e.g. the header cart trigger, the cart drawer and the
 * UI preview sidebar all read it). Whichever island hydrates first runs
 * `hydrateCartFromStorage()` and swaps the shared store to the persisted cart.
 * If a later island then read the raw store for its first render, its output
 * would describe the persisted cart while the server HTML described the
 * defaults — a hydration mismatch. Preact adopts DOM positionally without
 * patching props during hydration, so that mismatch shows up as stale
 * `class`/`title`/`style` attributes wrapped around freshly rendered children
 * (e.g. a swatch inheriting an empty-slot's flex row and stretching full
 * width). It only reproduces on a race, hence the intermittent "sometimes on
 * refresh" reports.
 *
 * Returning `DEFAULT_CART_SNAPSHOT` until mounted makes the first render of
 * every root identical to the server output, which removes the mismatch at the
 * source rather than patching its symptoms. After mount the live store is
 * returned, so persisted tokens appear as normal.
 */
export function useCart(): CartState {
  const cart = useStore(cartStore);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // A no-op when an earlier island already hydrated; `setMounted` must run
    // regardless so this root is never stranded on the default snapshot.
    hydrateCartFromStorage();
    setMounted(true);
  }, []);

  return mounted ? cart : DEFAULT_CART_SNAPSHOT;
}