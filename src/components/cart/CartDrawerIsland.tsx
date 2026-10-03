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

  return (
    <div class="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        class="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-150"
        onClick={() => isCartOpenStore.set(false)}
        aria-hidden="true"
      />

      {/* Slide-over panel (Desktop) / Bottom sheet (Mobile) */}
      <div
        class="relative z-10 w-full md:max-w-md h-[88vh] md:h-full mt-auto md:mt-0 bg-[#0e0e0e] border-t md:border-t-0 md:border-l border-[#262626] rounded-t-2xl md:rounded-none shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom md:slide-in-from-right duration-200"
        role="dialog"
        aria-modal="true"
        aria-label="Color Token Cart"
      >
        {/* Header */}
        <div class="p-4 border-b border-[#262626] flex items-center justify-between bg-[#141414]">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-[#a3a3a3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            <h2 class="text-sm font-semibold text-[#f5f5f5] tracking-tight">Design Token Cart</h2>
          </div>
          <button
            onClick={() => isCartOpenStore.set(false)}
            class="touch-target p-1.5 rounded-md hover:bg-[#262626] text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors"
            aria-label="Close cart"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Roles Horizontal Selector */}
        <div class="p-3 border-b border-[#1f1f1f] bg-[#0a0a0a]">
          <div class="text-[11px] font-mono text-[#737373] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>UI Roles (Token Groups)</span>
            <button
              onClick={() => setIsCreatingRole(!isCreatingRole)}
              class="text-xs text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors"
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
                placeholder="e.g. brand-accent"
                class="flex-1 px-3 py-1.5 rounded bg-[#171717] border border-[#262626] text-xs font-mono text-[#f5f5f5] focus:outline-none focus:border-[#525252]"
              />
              <button
                onClick={() => {
                  if (newRoleInput.trim()) {
                    createCustomRole(newRoleInput.trim());
                    setNewRoleInput('');
                    setIsCreatingRole(false);
                  }
                }}
                class="px-3 py-1.5 rounded bg-[#262626] hover:bg-[#333333] text-xs font-mono text-[#f5f5f5]"
              >
                Create
              </button>
            </div>
          )}

          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {Object.values(cart.roles).map((role) => {
              const count = Object.keys(role.shades).length;
              const isSelected = role.id === cart.activeRoleId;
              return (
                <button
                  key={role.id}
                  onClick={() => setActiveRole(role.id)}
                  class={`px-2.5 py-1 rounded-full text-xs font-mono whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#f5f5f5] text-[#0a0a0a] font-medium'
                      : 'bg-[#171717] text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#262626]'
                  }`}
                >
                  <span>{role.name}</span>
                  {count > 0 && (
                    <span class={`text-[10px] px-1 rounded-full ${isSelected ? 'bg-black/20 text-[#0a0a0a]' : 'bg-[#262626] text-[#a3a3a3]'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Role Editor & Shades */}
        {activeRole && (
          <div class="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Role Header Info */}
            <div class="bg-[#141414] p-3 rounded-lg border border-[#262626] space-y-2">
              <div class="flex items-center justify-between">
                {editingRoleId === activeRole.id ? (
                  <div class="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={roleInputName}
                      onInput={(e) => setRoleInputName((e.target as HTMLInputElement).value)}
                      class="px-2 py-1 rounded bg-[#171717] border border-[#262626] text-xs font-mono text-[#f5f5f5] flex-1"
                    />
                    <button
                      onClick={() => {
                        if (roleInputName.trim()) {
                          renameRole(activeRole.id, roleInputName.trim());
                        }
                        setEditingRoleId(null);
                      }}
                      class="px-2 py-1 rounded bg-[#262626] text-xs font-mono text-[#f5f5f5]"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-[#f5f5f5]">{activeRole.name}</span>
                    <button
                      onClick={() => {
                        setRoleInputName(activeRole.name);
                        setEditingRoleId(activeRole.id);
                      }}
                      class="text-[#737373] hover:text-[#a3a3a3] text-[11px] font-mono"
                      title="Rename role"
                    >
                      [rename]
                    </button>
                  </div>
                )}

                {!activeRole.isDefault && (
                  <button
                    onClick={() => deleteRole(activeRole.id)}
                    class="text-xs text-red-400 hover:text-red-300 font-mono"
                  >
                    Delete Role
                  </button>
                )}
              </div>

              <div class="text-[11px] font-mono text-[#737373]">
                Prefix: <span class="text-[#a3a3a3]">--color-{activeRole.id}-*</span>
              </div>

              {/* Action: Generate Full 50-950 Scale */}
              <button
                onClick={() => generateFullScaleForRole(activeRole.id)}
                class="w-full mt-2 py-2 px-3 rounded bg-[#1f1f1f] hover:bg-[#262626] border border-[#262626] text-xs font-mono text-[#f5f5f5] flex items-center justify-center gap-2 transition-colors"
              >
                <svg class="w-3.5 h-3.5 text-[#22c55e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>
                </svg>
                <span>Generate Full 50–950 Scale</span>
              </button>
            </div>

            {/* Shades List (50 to 950) */}
            <div class="space-y-1.5">
              <div class="text-[11px] font-mono text-[#737373] uppercase tracking-wider px-1">
                Shade Steps ({filledShadesCount}/11 filled)
              </div>

              {SHADE_STEPS.map((step) => {
                const token = activeRole.shades[step];
                const oklchCss = token ? formatOklch(token.color) : null;

                return (
                  <div
                    key={step}
                    class={`p-2 rounded-md border flex items-center justify-between text-xs font-mono transition-colors ${
                      token
                        ? 'bg-[#141414] border-[#262626]'
                        : 'bg-[#0a0a0a] border-[#1a1a1a] opacity-50'
                    }`}
                  >
                    <div class="flex items-center gap-2.5 min-w-0">
                      <span class="w-8 text-[#737373]">{step}</span>
                      {token ? (
                        <div
                          class="w-7 h-7 rounded border border-white/20 shadow-inner flex-shrink-0"
                          style={{ backgroundColor: oklchCss || token.color.hex }}
                        />
                      ) : (
                        <div class="w-7 h-7 rounded border border-dashed border-[#262626] flex items-center justify-center text-[10px] text-[#404040]">
                          -
                        </div>
                      )}

                      <div class="min-w-0">
                        {token ? (
                          <div class="truncate">
                            <div class="text-[#f5f5f5] text-[11px] truncate">{oklchCss}</div>
                            <div class="text-[10px] text-[#737373] flex items-center gap-1.5">
                              <span>{token.color.hex}</span>
                              {token.color.inP3 && !token.color.inSRGB && (
                                <span class="text-[#06b6d4]">P3</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span class="text-[#404040] text-[11px]">Empty slot</span>
                        )}
                      </div>
                    </div>

                    {token && (
                      <div class="flex items-center gap-1">
                        <button
                          onClick={() => {
                            if (oklchCss) {
                              navigator.clipboard.writeText(oklchCss);
                              showToast(`Copied ${oklchCss}`);
                            }
                          }}
                          class="p-1 hover:text-[#f5f5f5] text-[#737373]"
                          title="Copy oklch value"
                        >
                          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => removeShadeFromRole(activeRole.id, step)}
                          class="p-1 hover:text-red-400 text-[#737373]"
                          title="Remove shade"
                        >
                          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6 6 18M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer CTAs */}
        <div class="p-4 border-t border-[#262626] bg-[#141414] grid grid-cols-2 gap-2">
          <a
            href="/ui-preview"
            onClick={() => isCartOpenStore.set(false)}
            class="touch-target py-2 px-3 rounded-md bg-[#1f1f1f] hover:bg-[#262626] border border-[#262626] text-xs font-mono text-[#f5f5f5] text-center flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Live UI Preview</span>
          </a>
          <a
            href="/export"
            onClick={() => isCartOpenStore.set(false)}
            class="touch-target py-2 px-3 rounded-md bg-[#f5f5f5] hover:bg-white text-xs font-mono text-[#0a0a0a] font-medium text-center flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Export Code →</span>
          </a>
        </div>
      </div>
    </div>
  );
}
