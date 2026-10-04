import { useEffect, useRef } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { cartStore } from '../../stores/cartStore';
import { formatOklch, SHADE_STEPS, type ShadeStep } from '../../utils/color';

interface ContextMenuProps {
  x: number;
  y: number;
  targetRoleId: string;
  targetStep: ShadeStep;
  onSelect: (sourceRoleId: string, sourceStep: ShadeStep) => void;
  onClose: () => void;
}

export default function ContextMenu({ x, y, targetRoleId, targetStep, onSelect, onClose }: ContextMenuProps) {
  const cart = useStore(cartStore);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click, Escape, or scroll
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleScroll = () => onClose();
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    document.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [onClose]);

  // Adjust position to keep menu in viewport
  const menuWidth = 288;
  const menuHeight = 400;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 16);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 16);

  const rolesArray = Object.values(cart.roles).filter((r) => Object.keys(r.shades).length > 0);

  return (
    <div
      ref={menuRef}
      class="fixed z-[9999] w-72 bg-[#141414] border border-[#262626] rounded-xl shadow-2xl shadow-black/60 overflow-hidden"
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
    >
      {/* Header */}
      <div class="px-3 py-2.5 border-b border-[#1f1f1f] bg-[#111111] flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold text-[#f5f5f5]">Apply Cart Color</p>
          <p class="text-[10px] font-mono text-[#737373]">
            {targetRoleId} · {targetStep}
          </p>
        </div>
        <button
          onClick={onClose}
          class="p-1 rounded hover:bg-[#262626] text-[#737373] hover:text-[#f5f5f5] transition-colors"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Role list with shades */}
      <div class="max-h-80 overflow-y-auto p-2 space-y-2.5">
        {rolesArray.map((role) => {
          const shades = SHADE_STEPS.filter((s) => role.shades[s]);
          if (shades.length === 0) return null;
          return (
            <div key={role.id}>
              <p class="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#525252] px-1 mb-1">
                {role.name}
              </p>
              <div class="grid grid-cols-6 gap-1">
                {shades.map((step) => {
                  const token = role.shades[step]!;
                  const css = formatOklch(token.color);
                  const isTarget = role.id === targetRoleId && step === targetStep;
                  return (
                    <button
                      key={step}
                      onClick={() => onSelect(role.id, step)}
                      class={`h-8 rounded-md border transition-all hover:scale-110 ${
                        isTarget
                          ? 'border-white ring-1 ring-white/50'
                          : 'border-[#262626] hover:border-[#525252]'
                      }`}
                      style={{ backgroundColor: css }}
                      title={`${role.name} ${step}: ${css}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div class="px-3 py-2 border-t border-[#1f1f1f] bg-[#111111]">
        <p class="text-[10px] font-mono text-[#525252]">
          Click a swatch to apply its color to the target element
        </p>
      </div>
    </div>
  );
}
