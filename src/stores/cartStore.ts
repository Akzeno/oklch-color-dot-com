import { atom } from 'nanostores';
import {
  type ColorModel,
  type ShadeStep,
  SHADE_STEPS,
  getNearestShadeStep,
  generateFullScaleFromColor,
  createOklchColor,
} from '../utils/color';

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

// Defensive coercion: localStorage is user-writable, so a malformed/legacy
// payload must never be able to crash a render.
function sanitizeColor(input: unknown): ColorModel | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const l = Number(raw.l);
  const c = Number(raw.c);
  const h = Number(raw.h);
  if (!Number.isFinite(l) || !Number.isFinite(c) || !Number.isFinite(h)) return null;

  const alpha = Number(raw.alpha);
  return {
    l: Math.min(1, Math.max(0, l)),
    c: Math.min(0.4, Math.max(0, c)),
    h: ((h % 360) + 360) % 360,
    alpha: Number.isFinite(alpha) ? Math.min(1, Math.max(0, alpha)) : 1,
    hex: typeof raw.hex === 'string' ? raw.hex : '#000000',
    inSRGB: Boolean(raw.inSRGB),
    inP3: Boolean(raw.inP3),
  };
}

function sanitizeShades(input: unknown): Partial<Record<ShadeStep, RoleColorToken>> {
  const out: Partial<Record<ShadeStep, RoleColorToken>> = {};
  if (!input || typeof input !== 'object') return out;

  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const step = Number(key) as ShadeStep;
    if (!SHADE_STEPS.includes(step)) continue;
    const token = value as Partial<RoleColorToken> | null;
    const color = sanitizeColor(token?.color);
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
  showToast(`Added to ${role.name} (${varName})`);

  return { roleId: role.id, step };
}

// Generate full 50-950 scale for a specific role from an existing shade or base color
export function generateFullScaleForRole(roleId: string, baseColor?: ColorModel) {
  const current = cartStore.get();
  const role = current.roles[roleId];
  if (!role) return;

  // Find base color: either passed, or existing 500, or first available shade
  let base = baseColor;
  if (!base) {
    if (role.shades[500]) {
      base = role.shades[500]!.color;
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

  showToast(`Generated full 50-950 scale for ${role.name}`);
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
    showToast(`Applied to ${role.name} ${step} (--color-${roleId}-${step})`);
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
    showToast(`Removed --color-${roleId}-${step}`, 'success', {
      label: 'Undo',
      run: () => {
        setRoleShade(roleId, step, removed.color, { silent: true });
        showToast(`Restored --color-${roleId}-${step}`);
      },
    });
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
    showToast(`${role.name} has no colors to delete`, 'info');
    return;
  }

  saveCartState({
    ...current,
    roles: {
      ...current.roles,
      [roleId]: { ...role, shades: {} },
    },
  });

  showToast(`Deleted full scale of ${role.name} (${removedCount} colors)`);
}

// Delete every shade across every role (keeps the role definitions)
export function clearAllScales() {
  const current = cartStore.get();
  const total = getCartTotalCount(current);
  if (total === 0) {
    showToast('Cart is already empty', 'info');
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

  showToast(`Cleared all ${total} colors from every role`);
}

// Rename an existing role
export function renameRole(oldRoleId: string, newName: string) {
  const current = cartStore.get();
  const role = current.roles[oldRoleId];
  if (!role) return;

  // Convert to valid CSS identifier (kebab-case)
  const newRoleId = newName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'role';

  if (newRoleId === oldRoleId) {
    // Just update label
    saveCartState({
      ...current,
      roles: {
        ...current.roles,
        [oldRoleId]: { ...role, name: newName },
      },
    });
    return;
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

  showToast(`Renamed role to --color-${newRoleId}-*`);
}

// Create a new custom role
export function createCustomRole(name: string): string {
  const current = cartStore.get();
  const cleanId = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `custom-${Date.now().toString().slice(-4)}`;

  if (current.roles[cleanId]) {
    showToast(`Role ${cleanId} already exists`, 'info');
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

  showToast(`Created role ${name}`);
  return cleanId;
}

// Delete a custom role
export function deleteRole(roleId: string) {
  const current = cartStore.get();
  if (current.roles[roleId]?.isDefault) {
    showToast('Default roles cannot be deleted', 'info');
    return;
  }

  const updatedRoles = { ...current.roles };
  delete updatedRoles[roleId];

  saveCartState({
    activeRoleId: Object.keys(updatedRoles)[0] || 'trusty-button',
    roles: updatedRoles,
  });

  showToast(`Deleted role ${roleId}`);
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

export interface PickerHandoff {
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
    return {
      roleId: parsed.roleId,
      step,
      color: parsed.color ? sanitizeColor(parsed.color) : null,
      returnTo: sanitizeReturnTo(parsed.returnTo),
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
