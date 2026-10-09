import { atom } from 'nanostores';
import {
  type ColorModel,
  type ShadeStep,
  SHADE_STEPS,
  BASE_SHADE_STEP,
  getNearestShadeStep,
  generateFullScaleFromColor,
  createOklchColor,
  sanitizeColorModel,
} from '../utils/color';
import { parseLocaleFromPath, type LocaleCode } from '../i18n/config';
import { t } from '../i18n/translations';

/** Active UI locale, derived from the URL. Toasts fire client-side only. */
function uiLocale(): LocaleCode {
  const pathname = typeof window === 'undefined' ? undefined : window.location?.pathname;
  if (!pathname) return 'en';
  return parseLocaleFromPath(pathname).locale.code;
}

/** Localized display name for a role; custom roles keep the name they were given. */
function roleLabel(role: ColorRole): string {
  return t(uiLocale(), 'ui.roles.' + role.id, role.name);
}

export interface RoleColorToken {
  id: string;
  step: ShadeStep;
  color: ColorModel;
}

export interface ColorRole {
  id: string; // Kebab-case identifier e.g. "trusty-button"
  name: string; // Human label e.g. "Trusty Button"
  isDefault: boolean;
  shades: Partial<Record<ShadeStep, RoleColorToken>>;
}

export interface CartState {
  activeRoleId: string;
  roles: Record<string, ColorRole>;
}

const STORAGE_KEY = 'oklch_cart_v1';

// Initial default roles
export const DEFAULT_ROLES: ColorRole[] = [
  { id: 'primary', name: 'Primary', isDefault: true, shades: {} },
  { id: 'secondary', name: 'Secondary', isDefault: true, shades: {} },
  { id: 'trusty-button', name: 'Trusty Button', isDefault: true, shades: {} },
  { id: 'success', name: 'Success', isDefault: true, shades: {} },
  { id: 'danger', name: 'Danger', isDefault: true, shades: {} },
  { id: 'warning', name: 'Warning', isDefault: true, shades: {} },
  { id: 'info', name: 'Info', isDefault: true, shades: {} },
  { id: 'background', name: 'Background', isDefault: true, shades: {} },
  { id: 'text', name: 'Text', isDefault: true, shades: {} },
];

// Pure default cart (NO localStorage access) so the server-rendered markup and
// the first client render are always identical. Reading localStorage at module
// init time would make the two diverge and break hydration on every refresh.
function getDefaultCartState(): CartState {
  const rolesRecord: Record<string, ColorRole> = {};
  DEFAULT_ROLES.forEach((r) => {
    rolesRecord[r.id] = { ...r, shades: {} };
  });

  // Seed default trusty-button-500
  const blue500 = createOklchColor(0.62, 0.19, 255);
  rolesRecord['trusty-button'].shades[500] = {
    id: 'seed-trusty-500',
    step: 500,
    color: blue500,
  };

  // Seed primary-500
  const purple500 = createOklchColor(0.58, 0.22, 290);
  rolesRecord['primary'].shades[500] = {
    id: 'seed-primary-500',
    step: 500,
    color: purple500,
  };

  // Seed secondary-500
  const teal500 = createOklchColor(0.55, 0.18, 195);
  rolesRecord['secondary'].shades[500] = {
    id: 'seed-secondary-500',
    step: 500,
    color: teal500,
  };

  return {
    activeRoleId: 'trusty-button',
    roles: rolesRecord,
  };
}

/**
 * The deterministic default cart.
 *
 * Exported because it must pin the *first* render of every hydration root, not
 * just module init. `cartStore` is a singleton shared by all islands on a page,
 * so by the time a later island hydrates, another island may already have
 * replaced the store with the persisted cart. `useCart` returns this snapshot
 * for its first render so client output always matches the server HTML.
 */
export const DEFAULT_CART_SNAPSHOT: CartState = getDefaultCartState();

// Global cart store — starts from the deterministic defaults above.
export const cartStore = atom<CartState>(DEFAULT_CART_SNAPSHOT);

