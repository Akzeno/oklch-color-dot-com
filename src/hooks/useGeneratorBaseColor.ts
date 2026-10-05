import { useCallback, useEffect, useState } from 'preact/hooks';
import { useHydratedStore } from './useHydratedStore';
import {
  DEFAULT_BASE_COLOR_TEXT,
  generatorBaseStore,
  hydrateGeneratorBaseFromStorage,
  setGeneratorBaseColor,
} from '../stores/generatorStore';

/**
 * The palette generator's base colour: the text in the field, and the colour it
 * resolves to.
 *
 * WHY THE VALUE IS NOT SIMPLY THE STORE'S
 *
 * The store only ever holds a text that parses as a colour, but the field is
 * typed into one character at a time, and `#25` is not one. Those intermediate
 * values have to be shown — a field that refused to display what was just typed
 * into it would be unusable — while being kept *out* of the store, because the
 * store is what gets persisted. So the field shows the draft while one exists,
 * and the stored colour the moment the draft becomes a real colour.
 *
 * There is no "invalid" state to recover from: when a draft becomes valid it is
 * the draft's own text that gets stored, so the string on screen and the string
 * that was written are the same one and the field does not shift under the caret.
 *
 * @returns The text the field shows, and a setter for it. Every route to a new
 *   base colour — a preset, Random, the picker, typing — goes through the
 *   setter, which is why none of them can drift out of persistence.
 */
export function useGeneratorBaseColor(): [string, (text: string) => void] {
  // Pinned to the default for the first render: the server rendered that markup,
  // and the store may already hold a different colour by the time this island
  // mounts after a navigation.
  const stored = useHydratedStore(generatorBaseStore, DEFAULT_BASE_COLOR_TEXT);

  useEffect(() => {
    // A no-op when an earlier island already hydrated. Runs after the pin has
    // been lifted, so the persisted colour appears in the first real render.
    hydrateGeneratorBaseFromStorage();
  }, []);

  const [draft, setDraft] = useState<string | null>(null);

  const setText = useCallback((text: string) => {
    setDraft(text);
    // Accepted → the draft has become the stored colour, so it is no longer a
    // draft. Rejected → it stays on screen, unpersisted, until it parses.
    if (setGeneratorBaseColor(text)) setDraft(null);
  }, []);

  return [draft ?? stored, setText];
}