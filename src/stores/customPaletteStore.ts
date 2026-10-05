import { atom } from 'nanostores';
import {
  createOklchColor,
  findMaxChromaInSRGB,
  formatOklch,
  sanitizeColorModel,
  type ColorModel,
} from '../utils/color';
import { slugifyRoleName } from './cartStore';

const STORAGE_KEY = 'oklch_custom_palette_v1';

/** Cap on what is read back, so a corrupt or hand-edited payload cannot grow unbounded. */
const MAX_SLOTS = 12;

/** Longest accepted name. Far beyond any real variable name. */
const MAX_NAME = 64;

export interface CustomPaletteSlot {
  /**
   * Stable identity for one editable colour.
   *
   * Not the name: names are typed, renamed, and two rows may briefly collide,
   * while this has to survive a re-render, a reload, and — most importantly — the
   * trip through the colour picker, which is how "edit this exact swatch" is
   * expressed on the way out and recognised on the way back.
   */
  id: string;
  /**
   * The typed name, kept as typed.
   *
   * Slugifying on every keystroke would make the field fight the user — a
   * half-finished "Brand Accent" would show as "brand-ac" — so the raw text is
   * what is stored and `paletteVariable` resolves it at the moment it is used.
   */
  name: string;
  color: ColorModel;
}

/** Where a brand-new slot starts when there is nothing above it to derive from. */
const SEED_COLOR = createOklchColor(0.62, 0.19, 255);

/**
 * The palette the page renders before anything is stored.
 *
 * Deterministic on purpose: it is both the atom's initial value and the value
 * `useCustomPalette` pins its first render to, so the server HTML and the first
 * client render cannot disagree (see `useHydratedStore`). It is also a useful
 * starting point rather than a placeholder — four genuinely different roles,
 * which is what this palette exists to demonstrate.
 */
export const DEFAULT_CUSTOM_PALETTE: CustomPaletteSlot[] = [
  { id: 'slot-1', name: 'brand', color: createOklchColor(0.58, 0.21, 255) },
  { id: 'slot-2', name: 'accent', color: createOklchColor(0.72, 0.17, 70) },
  { id: 'slot-3', name: 'surface', color: createOklchColor(0.28, 0.03, 265) },
  { id: 'slot-4', name: 'text', color: createOklchColor(0.96, 0.01, 265) },
];

export const customPaletteStore = atom<CustomPaletteSlot[]>(DEFAULT_CUSTOM_PALETTE);

/**
 * Every id currently in circulation.
 *
 * Ids are minted rather than derived, so this is what stops a fresh one from
 * colliding with one that came back out of `localStorage` — two rows sharing an id
 * would make the picker edit the wrong colour with nothing to show for it.
 */
const usedIds = new Set<string>(DEFAULT_CUSTOM_PALETTE.map((s) => s.id));

function nextSlotId(): string {
  let n = usedIds.size;
  let id = `slot-${++n}`;
  while (usedIds.has(id)) id = `slot-${++n}`;
  usedIds.add(id);
  return id;
}

const SLOT_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Coerce a persisted payload into slots.
 *
 * `null` means "there was nothing usable to read", which is what lets a genuinely
 * empty palette (`[]`) be told apart from no payload at all — the user emptying
 * the palette is a decision, and hydration must not undo it.
 *
 * Exported so the guard can be exercised against every malformed shape without
 * having to reload the page to un-stick the once-per-session hydrate flag.
 */
