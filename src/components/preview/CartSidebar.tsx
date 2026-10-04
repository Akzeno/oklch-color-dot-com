import { useState } from 'preact/hooks';
import {
  cartStore,
  generateFullScaleForRole,
  clearRoleScale,
  clearAllScales,
  renameRole,
  createCustomRole,
  deleteRole,
  setActiveRole,
  savePickerHandoff,
  removeShadeWithUndo,
  setRoleShade,
} from '../../stores/cartStore';
import { useCart } from '../../hooks/useCart';
import { SHADE_STEPS, BASE_SHADE_STEP, formatOklch, parseAnyToOklch, type ShadeStep, type ColorModel } from '../../utils/color';
import { goTo } from '../../utils/navigate';
import { Check, Code2, Copy, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-preact';

/**
 * The Design Tokens panel: one card per role, one swatch per 50–950 step.
 *
 * WHAT THIS PANEL IS FOR
 *
 * It is the instrument's *state*, not its surface. Everything about how a token
 * looks is decided on the canvases to the left; this panel's only job is to say
 * which slots exist, which are filled, and to be the fastest route to changing
 * one. So it spends its pixels on swatches and counts, and nothing else.
 *
 * WHAT WAS REMOVED, AND WHY
 *
 *  - The header's decorative gradient icon box. It was a green/cyan swatch next
 *    to a grid of colour swatches, competing with them for the same judgement.
 *  - The footer's two stat tiles. They restated the header's own "N tokens ·
 *    M roles" line, at `text-lg`, which made a duplicated number the loudest
 *    thing in the panel. Only "Clear all colors" survives, because that is an
 *    action rather than a repeat.
 *  - The per-swatch OKLCH string. At an ~80px column it truncated to
 *    `oklch(0.55…`, which is not a value — it is noise with the shape of one.
 *    The tooltip, the picker and the export page all give the real string.
 *  - `#3b82f6` on role focus and active borders, and `#22c55e` on the generate
 *    and copy icons. Per DESIGN.md the only chromatic pixels in the product are
 *    gamut state and copy confirmation; emphasis here is carried by ink.
 */

export default function CartSidebar() {
  const cart = useCart();
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleInputName, setRoleInputName] = useState('');
  const [newRoleInput, setNewRoleInput] = useState('');
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [editingShade, setEditingShade] = useState<{ roleId: string; step: ShadeStep } | null>(null);
  const [shadeInput, setShadeInput] = useState('');
  const [confirmingClearRoleId, setConfirmingClearRoleId] = useState<string | null>(null);

  const filledShadesCount = Object.values(cart.roles).reduce((sum, r) => sum + Object.keys(r.shades).length, 0);
  const rolesArray = Object.values(cart.roles);

  /** Exporting a cart with no colors yields an empty stylesheet, so gate on it. */
  const canExport = filledShadesCount > 0;

  /**
   * Send an exact token slot to the full color picker page.
   *
   * `color` is `null` for an empty slot, which tells the picker to author a new
   * token there (seeding lightness from the step and hue from the role's 500)
   * instead of preloading an existing colour. Either way the picker writes back
   * to this very slot, never a nearest-lightness one.
   */
  const openPicker = (roleId: string, step: ShadeStep, color: ColorModel | null) => {
    // `returnTo` sends the user back here after they save, so editing a token
    // reads as one task instead of a page they have to find their way out of.
    savePickerHandoff({ roleId, step, color, returnTo: window.location.pathname });
    goTo('/');
  };

  /*
   * Both inline editors below funnel through here.
   *
   * They used to hand-roll the store update and its `localStorage` write. That
   * was a second copy of `setRoleShade`'s persistence, so a shade edited in
   * this panel could land in memory but survive a reload differently from one
   * edited anywhere else. `silent` because these fire on every keystroke — a
   * toast per character would be unusable — and because the swatch you are
   * looking at already shows the result.
   */
  const writeShade = (roleId: string, step: ShadeStep, color: ColorModel) => {
    setRoleShade(roleId, step, color, { silent: true });
  };

  const handleShadeInputChange = (roleId: string, step: ShadeStep, value: string) => {
    setShadeInput(value);
    const parsed = parseAnyToOklch(value);
    if (parsed) {
      writeShade(roleId, step, parsed);
    }
  };

  const handleLCHChange = (roleId: string, step: ShadeStep, field: 'l' | 'c' | 'h', value: string) => {
    const role = cartStore.get().roles[roleId];
    if (!role || !role.shades[step]) return;

    const currentColor = role.shades[step]!.color;
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    let newL = currentColor.l;
    let newC = currentColor.c;
    let newH = currentColor.h;

    if (field === 'l') newL = Math.max(0, Math.min(1, numValue));
    else if (field === 'c') newC = Math.max(0, Math.min(0.4, numValue));
    else if (field === 'h') newH = ((numValue % 360) + 360) % 360;

    writeShade(roleId, step, { ...currentColor, l: newL, c: newC, h: newH });
  };

  const hasAnyShades = (role: typeof rolesArray[0]): boolean => {
    return Object.keys(role.shades).length > 0;
  };

  return (
    <div class="w-full lg:w-[360px] xl:w-[400px] shrink-0 bg-canvas-sunken border-l border-hairline flex flex-col lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] overflow-hidden">
      {/* Header — the only place the totals appear. */}
      <div class="px-3 py-3 border-b border-hairline-subtle shrink-0">
        <div class="flex items-center justify-between gap-2 mb-2.5">
          <h3 class="text-label text-ink">Design Tokens</h3>
          <span class="pill">
            {filledShadesCount} tokens · {rolesArray.length} roles
          </span>
        </div>

        {isCreatingRole ? (
          <div class="flex items-center gap-1.5">
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
                if (e.key === 'Escape') {
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
            <button
              onClick={() => {
                setNewRoleInput('');
                setIsCreatingRole(false);
              }}
              class="icon-btn"
              aria-label="Cancel"
            >
              <X class="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsCreatingRole(true)}
            class="btn btn-quiet w-full h-8"
          >
            <Plus class="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
            <span>New role</span>
          </button>
        )}
      </div>

      {/* Role list */}
      <div class="flex-1 overflow-y-auto p-3 space-y-3">
        {/*
         * Contextual shortcut to Export & Code, directly above the tokens the
         * user has just been testing, so "I'm done, ship the CSS variables" is
         * one click from the thing that finishes the task. The global nav links
         * here too, but it lives in a fixed app shell a glance away.
         *
         * WHY IT WEARS THE PANEL'S ONLY PRIMARY FILL
         *
         * The first version of this button was a `text-[10px]` half-width pill in
         * the app's quiet-control palette (`bg-[#1a1a1a]` / `border-[#262626]` /
         * `text-[#a3a3a3]`), and it read as a caption rather than an action: 10px
         * is the smallest text in the panel, that palette is the same one the
         * trash and rename icons use, and it lost the row to a redundant dim
         * "Token Roles" label. Since this is the terminal action of the whole
         * test-then-ship loop, it now gets the emphasis instead:
         *
         *  - Full width, at the shared `.btn` size, matching the panel's other
         *    action buttons.
         *  - Filled with ink — `btn-primary`, the product's one light-on-dark
         *    fill. That is the loudest thing a control can be here without
         *    putting a colour next to the colour being judged, which is exactly
         *    what the `#3b82f6` tint it replaced was doing. Ink reads louder than
         *    a 10%-alpha blue did, and it cannot shift the perception of the
         *    swatches underneath it.
         *  - Carries the token count, which both explains the action and tells
         *    the user the export will not be empty.
         *  - `sticky`, because with six role cards this was otherwise the first
         *    thing to scroll away. The negative margin lets it span the scroll
         *    container's padding so cards pass cleanly underneath it; the fill
         *    must stay the panel's own background, or the cards scrolling behind
         *    would show through the gap above the button.
         *
         * The redundant "Token Roles" label is gone: the panel header already
         * reads "Design Tokens · N tokens · M roles".
         *
         * Disabled, not hidden, while the cart is empty — exporting zero tokens
         * produces an empty stylesheet, so the button says why it is inert
         * instead of sending the user to a dead page. `aria-disabled` plus
         * `preventDefault` rather than a `disabled` attribute, because an <a>
         * cannot take one — and keeping it a real anchor preserves cmd-click /
         * open-in-new-tab, which the view-transition router intercepts the same.
         *
         * The icon is the same `Code2` glyph the nav's /export item uses, so the
         * shortcut and the nav entry are visibly the same destination.
         */}
        <div class="sticky top-0 z-10 -mx-3 px-3 pt-3 pb-1 bg-canvas-sunken">
          <a
            href="/export"
            aria-disabled={canExport ? undefined : 'true'}
            onClick={(e) => {
              if (!canExport) e.preventDefault();
            }}
            title={
              canExport
                ? `Open Export & Code to copy or download ${filledShadesCount} CSS variable${filledShadesCount === 1 ? '' : 's'}`
                : 'Add at least one color before exporting'
            }
            class={`btn w-full ${canExport ? 'btn-primary' : 'btn-quiet text-faint cursor-not-allowed'}`}
          >
            <Code2 class="w-4 h-4 flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>Export & Code</span>
            {/* Hidden while inert: "0 tokens" would just restate the disabled
                state, and the tooltip already explains it. The count is dimmed
                rather than tinted — on the ink fill there is no room for a second
                colour, and the panel now has no non-gamut colour to spend. */}
            {canExport && <span class="opacity-60">{filledShadesCount} tokens</span>}
          </a>
        </div>

        {rolesArray.map((role) => {
          const roleShades = Object.keys(role.shades).filter((k) => SHADE_STEPS.includes(Number(k) as ShadeStep)) as unknown as ShadeStep[];
          const isActive = role.id === cart.activeRoleId;
          const shadeCount = roleShades.length;

          return (
            <div
              key={role.id}
              class={`rounded-lg border overflow-hidden transition-colors duration-150 ${
                isActive
                  ? 'border-faint bg-canvas-card'
                  : 'border-hairline bg-canvas-card/40 hover:border-faint'
              }`}
            >
              {/* Role header.
                  NOTE: must NOT be a <button>. It contains the rename/save/cancel/delete
                  buttons, and the HTML parser auto-closes an outer <button> as soon as it
                  meets a nested one — which detaches those action buttons from the header
                  and breaks both the layout and hydration on refresh. A div with
                  role="button" keeps them as real, nested-safe buttons.

                  The CSS prefix moved up next to the role name. It used to sit on its
                  own hairline-divided row under the header, which cost a rule and 22px
                  per role — × 6 roles — to say one thing, and that one thing is a name. */}
              <div
                role="button"
                tabIndex={0}
                aria-label={`Activate role ${role.name}`}
                aria-pressed={isActive}
                onClick={() => setActiveRole(role.id)}
                onKeyDown={(e) => {
                  if (editingRoleId === role.id) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveRole(role.id);
                  }
                }}
                class="w-full px-2.5 py-2 flex items-center justify-between gap-2 text-left cursor-pointer"
              >
                <div class="flex items-center gap-1.5 min-w-0 flex-1">
                  {editingRoleId === role.id ? (
                    <input
                      type="text"
                      value={roleInputName}
                      onInput={(e) => setRoleInputName((e.target as HTMLInputElement).value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && roleInputName.trim()) {
                          renameRole(role.id, roleInputName.trim());
                          setEditingRoleId(null);
                        }
                        if (e.key === 'Escape') {
                          setEditingRoleId(null);
                        }
                      }}
                      class="px-2 py-1 rounded bg-canvas-raised border border-hairline text-micro text-ink flex-1 min-w-0 font-mono focus:outline-none focus:border-border-focus"
                      autoFocus
                    />
                  ) : (
                    <span class="truncate">
                      <span class={`text-label ${isActive ? 'text-ink' : 'text-body'}`}>{role.name}</span>
                      <span class="block font-mono text-micro text-faint leading-tight">
                        --color-{role.id}-*
                      </span>
                    </span>
                  )}
                  {shadeCount > 0 && <span class="pill shrink-0">{shadeCount}</span>}
                </div>
                <div class="flex items-center shrink-0">
                  {!editingRoleId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRoleInputName(role.name);
                        setEditingRoleId(role.id);
                      }}
                      class="icon-btn icon-btn-sm"
                      title="Rename role"
                      aria-label={`Rename role ${role.name}`}
                    >
                      <Pencil class="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  )}
                  {editingRoleId === role.id && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (roleInputName.trim()) {
                            renameRole(role.id, roleInputName.trim());
                          }
                          setEditingRoleId(null);
                        }}
                        class="icon-btn icon-btn-sm"
                        title="Save name"
                        aria-label="Save name"
                      >
                        <Check class="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingRoleId(null);
                        }}
                        class="icon-btn icon-btn-sm"
                        title="Cancel"
                        aria-label="Cancel rename"
                      >
                        <X class="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    </>
                  )}
                  {!role.isDefault && !editingRoleId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRole(role.id);
                      }}
                      class="icon-btn icon-btn-sm"
                      title="Delete role"
                      aria-label={`Delete role ${role.name}`}
                    >
                      <Trash2 class="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              {/* Shades grid */}
              {shadeCount > 0 ? (
                <div class="px-2 pb-2 grid grid-cols-6 gap-1">
                  {SHADE_STEPS.map((step) => {
                    const token = role.shades[step];
                    const css = token ? formatOklch(token.color) : '';
                    const hex = token ? token.color.hex : '';
                    const isEditing = editingShade?.roleId === role.id && editingShade?.step === step;

                    /* Both the empty and the filled branch render the SAME wrapper element with the
                       same classes. They used to differ (`flex items-center
                       justify-center` vs `relative group`) while sharing one
                       `key`, so any partial reconciliation left a filled swatch
                       sitting inside an empty-slot flex row — which stretched
                       its `w-full` swatch across the whole cell. Keeping the
                       wrapper identical means the slot's box is never borrowed. */
                    if (!token) {
                      return (
                        <div key={step} class="relative group min-w-0">
                          <button
                            type="button"
                            onClick={() => openPicker(role.id, step, null)}
                            title={`Author --color-${role.id}-${step}`}
                            aria-label={`Author --color-${role.id}-${step}`}
                            class="h-8 w-full rounded-md bg-canvas border border-dashed border-hairline hover:border-border-focus transition-colors duration-150"
                          />
                          <span class="block font-mono text-micro text-faint text-center mt-0.5">{step}</span>
                        </div>
                      );
                    }

                    return (
                      <div key={step} class="relative group min-w-0">
                        {/* Color Swatch. `min-w-0` on this grid item is what keeps
                            the swatch pinned to its track: without it the item's
                            automatic minimum size is the widest child, so filled
                            swatches burst out of their box and overlap the next
                            column while empty slots stayed fine. */}
                        <div
                          class="h-8 w-full rounded-md border border-hairline relative overflow-hidden"
                          style={{ backgroundColor: css || hex }}
                        >
                          {/* Click the swatch to reopen the picker on this exact
                              slot (preloaded with its current colour). Right-click
                              removes it with an Undo toast. The action row below
                              stops propagation, so those still work. */}
                          {!isEditing && (
                            <button
                              type="button"
                              class="absolute inset-0 z-0 cursor-pointer"
                              aria-label={`Edit --color-${role.id}-${step} in the color picker`}
                              title={`${css} · click to edit, right-click to remove`}
                              onClick={(e) => {
                                e.stopPropagation();
                                openPicker(role.id, step, token.color);
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                removeShadeWithUndo(role.id, step);
                              }}
                            />
                          )}
                          {token.color.inP3 && !token.color.inSRGB && (
                            <span
                              class="absolute top-0.5 right-0.5 font-mono text-[9px] leading-none px-1 py-0.5 rounded bg-badge-surface text-gamut-p3"
                              title="Inside Display-P3, outside sRGB — browsers will clamp it"
                            >
                              P3
                            </span>
                          )}
                          {isEditing && (
                            <div class="absolute inset-0 bg-canvas-sunken/90 flex items-center">
                              <input
                                type="text"
                                value={shadeInput}
                                onInput={(e) => handleShadeInputChange(role.id, step, (e.target as HTMLInputElement).value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    setEditingShade(null);
                                  }
                                  if (e.key === 'Escape') {
                                    setShadeInput(css);
                                    setEditingShade(null);
                                  }
                                }}
                                onBlur={() => setEditingShade(null)}
                                class="w-full min-w-0 px-1 py-0.5 bg-canvas border border-border-focus rounded text-[10px] font-mono text-ink focus:outline-none"
                                autoFocus
                              />
                            </div>
                          )}
                        </div>

                        <span class="block font-mono text-micro text-mute text-center mt-0.5">{step}</span>

                        {/* One-click actions, on hover/focus. */}
                        {!isEditing && (
                          <div class="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150 pb-0.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingShade({ roleId: role.id, step });
                                setShadeInput(css);
                              }}
                              class="p-1 rounded bg-badge-surface hover:bg-canvas-elevated text-mute hover:text-ink transition-colors duration-150"
                              title={`Edit ${css} in place`}
                              aria-label={`Edit ${step} in place`}
                            >
                              <Pencil class="w-3 h-3" strokeWidth={1.75} aria-hidden="true" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(css);
                              }}
                              class="p-1 rounded bg-badge-surface hover:bg-canvas-elevated text-mute hover:text-ink transition-colors duration-150"
                              title={`Copy ${css}`}
                              aria-label={`Copy ${step} value`}
                            >
                              <Copy class="w-3 h-3" strokeWidth={1.75} aria-hidden="true" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeShadeWithUndo(role.id, step);
                              }}
                              class="p-1 rounded bg-badge-surface hover:bg-canvas-elevated text-mute hover:text-ink transition-colors duration-150"
                              title="Remove shade (undoable)"
                              aria-label={`Remove ${step}`}
                            >
                              <Trash2 class="w-3 h-3" strokeWidth={1.75} aria-hidden="true" />
                            </button>
                          </div>
                        )}

                        {/* Inline LCH editor. One row of three numbers for exactly
                            the slot being edited — the alternative, a field per
                            swatch, put 33 always-visible inputs under 11 swatches
                            and made the grid unreadable. */}
                        {isEditing && (
                          <div class="col-span-6 mt-1.5 grid grid-cols-3 gap-1 min-w-0">
                            {(['l', 'c', 'h'] as const).map((axis) => (
                              <input
                                key={axis}
                                type="number"
                                step="0.01"
                                min="0"
                                max={axis === 'h' ? '360' : axis === 'c' ? '0.4' : '1'}
                                value={
                                  axis === 'l'
                                    ? token.color.l.toFixed(2)
                                    : axis === 'c'
                                      ? token.color.c.toFixed(2)
                                      : Math.round(token.color.h)
                                }
                                onChange={(e) =>
                                  handleLCHChange(role.id, step, axis, (e.target as HTMLInputElement).value)
                                }
                                aria-label={`${axis.toUpperCase()} of --color-${role.id}-${step}`}
                                class="w-full min-w-0 px-1.5 py-1 rounded bg-canvas-raised border border-hairline font-mono text-micro text-ink focus:outline-none focus:border-border-focus [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /*
                 * An empty role used to be a dead end: the swatch grid is not
                 * rendered at all, and the "Full 50–950" / "Delete scale" row is
                 * gated behind `hasAnyShades`, so the old hint pointed at two
                 * controls that were both absent. This button is the one
                 * guaranteed way forward.
                 *
                 * It routes through `openPicker` with a null colour, so the picker
                 * authors a NEW token at BASE_SHADE_STEP seeded from that step's
                 * target lightness — and `returnTo` brings the user straight back
                 * here once they save.
                 */
                <div class="px-2.5 pb-2.5">
                  <button
                    onClick={() => openPicker(role.id, BASE_SHADE_STEP, null)}
                    title={`Author the base shade (${BASE_SHADE_STEP}) in the color picker`}
                    class="btn btn-quiet w-full h-8"
                  >
                    <Plus class="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
                    <span>Add color</span>
                  </button>
                </div>
              )}

              {/* Generate Full Scale / Delete Full Scale Actions */}
              {hasAnyShades(role) && (
                confirmingClearRoleId === role.id ? (
                  <div class="px-2 pb-2">
                    <div class="rounded-md border border-hairline bg-canvas-sunken p-2 space-y-2">
                      <p class="font-mono text-micro text-body leading-tight">
                        Delete {shadeCount} color{shadeCount === 1 ? '' : 's'} from{' '}
                        <span class="text-ink">{role.name}</span>?
                      </p>
                      <div class="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => setConfirmingClearRoleId(null)}
                          class="btn btn-quiet h-8"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            clearRoleScale(role.id);
                            setConfirmingClearRoleId(null);
                          }}
                          class="btn btn-danger h-8"
                        >
                          Delete scale
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div class="px-2 pb-2 grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => generateFullScaleForRole(role.id)}
                      class="btn btn-quiet h-8"
                      title="Generate the full 50–950 scale from the base color"
                    >
                      <Sparkles class="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
                      <span class="truncate">Full 50–950</span>
                    </button>
                    <button
                      onClick={() => setConfirmingClearRoleId(role.id)}
                      class="btn btn-quiet h-8"
                      title={`Delete all ${shadeCount} colors of ${role.name}`}
                    >
                      <Trash2 class="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
                      <span class="truncate">Delete scale</span>
                    </button>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>

      {/* Footer. One action, because the counts it used to display are already
          in the header and a duplicated number is not information. */}
      {filledShadesCount > 0 && (
        <div class="p-3 border-t border-hairline-subtle shrink-0">
          <button
            onClick={() => clearAllScales()}
            class="btn btn-danger w-full h-8"
            title="Remove every color from every role"
          >
            <Trash2 class="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>Clear all colors</span>
          </button>
        </div>
      )}
    </div>
  );
}
