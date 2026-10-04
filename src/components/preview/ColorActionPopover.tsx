import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  formatOklch,
  SHADE_STEPS,
  type ColorModel,
  type ShadeStep,
} from '../../utils/color';
import { PALETTES } from '../../data/palettes';
import { useCart } from '../../hooks/useCart';

interface ColorActionPopoverProps {
  /** Viewport coordinates of the click that opened this popover. */
  x: number;
  y: number;
  targetRoleId: string;
  targetStep: ShadeStep;
  /** Apply a picked color to the clicked token slot. */
  onApplyColor: (color: ColorModel, sourceLabel: string) => void;
  /** Remove only the clicked color token. */
  onDeleteShade: () => void;
  /** Remove every color of the parent role (its full 50–950 scale). */
  onDeleteFullScale: () => void;
  /** Hand the color over to the color picker page. */
  onOpenInPicker: (color: ColorModel) => void;
  onClose: () => void;
}

type Tab = 'tokens' | 'palettes';
type PendingDelete = 'shade' | 'scale' | null;

/**
 * Anchored action popover shown when a colored element inside the dummy UI
 * preview is clicked (or right-clicked).
 *
 * Offers everything you can do with that token from one place:
 *  - copy a color from another role's scale ("Tokens" tab, legacy behaviour)
 *  - pick any library palette shade ("Palettes" tab)
 *  - hand the color off to the full color picker page
 *  - delete this single color, or delete the whole parent role scale
 */
