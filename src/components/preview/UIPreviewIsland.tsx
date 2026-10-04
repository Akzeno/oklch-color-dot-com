import { useState, useMemo } from 'preact/hooks';
import {
  cartStore,
  isCartOpenStore,
  generateFullScaleForRole,
  showToast,
  type ColorRole,
} from '../../stores/cartStore';
import { useCart } from '../../hooks/useCart';
import { formatOklch, getWcagContrast, getApcaContrast, createOklchColor, type ShadeStep } from '../../utils/color';
import CartSidebar from './CartSidebar';
import ContextMenu from './ContextMenu';

/* ─────────────────────── PreviewFrame ─────────────────────── */
function PreviewFrame({
  label,
  hint,
  hintPass,
  canvasBg,
  borderCol,
  index,
  children,
}: {
  label: string;
  hint?: string;
  hintPass?: boolean;
  canvasBg: string;
  borderCol: string;
  index: number;
  children: any;
}) {
  return (
    <div
      class="space-y-2.5 animate-frame-in"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Section Label */}
      <div class="flex items-center justify-between px-1">
        <span class="text-[11px] font-mono font-semibold uppercase tracking-widest text-[#525252]">
          {label}
        </span>
        {hint && (
          <span
            class={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
              hintPass === true
                ? 'bg-emerald-500/10 text-emerald-400'
                : hintPass === false
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'text-[#404040]'
            }`}
          >
            {hint}
          </span>
        )}
      </div>

      {/* Canvas */}
      <div
        class="rounded-2xl border p-5 md:p-6 transition-colors duration-200 shadow-lg shadow-black/20"
        style={{ backgroundColor: canvasBg, borderColor: borderCol }}
      >
        {children}
      </div>
    </div>
  );
}

/* ─────────────────────── Main Island ──────────────────────── */
export default function UIPreviewIsland() {
  const cart = useCart();
  const [previewTheme, setPreviewTheme] = useState<'dark' | 'light'>('dark');

  // Helper to extract CSS color for a role & step, falling back gracefully
  const getRoleColorCss = (roleId: string, preferredStep: number = 500, fallbackHex: string = '#3b82f6'): { css: string; hex: string } => {
    const role = cart.roles[roleId];
    if (role && role.shades[preferredStep as ShadeStep]) {
      const col = role.shades[preferredStep as ShadeStep]!.color;
      return { css: formatOklch(col), hex: col.hex };
    }
    // Try any available shade in that role
    if (role) {
      const keys = Object.keys(role.shades);
      if (keys.length > 0) {
        const first = role.shades[Number(keys[0]) as ShadeStep]!.color;
        return { css: formatOklch(first), hex: first.hex };
      }
    }
    return { css: fallbackHex, hex: fallbackHex };
  };

  const primary = getRoleColorCss('primary', 500, '#3b82f6');
  const primaryLight = getRoleColorCss('primary', 100, '#dbeafe');
  const trustyBtn = getRoleColorCss('trusty-button', 500, '#2563eb');
  const success = getRoleColorCss('success', 500, '#10b981');
  const successBg = getRoleColorCss('success', 100, '#d1fae5');
  const danger = getRoleColorCss('danger', 500, '#ef4444');
  const dangerBg = getRoleColorCss('danger', 100, '#fee2e2');
  const warning = getRoleColorCss('warning', 500, '#f59e0b');
  const warningBg = getRoleColorCss('warning', 100, '#fef3c7');
  const info = getRoleColorCss('info', 500, '#06b6d4');
  const infoBg = getRoleColorCss('info', 100, '#cffafe');

  // Surface & Text
  const canvasBg = previewTheme === 'dark' ? '#0f0f0f' : '#ffffff';
  const cardBg = previewTheme === 'dark' ? '#181818' : '#f9fafb';
  const textMain = previewTheme === 'dark' ? '#f5f5f5' : '#111827';
  const textMuted = previewTheme === 'dark' ? '#a3a3a3' : '#6b7280';
  const borderCol = previewTheme === 'dark' ? '#262626' : '#e5e7eb';

  // Contrast evaluations
  const btnTextContrast = useMemo(() => {
    return getWcagContrast('#ffffff', trustyBtn.hex);
  }, [trustyBtn.hex]);

  const alertContrast = useMemo(() => {
    return getWcagContrast(danger.hex, canvasBg);
  }, [danger.hex, canvasBg]);

  const apcaDelta = useMemo(() => {
    return getApcaContrast(primary.hex, canvasBg);
  }, [primary.hex, canvasBg]);

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; roleId: string; step: ShadeStep } | null>(null);

  const handleContextMenu = (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[data-context-role]') as HTMLElement | null;
    if (!target) return;
    e.preventDefault();
    const roleId = target.dataset.contextRole!;
    const step = Number(target.dataset.contextStep) || 500;
    setCtxMenu({ x: e.clientX, y: e.clientY, roleId, step: step as ShadeStep });
  };

  const handleCtxColorSelect = (sourceRoleId: string, sourceStep: ShadeStep) => {
    if (!ctxMenu) return;
    const current = cartStore.get();
    const sourceRole = current.roles[sourceRoleId];
    if (!sourceRole?.shades[sourceStep]) return;
    const color = sourceRole.shades[sourceStep]!.color;
    const targetRole = current.roles[ctxMenu.roleId];
    if (!targetRole) return;

    const updatedShades = {
      ...targetRole.shades,
      [ctxMenu.step]: {
        id: `${ctxMenu.roleId}-${ctxMenu.step}-${Date.now()}`,
        step: ctxMenu.step,
        color,
      },
    };

    const newState = {
      ...current,
      roles: {
        ...current.roles,
        [ctxMenu.roleId]: {
          ...targetRole,
          shades: updatedShades,
        },
      },
    };

    cartStore.set(newState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('oklch_cart_v1', JSON.stringify(newState));
    }

    showToast(`Applied ${sourceRole.name} ${sourceStep} → ${targetRole.name} ${ctxMenu.step}`);
    setCtxMenu(null);
  };

  return (
    <div class="space-y-6">
      {/* ── Inline keyframes (scoped to this island) ── */}
      <style>{`
        @keyframes frameIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-frame-in {
          animation: frameIn 0.35s ease-out both;
        }
        [data-context-role] {
          cursor: context-menu;
          position: relative;
        }
        [data-context-role]:hover {
          outline: 2px dashed rgba(255, 255, 255, 0.3);
          outline-offset: 2px;
        }
      `}</style>

      {/* ─────── Split Layout: Preview + Sidebar ─────── */}
      <div class="flex flex-col lg:flex-row gap-6" onContextMenu={handleContextMenu}>
        {/* Main Preview Area */}
        <div class="flex-1 min-w-0 space-y-6">
          {/* ─────── Controls Bar ─────── */}
      <div class="flex items-center justify-between flex-wrap gap-3 bg-[#141414] border border-[#262626] p-4 rounded-xl">
        <div>
          <h2 class="text-sm font-semibold text-[#f5f5f5]">Component Showcase</h2>
          <p class="text-xs font-mono text-[#737373] mt-0.5">
            Each section below is an isolated canvas rendered with your active Cart roles.{' '}
            <span class="text-[#a3a3a3]">Right-click any element to change its color.</span>
          </p>
        </div>

        <div class="flex items-center gap-2">
          {/* Light / Dark Mode Toggle for the Preview Canvas */}
          <div class="flex items-center bg-[#171717] border border-[#262626] rounded-lg p-1 text-xs font-mono">
            <button
              onClick={() => setPreviewTheme('dark')}
              class={`px-2.5 py-1 rounded transition-colors ${
                previewTheme === 'dark' ? 'bg-[#262626] text-white font-medium' : 'text-[#737373] hover:text-[#f5f5f5]'
              }`}
            >
              Dark Surface
            </button>
            <button
              onClick={() => setPreviewTheme('light')}
              class={`px-2.5 py-1 rounded transition-colors ${
                previewTheme === 'light' ? 'bg-[#f5f5f5] text-black font-medium' : 'text-[#737373] hover:text-[#f5f5f5]'
              }`}
            >
              Light Surface
            </button>
          </div>

          <button
            onClick={() => isCartOpenStore.set(true)}
            class="touch-target px-3 py-1.5 rounded-lg bg-[#1f1f1f] hover:bg-[#262626] border border-[#262626] text-xs font-mono text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors"
          >
            Manage Roles
          </button>
        </div>
      </div>

      {/* ─────── Component Frames ─────── */}
      <div class="space-y-8">

        {/* ── 1. Navigation Bar ── */}
        <PreviewFrame
          label="Navigation Bar"
          canvasBg={canvasBg}
          borderCol={borderCol}
          index={0}
        >
          <div
            class="flex items-center justify-between p-4 rounded-xl border"
            style={{ backgroundColor: cardBg, borderColor: borderCol, color: textMain }}
          >
            <div class="flex items-center gap-3">
              <div
                class="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow"
                style={{ backgroundColor: primary.css }}
                data-context-role="primary"
                data-context-step="500"
              >
                U
              </div>
              <span class="font-semibold text-sm">Dashboard UI</span>
            </div>

            <div class="flex items-center gap-2">
              <button
                class="px-3 py-1.5 rounded-lg text-xs font-medium text-white shadow-sm transition-transform active:scale-95"
                style={{ backgroundColor: trustyBtn.css }}
                data-context-role="trusty-button"
                data-context-step="500"
              >
                Primary Action
              </button>
            </div>
          </div>
        </PreviewFrame>

        {/* ── 2. Button Variants ── */}
        <PreviewFrame
          label="Button Variants"
          hint={`Trusty btn contrast: ${btnTextContrast}:1 ${btnTextContrast >= 4.5 ? '· AA Pass' : '· Low'}`}
          hintPass={btnTextContrast >= 4.5}
          canvasBg={canvasBg}
          borderCol={borderCol}
          index={1}
        >
          <div class="flex items-center gap-3 flex-wrap" style={{ color: textMain }}>
            <button
              class="px-4 py-2 rounded-lg text-xs font-medium text-white shadow transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: trustyBtn.css }}
              data-context-role="trusty-button"
              data-context-step="500"
            >
              Trusty Button (Solid)
            </button>

            <button
              class="px-4 py-2 rounded-lg text-xs font-medium border transition-all hover:bg-black/5 active:scale-95"
              style={{ borderColor: trustyBtn.css, color: trustyBtn.css }}
              data-context-role="trusty-button"
              data-context-step="500"
            >
              Trusty Outline
            </button>

            <button
              class="px-4 py-2 rounded-lg text-xs font-medium text-white shadow transition-all hover:opacity-90"
              style={{ backgroundColor: success.css }}
              data-context-role="success"
              data-context-step="500"
            >
              Confirm (Success)
            </button>

            <button
              class="px-4 py-2 rounded-lg text-xs font-medium text-white shadow transition-all hover:opacity-90"
              style={{ backgroundColor: danger.css }}
              data-context-role="danger"
              data-context-step="500"
            >
              Delete (Danger)
            </button>

            <button
              disabled
              class="px-4 py-2 rounded-lg text-xs font-medium opacity-40 cursor-not-allowed border"
              style={{ borderColor: borderCol, color: textMuted }}
            >
              Disabled Action
            </button>
          </div>
        </PreviewFrame>

        {/* ── 3. Alert Banners ── */}
        <PreviewFrame
          label="Alert Banners"
          canvasBg={canvasBg}
          borderCol={borderCol}
          index={2}
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs" style={{ color: textMain }}>
            {/* Success Alert */}
            <div
              class="p-3.5 rounded-xl border flex items-start gap-3"
              style={{
                backgroundColor: previewTheme === 'dark' ? 'rgba(16, 185, 129, 0.1)' : successBg.hex,
                borderColor: success.css,
              }}
              data-context-role="success"
              data-context-step="500"
            >
              <div class="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: success.css }} />
              <div>
                <span class="font-semibold block">Operation Successful</span>
                <span style={{ color: textMuted }}>
                  Your tokens were safely synthesized and added to the design catalog.
                </span>
              </div>
            </div>

            {/* Danger Alert */}
            <div
              class="p-3.5 rounded-xl border flex items-start gap-3"
              style={{
                backgroundColor: previewTheme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : dangerBg.hex,
                borderColor: danger.css,
              }}
              data-context-role="danger"
              data-context-step="500"
            >
              <div class="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: danger.css }} />
              <div>
                <span class="font-semibold block">Destructive Warning</span>
                <span style={{ color: textMuted }}>
                  This action will permanently purge the selected cache buffer.
                </span>
              </div>
            </div>

            {/* Warning Alert */}
            <div
              class="p-3.5 rounded-xl border flex items-start gap-3"
              style={{
                backgroundColor: previewTheme === 'dark' ? 'rgba(245, 158, 11, 0.1)' : warningBg.hex,
                borderColor: warning.css,
              }}
              data-context-role="warning"
              data-context-step="500"
            >
              <div class="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: warning.css }} />
              <div>
                <span class="font-semibold block">Attention Required</span>
                <span style={{ color: textMuted }}>
                  Lightness step is approaching Display-P3 wide gamut limits.
                </span>
              </div>
            </div>

            {/* Info Alert */}
            <div
              class="p-3.5 rounded-xl border flex items-start gap-3"
              style={{
                backgroundColor: previewTheme === 'dark' ? 'rgba(6, 182, 212, 0.1)' : infoBg.hex,
                borderColor: info.css,
              }}
              data-context-role="info"
              data-context-step="500"
            >
              <div class="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: info.css }} />
              <div>
                <span class="font-semibold block">System Telemetry</span>
                <span style={{ color: textMuted }}>
                  Tailwind v4 @theme export is active and live-updating.
                </span>
              </div>
            </div>
          </div>
        </PreviewFrame>

        {/* ── 4. Card & Form Elements ── */}
        <PreviewFrame
          label="Card & Form Elements"
          canvasBg={canvasBg}
          borderCol={borderCol}
          index={3}
        >
          <div
            class="p-5 rounded-xl border space-y-4 shadow-sm"
            style={{ backgroundColor: cardBg, borderColor: borderCol, color: textMain }}
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold">Project Settings</span>
              <span
                class="px-2 py-0.5 rounded-full text-[11px] font-mono text-white font-medium"
                style={{ backgroundColor: primary.css }}
                data-context-role="primary"
                data-context-step="500"
              >
                Active
              </span>
            </div>

            <div class="space-y-2">
              <label class="text-xs font-mono block" style={{ color: textMuted }}>
                Design Token Namespace
              </label>
              <input
                type="text"
                value="--color-trusty-button-500"
                readOnly
                class="w-full px-3 py-2 rounded-lg text-xs font-mono border focus:outline-none"
                style={{
                  backgroundColor: previewTheme === 'dark' ? '#121212' : '#ffffff',
                  borderColor: borderCol,
                  color: textMain,
                }}
              />
            </div>

            <div class="flex items-center gap-2 pt-2">
              <span class="text-xs font-mono" style={{ color: textMuted }}>
                Pill Badges:
              </span>
              <span
                class="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold"
                style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: primary.css }}
                data-context-role="primary"
                data-context-step="500"
              >
                v4.0.0
              </span>
              <span
                class="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold"
                style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: success.css }}
                data-context-role="success"
                data-context-step="500"
              >
                Production
              </span>
            </div>
          </div>
        </PreviewFrame>

        {/* ── 5. Accessibility Contrast Matrix ── */}
        <PreviewFrame
          label="Accessibility Contrast Matrix"
          hint="WCAG 2.1 + APCA"
          canvasBg={canvasBg}
          borderCol={borderCol}
          index={4}
        >
          <div class="space-y-2" style={{ color: textMain }}>
            {/* Table header */}
            <div
              class="grid grid-cols-3 gap-2 text-[10px] font-mono uppercase tracking-wider px-3 pb-1"
              style={{ color: textMuted }}
            >
              <span>Pair</span>
              <span class="text-center">Ratio</span>
              <span class="text-right">Result</span>
            </div>

            {/* Row 1: Trusty Button vs White */}
            <div
              class="grid grid-cols-3 gap-2 items-center p-3 rounded-lg text-xs font-mono"
              style={{ backgroundColor: previewTheme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
            >
              <span>Trusty Button · White text</span>
              <span class="text-center font-bold">{btnTextContrast}:1</span>
              <span class="text-right">
                <span
                  class={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    btnTextContrast >= 4.5
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-amber-500/15 text-amber-400'
                  }`}
                >
                  {btnTextContrast >= 7 ? 'AAA' : btnTextContrast >= 4.5 ? 'AA' : 'Fail'}
                </span>
              </span>
            </div>

            {/* Row 2: Danger vs Surface */}
            <div
              class="grid grid-cols-3 gap-2 items-center p-3 rounded-lg text-xs font-mono"
              style={{ backgroundColor: previewTheme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
            >
              <span>Danger · Surface canvas</span>
              <span class="text-center font-bold">{alertContrast}:1</span>
              <span class="text-right">
                <span
                  class={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    alertContrast >= 4.5
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-amber-500/15 text-amber-400'
                  }`}
                >
                  {alertContrast >= 7 ? 'AAA' : alertContrast >= 4.5 ? 'AA' : 'Fail'}
                </span>
              </span>
            </div>

            {/* Row 3: APCA Delta */}
            <div
              class="grid grid-cols-3 gap-2 items-center p-3 rounded-lg text-xs font-mono"
              style={{ backgroundColor: previewTheme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
            >
              <span>Primary · Surface (APCA)</span>
              <span class="text-center font-bold text-emerald-400">{apcaDelta} Lc</span>
              <span class="text-right">
                <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-400">
                  Perceptual
                </span>
              </span>
            </div>
          </div>
        </PreviewFrame>

      </div>
        </div>

        {/* Sidebar - Cart Colors */}
        <CartSidebar />
      </div>

      {/* Context Menu for right-click color changing */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          targetRoleId={ctxMenu.roleId}
          targetStep={ctxMenu.step}
          onSelect={handleCtxColorSelect}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  );
}