export function sanitizeCustomPalette(input: unknown): CustomPaletteSlot[] | null {
  if (!Array.isArray(input)) return null;

  const out: CustomPaletteSlot[] = [];
  // Uniqueness is enforced against the payload being read, not against every id
  // this session has ever used: a stored id must survive a reload unchanged,
  // because the picker round trip addresses rows by id. Renumbering stable ids on
  // every load would break an edit that is already in flight.
  const seen = new Set<string>();

  for (const raw of input.slice(0, MAX_SLOTS)) {
    if (!raw || typeof raw !== 'object') continue;
    const entry = raw as Partial<CustomPaletteSlot>;
    const color = sanitizeColorModel(entry.color);
    if (!color) continue;

    const storedId = typeof entry.id === 'string' ? entry.id : '';
    // A missing, malformed or duplicated id is replaced rather than rejected:
    // the colour is still perfectly good, and discarding it would lose the user's
    // palette over a bookkeeping field.
    const id = SLOT_ID_RE.test(storedId) && !seen.has(storedId) ? storedId : nextSlotId();
    seen.add(id);
    usedIds.add(id);

    out.push({
      id,
      name: typeof entry.name === 'string' ? entry.name.slice(0, MAX_NAME) : '',
      color,
    });
  }
  return out;
}

let hasHydrated = false;

/**
 * Merge the persisted palette into the store. MUST be called after mount (an
 * effect), never during render — same reason as `hydrateCartFromStorage`.
 */
export function hydrateCustomPaletteFromStorage() {
  if (hasHydrated || typeof window === 'undefined') return;
  hasHydrated = true;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const slots = sanitizeCustomPalette(JSON.parse(raw));
    if (slots) customPaletteStore.set(slots);
  } catch (e) {
    console.warn('Could not read the custom palette from localStorage', e);
  }
}

function commit(next: CustomPaletteSlot[]) {
  customPaletteStore.set(next);
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (e) {
    console.warn('Could not save the custom palette to localStorage', e);
  }
}

/**
 * The colour a newly added slot starts on.
 *
 * Derived from the slot above rather than randomised, because "different
 * colours" is the entire promise of this palette: a random pick lands within a
 * few degrees of hue of its neighbour often enough to read as a bug rather than
 * a choice. The golden angle is the largest hue step that stays distinct when
 * used repeatedly, so every added row is visibly its own colour.
 */
function distinctColor(from: ColorModel | undefined): ColorModel {
  const source = from ?? SEED_COLOR;
  const h = (source.h + 137.508) % 360;
  // Step lightness away from the neighbour so the row differs in more than hue.
  const l = Math.min(0.82, Math.max(0.32, source.l + (source.l > 0.6 ? -0.1 : 0.1)));
  const c = Math.min(findMaxChromaInSRGB(l, h) * 0.9, Math.max(0.06, source.c));
  return createOklchColor(l, c, h, source.alpha);
}

/**
 * The first `color-<n>` name not already in use.
 *
 * Only ever applied to a slot the user has not named; a name they typed is never
 * overwritten, not even to keep it unique. Uniqueness is reported, not enforced —
 * silently renaming someone's "brand" would be worse than telling them about it.
 */
