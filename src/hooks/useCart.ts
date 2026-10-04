import { useEffect } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { cartStore, hydrateCartFromStorage, type CartState } from '../stores/cartStore';

/**
 * Read the cart store and hydrate it from localStorage *after* mount.
 *
 * The store intentionally starts from deterministic defaults so the SSR HTML
 * matches the first client render. Every component that displays cart data
 * must go through this hook (instead of a bare `useStore(cartStore)`) so the
 * persisted tokens get applied in an effect, where a state change is safe.
 */
export function useCart(): CartState {
  const cart = useStore(cartStore);

  useEffect(() => {
    hydrateCartFromStorage();
  }, []);

  return cart;
}