// Untrusted values from localStorage / sessionStorage are coerced by the shared
// `sanitizeColorModel`, which lives in utils/color because the custom palette
// store reads a second persisted payload and needs the identical guard.
function sanitizeShades(input: unknown): Partial<Record<ShadeStep, RoleColorToken>> {
  const out: Partial<Record<ShadeStep, RoleColorToken>> = {};
  if (!input || typeof input !== 'object') return out;

  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const step = Number(key) as ShadeStep;
    if (!SHADE_STEPS.includes(step)) continue;
    const token = value as Partial<RoleColorToken> | null;
    const color = sanitizeColorModel(token?.color);
    if (!color) continue;
    out[step] = {
      id: typeof token?.id === 'string' ? token.id : `${key}`,
      step,
      color,
    };
  }
  return out;
}

let hasHydratedCart = false;

/**
 * Merge the persisted cart into the store. MUST be called after mount (an
 * effect), never during render, otherwise the first client paint disagrees
 * with the server HTML and Preact's hydration corrupts the UI.
 */
export function hydrateCartFromStorage() {
  if (hasHydratedCart || typeof window === 'undefined') return;
  hasHydratedCart = true;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const parsed = JSON.parse(stored);
    if (!parsed || !parsed.roles || typeof parsed.roles !== 'object') return;

    const defaults = getDefaultCartState();
    const mergedRoles: Record<string, ColorRole> = { ...defaults.roles };

    for (const [roleId, value] of Object.entries(parsed.roles as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const storedRole = value as Partial<ColorRole>;
      const base = mergedRoles[roleId];

      mergedRoles[roleId] = {
        id: roleId,
        name: typeof storedRole.name === 'string' && storedRole.name.trim()
          ? storedRole.name
          : base?.name ?? roleId,
        isDefault: base ? base.isDefault : false,
        shades: sanitizeShades(storedRole.shades),
      };
    }

    const storedActive = typeof parsed.activeRoleId === 'string' ? parsed.activeRoleId : '';
    cartStore.set({
      activeRoleId: mergedRoles[storedActive] ? storedActive : 'trusty-button',
      roles: mergedRoles,
    });
  } catch (e) {
    console.warn('Could not read cart from localStorage', e);
  }
}

// UI state: whether Cart drawer/bottom-sheet is open
export const isCartOpenStore = atom<boolean>(false);

// Micro-toast notification store
export interface ToastAction {
  label: string;
  run: () => void;
}

export interface ToastNotification {
  id: string;
  message: string;
  type?: 'success' | 'info';
  /**
   * Optional inline action, e.g. Undo. Required for destructive one-click
   * actions so the user can always get the token back.
   */
  action?: ToastAction;
}
export const toastStore = atom<ToastNotification | null>(null);

export function showToast(
  message: string,
  type: 'success' | 'info' = 'success',
  action?: ToastAction
) {
  const id = Math.random().toString(36).substring(2, 9);
  toastStore.set({ id, message, type, action });
  // Give an actionable toast longer to live so Undo stays reachable.
  setTimeout(
    () => {
      if (toastStore.get()?.id === id) {
        toastStore.set(null);
      }
    },
    action ? 6000 : 2200
  );
}

// Persist cart helper
function saveCartState(state: CartState) {
  cartStore.set(state);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save cart to localStorage', e);
    }
  }
}

// Add a SINGLE color to a role (auto-slots to nearest 50-950 shade)
export function addColorToCart(color: ColorModel, targetRoleId?: string): { roleId: string; step: ShadeStep } {
  const current = cartStore.get();
  const roleId = targetRoleId || current.activeRoleId || 'trusty-button';
  const role = current.roles[roleId] || current.roles['trusty-button'];

  const step = getNearestShadeStep(color.l);
  const tokenId = `${roleId}-${step}-${Date.now()}`;

  const updatedShades = {
    ...role.shades,
    [step]: {
      id: tokenId,
      step,
      color,
    },
  };

  const updatedRoles = {
    ...current.roles,
    [role.id]: {
      ...role,
      shades: updatedShades,
    },
  };

  saveCartState({
    activeRoleId: role.id,
    roles: updatedRoles,
  });

  const varName = `--color-${role.id}-${step}`;
  showToast(
    t(uiLocale(), 'ui.cartStore.added', 'Added to {role} ({variable})')
      .replace('{role}', roleLabel(role))
      .replace('{variable}', varName)
  );

  return { roleId: role.id, step };
}

