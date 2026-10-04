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
} from '../../stores/cartStore';
import { useCart } from '../../hooks/useCart';
import { SHADE_STEPS, formatOklch, parseAnyToOklch, type ShadeStep, type ColorModel } from '../../utils/color';
import { goTo } from '../../utils/navigate';

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

  const updateShadeColor = (roleId: string, step: ShadeStep, newColor: ColorModel) => {
    const current = cartStore.get();
    const role = current.roles[roleId];
    if (!role) return;

    const updatedShades = {
      ...role.shades,
      [step]: {
        id: `${roleId}-${step}-${Date.now()}`,
        step,
        color: newColor,
      },
    };

    const updatedRoles = {
      ...current.roles,
      [role.id]: {
        ...role,
        shades: updatedShades,
      },
    };

    cartStore.set({
      ...current,
      roles: updatedRoles,
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('oklch_cart_v1', JSON.stringify({
        ...current,
        roles: updatedRoles,
      }));
    }
  };

  const handleShadeInputChange = (roleId: string, step: ShadeStep, value: string) => {
    setShadeInput(value);
    const parsed = parseAnyToOklch(value);
    if (parsed) {
      updateShadeColor(roleId, step, parsed);
    }
  };

  const handleLCHChange = (roleId: string, step: ShadeStep, field: 'l' | 'c' | 'h', value: string) => {
    const current = cartStore.get();
    const role = current.roles[roleId];
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

    const newColor = {
      ...currentColor,
      l: newL,
      c: newC,
      h: newH,
    };

    updateShadeColor(roleId, step, newColor);
  };

  const hasAnyShades = (role: typeof rolesArray[0]): boolean => {
    return Object.keys(role.shades).length > 0;
  };

  return (
    <div class="w-full lg:w-[360px] xl:w-[400px] 2xl:w-[440px] flex-shrink-0 bg-[#0e0e0e] border-l border-[#1f1f1f] flex flex-col lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] rounded-xl overflow-hidden">
      {/* Header */}
      <div class="p-4 border-b border-[#1f1f1f] bg-[#111111] flex-shrink-0">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-[#22c55e]/20 to-[#06b6d4]/20 border border-[#262626] flex items-center justify-center">
              <svg class="w-4 h-4 text-[#22c55e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <div>
              <h3 class="text-sm font-semibold text-[#f5f5f5] tracking-tight">Design Tokens</h3>
              <p class="text-[11px] font-mono text-[#737373]">{filledShadesCount} tokens · {rolesArray.length} roles</p>
            </div>
          </div>
        </div>

        {/* New Role Input */}
        {isCreatingRole ? (
          <div class="flex items-center gap-2">
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
              placeholder="e.g. brand-accent"
              class="flex-1 px-3 py-2 rounded-lg bg-[#171717] border border-[#262626] text-xs font-mono text-[#f5f5f5] focus:outline-none focus:border-[#525252] transition-colors"
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
              class="px-3 py-2 rounded-lg bg-[#262626] hover:bg-[#333333] text-xs font-mono text-[#f5f5f5] transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => {
                setNewRoleInput('');
                setIsCreatingRole(false);
              }}
              class="p-2 rounded-lg hover:bg-[#262626] text-[#737373] hover:text-[#f5f5f5] transition-colors"
              aria-label="Cancel"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsCreatingRole(true)}
            class="w-full py-2 px-3 rounded-lg bg-[#171717] hover:bg-[#1f1f1f] border border-[#262626] text-xs font-mono text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors flex items-center justify-center gap-2"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" /></svg>
            <span>+ New Role</span>
          </button>
        )}
      </div>

      {/* Role List */}
      <div class="flex-1 overflow-y-auto p-3 space-y-3">
        {rolesArray.map((role) => {
          const roleShades = Object.keys(role.shades).filter((k) => SHADE_STEPS.includes(Number(k) as ShadeStep)) as unknown as ShadeStep[];
          const isActive = role.id === cart.activeRoleId;
          const shadeCount = roleShades.length;

          return (
            <div
              key={role.id}
              class={`group rounded-xl border overflow-hidden transition-all ${
                isActive
                  ? 'border-[#3b82f6]/40 bg-[#141414]/50'
                  : 'border-[#262626] bg-[#141414] hover:border-[#333333]'
              }`}
            >
              {/* Role Header
                  NOTE: must NOT be a <button>. It contains the rename/save/cancel/delete
                  buttons, and the HTML parser auto-closes an outer <button> as soon as it
                  meets a nested one — which detaches those action buttons from the header
                  and breaks both the layout and hydration on refresh. A div with
                  role="button" keeps them as real, nested-safe buttons. */}
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
                class="w-full px-3 py-2.5 flex items-center justify-between text-left cursor-pointer"
              >
                <div class="flex items-center gap-2 min-w-0 flex-1">
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
                      class="px-2 py-1 rounded bg-[#171717] border border-[#262626] text-xs font-mono text-[#f5f5f5] flex-1 focus:outline-none focus:border-[#3b82f6]"
                      autoFocus
                    />
                  ) : (
                    <span class="text-sm font-medium text-[#f5f5f5] truncate flex-1">{role.name}</span>
                  )}
                  {shadeCount > 0 && (
                    <span class={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap ${
                      isActive ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'bg-[#262626] text-[#737373]'
                    }`}>
                      {shadeCount}
                    </span>
                  )}
                </div>
                <div class="flex items-center gap-1 ml-2">
                  {!editingRoleId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRoleInputName(role.name);
                        setEditingRoleId(role.id);
                      }}
                      class="p-1.5 rounded hover:bg-[#262626] text-[#737373] hover:text-[#a3a3a3] transition-colors"
                      title="Rename"
                    >
                      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
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
                        class="p-1.5 rounded hover:bg-[#22c55e]/20 text-[#22c55e] transition-colors"
                        title="Save"
                      >
                        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingRoleId(null);
                        }}
                        class="p-1.5 rounded hover:bg-red-400/20 text-red-400 transition-colors"
                        title="Cancel"
                      >
                        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                      </button>
                    </>
                  )}
                  {!role.isDefault && !editingRoleId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRole(role.id);
                      }}
                      class="p-1.5 rounded hover:bg-red-400/20 text-red-400/80 transition-colors"
                      title="Delete role"
                    >
                      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  )}
                </div>
              </div>

              {/* CSS Variable Prefix */}
              <div class="px-3 pb-2 border-b border-[#1f1f1f] text-[10px] font-mono text-[#525252]">
                --color-{role.id}-*
              </div>

              {/* Shades Grid */}
              {shadeCount > 0 ? (
                <div class="px-2 py-2 grid grid-cols-4 2xl:grid-cols-5 gap-1.5">
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
                          <div
                            class="h-10 w-full rounded-lg bg-[#0a0a0a] border border-[#262626] flex items-center justify-center cursor-pointer hover:border-[#333333] transition-colors"
                            onClick={() => openPicker(role.id, step, null)}
                            title={`Pick a color for step ${step}`}
                          >
                            <span class="text-[10px] font-mono text-[#333333]">{step}</span>
                          </div>
                          <div class="text-[10px] font-mono text-[#525252] mt-1 text-center">{step}</div>
                        </div>
                      );
                    }

                    return (
                      <div key={step} class="relative group min-w-0">
                        {/* Color Swatch. `min-w-0` on this grid item is what keeps
                            the swatch pinned to its track: without it the item's
                            automatic minimum size is the full `truncate`d OKLCH
                            string below (~144px vs an ~80px track), so filled
                            swatches burst out of their box and overlap the next
                            column while empty slots stayed fine. */}
                        <div
                          class="h-10 w-full rounded-lg border border-[#262626] relative overflow-hidden"
                          style={{ backgroundColor: css || hex }}
                        >
                          {/* Click the swatch to reopen the picker on this exact
                              slot (preloaded with its current colour). Right-click
                              removes it with an Undo toast. The edit/copy/remove
                              row below calls stopPropagation, so those still work. */}
                          {!isEditing && (
                            <button
                              type="button"
                              class="absolute inset-0 z-0 cursor-pointer"
                              aria-label={`Edit --color-${role.id}-${step} in the color picker`}
                              title={`Edit --color-${role.id}-${step} · right-click to remove`}
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
                            <span class="absolute top-1 right-1 text-[8px] font-mono font-bold px-1 py-0.5 rounded bg-black/40 text-[#06b6d4] backdrop-blur-sm">
                              P3
                            </span>
                          )}
                          {isEditing && (
                            <div class="absolute inset-0 bg-black/50 flex items-center justify-center">
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
                                class="w-full min-w-0 px-1 py-1 bg-[#0e0e0e] border border-[#3b82f6] rounded text-[10px] font-mono text-[#f5f5f5] focus:outline-none"
                                autoFocus
                              />
                            </div>
                          )}
                        </div>

                        {/* Step Label */}
                        <div class="text-[10px] font-mono text-[#737373] mt-1 text-center">{step}</div>

                        {/* Actions on hover */}
                        <div class="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pb-1 pointer-events-none">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingShade({ roleId: role.id, step });
                              setShadeInput(css);
                            }}
                            class="p-1 rounded bg-black/50 hover:bg-black/70 text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors pointer-events-auto"
                            title="Edit OKLCH"
                          >
                            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(css);
                            }}
                            class="p-1 rounded bg-black/50 hover:bg-black/70 text-[#a3a3a3] hover:text-[#22c55e] transition-colors pointer-events-auto"
                            title="Copy OKLCH"
                          >
                            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeShadeWithUndo(role.id, step);
                            }}
                            class="p-1 rounded bg-black/50 hover:bg-black/70 text-[#a3a3a3] hover:text-red-400 transition-colors pointer-events-auto"
                            title="Remove shade (undoable)"
                          >
                            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                          </button>
                        </div>

                        {/* Inline LCH Editor */}
                        {isEditing && (
                          <div class="mt-2 space-y-1 px-1 min-w-0">
                            <div class="grid grid-cols-3 gap-1 text-[10px] font-mono text-[#737373]">
                              <span>L</span><span class="text-center">C</span><span class="text-right">H</span>
                            </div>
                            {/* `min-w-0` on the track and `w-full` on each input let
                                the three number fields shrink into the ~80px swatch
                                column; the spinners are hidden because they alone
                                consume more width than the whole track. */}
                            <div class="grid grid-cols-3 gap-1 min-w-0">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="1"
                                value={token.color.l.toFixed(2)}
                                onChange={(e) => handleLCHChange(role.id, step, 'l', (e.target as HTMLInputElement).value)}
                                class="w-full min-w-0 px-1 py-1 bg-[#171717] border border-[#262626] rounded text-[11px] font-mono text-[#f5f5f5] focus:outline-none focus:border-[#3b82f6] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="0.4"
                                value={token.color.c.toFixed(2)}
                                onChange={(e) => handleLCHChange(role.id, step, 'c', (e.target as HTMLInputElement).value)}
                                class="w-full min-w-0 px-1 py-1 bg-[#171717] border border-[#262626] rounded text-[11px] font-mono text-[#f5f5f5] focus:outline-none focus:border-[#3b82f6] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                              <input
                                type="number"
                                step="1"
                                min="0"
                                max="360"
                                value={Math.round(token.color.h)}
                                onChange={(e) => handleLCHChange(role.id, step, 'h', (e.target as HTMLInputElement).value)}
                                class="w-full min-w-0 px-1 py-1 bg-[#171717] border border-[#262626] rounded text-[11px] font-mono text-[#f5f5f5] focus:outline-none focus:border-[#3b82f6] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                            </div>
                          </div>
                        )}

                        {/* OKLCH Value Display */}
                        {!isEditing && (
                          <div class="mt-1 w-full min-w-0 text-[10px] font-mono text-[#525252] truncate">{css}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div class="px-3 py-4 text-center">
                  <p class="text-[11px] text-[#737373] font-mono">No shades yet</p>
                  <p class="text-[10px] text-[#525252] mt-1">Click empty slot or generate scale</p>
                </div>
              )}

              {/* Generate Full Scale / Delete Full Scale Actions */}
              {hasAnyShades(role) && (
                confirmingClearRoleId === role.id ? (
                  <div class="px-2 pb-2">
                    <div class="rounded-lg border border-red-500/40 bg-red-500/10 p-2 space-y-2">
                      <p class="text-[11px] font-mono text-red-300 leading-tight">
                        Delete all {shadeCount} color{shadeCount === 1 ? '' : 's'} of{' '}
                        <span class="text-white">{role.name}</span>?
                      </p>
                      <div class="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setConfirmingClearRoleId(null)}
                          class="px-2 py-1.5 rounded-md bg-[#1a1a1a] border border-[#262626] text-[11px] font-mono text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            clearRoleScale(role.id);
                            setConfirmingClearRoleId(null);
                          }}
                          class="px-2 py-1.5 rounded-md bg-red-500 text-[11px] font-mono font-semibold text-white hover:bg-red-400 transition-colors"
                        >
                          Delete scale
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div class="px-2 pb-2 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => generateFullScaleForRole(role.id)}
                      class="py-2 px-2 rounded-lg bg-[#1a1a1a] hover:bg-[#222222] border border-[#262626] hover:border-[#333333] text-[11px] font-mono text-[#f5f5f5] flex items-center justify-center gap-1.5 transition-all"
                      title="Generate the full 50–950 scale from the base color"
                    >
                      <svg class="w-3.5 h-3.5 text-[#22c55e] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
                      </svg>
                      <span class="truncate">Full 50–950</span>
                    </button>
                    <button
                      onClick={() => setConfirmingClearRoleId(role.id)}
                      class="py-2 px-2 rounded-lg bg-[#1a1a1a] hover:bg-red-500/10 border border-[#262626] hover:border-red-500/40 text-[11px] font-mono text-[#a3a3a3] hover:text-red-300 flex items-center justify-center gap-1.5 transition-all"
                      title={`Delete all ${shadeCount} colors of ${role.name}`}
                    >
                      <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                      </svg>
                      <span class="truncate">Delete scale</span>
                    </button>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>

      {/* Footer - Quick Stats */}
      <div class="p-3 border-t border-[#1f1f1f] bg-[#111111] flex-shrink-0">
        <div class="grid grid-cols-2 gap-2 text-center">
          <div class="p-2 rounded-lg bg-[#171717]">
            <div class="text-lg font-mono font-bold text-[#f5f5f5]">{filledShadesCount}</div>
            <div class="text-[10px] text-[#737373]">Total Tokens</div>
          </div>
          <div class="p-2 rounded-lg bg-[#171717]">
            <div class="text-lg font-mono font-bold text-[#f5f5f5]">{rolesArray.length}</div>
            <div class="text-[10px] text-[#737373]">Roles</div>
          </div>
        </div>
        {filledShadesCount > 0 && (
          <button
            onClick={() => clearAllScales()}
            class="mt-2 w-full py-2 px-3 rounded-lg bg-[#171717] hover:bg-red-500/10 border border-[#262626] hover:border-red-500/40 text-[11px] font-mono text-[#737373] hover:text-red-300 transition-colors flex items-center justify-center gap-1.5"
            title="Remove every color from every role"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
            <span>Clear all colors</span>
          </button>
        )}
      </div>
    </div>
  );
}