function unusedName(slots: CustomPaletteSlot[]): string {
  const taken = new Set(slots.map((slot, i) => paletteSlug(slot, i)));
  for (let n = taken.size + 1; ; n++) {
    const candidate = `color-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/**
 * Append a slot. Returns its id, so a caller can immediately act on the new row
 * (focus its name field, for instance).
 */
export function addPaletteSlot(): string {
  const current = customPaletteStore.get();
  const id = nextSlotId();
  const color = distinctColor(current[current.length - 1]?.color);
  commit([...current, { id, name: unusedName(current), color }]);
  return id;
}

/**
 * Put a previously removed slot back where it was.
 *
 * The index is part of the contract because order is output order: a palette
 * restored to the end is a palette whose CSS block no longer reads the way the
 * user arranged it.
 */
export function restorePaletteSlot(slot: CustomPaletteSlot, index: number) {
  const current = customPaletteStore.get();
  if (current.some((s) => s.id === slot.id)) return;

  usedIds.add(slot.id);
  const at = Math.max(0, Math.min(index, current.length));
  commit([...current.slice(0, at), slot, ...current.slice(at)]);
}

export function removePaletteSlot(id: string) {
  commit(customPaletteStore.get().filter((slot) => slot.id !== id));
}

export function renamePaletteSlot(id: string, name: string) {
  commit(
    customPaletteStore.get().map((slot) =>
      slot.id === id ? { ...slot, name: name.slice(0, MAX_NAME) } : slot
    )
  );
}

export function setPaletteSlotColor(id: string, color: ColorModel) {
  commit(
    customPaletteStore.get().map((slot) => (slot.id === id ? { ...slot, color } : slot))
  );
}

/* ─────────────────── Naming and output ─────────────────── */

/**
 * The variable name one slot emits.
 *
 * `index` is only used for the fallback: a name the user has not typed has to
 * produce *something* valid, and `color-<n>` is both valid and predictable. The
 * slug rule itself is the store's own, so a name that reads one way here cannot
 * land on a different variable anywhere else in the app.
 */
export function paletteVariable(slot: CustomPaletteSlot, index: number): string {
  const trimmed = slot.name.trim();
  // A name with no letters or digits cannot name a CSS variable at all, so it
  // falls back rather than emitting `--color---`.
  const slug = /[a-z0-9]/i.test(trimmed) ? slugifyRoleName(trimmed) : `color-${index + 1}`;
  return `--color-${slug}`;
}

/** The slug alone, for the duplicate check. */
function paletteSlug(slot: CustomPaletteSlot, index: number): string {
  return paletteVariable(slot, index).slice('--color-'.length);
}

export interface PaletteDeclaration {
  slot: CustomPaletteSlot;
  variable: string;
  value: string;
  /** The bare slug, so JSON output can key on the same name CSS emits. */
  slug: string;
}

export interface PaletteDeclarations {
  lines: PaletteDeclaration[];
  /** Variable names two slots both claim, in the order they were dropped. */
  duplicates: string[];
}

/**
 * Turn slots into the declarations that will actually be emitted.
 *
 * DUPLICATES ARE DROPPED, NOT MERGED
 *
 * Two rows typed as "brand" would emit two identical custom properties, where
 * the second silently wins in CSS. Emitting both would mean the preview shows
 * something the browser will not honour; merging would hide the clash. So the
 * first declaration is kept, the later one is dropped, and the caller is told
 * which name lost — the copy then matches the preview, and the problem is named.
 */
export function paletteDeclarations(slots: CustomPaletteSlot[]): PaletteDeclarations {
  const lines: PaletteDeclaration[] = [];
  const duplicates: string[] = [];
  const seen = new Set<string>();

  slots.forEach((slot, index) => {
    const slug = paletteSlug(slot, index);
    const variable = `--color-${slug}`;
    if (seen.has(variable)) {
      if (!duplicates.includes(variable)) duplicates.push(variable);
      return;
    }
    seen.add(variable);
    lines.push({ slot, variable, slug, value: formatOklch(slot.color) });
  });

  return { lines, duplicates };
}

export type CustomPaletteFormat = 'theme' | 'root' | 'json';

/**
 * The whole palette as one copyable block.
 *
 * Empty string when there is nothing to say, so the caller can disable its copy
 * button instead of copying a bare `@theme {}`.
 */
export function buildPaletteBlock(
  slots: CustomPaletteSlot[],
  format: CustomPaletteFormat
): string {
  const { lines } = paletteDeclarations(slots);
  if (lines.length === 0) return '';

  if (format === 'json') {
    return JSON.stringify(
      Object.fromEntries(lines.map((l) => [l.slug, l.value])),
      null,
      2
    );
  }

  const open = format === 'theme' ? '@theme {' : ':root {';
  return `${open}\n${lines.map((l) => `  ${l.variable}: ${l.value};`).join('\n')}\n}`;
}

/**
 * Replace the whole palette in one write.
 *
 * Used for undo: clearing the palette and putting it back cannot be expressed as
 * a sequence of the per-slot mutations without re-minting ids and re-deriving
 * colours, and an undo that does not restore the palette exactly is not an undo.
 */
export function replaceCustomPalette(slots: CustomPaletteSlot[]) {
  slots.forEach((slot) => usedIds.add(slot.id));
  commit(slots);
}