// Generate full 50-950 scale for a specific role from an existing shade or base color
export function generateFullScaleForRole(roleId: string, baseColor?: ColorModel) {
  const current = cartStore.get();
  const role = current.roles[roleId];
  if (!role) return;

  // Find base color: either passed, or the role's own base step, or first
  // available shade. `BASE_SHADE_STEP` is the same slot the picker's "Add color"
  // and the sidebar's empty-role button write to, so a scale generated right
  // after adding a color is guaranteed to be derived from it.
  let base = baseColor;
  if (!base) {
    if (role.shades[BASE_SHADE_STEP]) {
      base = role.shades[BASE_SHADE_STEP]!.color;
    } else {
      const firstKey = Object.keys(role.shades)[0];
      if (firstKey) {
        base = role.shades[Number(firstKey) as ShadeStep]!.color;
      }
    }
  }

  if (!base) {
    base = createOklchColor(0.62, 0.19, 255); // Default fallback
  }

  const generatedScale = generateFullScaleFromColor(base);
  const newShades: Partial<Record<ShadeStep, RoleColorToken>> = {};

  SHADE_STEPS.forEach((step) => {
    newShades[step] = {
      id: `${roleId}-${step}`,
      step,
      color: generatedScale[step],
    };
  });

  const updatedRoles = {
    ...current.roles,
    [roleId]: {
      ...role,
      shades: newShades,
    },
  };

  saveCartState({
    ...current,
    roles: updatedRoles,
  });

  showToast(
    t(uiLocale(), 'ui.cartStore.generatedScale', 'Generated full 50-950 scale for {role}').replace(
      '{role}',
      roleLabel(role)
    )
  );
}

/**
 * Write a color into an EXACT shade slot of a role.
 *
 * Unlike `addColorToCart` this never re-slots the color to the nearest
 * lightness step, so it is what the UI preview popover and the color picker
 * handoff need when the destination slot is already known.
 */
export function setRoleShade(
  roleId: string,
  step: ShadeStep,
  color: ColorModel,
  options: { silent?: boolean } = {}
) {
  const current = cartStore.get();
  const role = current.roles[roleId];
  if (!role) return false;

  const updatedShades = {
    ...role.shades,
    [step]: {
      id: `${roleId}-${step}-${Date.now()}`,
      step,
      color,
    },
  };

  saveCartState({
    ...current,
    roles: {
      ...current.roles,
      [roleId]: { ...role, shades: updatedShades },
    },
  });

  if (!options.silent) {
    showToast(
      t(uiLocale(), 'ui.cartStore.applied', 'Applied to {role} {step} ({variable})')
        .replace('{role}', roleLabel(role))
        .replace('{step}', String(step))
        .replace('{variable}', `--color-${roleId}-${step}`)
    );
  }
  return true;
}

// Remove an individual shade from a role
export function removeShadeFromRole(roleId: string, step: ShadeStep) {
  const current = cartStore.get();
  const role = current.roles[roleId];
  if (!role) return;

  const updatedShades = { ...role.shades };
  delete updatedShades[step];

  saveCartState({
    ...current,
    roles: {
      ...current.roles,
      [roleId]: {
        ...role,
        shades: updatedShades,
      },
    },
  });
}

/**
 * Remove a single shade but keep it recoverable.
 *
 * The sidebar's swatch has a one-click remove, and a stray click on a small
 * target is easy — so this always offers Undo instead of a confirm dialog that
 * would turn every removal into two clicks. Pass `silent: true` when the caller
 * shows its own toast (e.g. one that already contains an Undo action).
 */
export function removeShadeWithUndo(
  roleId: string,
  step: ShadeStep,
  options: { silent?: boolean } = {}
) {
  const current = cartStore.get();
  const role = current.roles[roleId];
  const removed = role?.shades[step];
  if (!role || !removed) return false;

  removeShadeFromRole(roleId, step);

  if (!options.silent) {
    showToast(
      t(uiLocale(), 'ui.cartStore.removed', 'Removed {variable}').replace(
        '{variable}',
        `--color-${roleId}-${step}`
      ),
      'success',
      {
        label: t(uiLocale(), 'ui.cartStore.undo', 'Undo'),
        run: () => {
          setRoleShade(roleId, step, removed.color, { silent: true });
          showToast(
            t(uiLocale(), 'ui.cartStore.restored', 'Restored {variable}').replace(
              '{variable}',
              `--color-${roleId}-${step}`
            )
          );
        },
      }
    );
  }

  return true;
}

