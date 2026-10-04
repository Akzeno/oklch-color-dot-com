import { useState, useMemo } from 'preact/hooks';
import {
  isCartOpenStore,
  showToast,
  savePickerHandoff,
  setRoleShade,
  removeShadeFromRole,
  clearRoleScale,
  type CartState,
} from '../../stores/cartStore';
import { useCart } from '../../hooks/useCart';
import {
  formatOklch,
  getWcagContrast,
  getApcaContrast,
  SHADE_STEPS,
  TARGET_LIGHTNESS,
  type ShadeStep,
  type ColorModel,
} from '../../utils/color';
import { goTo } from '../../utils/navigate';
import CartSidebar from './CartSidebar';
import ColorActionPopover from './ColorActionPopover';

/* ─────────────────────── Token resolution ─────────────────────── */

interface ResolvedToken {
  css: string;
  hex: string;
  color: ColorModel;
  /** The step actually used — differs from the requested one when substituted. */
  step: ShadeStep;
  /** True when the exact requested step was empty and another one was used. */
  substituted: boolean;
}

/**
 * Resolve one design token for the showcase.
 *
 * Returns `null` when the slot is genuinely empty. It never invents a colour:
 * the preview has to show the tokens the user actually owns, not a stock
 * Tailwind palette masquerading as their design system.
 *
 * When the exact step is missing we fall back deterministically — 500 first,
 * then the available shade whose target lightness is nearest — and flag it as
 * `substituted` so the UI can disclose it instead of quietly lying.
 */
function resolveToken(cart: CartState, roleId: string, step: ShadeStep): ResolvedToken | null {
  const role = cart.roles[roleId];
  if (!role) return null;

  const exact = role.shades[step];
  if (exact) {
    return { css: formatOklch(exact.color), hex: exact.color.hex, color: exact.color, step, substituted: false };
  }

  const available = SHADE_STEPS.filter((s) => role.shades[s]);
  if (available.length === 0) return null;

  const pick = available.includes(500)
    ? 500
    : available.reduce((best, s) =>
        Math.abs(TARGET_LIGHTNESS[s] - TARGET_LIGHTNESS[step]) <
        Math.abs(TARGET_LIGHTNESS[best] - TARGET_LIGHTNESS[step])
          ? s
          : best
      );

  const token = role.shades[pick]!;
  return {
    css: formatOklch(token.color),
    hex: token.color.hex,
    color: token.color,
    step: pick,
    substituted: true,
  };
}

/** Same token at a low alpha, for tinted alert backgrounds. */
function tokenTint(token: ResolvedToken | null, alpha: number) {
  if (!token) return 'transparent';
  return formatOklch({ ...token.color, alpha });
}

/**
 * Alert banner whose tint, border and dot all come from one role token.
 *
 * Both the light and dark tint are derived from the *same* `--color-<role>-500`
 * slot (just at different alphas). Deriving the light-mode fill from a separate
 * 100 slot meant clicking the alert updated the border while the background kept
 * the old colour — the token and its tint fighting each other.
 */
function TokenAlert({
  role,
  title,
  children,
  token,
  theme,
  textMain,
  textMuted,
}: {
  role: string;
  title: string;
  children: any;
  token: ResolvedToken | null;
  theme: 'dark' | 'light';
  textMain: string;
  textMuted: string;
}) {
  const unsetLine = theme === 'dark' ? '#525252' : '#d4d4d8';

  return (
    <div
      class={`p-3.5 rounded-xl border flex items-start gap-3 ${token ? '' : 'border-dashed'}`}
      style={{
        backgroundColor: tokenTint(token, theme === 'dark' ? 0.16 : 0.12),
        borderColor: token ? token.css : unsetLine,
      }}
      data-context-role={role}
      data-context-step="500"
      title={token ? `--color-${role}-500 · ${token.css}` : `Click to set --color-${role}-500`}
    >
      <div
        class="w-2 h-2 rounded-full mt-1 flex-shrink-0"
        style={
          token
            ? { backgroundColor: token.css }
            : { backgroundColor: 'transparent', border: `1px dashed ${unsetLine}` }
        }
      />
      <div>
        <span class="font-semibold block" style={{ color: token ? textMain : textMuted }}>
          {title}
        </span>
        <span style={{ color: textMuted }}>{children}</span>
      </div>
    </div>
  );
}

