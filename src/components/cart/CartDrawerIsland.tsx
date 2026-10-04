import { useState, useEffect } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import {
  cartStore,
  isCartOpenStore,
  generateFullScaleForRole,
  removeShadeFromRole,
  renameRole,
  createCustomRole,
  deleteRole,
  setActiveRole,
  showToast,
} from '../../stores/cartStore';
import { SHADE_STEPS, formatOklch, type ShadeStep } from '../../utils/color';

export default function CartDrawerIsland() {
  const cart = useStore(cartStore);
  const isOpen = useStore(isCartOpenStore);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleInputName, setRoleInputName] = useState('');
  const [newRoleInput, setNewRoleInput] = useState('');
  const [isCreatingRole, setIsCreatingRole] = useState(false);

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

  if (!isOpen) return null;

  const activeRole = cart.roles[cart.activeRoleId] || Object.values(cart.roles)[0];
  const filledShadesCount = activeRole ? Object.keys(activeRole.shades).length : 0;
  const filledSteps = SHADE_STEPS.filter((step) => activeRole?.shades[step]);

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
      {/* Backdrop */}
      <div
        class="fixed inset-0 bg-black/75 backdrop-blur-sm"
        onClick={() => isCartOpenStore.set(false)}
        aria-hidden="true"
        style="animation: cartBackdropIn 0.15s ease-out"
      />

      {/* Centered Modal Panel */}
      <div
        class="relative z-10 w-full max-w-2xl max-h-[85vh] bg-[#0e0e0e] border border-[#262626] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style="animation: cartModalIn 0.2s ease-out"
        role="dialog"
        aria-modal="true"
        aria-label="Design Token Cart"
      >
        {/* Header */}
        <div class="px-5 py-4 border-b border-[#262626] flex items-center justify-between bg-[#111111]">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-[#22c55e]/20 to-[#06b6d4]/20 border border-[#262626] flex items-center justify-center">
              <svg class="w-4 h-4 text-[#22c55e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </div>
            <div>
              <h2 class="text-sm font-semibold text-[#f5f5f5] tracking-tight">Design Token Cart</h2>
              <p class="text-[11px] font-mono text-[#737373]">
                {Object.values(cart.roles).reduce((sum, r) => sum + Object.keys(r.shades).length, 0)} tokens across {Object.keys(cart.roles).length} roles
              </p>
            </div>
          </div>
          <button
            onClick={() => isCartOpenStore.set(false)}
            class="p-2 rounded-lg hover:bg-[#262626] text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors"
            aria-label="Close cart"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Role Tabs (Wrapping) */}
        <div class="px-5 py-3 border-b border-[#1f1f1f] bg-[#0a0a0a]">
          <div class="text-[11px] font-mono text-[#737373] uppercase tracking-wider mb-2.5 flex items-center justify-between">
            <span>UI Roles</span>
            <button
              onClick={() => setIsCreatingRole(!isCreatingRole)}
              class="text-xs text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors font-mono"
            >
              {isCreatingRole ? 'Cancel' : '+ New Role'}
            </button>
          </div>

          {isCreatingRole && (
            <div class="flex items-center gap-2 mb-3">
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
                class="px-4 py-2 rounded-lg bg-[#262626] hover:bg-[#333333] text-xs font-mono text-[#f5f5f5] transition-colors"
              >
                Create
              </button>
            </div>
          )}

          {/* Wrapped Role Tab Buttons */}
          <div class="flex flex-wrap gap-1.5">
            {Object.values(cart.roles).map((role) => {
              const count = Object.keys(role.shades).length;
              const isSelected = role.id === cart.activeRoleId;
              return (
                <button
                  key={role.id}
                  onClick={() => setActiveRole(role.id)}
                  class={`px-3 py-2 rounded-lg text-xs font-mono whitespace-nowrap transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'bg-[#f5f5f5] text-[#0a0a0a] font-semibold shadow-md shadow-white/5'
                      : 'bg-[#171717] text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#1f1f1f] border border-[#262626]'
                  }`}
                >
                  <span>{role.name}</span>
                  {count > 0 && (
                    <span class={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      isSelected ? 'bg-[#0a0a0a]/20 text-[#0a0a0a]' : 'bg-[#262626] text-[#a3a3a3]'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Role Content */}
        {activeRole && (
          <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Role Header Card */}
            <div class="bg-[#141414] p-4 rounded-xl border border-[#262626] space-y-3">
              <div class="flex items-center justify-between">
                {editingRoleId === activeRole.id ? (
                  <div class="flex items-center gap-2 flex-1">
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
                      class="px-3 py-1.5 rounded-lg bg-[#171717] border border-[#262626] text-xs font-mono text-[#f5f5f5] flex-1 focus:outline-none focus:border-[#525252]"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        if (roleInputName.trim()) {
                          renameRole(activeRole.id, roleInputName.trim());
                        }
                        setEditingRoleId(null);
                      }}
                      class="px-3 py-1.5 rounded-lg bg-[#262626] hover:bg-[#333333] text-xs font-mono text-[#f5f5f5] transition-colors"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div class="flex items-center gap-3">
                    <span class="text-sm font-semibold text-[#f5f5f5]">{activeRole.name}</span>
                    <button
                      onClick={() => {
                        setRoleInputName(activeRole.name);
                        setEditingRoleId(activeRole.id);
                      }}
                      class="px-2 py-0.5 rounded-md bg-[#1f1f1f] hover:bg-[#262626] text-[#737373] hover:text-[#a3a3a3] text-[11px] font-mono transition-colors"
                      title="Rename role"
                    >
                      Rename
                    </button>
                  </div>
                )}

                {!activeRole.isDefault && (
                  <button
                    onClick={() => deleteRole(activeRole.id)}
                    class="px-2.5 py-1 rounded-md text-xs text-red-400/80 hover:text-red-300 hover:bg-red-400/10 font-mono transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>

              <div class="text-[11px] font-mono text-[#737373]">
                Prefix: <span class="text-[#a3a3a3]">--color-{activeRole.id}-*</span>
                <span class="mx-2 text-[#404040]">•</span>
                <span>{filledShadesCount}/11 filled</span>
              </div>

              {/* Generate Full Scale Button */}
              <button
                onClick={() => generateFullScaleForRole(activeRole.id)}
                class="w-full py-2.5 px-4 rounded-lg bg-[#1a1a1a] hover:bg-[#222222] border border-[#262626] hover:border-[#333333] text-xs font-mono text-[#f5f5f5] flex items-center justify-center gap-2.5 transition-all"
              >
                <svg class="w-4 h-4 text-[#22c55e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>
                </svg>
                <span>Generate Full 50–950 Scale</span>
              </button>
            </div>

            {/* Shade Cards Grid (only filled) */}
            {filledShadesCount > 0 ? (
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {filledSteps.map((step) => {
                  const token = activeRole.shades[step]!;
                  const oklchCss = formatOklch(token.color);

                  return (
                    <div
                      key={step}
                      class="group bg-[#141414] rounded-xl border border-[#262626] hover:border-[#404040] transition-all overflow-hidden"
                    >
                      {/* Large Color Swatch */}
                      <div
                        class="h-16 w-full border-b border-[#262626] relative"
                        style={{ backgroundColor: oklchCss || token.color.hex }}
                      >
                        {/* Gamut badge overlay */}
                        {token.color.inP3 && !token.color.inSRGB && (
                          <span class="absolute top-1.5 right-1.5 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/40 text-[#06b6d4] backdrop-blur-sm">
                            P3
                          </span>
                        )}
                      </div>

                      {/* Info & Actions */}
                      <div class="p-3 space-y-1.5">
                        <div class="flex items-center justify-between">
                          <span class="text-xs font-mono font-bold text-[#f5f5f5]">{step}</span>
                          <div class="flex items-center gap-0.5">
                            {/* Copy Button */}
                            <button
                              onClick={() => {
                                if (oklchCss) {
                                  navigator.clipboard.writeText(oklchCss);
                                  showToast(`Copied ${oklchCss}`);
                                }
                              }}
                              class="p-1.5 rounded-md hover:bg-[#262626] text-[#737373] hover:text-[#22c55e] transition-colors"
                              title="Copy OKLCH value"
                            >
                              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                              </svg>
                            </button>
                            {/* Remove Button */}
                            <button
                              onClick={() => removeShadeFromRole(activeRole.id, step)}
                              class="p-1.5 rounded-md hover:bg-red-400/10 text-[#737373] hover:text-red-400 transition-colors"
                              title="Remove shade"
                            >
                              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div class="text-[11px] font-mono text-[#a3a3a3] truncate">{oklchCss}</div>
                        <div class="text-[10px] font-mono text-[#737373]">{token.color.hex}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Empty State */
              <div class="text-center py-12 space-y-3">
                <div class="w-14 h-14 mx-auto rounded-2xl bg-[#141414] border border-[#262626] flex items-center justify-center">
                  <svg class="w-6 h-6 text-[#404040]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M12 2v20M2 12h20"/>
                  </svg>
                </div>
                <div>
                  <p class="text-sm text-[#737373] font-medium">No shades added yet</p>
                  <p class="text-[11px] text-[#525252] font-mono mt-1">
                    Use the color picker to add colors, or generate a full scale
                  </p>
                </div>
              </div>
            )}

            {/* Empty Slots Remaining Indicator */}
            {filledShadesCount > 0 && filledShadesCount < 11 && (
              <div class="text-[11px] font-mono text-[#525252] text-center py-2 border-t border-[#1a1a1a]">
                {11 - filledShadesCount} empty slot{11 - filledShadesCount !== 1 ? 's' : ''} remaining
                <span class="mx-1.5 text-[#333333]">•</span>
                Use "Generate Full Scale" to fill all
              </div>
            )}
          </div>
        )}

        {/* Footer CTAs */}
        <div class="px-5 py-4 border-t border-[#262626] bg-[#111111] grid grid-cols-2 gap-3">
          <a
            href="/ui-preview"
            onClick={() => isCartOpenStore.set(false)}
            class="py-2.5 px-4 rounded-xl bg-[#1a1a1a] hover:bg-[#222222] border border-[#262626] hover:border-[#333333] text-xs font-mono text-[#f5f5f5] text-center flex items-center justify-center gap-2 transition-all"
          >
            <svg class="w-3.5 h-3.5 text-[#a3a3a3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/>
            </svg>
            <span>Live Preview</span>
          </a>
          <a
            href="/export"
            onClick={() => isCartOpenStore.set(false)}
            class="py-2.5 px-4 rounded-xl bg-[#f5f5f5] hover:bg-white text-xs font-mono text-[#0a0a0a] font-semibold text-center flex items-center justify-center gap-2 transition-all shadow-lg shadow-white/5"
          >
            <span>Export Code</span>
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