// Delete EVERY shade of a role — i.e. wipe the full 50–950 scale owned by the
// parent role, while keeping the role itself (and its --color-<role>-* prefix).
export function clearRoleScale(roleId: string) {
  const current = cartStore.get();
  const role = current.roles[roleId];
  if (!role) return;

  const removedCount = Object.keys(role.shades).length;
  if (removedCount === 0) {
    showToast(
      t(uiLocale(), 'ui.cartStore.noColorsToDelete', '{role} has no colors to delete').replace(
        '{role}',
        roleLabel(role)
      ),
      'info'
    );
    return;
  }

  saveCartState({
    ...current,
    roles: {
      ...current.roles,
      [roleId]: { ...role, shades: {} },
    },
  });

  showToast(
    t(uiLocale(), 'ui.cartStore.deletedScale', 'Deleted full scale of {role} ({count} colors)')
      .replace('{role}', roleLabel(role))
      .replace('{count}', String(removedCount))
  );
}

// Delete every shade across every role (keeps the role definitions)
export function clearAllScales() {
  const current = cartStore.get();
  const total = getCartTotalCount(current);
  if (total === 0) {
    showToast(t(uiLocale(), 'ui.cartStore.cartEmpty', 'Cart is already empty'), 'info');
    return;
  }

  const clearedRoles: Record<string, ColorRole> = {};
  for (const [roleId, role] of Object.entries(current.roles)) {
    clearedRoles[roleId] = { ...role, shades: {} };
  }

  saveCartState({
    ...current,
    roles: clearedRoles,
  });

  showToast(
    t(uiLocale(), 'ui.cartStore.clearedAll', 'Cleared all {count} colors from every role').replace(
      '{count}',
      String(total)
    )
  );
}

/**
 * Normalise a typed name into the kebab-case identifier the cart is keyed by.
 *
 * Exported because three callers now need the *same* mapping, not just the same
 * intent: renaming a role, creating one, and asking "does what the user just
 * typed name a role that already exists?" on the generator. That last question
 * decides whether a custom variable name is an update to an existing role or a
 * brand-new one, and it can only be answered correctly by slugifying with
 * exactly the rule the store writes with — otherwise `Brand Accent` would look
 * new here and land on `brand-accent` there.
 */
export function slugifyRoleName(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'role'
  );
}

/**
 * Rename an existing role. Returns whether the rename happened.
 *
 * `false` means it was refused (unknown role, or a name already taken) and
 * nothing changed. Callers with a live text editor need that distinction: closing
 * the editor on a refusal would throw away what the user just typed and make
 * them start over, while applying it anyway is the overwrite this guards.
 */
export function renameRole(oldRoleId: string, newName: string): boolean {
  const current = cartStore.get();
  const role = current.roles[oldRoleId];
  if (!role) return false;

  // Convert to valid CSS identifier (kebab-case)
  const newRoleId = slugifyRoleName(newName);

  if (newRoleId === oldRoleId) {
    // Just update label
    saveCartState({
      ...current,
      roles: {
        ...current.roles,
        [oldRoleId]: { ...role, name: newName },
      },
    });
    return true;
  }

  // Refuse a name that is already taken.
  //
  // Without this, renaming a custom role to "Primary" *replaces* the Primary
  // role — key, colours and all — because the branch below assigns by the new id.
  // That is unrecoverable: there is no undo for a rename, and the colours that
  // vanished were never part of what the user asked to remove. The check belongs
  // here rather than in each caller because the export page and the two carts all
  // reach this function, and none of them can undo the overwrite.
  if (current.roles[newRoleId]) {
    showToast(
      t(uiLocale(), 'ui.cartStore.roleNameExists', 'A role named {name} already exists').replace(
        '{name}',
        newRoleId
      ),
      'info'
    );
    return false;
  }

  const updatedRoles = { ...current.roles };
  delete updatedRoles[oldRoleId];
  updatedRoles[newRoleId] = {
    ...role,
    id: newRoleId,
    name: newName,
  };

  saveCartState({
    activeRoleId: current.activeRoleId === oldRoleId ? newRoleId : current.activeRoleId,
    roles: updatedRoles,
  });

  showToast(
    t(uiLocale(), 'ui.cartStore.renamed', 'Renamed role to {variable}').replace(
      '{variable}',
      `--color-${newRoleId}-*`
    )
  );
  return true;
}

