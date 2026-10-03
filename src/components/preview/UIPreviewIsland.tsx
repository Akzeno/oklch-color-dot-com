import { useState, useMemo } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import {
  cartStore,
  isCartOpenStore,
  generateFullScaleForRole,
  type ColorRole,
} from '../../stores/cartStore';
import { formatOklch, getWcagContrast, getApcaContrast, createOklchColor } from '../../utils/color';

export default function UIPreviewIsland() {
  const cart = useStore(cartStore);
  const [previewTheme, setPreviewTheme] = useState<'dark' | 'light'>('dark');

  // Helper to extract CSS color for a role & step, falling back gracefully
  const getRoleColorCss = (roleId: string, preferredStep: number = 500, fallbackHex: string = '#3b82f6'): { css: string; hex: string } => {
    const role = cart.roles[roleId];
    if (role && role.shades[preferredStep as any]) {
      const col = role.shades[preferredStep as any]!.color;
      return { css: formatOklch(col), hex: col.hex };
    }
    // Try any available shade in that role
    if (role) {
      const keys = Object.keys(role.shades);
      if (keys.length > 0) {
        const first = role.shades[Number(keys[0]) as any]!.color;
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

  return (
    <div class="space-y-6">
      {/* Controls Bar */}
      <div class="flex items-center justify-between flex-wrap gap-3 bg-[#141414] border border-[#262626] p-4 rounded-xl">
        <div>
          <h2 class="text-sm font-semibold text-[#f5f5f5]">Live Dummy UI Workbench</h2>
          <p class="text-xs font-mono text-[#737373] mt-0.5">
            Components rendered dynamically using your active Cart roles (--color-&#123;role&#125;-*).
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

      {/* Interactive Mockup Container */}
      <div
        class="border rounded-2xl p-6 md:p-8 space-y-8 shadow-2xl transition-colors duration-200"
        style={{ backgroundColor: canvasBg, borderColor: borderCol, color: textMain }}
      >
        {/* Mock Navigation Bar */}
        <div
          class="flex items-center justify-between p-4 rounded-xl border"
          style={{ backgroundColor: cardBg, borderColor: borderCol }}
        >
          <div class="flex items-center gap-3">
            <div
              class="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow"
              style={{ backgroundColor: primary.css }}
            >
              U
            </div>
            <span class="font-semibold text-sm">Dashboard UI</span>
          </div>

          <div class="flex items-center gap-2">
            <button
              class="px-3 py-1.5 rounded-lg text-xs font-medium text-white shadow-sm transition-transform active:scale-95"
              style={{ backgroundColor: trustyBtn.css }}
            >
              Primary Action
            </button>
          </div>
        </div>

        {/* Buttons Suite & Contrast Check */}
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-mono font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
              Button Variants & WCAG Contrast
            </span>
            <div class="text-xs font-mono flex items-center gap-2">
              <span>Trusty Button Contrast:</span>
              <span
                class={`px-2 py-0.5 rounded font-bold ${
                  btnTextContrast >= 4.5 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {btnTextContrast}:1 ({btnTextContrast >= 4.5 ? 'AA Pass' : 'Low Contrast'})
              </span>
            </div>
          </div>

          <div class="flex items-center gap-3 flex-wrap">
            <button
              class="px-4 py-2 rounded-lg text-xs font-medium text-white shadow transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: trustyBtn.css }}
            >
              Trusty Button (Solid)
            </button>

            <button
              class="px-4 py-2 rounded-lg text-xs font-medium border transition-all hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
              style={{ borderColor: trustyBtn.css, color: trustyBtn.css }}
            >
              Trusty Outline
            </button>

            <button
              class="px-4 py-2 rounded-lg text-xs font-medium text-white shadow transition-all hover:opacity-90"
              style={{ backgroundColor: success.css }}
            >
              Confirm (Success)
            </button>

            <button
              class="px-4 py-2 rounded-lg text-xs font-medium text-white shadow transition-all hover:opacity-90"
              style={{ backgroundColor: danger.css }}
            >
              Delete (Danger)
            </button>

            <button
              disabled
              class="px-4 py-2 rounded-lg text-xs font-medium opacity-40 cursor-not-allowed border"
              style={{ borderColor: borderCol }}
            >
              Disabled Action
            </button>
          </div>
        </div>

        {/* Alerts Matrix */}
        <div class="space-y-3">
          <span class="text-xs font-mono font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
            Role Alert Banners
          </span>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Success Alert */}
            <div
              class="p-3.5 rounded-xl border flex items-start gap-3"
              style={{
                backgroundColor: previewTheme === 'dark' ? 'rgba(16, 185, 129, 0.1)' : successBg.hex,
                borderColor: success.css,
              }}
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
        </div>

        {/* Form Inputs & Badges */}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Mockup */}
          <div
            class="p-5 rounded-xl border space-y-4 shadow-sm"
            style={{ backgroundColor: cardBg, borderColor: borderCol }}
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold">Project Settings</span>
              <span
                class="px-2 py-0.5 rounded-full text-[11px] font-mono text-white font-medium"
                style={{ backgroundColor: primary.css }}
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
              >
                v4.0.0
              </span>
              <span
                class="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold"
                style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: success.css }}
              >
                Production
              </span>
            </div>
          </div>

          {/* Contrast Matrix */}
          <div
            class="p-5 rounded-xl border space-y-3"
            style={{ backgroundColor: cardBg, borderColor: borderCol }}
          >
            <span class="text-xs font-mono font-semibold uppercase tracking-wider block" style={{ color: textMuted }}>
              Accessibility & Contrast Matrix (WCAG 2.1)
            </span>

            <div class="space-y-2 text-xs font-mono">
              <div class="flex items-center justify-between p-2 rounded bg-black/5 dark:bg-white/5">
                <span>Trusty Button vs White text:</span>
                <span class="font-bold">{btnTextContrast}:1</span>
              </div>
              <div class="flex items-center justify-between p-2 rounded bg-black/5 dark:bg-white/5">
                <span>Danger vs Surface Canvas:</span>
                <span class="font-bold">{alertContrast}:1</span>
              </div>
              <div class="flex items-center justify-between p-2 rounded bg-black/5 dark:bg-white/5">
                <span>APCA Delta (Estimated):</span>
                <span class="font-bold text-emerald-400">
                  {getApcaContrast(primary.hex, canvasBg)} Lc
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