/* ─────────────────────── Contrast matrix row ─────────────────────── */

type GradeTone = 'pass' | 'warn' | 'info';

/**
 * One contrast row. When `ratio` is `null` the token isn't set, so the row says
 * "Token unset" instead of grading a placeholder colour — a confident-looking
 * "AA Pass" on a colour the user never picked is worse than no score at all.
 */
function ContrastRow({
  label,
  value,
  ratio,
  badge,
  tone,
  surface,
}: {
  label: string;
  value: string;
  ratio: number | null;
  badge: string | null;
  tone: GradeTone;
  surface: string;
}) {
  return (
    <div
      class="grid grid-cols-3 gap-2 items-center p-3 rounded-lg text-xs font-mono"
      style={{ backgroundColor: surface }}
    >
      <span class="truncate" title={label}>
        {label}
      </span>
      <span class="text-center font-bold" style={ratio === null ? { color: '#737373' } : undefined}>
        {value}
      </span>
      <span class="text-right">
        {badge === null ? (
          <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#262626] text-[#737373]">
            Token unset
          </span>
        ) : (
          <span
            class={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
              tone === 'pass'
                ? 'bg-emerald-500/15 text-emerald-400'
                : tone === 'info'
                  ? 'bg-sky-500/15 text-sky-400'
                  : 'bg-amber-500/15 text-amber-400'
            }`}
          >
            {badge}
          </span>
        )}
      </span>
    </div>
  );
}

/* ─────────────────────── PreviewFrame ─────────────────────── */
function PreviewFrame({
  label,
  hint,
  hintPass,
  canvasBg,
  borderCol,
  index,
  span = false,
  children,
}: {
  label: string;
  hint?: string;
  hintPass?: boolean;
  canvasBg: string;
  borderCol: string;
  index: number;
  /** Stretch across both columns once the frames grid goes two-up. */
  span?: boolean;
  children: any;
}) {
  return (
    <div
      class={`space-y-2.5 animate-frame-in ${span ? '@3xl:col-span-2' : ''}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Section Label */}
      <div class="flex items-center justify-between px-1 gap-3">
        <span class="text-[11px] font-mono font-semibold uppercase tracking-widest text-[#525252]">
          {label}
        </span>
        {hint && (
          <span
            class={`text-[11px] font-mono px-2 py-0.5 rounded-full whitespace-nowrap ${
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

  // Every token the showcase paints from. A `null` entry means "you have not
  // set this slot" and is rendered as an explicit unset state — never as a
  // placeholder colour, so the preview can't lie about your design system.
  //
  // Tints (alert backgrounds, pill fills) are derived from these same 500 slots
  // at a low alpha rather than from separate 100 slots, so clicking a token
  // updates everything painted from it at once.
  const primary = resolveToken(cart, 'primary', 500);
  const trustyBtn = resolveToken(cart, 'trusty-button', 500);
  const success = resolveToken(cart, 'success', 500);
  const danger = resolveToken(cart, 'danger', 500);
  const warning = resolveToken(cart, 'warning', 500);
  const info = resolveToken(cart, 'info', 500);

  /** "500" or "500 → 400" when a step had to be substituted. */
  const stepNote = (t: ResolvedToken | null, requested: ShadeStep) =>
    !t ? `${requested} unset` : t.substituted ? `${requested} → ${t.step}` : String(requested);

  // Surface & Text
  const canvasBg = previewTheme === 'dark' ? '#0f0f0f' : '#ffffff';
  const cardBg = previewTheme === 'dark' ? '#181818' : '#f9fafb';
  const textMain = previewTheme === 'dark' ? '#f5f5f5' : '#111827';
  const textMuted = previewTheme === 'dark' ? '#a3a3a3' : '#6b7280';
  const borderCol = previewTheme === 'dark' ? '#262626' : '#e5e7eb';

  // Contrast evaluations. `null` means the token isn't set — scoring a
  // placeholder colour here would report a confident, meaningless AA/AAA grade.
  const btnTextContrast = useMemo(
    () => (trustyBtn ? getWcagContrast('#ffffff', trustyBtn.hex) : null),
    [trustyBtn?.hex]
  );

  const alertContrast = useMemo(
    () => (danger ? getWcagContrast(danger.hex, canvasBg) : null),
    [danger?.hex, canvasBg]
  );

  const apcaDelta = useMemo(
    () => (primary ? getApcaContrast(primary.hex, canvasBg) : null),
    [primary?.hex, canvasBg]
  );

  // Action popover state (opened by left- or right-click on any colored element)
  const [popover, setPopover] = useState<{ x: number; y: number; roleId: string; step: ShadeStep } | null>(null);

  const openPopoverFromEvent = (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[data-context-role]') as HTMLElement | null;
    if (!target) return;
    e.preventDefault();
    const roleId = target.dataset.contextRole!;
    const step = Number(target.dataset.contextStep) || 500;
    setPopover({ x: e.clientX, y: e.clientY, roleId, step: step as ShadeStep });
  };

  // Left click opens the action popover; right click keeps the legacy behaviour
  const handlePreviewClick = (e: MouseEvent) => {
    if (e.button !== 0) return;
    openPopoverFromEvent(e);
  };

  const handlePreviewContextMenu = (e: MouseEvent) => {
    if (e.button !== 2) return;
    openPopoverFromEvent(e);
  };

  // Apply a picked color (from cart or palette library) to the clicked token
  const handleApplyColor = (color: ColorModel, sourceLabel: string) => {
    if (!popover) return;
    setRoleShade(popover.roleId, popover.step, color, { silent: true });
    showToast(`${sourceLabel} → --color-${popover.roleId}-${popover.step}`);
    setPopover(null);
  };

  // Delete only the clicked color token
  const handleDeleteShade = () => {
    if (!popover) return;
    removeShadeFromRole(popover.roleId, popover.step);
    showToast(`Removed --color-${popover.roleId}-${popover.step}`);
    setPopover(null);
  };

  // Delete every color of the parent role (its full 50–950 scale)
  const handleDeleteFullScale = () => {
    if (!popover) return;
    clearRoleScale(popover.roleId);
    setPopover(null);
  };

  // Hand the exact token slot over to the full color picker page. Works for an
  // unset slot too (`color: null`), which the picker treats as "author new".
  // `returnTo` brings the user back here after they save.
  const handleOpenInPicker = (color: ColorModel | null) => {
    if (!popover) return;
    savePickerHandoff({
      roleId: popover.roleId,
      step: popover.step,
      color,
      returnTo: window.location.pathname,
    });
    setPopover(null);
    goTo('/');
  };

  return (
    <div class="space-y-6 lg:space-y-8">
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
          cursor: pointer;
          position: relative;
        }
        [data-context-role]:hover {
          outline: 2px dashed rgba(255, 255, 255, 0.45);
          outline-offset: 2px;
        }
      `}</style>

      {/* ─────── Split Layout: Preview + Sidebar ─────── */}
      <div
        class="flex flex-col lg:flex-row gap-5 lg:gap-8 2xl:gap-10"
        onClick={handlePreviewClick}
        onContextMenu={handlePreviewContextMenu}
      >
        {/* Main Preview Area — container context for the frames grid below */}
        <div class="flex-1 min-w-0 space-y-6 @container">
          {/* ─────── Controls Bar ─────── */}
      <div class="flex items-center justify-between flex-wrap gap-3 bg-[#141414] border border-[#262626] p-4 rounded-xl">
        <div>
          <h2 class="text-sm font-semibold text-[#f5f5f5]">Component Showcase</h2>
          <p class="text-xs font-mono text-[#737373] mt-0.5">
            Each section below is an isolated canvas rendered with your active Cart roles.{' '}
            <span class="text-[#a3a3a3]">Click any colored element to swap it from your cart or a palette, open it in the picker, or delete it.</span>
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

      {/* ─────── Component Frames ───────
            Two columns are driven by the *width available to the preview
            column* (`@3xl` = 48rem), not the viewport. A viewport `2xl:`
            breakpoint fired at 1536px while the 240px nav rail left the preview
            only ~750px, splitting into two cramped ~366px cards. A container
            query also reacts when the rail collapses. */}
      <div class="grid grid-cols-1 @3xl:grid-cols-2 gap-5 @3xl:gap-6 items-start">

        {/* ── 1. Navigation Bar ── */}
        <PreviewFrame
          label="Navigation Bar"
          canvasBg={canvasBg}
          borderCol={borderCol}
          index={0}
          span
        >
          <div
            class="flex items-center justify-between p-4 rounded-xl border"
            style={{ backgroundColor: cardBg, borderColor: borderCol, color: textMain }}
          >
            <div class="flex items-center gap-3">
              <div
                class={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                  primary ? 'text-white shadow' : 'border border-dashed'
                }`}
                style={primary ? { backgroundColor: primary.css } : { borderColor: textMuted, color: textMuted }}
                data-context-role="primary"
                data-context-step="500"
                title={stepNote(primary, 500)}
              >
                U
              </div>
              <span class="font-semibold text-sm">Dashboard UI</span>
            </div>

            <div class="flex items-center gap-2">
              <button
                class={`px-3 py-1.5 rounded-lg text-xs font-medium transition-transform active:scale-95 ${
                  trustyBtn ? 'text-white shadow-sm' : 'border border-dashed'
                }`}
                style={
                  trustyBtn
                    ? { backgroundColor: trustyBtn.css }
                    : { borderColor: textMuted, color: textMuted }
                }
                data-context-role="trusty-button"
                data-context-step="500"
                title={stepNote(trustyBtn, 500)}
              >
                Primary Action
              </button>
            </div>
          </div>
        </PreviewFrame>

        {/* ── 2. Button Variants ── */}
        <PreviewFrame
          label="Button Variants"
          hint={
            btnTextContrast === null
              ? 'Set trusty-button-500 to score'
              : `Trusty btn contrast: ${btnTextContrast}:1 ${btnTextContrast >= 4.5 ? '· AA Pass' : '· Low'}`
          }
          hintPass={btnTextContrast === null ? undefined : btnTextContrast >= 4.5}
          canvasBg={canvasBg}
          borderCol={borderCol}
          index={1}
        >
          <div class="flex items-center gap-3 flex-wrap" style={{ color: textMain }}>
            <button
              class={`px-4 py-2 rounded-lg text-xs font-medium transition-all active:scale-95 ${
                trustyBtn ? 'text-white shadow hover:opacity-90' : 'border border-dashed'
              }`}
              style={
                trustyBtn
                  ? { backgroundColor: trustyBtn.css }
                  : { borderColor: textMuted, color: textMuted }
              }
              data-context-role="trusty-button"
              data-context-step="500"
              title={stepNote(trustyBtn, 500)}
            >
              Trusty Button (Solid)
            </button>

            <button
              class="px-4 py-2 rounded-lg text-xs font-medium border transition-all hover:bg-black/5 active:scale-95"
              style={
                trustyBtn
                  ? { borderColor: trustyBtn.css, color: trustyBtn.css }
                  : { borderStyle: 'dashed', borderColor: textMuted, color: textMuted }
              }
              data-context-role="trusty-button"
              data-context-step="500"
              title={stepNote(trustyBtn, 500)}
            >
              Trusty Outline
            </button>

            <button
              class={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                success ? 'text-white shadow hover:opacity-90' : 'border border-dashed'
              }`}
              style={
                success ? { backgroundColor: success.css } : { borderColor: textMuted, color: textMuted }
              }
              data-context-role="success"
              data-context-step="500"
              title={stepNote(success, 500)}
            >
              Confirm (Success)
            </button>

            <button
              class={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                danger ? 'text-white shadow hover:opacity-90' : 'border border-dashed'
              }`}
              style={danger ? { backgroundColor: danger.css } : { borderColor: textMuted, color: textMuted }}
              data-context-role="danger"
              data-context-step="500"
              title={stepNote(danger, 500)}
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
            <TokenAlert
              role="success"
              title="Operation Successful"
              token={success}
              theme={previewTheme}
              textMain={textMain}
              textMuted={textMuted}
            >
              Your tokens were safely synthesized and added to the design catalog.
            </TokenAlert>

            <TokenAlert
              role="danger"
              title="Destructive Warning"
              token={danger}
              theme={previewTheme}
              textMain={textMain}
              textMuted={textMuted}
            >
              This action will permanently purge the selected cache buffer.
            </TokenAlert>

            <TokenAlert
              role="warning"
              title="Attention Required"
              token={warning}
              theme={previewTheme}
              textMain={textMain}
              textMuted={textMuted}
            >
              Lightness step is approaching Display-P3 wide gamut limits.
            </TokenAlert>

            <TokenAlert
              role="info"
              title="System Telemetry"
              token={info}
              theme={previewTheme}
              textMain={textMain}
              textMuted={textMuted}
            >
              Tailwind v4 @theme export is active and live-updating.
            </TokenAlert>
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
                class={`px-2 py-0.5 rounded-full text-[11px] font-mono font-medium ${
                  primary ? 'text-white' : 'border border-dashed text-[#737373]'
                }`}
                style={primary ? { backgroundColor: primary.css } : { borderColor: '#525252' }}
                data-context-role="primary"
                data-context-step="500"
                title={stepNote(primary, 500)}
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
                class={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                  primary ? '' : 'border border-dashed opacity-60'
                }`}
                style={
                  primary
                    ? { backgroundColor: tokenTint(primary, 0.2), color: primary.css }
                    : { borderColor: '#525252', color: textMuted }
                }
                data-context-role="primary"
                data-context-step="500"
                title={stepNote(primary, 500)}
              >
                v4.0.0
              </span>
              <span
                class={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                  success ? '' : 'border border-dashed opacity-60'
                }`}
                style={
                  success
                    ? { backgroundColor: tokenTint(success, 0.2), color: success.css }
                    : { borderColor: '#525252', color: textMuted }
                }
                data-context-role="success"
                data-context-step="500"
                title={stepNote(success, 500)}
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

            <ContrastRow
              label="Trusty Button · White text"
              ratio={btnTextContrast}
              value={btnTextContrast === null ? '—' : `${btnTextContrast}:1`}
              badge={
                btnTextContrast === null
                  ? null
                  : btnTextContrast >= 7
                    ? 'AAA'
                    : btnTextContrast >= 4.5
                      ? 'AA'
                      : 'Fail'
              }
              tone={btnTextContrast !== null && btnTextContrast >= 4.5 ? 'pass' : 'warn'}
              surface={previewTheme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}
            />

            <ContrastRow
              label="Danger · Surface canvas"
              ratio={alertContrast}
              value={alertContrast === null ? '—' : `${alertContrast}:1`}
              badge={
                alertContrast === null
                  ? null
                  : alertContrast >= 7
                    ? 'AAA'
                    : alertContrast >= 4.5
                      ? 'AA'
                      : 'Fail'
              }
              tone={alertContrast !== null && alertContrast >= 4.5 ? 'pass' : 'warn'}
              surface={previewTheme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}
            />

            <ContrastRow
              label="Primary · Surface (APCA)"
              ratio={apcaDelta}
              value={apcaDelta === null ? '—' : `${apcaDelta} Lc`}
              badge={apcaDelta === null ? null : 'Perceptual'}
              tone="info"
              surface={previewTheme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}
            />
          </div>
        </PreviewFrame>

      </div>
        </div>

        {/* Sidebar - Cart Colors */}
        <CartSidebar />
      </div>

      {/* Action popover shown when a colored element is clicked / right-clicked */}
      {popover && (
        <ColorActionPopover
          x={popover.x}
          y={popover.y}
          targetRoleId={popover.roleId}
          targetStep={popover.step}
          onApplyColor={handleApplyColor}
          onDeleteShade={handleDeleteShade}
          onDeleteFullScale={handleDeleteFullScale}
          onOpenInPicker={handleOpenInPicker}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  );
}