// Create a new custom role
export function createCustomRole(name: string): string {
  const current = cartStore.get();
  // Measured before `slugifyRoleName`, whose `'role'` fallback is a rename
  // policy: a name that slugifies to nothing here ("###") is not a role name at
  // all, so it gets a generated id. Letting it fall back to `'role'` would make
  // every such attempt collide on one key and refuse all but the first.
  const hasRealName = /[a-z0-9]/i.test(name);
  const cleanId = hasRealName
    ? slugifyRoleName(name)
    : `custom-${Date.now().toString().slice(-4)}`;

  if (current.roles[cleanId]) {
    showToast(
      t(uiLocale(), 'ui.cartStore.roleExists', 'Role {name} already exists').replace('{name}', cleanId),
      'info'
    );
    return cleanId;
  }

  const newRole: ColorRole = {
    id: cleanId,
    name,
    isDefault: false,
    shades: {},
  };

  saveCartState({
    activeRoleId: cleanId,
    roles: {
      ...current.roles,
      [cleanId]: newRole,
    },
  });

  showToast(
    t(uiLocale(), 'ui.cartStore.roleCreated', 'Created role {name}').replace('{name}', name)
  );
  return cleanId;
}

/**
 * Resolve a typed variable name to a role id, creating the role if it is new.
 *
 * This is what a free-text "custom variable name" field needs, and it differs
 * from `createCustomRole` in one important way: an *existing* role must be
 * returned silently rather than refused.
 *
 * `createCustomRole` refuses a name that already exists and toasts about it,
 * which is right for an explicit "New role" button — the duplicate is a mistake
 * there. Here the field is the destination selector: the user typed a name that
 * is already a role, and that is a legitimate choice of an existing target, not
 * an error. So a match returns the id and says nothing.
 *
 * The match is on the *slug*, not the raw string, because the id is what the
 * `--color-*` name is built from. `Brand Accent`, `brand-accent` and
 * `brand  accent` are the same variable, and typing any of them has to target
 * the same role rather than creating a near-duplicate.
 */
export function ensureRole(name: string, options: { silent?: boolean } = {}): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const current = cartStore.get();
  const slug = slugifyRoleName(trimmed);

  // A typed name that carries no letters or digits cannot name a CSS variable,
  // so there is nothing to resolve. Returning null keeps the caller from
  // inventing a `--color-role-*` variable the user never asked for.
  if (!/[a-z0-9]/i.test(trimmed)) return null;

  const exact = current.roles[slug];
  if (exact) {
    setActiveRole(slug);
    return slug;
  }

  // `createCustomRole` toasts both on creation and on a name clash. The clash
  // case cannot happen here (we just checked), but the creation toast is the
  // user's only confirmation that their variable now exists — so it is kept
  // unless the caller is applying colours in the same gesture, where the colour
  // toast would immediately supersede it anyway.
  const created = createCustomRole(trimmed);
  return options.silent ? (created || null) : created;
}

// Delete a custom role
export function deleteRole(roleId: string) {
  const current = cartStore.get();
  if (current.roles[roleId]?.isDefault) {
    showToast(t(uiLocale(), 'ui.cartStore.cannotDeleteDefault', 'Default roles cannot be deleted'), 'info');
    return;
  }

  const updatedRoles = { ...current.roles };
  delete updatedRoles[roleId];

  saveCartState({
    activeRoleId: Object.keys(updatedRoles)[0] || 'trusty-button',
    roles: updatedRoles,
  });

  showToast(
    t(uiLocale(), 'ui.cartStore.roleDeleted', 'Deleted role {name}').replace('{name}', roleId)
  );
}

// Set active role
export function setActiveRole(roleId: string) {
  const current = cartStore.get();
  if (current.roles[roleId]) {
    saveCartState({
      ...current,
      activeRoleId: roleId,
    });
  }
}

// Total count of all colors currently in the cart
export function getCartTotalCount(state: CartState): number {
  let count = 0;
  for (const role of Object.values(state.roles)) {
    count += Object.keys(role.shades).length;
  }
  return count;
}

/* ─────────────────── Picker handoff (UI preview → picker page) ─────────────────── */

const PICKER_HANDOFF_KEY = 'oklch_picker_handoff_v1';
const PICKER_RESULT_KEY = 'oklch_picker_result_v1';

