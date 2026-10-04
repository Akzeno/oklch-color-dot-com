import { useState, useEffect } from 'preact/hooks';
import {
  isCartOpenStore,
  generateFullScaleForRole,
  removeShadeFromRole,
  clearRoleScale,
  renameRole,
  createCustomRole,
  deleteRole,
  setActiveRole,
  showToast,
} from '../../stores/cartStore';
import { SHADE_STEPS, formatOklch, type ShadeStep } from '../../utils/color';
import { useCart } from '../../hooks/useCart';
import { useHydratedStore } from '../../hooks/useHydratedStore';
import { ArrowRight, Copy, LayoutTemplate, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-preact';

/**
 * The mobile / wide-screen modal cart.
 *
 * It exists because the sidebar panel — the same role list, same shade grid —
 * is a `lg:` breakpoint and up. Below that there is nowhere to put it, so the
 * data would simply not exist on a phone. Same information, same store, laid
 * out for a sheet.
 *
 * WHAT IT LEAVES OUT
 *
 * The header's green/cyan gradient icon box, and the "N empty slots remaining ·
 * Use Generate Full Scale to fill all" line. Both restate something on screen:
 * the icon box is decoration next to colour swatches, and the slot line is a
 * count the header's own "N/11 filled" already gives and the Generate button
 * already acts on.
 */

export default function CartDrawerIsland() {
  const cart = useCart();
  // Pinned to the server's value (closed) for the first render — see
  // `useHydratedStore`. `isCartOpenStore` is a module singleton, so opening the
  // drawer and then navigating would otherwise hydrate this island's empty SSR
  // markup against a full modal tree.
  const isOpen = useHydratedStore(isCartOpenStore, false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleInputName, setRoleInputName] = useState('');
  const [newRoleInput, setNewRoleInput] = useState('');
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [confirmingClearScale, setConfirmingClearScale] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        isCartOpenStore.set(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Reset transient state whenever the drawer closes or the active role changes
  useEffect(() => {
    if (!isOpen) {
      setConfirmingClearScale(false);
      setEditingRoleId(null);
    }
  }, [isOpen, cart.activeRoleId]);

  // NOTE: there is deliberately no `if (!isOpen) return null` here — see the
  // note on the wrapper at the bottom of this component.

  const activeRole = cart.roles[cart.activeRoleId] || Object.values(cart.roles)[0];
  const filledShadesCount = activeRole ? Object.keys(activeRole.shades).length : 0;
  const filledSteps = SHADE_STEPS.filter((step) => activeRole?.shades[step]);
  const totalTokens = Object.values(cart.roles).reduce((sum, r) => sum + Object.keys(r.shades).length, 0);

  // The root element is rendered unconditionally, closed or not.
  //
  // A client-side route change (<ClientRouter />) fetches this page from the server,
  // so the island arrives carrying the SERVER's markup — which for a closed drawer is
  // nothing at all — while `isCartOpenStore` is a module singleton that survives the
  // navigation. Navigating with the drawer open therefore asks Preact to hydrate an
  // empty container with a non-empty tree, and it throws "Cannot read properties of
  // null (reading 'map')". Keeping the root unconditional makes server and client
  // agree on the DOM shape; only the children differ, which hydrates cleanly.
  //
  // `display: contents` generates no box, so this wrapper cannot become the containing
  // block for the `fixed` panel inside it — the drawer still anchors to the viewport
  // exactly as it did with no wrapper at all.
  return (
    <div class="contents">
      {isOpen && (
        <div class="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-8">
          {/* Backdrop */}
          <div
            class="fixed inset-0 bg-black/75 backdrop-blur-sm animate-fade-in"
            onClick={() => isCartOpenStore.set(false)}
            aria-hidden="true"
          />

          {/* Modal panel. `rounded-t-lg` on mobile because it is a bottom sheet
              there, `rounded-lg` from `md:` up once it is a centred dialog. */}
          <div
            class="relative z-10 w-full md:max-w-2xl max-h-[85vh] md:max-h-[80vh] bg-canvas-sunken border border-hairline rounded-t-lg md:rounded-lg flex flex-col overflow-hidden animate-dock-in"
            role="dialog"
            aria-modal="true"
            aria-label="Design Token Cart"
          >
            {/* Header */}
            <div class="px-4 py-3 border-b border-hairline flex items-center justify-between gap-3">
              <h2 class="text-title text-ink">Design Tokens</h2>
              <div class="flex items-center gap-2">
                <span class="pill">{totalTokens} tokens</span>
                <button
                  onClick={() => isCartOpenStore.set(false)}
                  class="icon-btn"
                  aria-label="Close cart"
                >
                  <X class="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Role tabs */}
            <div class="px-4 py-3 border-b border-hairline-subtle bg-canvas">
              <div class="flex items-center justify-between gap-2 mb-2">
                <span class="eyebrow">Roles</span>
                <button
                  onClick={() => setIsCreatingRole(!isCreatingRole)}
                  class="link-hud"
                  aria-expanded={isCreatingRole}
                >
                  {isCreatingRole ? 'Cancel' : '+ New role'}
                </button>
              </div>

              {isCreatingRole && (
                <div class="flex items-center gap-1.5 mb-2.5">
                  <input
                    type="text"
                    value={newRoleInput}
                    onInput={(e) => setNewRoleInput((e.target as HTMLInputElement).value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newRoleInput.trim()) {
                        createCustomRole(newRoleInput.trim());
                        setNewRoleInput('');
                        setIsCreatingRole(false);
                      }
                    }}
                    placeholder="brand-accent"
                    class="flex-1 min-w-0 px-2.5 py-1.5 rounded-md bg-canvas-raised border border-hairline font-mono text-micro text-ink placeholder:text-faint focus:outline-none focus:border-border-focus transition-colors duration-150"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      if (newRoleInput.trim()) {
                        createCustomRole(newRoleInput.trim());
                        setNewRoleInput('');
                        setIsCreatingRole(false);
                      }
                    }}
                    class="btn btn-quiet h-8"
                  >
                    Create
                  </button>
                </div>
              )}

              <div class="flex flex-wrap gap-1.5">
                {Object.values(cart.roles).map((role) => {
                  const count = Object.keys(role.shades).length;
                  return (
                    <button
                      key={role.id}
                      onClick={() => setActiveRole(role.id)}
                      aria-pressed={role.id === cart.activeRoleId}
                      class={`chip ${role.id === cart.activeRoleId ? '' : 'text-body'}`}
                    >
                      <span>{role.name}</span>
                      {count > 0 && (
                        <span
                          class={`font-mono text-micro ${
                            role.id === cart.activeRoleId ? 'text-ink-inverse/70' : 'text-faint'
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active role content */}
            {activeRole && (
              <div class="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                <div class="card">
                  <div class="flex items-center justify-between gap-2">
                    {editingRoleId === activeRole.id ? (
                      <div class="flex items-center gap-1.5 flex-1 min-w-0">
                        <input
                          type="text"
                          value={roleInputName}
                          onInput={(e) => setRoleInputName((e.target as HTMLInputElement).value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (roleInputName.trim()) {
                                renameRole(activeRole.id, roleInputName.trim());
                              }
                              setEditingRoleId(null);
                            }
                          }}
                          class="px-2.5 py-1.5 rounded-md bg-canvas-raised border border-hairline font-mono text-micro text-ink flex-1 min-w-0 focus:outline-none focus:border-border-focus"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            if (roleInputName.trim()) {
                              renameRole(activeRole.id, roleInputName.trim());
                            }
                            setEditingRoleId(null);
                          }}
                          class="btn btn-quiet h-8"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="text-card text-ink truncate">{activeRole.name}</span>
                        <button
                          onClick={() => {
                            setRoleInputName(activeRole.name);
                            setEditingRoleId(activeRole.id);
                          }}
                          class="icon-btn icon-btn-sm"
                          title="Rename role"
                          aria-label={`Rename role ${activeRole.name}`}
                        >
                          <Pencil class="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
                        </button>
                      </div>
                    )}

                    {!activeRole.isDefault && (
                      <button
                        onClick={() => deleteRole(activeRole.id)}
                        class="link-hud text-[#fca5a5]"
                        title={`Delete role ${activeRole.name}`}
                      >
                        Delete role
                      </button>
                    )}
                  </div>

                  <div class="mt-1.5 font-mono text-micro text-mute">
                    --color-{activeRole.id}-*
                    <span class="mx-1.5 text-faint">·</span>
                    {filledShadesCount}/{SHADE_STEPS.length} filled
                  </div>

                  {/* Generate / Clear Full Scale */}
                  <div class="mt-3 pt-3 border-t border-hairline-subtle">
                    {confirmingClearScale ? (
                      <div class="rounded-md border border-hairline bg-canvas-sunken p-2.5 space-y-2">
                        <p class="font-mono text-micro text-body leading-tight">
                          Delete {filledShadesCount} color{filledShadesCount === 1 ? '' : 's'} from{' '}
                          <span class="text-ink">{activeRole.name}</span>?
                        </p>
                        <div class="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => setConfirmingClearScale(false)}
                            class="btn btn-quiet h-8"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              clearRoleScale(activeRole.id);
                              setConfirmingClearScale(false);
                            }}
                            class="btn btn-danger h-8"
                          >
                            Delete scale
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div class="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => generateFullScaleForRole(activeRole.id)}
                          disabled={filledShadesCount === 0}
                          class="btn btn-quiet h-8"
                          title="Generate the full 50–950 scale from the base color"
                        >
                          <Sparkles class="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
                          <span class="truncate">Generate scale</span>
                        </button>
                        <button
                          onClick={() => setConfirmingClearScale(true)}
                          disabled={filledShadesCount === 0}
                          class="btn btn-quiet h-8"
                          title={`Delete all ${filledShadesCount} colors of ${activeRole.name}`}
                        >
                          <Trash2 class="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
                          <span class="truncate">Delete scale</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Shade cards (only filled) */}
                {filledShadesCount > 0 ? (
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {filledSteps.map((step) => {
                      const token = activeRole.shades[step]!;
                      const oklchCss = formatOklch(token.color);

                      return (
                        <div
                          key={step}
                          class="group bg-canvas-card rounded-lg border border-hairline hover:border-faint transition-colors duration-150 overflow-hidden"
                        >
                          <div
                            class="h-14 w-full relative"
                            style={{ backgroundColor: oklchCss || token.color.hex }}
                          >
                            {token.color.inP3 && !token.color.inSRGB && (
                              <span
                                class="absolute top-1 right-1 font-mono text-[9px] leading-none px-1 py-0.5 rounded bg-badge-surface text-gamut-p3"
                                title="Inside Display-P3, outside sRGB — browsers will clamp it"
                              >
                                P3
                              </span>
                            )}
                          </div>

                          <div class="px-2 py-1.5 flex items-center justify-between gap-1">
                            <span class="font-mono text-micro text-ink">{step}</span>
                            <div class="flex items-center gap-0.5">
                              <button
                                onClick={() => {
                                  if (oklchCss) {
                                    navigator.clipboard.writeText(oklchCss);
                                    showToast(`Copied ${oklchCss}`);
                                  }
                                }}
                                class="icon-btn icon-btn-xs"
                                title={`Copy ${oklchCss}`}
                                aria-label={`Copy ${step} value`}
                              >
                                <Copy class="w-3 h-3" strokeWidth={1.75} aria-hidden="true" />
                              </button>
                              <button
                                onClick={() => removeShadeFromRole(activeRole.id, step)}
                                class="icon-btn icon-btn-xs"
                                title="Remove shade"
                                aria-label={`Remove ${step}`}
                              >
                                <Trash2 class="w-3 h-3" strokeWidth={1.75} aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Empty state. A single line, because the role's own "0/11
                     filled" above it already says what is missing and the
                     Generate button beside it is the way out. */
                  <div class="well px-4 py-8 text-center">
                    <p class="prose-hud">No shades yet — generate the full scale, or add colors in the picker.</p>
                  </div>
                )}
              </div>
            )}

            {/* Footer CTAs */}
            <div class="px-4 py-3 border-t border-hairline grid grid-cols-2 gap-2">
              <a
                href="/ui-preview"
                onClick={() => isCartOpenStore.set(false)}
                class="btn btn-quiet"
              >
                <LayoutTemplate class="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span>Live Preview</span>
              </a>
              <a
                href="/export"
                onClick={() => isCartOpenStore.set(false)}
                class="btn btn-primary"
              >
                <span>Export Code</span>
                <ArrowRight class="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
