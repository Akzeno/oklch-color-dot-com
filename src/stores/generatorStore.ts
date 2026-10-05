import { atom } from 'nanostores';
import { parseAnyToOklch } from '../utils/color';

const STORAGE_KEY = 'oklch_generator_base_v1';

/**
 * Longest accepted text. Well beyond any real colour notation, and it bounds
 * what a hand-edited payload can put in front of the parser.
 */
const MAX_TEXT = 120;

/**
 * What the page renders — and returns to — before anything has been chosen.
 *
 * A literal rather than a derived colour, because it is also the *text* the input
 * shows: the server has to render the exact string the client will render first,
 * or the field's `value` attribute disagrees with the server HTML during
 * hydration and Preact adopts the mismatched node.
 */
export const DEFAULT_BASE_COLOR_TEXT = '#2563eb';

/**
 * The base colour of the palette generator, as the text it was entered as.
 *
 * WHY TEXT AND NOT A `ColorModel`
 *
 * The field accepts any CSS notation, and a user who typed `#2563eb` should find
 * `#2563eb` in the box after a refresh rather than `oklch(54.6% 0.205 262.9)`.
 * Storing the text keeps the notation they chose as the thing they get back; the
 * colour itself is derived from it on every read, so there is still only ever one
 * source of truth.
 *
 * WHY A STORE AT ALL
 *
 * The island is torn down and re-mounted by `<ClientRouter />` on every client-side
 * navigation, and the colour picker is such a navigation: editing the base colour
 * goes to `/` and back. `useState` in the island comes back as its initial value
 * after each of those, so the colour the user chose would silently become blue
 * again — exactly the "it went back to blue" symptom. A module-singleton store
 * survives, and so does this payload.
 */
export const generatorBaseStore = atom<string>(DEFAULT_BASE_COLOR_TEXT);

/**
 * Accept a stored or typed value only if it really is a colour.
 *
 * `null` for everything else, which is what lets the caller distinguish "nothing
 * usable was there" from "there was nothing" — the same distinction the custom
 * palette's `sanitizeCustomPalette` draws. localStorage is user-writable, so this
 * value is attacker-reachable input and is validated before it is rendered.
 *
 * Exported for the same reason as that guard: so the check can be exercised
 * against every malformed payload without reloading the page to un-stick the
 * once-per-session hydrate flag.
 */
export function sanitizeBaseColorText(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const text = input.trim().slice(0, MAX_TEXT);
  return parseAnyToOklch(text) ? text : null;
}

let hasHydrated = false;

/**
 * Merge the persisted base colour into the store. MUST be called after mount (an
 * effect), never during render — same reason as `hydrateCartFromStorage`.
 *
 * Exported so the one-shot flag can be exercised in a test without reloading the
 * page to un-stick it.
 */
export function hydrateGeneratorBaseFromStorage() {
  if (hasHydrated || typeof window === 'undefined') return;
  hasHydrated = true;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const text = sanitizeBaseColorText(JSON.parse(raw));
    if (text) generatorBaseStore.set(text);
  } catch (e) {
    console.warn('Could not read the generator base colour from localStorage', e);
  }
}

function commit(next: string) {
  generatorBaseStore.set(next);
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (e) {
    console.warn('Could not save the generator base colour to localStorage', e);
  }
}

/**
 * Set the base colour from typed text.
 *
 * Returns whether the text was accepted, and this is the point of the return
 * value: a field is typed into one character at a time, so most keystrokes are
 * mid-edit (`#25`, `oklch(6`) and are not colours. Those must not be persisted —
 * a stored partial value would come back as a partial value with the blue
 * fallback painted next to it, which is the same broken-looking state the user is
 * complaining about, only now durable. Only a text that really parses is written.
 */
export function setGeneratorBaseColor(text: string): boolean {
  const clean = sanitizeBaseColorText(text);
  if (!clean) return false;
  if (clean !== generatorBaseStore.get()) commit(clean);
  return true;
}