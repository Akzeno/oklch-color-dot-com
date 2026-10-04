import { atom } from 'nanostores';
import {
  type ColorModel,
  type ShadeStep,
  SHADE_STEPS,
  getNearestShadeStep,
  generateFullScaleFromColor,
  formatOklch,
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

// Global cart store — starts from the deterministic defaults above.
export const cartStore = atom<CartState>(getDefaultCartState());

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
export interface ToastNotification {
  id: string;
  message: string;
  type?: 'success' | 'info';
}
export const toastStore = atom<ToastNotification | null>(null);

export function showToast(message: string, type: 'success' | 'info' = 'success') {
  const id = Math.random().toString(36).substring(2, 9);
  toastStore.set({ id, message, type });
  setTimeout(() => {
    if (toastStore.get()?.id === id) {
      toastStore.set(null);
    }
  }, 2200);
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