/**
 * What the picker should DO with the colour the user saves.
 *
 *  - `'token'` writes into `--color-<roleId>-<step>`. The original and still
 *    common case: the swatch that was clicked *is* a token slot.
 *  - `'free'` writes nothing to the cart and instead hands the colour back to
 *    `returnTo` through `consumePickerResult()`.
 *
 * WHY `'free'` IS NEEDED
 *
 * Not every swatch on the site is backed by a cart token. The palette
 * generator's base colour and a converter's input field are both plain component
 * state that a user is invited to click and change. Pointing those at a token
 * slot would be a lie twice over: it would file the colour into a `--color-*`
 * variable the page never mentions, and it would reload the generator showing a
 * base colour that had silently become a different token's colour.
 *
 * So the picker needs to be able to *return* a colour rather than *store* one.
 * `'token'` stays the default so every existing caller keeps its exact
 * behaviour, and an absent or unrecognised value degrades to it rather than
 * being rejected — a payload too old to know about `mode` is still a valid
 * token handoff.
 */
export type PickerHandoffMode = 'token' | 'free';

export interface PickerHandoff {
  /**
   * Omitted by `'token'` callers for backwards compatibility; see above.
   * Defaults to `'token'` on read.
   */
  mode?: PickerHandoffMode;
  roleId: string;
  step: ShadeStep;
  /**
   * The token's current colour, or `null` when the slot is still empty.
   *
   * `null` means "author a brand-new token in this exact slot": the picker then
   * seeds itself from the step's canonical lightness and the role's own hue
   * instead of preloading an existing colour, but still writes back to
   * `--color-<role>-<step>` rather than a nearest-lightness slot.
   */
  color: ColorModel | null;
  /**
   * Page the picker should send the user back to once the colour is saved,
   * e.g. `/ui-preview`. `null` means "the picker was opened directly", in which
   * case saving keeps the user where they are.
   *
   * Only ever a same-origin in-app path — `sanitizeReturnTo` enforces that on
   * read, because this value comes back out of `sessionStorage` and is used as a
   * navigation target.
   */
  returnTo: string | null;
  /**
   * Which of several editable colours on the originating page this is for.
   * `'free'` mode only; `null` (or absent) means the page's single, unslotted
   * free colour.
   *
   * WHY A HANDOFF NEEDS THIS
   *
   * A page can hold more than one colour that is *not* a cart token. The palette
   * generator is the case that forced it: its base colour is one, and so is every
   * row of the custom palette beneath it. A bare colour coming back cannot say
   * which one was edited, so the page would have to guess — and the two guesses
   * have very different consequences.
   *
   * It rides the handoff for the same reason `returnTo` does: the picker is not
   * the thing that knows. The originating page stamped the id on the way out, and
   * only it can resolve it to a destination after the round trip.
   */
  slot?: string | null;
  /**
   * `'token'` callers only, and only the *modal* one: asking for the drawer to be
   * reopened once the user returns.
   *
   * WHY THE CALLER CANNOT DECIDE THIS ITSELF
   *
   * The return trip has two surfaces that can send someone to the picker and both
   * of them want to land the user back on a token editor — but only one of them is
   * a modal that disappears while you are away. The `/ui-preview` token panel is
   * still on screen when the picker bounces back, so reopening the drawer there
   * would cover the very panel the user just used. The originating page knows
   * which surface it is; the picker cannot tell them apart, so it is told.
   */
  reopenCart?: boolean;
}

/**
 * Accept only same-origin, in-app absolute paths as a return target.
 *
 * This is attacker-reachable input: it round-trips through `sessionStorage`,
 * which is writable by any script on the origin and survives the navigation.
 * A naive `startsWith('/')` check would happily accept `//evil.example` (a
 * protocol-relative URL that navigates off-site) and `/%5C%5Cevil.example`, so
 * the check is on the *shape* of the path rather than one prefix test.
 */
function sanitizeReturnTo(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  // Must be an absolute path, and must not be protocol-relative (`//host`).
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  // Backslashes are normalised to `/` by browsers, so `/\evil.example` and
  // `\/evil.example` would both escape the origin after parsing.
  if (value.includes('\\')) return null;
  // Any scheme-looking prefix (`/x:`, or an encoded one) can re-enter scheme
  // resolution once the URL is parsed.
  if (/^\/?[a-z][a-z0-9+.-]*:/i.test(value)) return null;
  return value;
}

/**
 * Accept only opaque, bounded slot keys.
 *
 * A slot is an id the app minted, never user text: it is looked up in a list and
 * never rendered. It still arrives from `sessionStorage`, so the shape is pinned
 * rather than trusted — a payload naming a megabyte of "slots" must not become a
 * megabyte of string carried around by every consumer.
 */
function sanitizeSlot(value: unknown): string | null {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : null;
}

