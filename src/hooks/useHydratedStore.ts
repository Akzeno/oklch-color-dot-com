import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import type { Store, StoreValue } from 'nanostores';

/**
 * Read a nanostore, reporting the server-rendered value for the first render.
 *
 * THE PROBLEM THIS SOLVES
 *
 * A nanostore is a module singleton, so it survives a client-side route change.
 * With `<ClientRouter />`, the destination page is fetched *from the server*, so
 * every island arrives carrying the markup the server produced — while the store
 * it reads still holds whatever the user was doing on the previous page.
 *
 * Those two can disagree, and Preact hydration is positional: it walks the
 * incoming DOM and adopts nodes by position. When the client's first render
 * describes a different tree, Preact finds no node to adopt, falls back to
 * `options.__m` ("Expected a DOM node of type X but found Y"), and renders the
 * island as a second, unstyled duplicate on top of the SSR one.
 *
 * THE FIX
 *
 * Pin the first render to the value the server saw. That makes the first client
 * render identical to the SSR markup by construction, whatever the store
 * happens to hold. The effect runs immediately after mount, so the live value
 * lands one frame later — imperceptible, and far cheaper than a hydration
 * mismatch that duplicates the app shell.
 *
 * This is the only correct shape for a store-backed island once client-side
 * routing is on. "Render nothing when empty" is not a fix: it only moves the
 * disagreement from the DOM shape down to the children, and the children still
 * mismatch.
 *
 * @param store       The nanostore to read.
 * @param serverValue What the server rendered for this store. For transient
 *                    overlay state that is almost always `false`/`null`.
 *                    `NoInfer` keeps this argument out of inference — otherwise
 *                    `useHydratedStore(toastStore, null)` would infer `T = null`
 *                    from it and erase the store's own value type.
 */
export function useHydratedStore<SomeStore extends Store>(
  store: SomeStore,
  serverValue: NoInfer<StoreValue<SomeStore>>
): StoreValue<SomeStore> {
  const value = useStore(store);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Unconditional: an island must never be stranded on the server value, or
    // the overlay it controls would be permanently dead.
    setMounted(true);
  }, []);

  return mounted ? value : serverValue;
}