export default function ColorActionPopover({
  x,
  y,
  targetRoleId,
  targetStep,
  onApplyColor,
  onDeleteShade,
  onDeleteFullScale,
  onOpenInPicker,
  onClose,
}: ColorActionPopoverProps) {
  const cart = useCart();
  const panelRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>('tokens');
  const [paletteQuery, setPaletteQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  const targetRole = cart.roles[targetRoleId];
  const targetToken = targetRole?.shades[targetStep];
  const targetColor: ColorModel | null = targetToken?.color ?? null;
  const scaleCount = targetRole ? Object.keys(targetRole.shades).length : 0;

  const rolesWithShades = useMemo(
    () => Object.values(cart.roles).filter((r) => Object.keys(r.shades).length > 0),
    [cart.roles]
  );

  const filteredPalettes = useMemo(() => {
    const q = paletteQuery.trim().toLowerCase();
    if (!q) return PALETTES;
    return PALETTES.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.slug.includes(q) ||
        p.categoryLabel.toLowerCase().includes(q)
    );
  }, [paletteQuery]);

  /* Keep the panel inside the viewport, measured after the first layout so the
     real height is known (content height changes per tab). */
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 12;
    const gap = 8;

    let left = x;
    if (left + rect.width > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - rect.width - pad);
    }

    let top = y + gap;
    if (top + rect.height > window.innerHeight - pad) {
      top = Math.max(pad, y - rect.height - gap);
    }
    if (top + rect.height > window.innerHeight - pad) {
      top = Math.max(pad, window.innerHeight - rect.height - pad);
    }

    setPos({ left, top });
  }, [x, y]);

  /* Close on outside click, Escape, resize or any scroll of an ancestor */
  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onScrollOrResize = () => onClose();

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onScrollOrResize);
    document.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onScrollOrResize);
      document.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      class="fixed z-[9999] w-[340px] max-w-[calc(100vw-1.5rem)] bg-[#141414] border border-[#333333] rounded-2xl shadow-2xl shadow-black/70 overflow-hidden flex flex-col max-h-[min(78vh,620px)] animate-popover-in"
      style={{ left: `${pos.left}px`, top: `${pos.top}px` }}
      role="dialog"
      aria-label={`Actions for ${targetRole?.name ?? targetRoleId} ${targetStep}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header: what am I acting on? */}
      <div class="px-3.5 py-3 border-b border-[#1f1f1f] bg-[#111111] flex items-center gap-3 flex-shrink-0">
        <div
          class="w-9 h-9 rounded-lg border border-[#262626] flex-shrink-0 shadow-inner"
          style={{ backgroundColor: targetColor ? formatOklch(targetColor) : '#262626' }}
          aria-hidden="true"
        />
        <div class="min-w-0 flex-1">
          <p class="text-xs font-semibold text-[#f5f5f5] truncate">
            {targetRole?.name ?? targetRoleId} · {targetStep}
          </p>
          <p class="text-[10px] font-mono text-[#737373] truncate">
            --color-{targetRoleId}-{targetStep}
            {targetColor ? ` · ${formatOklch(targetColor)}` : ' · not set'}
          </p>
        </div>
        <button
          onClick={onClose}
          class="p-1.5 rounded-md hover:bg-[#262626] text-[#737373] hover:text-[#f5f5f5] transition-colors flex-shrink-0"
          aria-label="Close"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div class="grid grid-cols-2 gap-1 p-1.5 bg-[#111111] border-b border-[#1f1f1f] flex-shrink-0">
        <button
          onClick={() => setTab('tokens')}
          class={`px-2 py-1.5 rounded-lg text-[11px] font-mono transition-colors ${
            tab === 'tokens' ? 'bg-[#262626] text-[#f5f5f5] font-semibold' : 'text-[#737373] hover:text-[#a3a3a3]'
          }`}
        >
          Cart Colors
        </button>
        <button
          onClick={() => setTab('palettes')}
          class={`px-2 py-1.5 rounded-lg text-[11px] font-mono transition-colors ${
            tab === 'palettes' ? 'bg-[#262626] text-[#f5f5f5] font-semibold' : 'text-[#737373] hover:text-[#a3a3a3]'
          }`}
        >
          Palettes
        </button>
      </div>

      {/* Body */}
      <div class="flex-1 overflow-y-auto p-2.5 min-h-0">
        {tab === 'tokens' ? (
          rolesWithShades.length === 0 ? (
            <p class="text-[11px] font-mono text-[#525252] px-1 py-4 text-center">
              No colors in your cart yet.
            </p>
          ) : (
            <div class="space-y-2.5">
              {rolesWithShades.map((role) => {
                const shades = SHADE_STEPS.filter((s) => role.shades[s]);
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
                            onClick={() => onApplyColor(token.color, `${role.name} ${step}`)}
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
          )
        ) : (
          <div class="space-y-2.5">
            <input
              type="text"
              value={paletteQuery}
              onInput={(e) => setPaletteQuery((e.target as HTMLInputElement).value)}
              placeholder="Filter palettes…"
              class="w-full px-2.5 py-1.5 rounded-lg bg-[#0a0a0a] border border-[#262626] text-[11px] font-mono text-[#f5f5f5] placeholder:text-[#404040] focus:outline-none focus:border-[#525252] transition-colors"
            />

            {filteredPalettes.length === 0 ? (
              <p class="text-[11px] font-mono text-[#525252] px-1 py-4 text-center">
                No palettes match “{paletteQuery}”.
              </p>
            ) : (
              filteredPalettes.map((palette) => (
                <div key={palette.id}>
                  <div class="flex items-center justify-between px-1 mb-1">
                    <p class="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#525252] truncate">
                      {palette.name}
                    </p>
                    <span class="text-[9px] font-mono text-[#404040] flex-shrink-0 ml-2">
                      {palette.categoryLabel}
                    </span>
                  </div>
                  <div class="grid grid-cols-6 gap-1">
                    {SHADE_STEPS.map((step) => {
                      const color = palette.shades[step];
                      const isTargetStep = step === targetStep;
                      return (
                        <button
                          key={step}
                          onClick={() => onApplyColor(color, `${palette.name} ${step}`)}
                          class={`h-8 rounded-md border transition-all hover:scale-110 ${
                            isTargetStep
                              ? 'border-white/70 ring-1 ring-white/30'
                              : 'border-[#262626] hover:border-[#525252]'
                          }`}
                          style={{ backgroundColor: formatOklch(color) }}
                          title={`${palette.name} ${step}: ${formatOklch(color)}`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Action footer */}
      <div class="border-t border-[#1f1f1f] bg-[#111111] p-2.5 flex-shrink-0 space-y-2">
        {/* Pickers */}
        <div class="grid grid-cols-2 gap-2">
          <button
            onClick={() => targetColor && onOpenInPicker(targetColor)}
            disabled={!targetColor}
            class="px-2.5 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#222222] border border-[#262626] hover:border-[#333333] text-[11px] font-mono text-[#f5f5f5] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Open the full color picker preloaded with this color"
          >
            <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="m2 22 1-4 12.5-12.5 3 3L6 21l-4 1Z" /><path d="m15 6 3-3 3 3-3 3" /><path d="M9 12 6.5 14.5" />
            </svg>
            <span class="truncate">Color Picker</span>
          </button>
          <button
            onClick={() => setTab('palettes')}
            class="px-2.5 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#222222] border border-[#262626] hover:border-[#333333] text-[11px] font-mono text-[#f5f5f5] transition-colors flex items-center justify-center gap-1.5"
            title="Choose a color from the palette library"
          >
            <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="13.5" cy="6.5" r="1.2" /><circle cx="17.5" cy="10.5" r="1.2" /><circle cx="8.5" cy="7.5" r="1.2" /><circle cx="6.5" cy="12.5" r="1.2" />
              <path d="M12 2a10 10 0 0 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-.9-.5-1.3-.3-.4-.5-.8-.5-1.3a2 2 0 0 1 2-2h2.1A4.9 4.9 0 0 0 22 10.4C21.4 5.6 17 2 12 2Z" />
            </svg>
            <span class="truncate">Palette</span>
          </button>
        </div>

        {/* Delete row */}
        {pendingDelete === 'shade' ? (
          <div class="rounded-lg border border-red-500/40 bg-red-500/10 p-2 space-y-2">
            <p class="text-[11px] font-mono text-red-300 leading-tight">
              Delete <span class="text-white">--color-{targetRoleId}-{targetStep}</span> from {targetRole?.name ?? targetRoleId}?
            </p>
            <div class="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setPendingDelete(null);
                  onClose();
                }}
                class="px-2 py-1.5 rounded-md bg-[#1a1a1a] border border-[#262626] text-[11px] font-mono text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setPendingDelete(null);
                  onDeleteShade();
                  onClose();
                }}
                class="px-2 py-1.5 rounded-md bg-red-500 text-[11px] font-mono font-semibold text-white hover:bg-red-400 transition-colors"
              >
                Delete color
              </button>
            </div>
          </div>
        ) : pendingDelete === 'scale' ? (
          <div class="rounded-lg border border-red-500/40 bg-red-500/10 p-2 space-y-2">
            <p class="text-[11px] font-mono text-red-300 leading-tight">
              Delete the full 50–950 scale of{' '}
              <span class="text-white">{targetRole?.name ?? targetRoleId}</span> ({scaleCount} color{scaleCount === 1 ? '' : 's'})?
            </p>
            <div class="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPendingDelete(null)}
                class="px-2 py-1.5 rounded-md bg-[#1a1a1a] border border-[#262626] text-[11px] font-mono text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setPendingDelete(null);
                  onDeleteFullScale();
                  onClose();
                }}
                class="px-2 py-1.5 rounded-md bg-red-500 text-[11px] font-mono font-semibold text-white hover:bg-red-400 transition-colors"
              >
                Delete scale
              </button>
            </div>
          </div>
        ) : (
          <div class="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPendingDelete('shade')}
              disabled={!targetToken}
              class="px-2.5 py-2 rounded-lg bg-[#1a1a1a] hover:bg-red-500/10 border border-[#262626] hover:border-red-500/40 text-[11px] font-mono text-[#a3a3a3] hover:text-red-300 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              title={`Remove only --color-${targetRoleId}-${targetStep}`}
            >
              <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              </svg>
              <span class="truncate">Delete color</span>
            </button>
            <button
              onClick={() => setPendingDelete('scale')}
              disabled={scaleCount === 0}
              class="px-2.5 py-2 rounded-lg bg-[#1a1a1a] hover:bg-red-500/10 border border-[#262626] hover:border-red-500/40 text-[11px] font-mono text-[#a3a3a3] hover:text-red-300 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              title={`Delete all ${scaleCount} colors of ${targetRole?.name ?? targetRoleId}`}
            >
              <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
                <path d="m19 5 .7 1.3L21 7l-1.3.7L19 9l-.7-1.3L17 7l1.3-.7Z" />
              </svg>
              <span class="truncate">Delete full scale</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}