/**
 * Remember which exact token slot to author before navigating to the color
 * picker page, so the picker can prefill L/C/H and write back to the very same
 * `--color-<role>-<step>` variable instead of a nearest-lightness slot.
 *
 * `returnTo` also lets the picker bounce the user back to the page they came
 * from once they save, which is what makes the preview → pick → preview trip
 * feel like one task instead of two pages.
 */
export function savePickerHandoff(handoff: PickerHandoff) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(PICKER_HANDOFF_KEY, JSON.stringify(handoff));
  } catch {
    /* private mode / quota — the picker simply opens with defaults */
  }
}

/** Read + clear the pending handoff. Call exactly once, after mount. */
export function consumePickerHandoff(): PickerHandoff | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(PICKER_HANDOFF_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PICKER_HANDOFF_KEY);
    const parsed = JSON.parse(raw) as Partial<PickerHandoff>;
    const step = Number(parsed.step) as ShadeStep;
    if (typeof parsed.roleId !== 'string' || !SHADE_STEPS.includes(step)) return null;
    // A missing/invalid colour is legitimate now: it means an empty slot, and
    // the role + step are still enough to target the write-back precisely.
    //
    // `mode` is allow-listed rather than trusted. It arrives from sessionStorage,
    // which any script on the origin can write to, and it decides whether saving
    // mutates the cart or merely returns a colour. An unrecognised value degrades
    // to `'token'` — the behaviour every caller had before `mode` existed — so a
    // malformed payload can never silently downgrade a token write.
    //
    // `reopenCart` is pinned to strict `true` for the same reason: it decides
    // whether a modal opens itself on arrival, so anything but an explicit yes is
    // a no. A missing flag is the pre-`reopenCart` behaviour, which is "don't
    // reopen" for every caller that never asked.
    return {
      mode: parsed.mode === 'free' ? 'free' : 'token',
      roleId: parsed.roleId,
      step,
      color: parsed.color ? sanitizeColorModel(parsed.color) : null,
      returnTo: sanitizeReturnTo(parsed.returnTo),
      slot: sanitizeSlot(parsed.slot),
      reopenCart: parsed.reopenCart === true,
    };
  } catch {
    return null;
  }
}

/** Discard a pending handoff (used when the user cancels inside the picker). */
export function clearPickerHandoff() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(PICKER_HANDOFF_KEY);
  } catch {
    /* no-op */
  }
}

/* ─────────────────── Picker result ('free' mode: colour → originating page) ─────────────────── */

/** A colour handed back to the page that sent it, and the slot it was for. */
export interface PickerResult {
  color: ColorModel;
  /**
   * Echo of the handoff's slot, so a page holding several free colours can tell
   * which one was edited. `null` for the unslotted one — see `PickerHandoff.slot`.
   */
  slot: string | null;
}

/**
 * Park the colour the user saved in a `'free'`-mode handoff so the page that
 * sent them to the picker can pick it up on arrival.
 *
 * `returnTo` travels with the colour instead of being trusted from the URL,
 * because the receiving page is the one that has to answer "was this meant for
 * me?" — the picker knows where it is sending them, not what they will do with
 * the value once they get there. The slot rides along for the same reason: a
 * page with several editable colours needs to know *which* one came back.
 */
export function savePickerResult(result: {
  color: ColorModel;
  returnTo: string | null;
  slot?: string | null;
}) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(
      PICKER_RESULT_KEY,
      JSON.stringify({
        color: result.color,
        returnTo: sanitizeReturnTo(result.returnTo),
        slot: sanitizeSlot(result.slot),
      })
    );
  } catch {
    /* private mode / quota — the page keeps whatever it already had */
  }
}

/**
 * Read + clear the colour saved by a `'free'`-mode picker session.
 *
 * Returns the colour only when `returnTo` names this page, so a stale result
 * cannot leak into an unrelated page that happens to be open. Call exactly once,
 * after mount.
 *
 * The whole result is returned rather than a bare colour because the slot is
 * part of what was asked for, and a caller that cannot see it has to guess which
 * of its colours was edited.
 */
