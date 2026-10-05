import { useEffect } from 'preact/hooks';
import {
  customPaletteStore,
  hydrateCustomPaletteFromStorage,
  DEFAULT_CUSTOM_PALETTE,
  type CustomPaletteSlot,
} from '../stores/customPaletteStore';
import { useHydratedStore } from './useHydratedStore';

/**
 * Read the custom palette and hydrate it from localStorage *after* mount.
 *
 * WHY THIS IS PERSISTED AT ALL
 *
 * Not for the reload. For the colour picker: editing a slot navigates to `/` and
 * back, and `<ClientRouter />` swaps the document — so every island on this page
 * is torn down and re-mounted, and component state does not survive the trip.
 * A palette held in `useState` would come back as its defaults after every
 * single edit, which would make the feature unusable rather than merely lossy.
 *
 * Everything else follows from that: the store is a module singleton (so the
 * values are there before the island remounts), and the first render is pinned
 * to `DEFAULT_CUSTOM_PALETTE` so the server HTML and the client's first paint
 * cannot disagree while the persisted palette is being loaded.
 */
export function useCustomPalette(): CustomPaletteSlot[] {
  const slots = useHydratedStore(customPaletteStore, DEFAULT_CUSTOM_PALETTE);

  useEffect(() => {
    // A no-op when an earlier island already hydrated. Runs after the pin has
    // been lifted, so the persisted palette appears in the first real render.
    hydrateCustomPaletteFromStorage();
  }, []);

  return slots;
}