export function consumePickerResult(currentPath: string): PickerResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(PICKER_RESULT_KEY);
    if (!raw) return null;
    // Cleared before the `returnTo` check, not after: a result addressed to some
    // other page is still spent, and leaving it behind would let it be applied
    // later by whichever page it was actually meant for.
    sessionStorage.removeItem(PICKER_RESULT_KEY);
    const parsed = JSON.parse(raw) as { color?: unknown; returnTo?: unknown; slot?: unknown };
    if (sanitizeReturnTo(parsed.returnTo) !== currentPath) return null;
    const color = parsed.color ? sanitizeColorModel(parsed.color) : null;
    if (!color) return null;
    return { color, slot: sanitizeSlot(parsed.slot) };
  } catch {
    return null;
  }
}

/** Discard a pending result (used when the user cancels inside the picker). */
export function clearPickerResult() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(PICKER_RESULT_KEY);
  } catch {
    /* no-op */
  }
}

/* ─────────────────── Reopening the drawer after a picker round trip ─────────────────── */

/**
 * How long a pending reopen stays believable.
 *
 * The flag is only ever meant to survive the single hop back from the picker,
 * which takes seconds. Anything left after this is a user who edited a token,
 * wandered off, and came back later — and a modal opening itself unasked is worse
 * than a missed one.
 */
const CART_REOPEN_TTL_MS = 5 * 60 * 1000;

const CART_REOPEN_KEY = 'oklch_reopen_cart_v1';

/**
 * Ask for the design-token drawer to be open again once the user reaches `path`.
 *
 * CALLED BY THE PICKER, ON THE WAY BACK — AND THAT IS THE WHOLE POINT
 *
 * The obvious place to park this is the drawer, on the way *out* to the picker.
 * It cannot work from there, because the page the drawer is leaving for is `/` —
 * and `/` is itself a page that opens this drawer. Parking on the way out makes
 * the flag mean "someone once wanted the drawer back", which the picker's own page
 * satisfies on arrival: the user opens the drawer on `/`, taps a swatch, and the
 * modal reopens over the picker they were sent to use.
 *
 * There is no path comparison that rescues it, either. `returnTo` is legitimately
 * `/` in exactly that case, so "the flag names this page" and "this page is the
 * picker" are the same statement.
 *
 * Parking it here instead makes the flag mean "a picker session just finished and
 * is sending the user home", which only becomes true at the moment of return. The
 * picker page can never satisfy it while the user is still choosing a colour.
 *
 * WHY NOT JUST SET `isCartOpenStore`
 *
 * That atom is a module singleton, so setting it here would open the drawer on the
 * picker page *before* the navigation lands — a modal over the very sliders the
 * user is still dragging, on top of a backdrop swallowing the page. A token edit
 * has to stay usable while it is in progress; only the return trip restores the
 * surface.
 */
export function saveCartReopen(path: string) {
  if (typeof window === 'undefined') return;
  // A path the sanitizer rejects cannot be a real page, so there is nothing to
  // come back to — record it as "nobody" rather than storing it for later.
  const safePath = sanitizeReturnTo(path);
  if (!safePath) return;
  try {
    sessionStorage.setItem(CART_REOPEN_KEY, JSON.stringify({ path: safePath, at: Date.now() }));
  } catch {
    /* private mode / quota — the user just does not get the drawer back */
  }
}

/**
 * Claim a pending reopen, but only for the page the picker is returning to.
 *
 * Returns `false` and *keeps the flag* on any other path, which is the load
 * bearing detail: the flag is written immediately before the navigation, so the
 * only page that should ever see it is the destination — but a user who wanders
 * off in between must not spend it. The flag survives exactly the pages that are
 * not the target and is spent on the one that is.
 */
export function consumeCartReopen(currentPath: string): boolean {
  if (typeof window === 'undefined') return false;

  let payload: { path?: unknown; at?: unknown } | null = null;
  try {
    const raw = sessionStorage.getItem(CART_REOPEN_KEY);
    if (!raw) return false;
    payload = JSON.parse(raw);
  } catch {
    try {
      sessionStorage.removeItem(CART_REOPEN_KEY);
    } catch {
      /* no-op */
    }
    return false;
  }

  const path = sanitizeReturnTo(payload?.path);
  const at = typeof payload?.at === 'number' ? payload.at : 0;
  const expired = !path || Date.now() - at > CART_REOPEN_TTL_MS;

  // Spend the flag either way when it is spent: on the target page, and on any
  // page that finds it unreadable or too old.
  if (expired || path === currentPath) {
    try {
      sessionStorage.removeItem(CART_REOPEN_KEY);
    } catch {
      /* no-op */
    }
  }

  return !expired && path === currentPath;
}
