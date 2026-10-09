import type { ComponentChildren } from 'preact';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  formatOklch,
  SHADE_STEPS,
  type ColorModel,
  type ShadeStep,
} from '../../utils/color';
import { PALETTES } from '../../data/palettes';
import { useCart } from '../../hooks/useCart';
import { t } from '../../i18n/translations';
import type { LocaleCode } from '../../i18n/config';
import { Paintbrush, Palette as PaletteIcon, Sparkles, Trash2, X } from 'lucide-preact';
import ColorSwatch from '../common/ColorSwatch';

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
  /**
   * Hand the token slot over to the full color picker page.
   * `color` is `null` when the slot is still empty, so the picker can author a
   * brand-new token for that exact variable instead of refusing to open.
   */
  onOpenInPicker: (color: ColorModel | null) => void;
  onClose: () => void;
  /** Locale for human-facing chrome. */
  locale?: LocaleCode;
}

type Tab = 'tokens' | 'palettes';
type PendingDelete = 'shade' | 'scale' | null;

/**
 * Anchored action popover shown when a colored element inside the dummy UI
 * preview is clicked (or right-clicked).
 *
 * Offers everything you can do with that token from one place:
 *  - copy a color from another role's scale ("Tokens" tab)
 *  - pick any library palette shade ("Palettes" tab)
 *  - hand the color off to the full color picker page
 *  - delete this single color, or delete the whole parent role scale
 *
 * It is a `.dock` rather than an elevated card: it floats over the canvases
 * being judged, so a translucent blurred panel keeps the colour underneath
 * readable instead of replacing it with an opaque slab.
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
  locale = 'en',
}: ColorActionPopoverProps) {
  const cart = useCart();
  /** Human-facing name for a role: the localized override, or its stored name. */
  const roleName = (role: { id: string; name: string } | undefined) =>
    role ? t(locale, `ui.roles.${role.id}`, role.name) : targetRoleId;
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

  /*
   * Close on outside click, Escape, resize, or a scroll from outside.
   *
   * WHY THE SCROLL LISTENER IS CAPTURED
   *
   * Because it has to be: a scroll event does not bubble, so a bubbling listener
   * on `document` would only ever hear the page scroll and miss every nested
   * scroller. Capturing it hears all of them — including, fatally, the popover's
   * own body. That body is a real scroller (nine palettes are ~1570px of swatches
   * in a ~420px box), so scrolling toward a palette fired the handler and
   * unmounted the panel mid-scroll, leaving `scrollTop` back at 0. Reaching
   * anything past the fold was impossible.
   *
   * Hence the one carve-out: a scroll whose target is inside the panel is the
   * user reading the panel, not the anchor sliding out from under it, so it is
   * ignored. Every other scroll still dismisses, because the popover is pinned to
   * a viewport coordinate taken from the click — scroll the page and that
   * coordinate no longer points at the element it acts on.
   */
  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onScroll = (e: Event) => {
      const panel = panelRef.current;
      if (panel && e.target instanceof Node && panel.contains(e.target)) return;
      onClose();
    };
    const onResize = () => onClose();

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    document.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('scroll', onScroll, true);
    };
  }, [onClose]);

  /** The header's colour chip — the one place the target's own colour appears. */
  const confirmRow = (label: string | ComponentChildren, run: () => void) => (
    <div class="rounded-md border border-hairline bg-canvas-sunken p-2 space-y-2">
      <p class="font-mono text-micro text-body leading-tight">{label}</p>
      <div class="grid grid-cols-2 gap-1.5">
        <button onClick={() => setPendingDelete(null)} class="btn btn-quiet h-8">
          {t(locale, 'ui.preview.popover.cancel', 'Cancel')}
        </button>
        <button
          onClick={() => {
            setPendingDelete(null);
            run();
            onClose();
          }}
          class="btn btn-danger h-8"
        >
          {t(locale, 'ui.preview.popover.delete', 'Delete')}
        </button>
      </div>
    </div>
  );

  return (
    <div
      ref={panelRef}
      class="fixed z-[9999] dock w-[340px] max-w-[calc(100vw-1.5rem)] overflow-hidden flex flex-col max-h-[min(78vh,620px)] animate-popover-in"
      style={{ left: `${pos.left}px`, top: `${pos.top}px` }}
      role="dialog"
      aria-label={t(
        locale,
        'ui.preview.popover.dialogAria',
        'Actions for {role} {step}'
      )
        .replace('{role}', roleName(targetRole))
        .replace('{step}', String(targetStep))}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header: what am I acting on? */}
      <div class="px-3 py-2.5 border-b border-hairline flex items-center gap-2.5 shrink-0">
        <ColorSwatch
          color={targetColor}
          fallbackCss="#262626"
          onClick={() => onOpenInPicker(targetColor)}
          class="w-7 h-7 rounded-md border border-hairline flex-shrink-0 hover:border-border-focus focus-visible:border-border-focus focus-visible:outline-none"
          title={
            targetColor
              ? t(
                  locale,
                  'ui.preview.popover.swatchEditTitle',
                  '{value} — click to edit in the color picker'
                ).replace('{value}', formatOklch(targetColor))
              : t(
                  locale,
                  'ui.preview.popover.swatchAuthorTitle',
                  'Click to author --color-{role}-{step}'
                )
                  .replace('{role}', targetRoleId)
                  .replace('{step}', String(targetStep))
          }
          ariaLabel={
            targetColor
              ? t(
                  locale,
                  'ui.preview.popover.editAria',
                  'Edit {role} {step} in the color picker'
                )
                  .replace('{role}', roleName(targetRole))
                  .replace('{step}', String(targetStep))
              : t(
                  locale,
                  'ui.preview.popover.createAria',
                  'Create {role} {step} in the color picker'
                )
                  .replace('{role}', roleName(targetRole))
                  .replace('{step}', String(targetStep))
          }
        />
        <div class="min-w-0 flex-1">
          <p class="text-label text-ink truncate">
            {roleName(targetRole)} · {targetStep}
          </p>
          <p class="font-mono text-micro text-mute truncate">
            {targetColor
              ? formatOklch(targetColor)
              : t(
                  locale,
                  'ui.preview.popover.notSet',
                  '--color-{role}-{step} · not set'
                )
                  .replace('{role}', targetRoleId)
                  .replace('{step}', String(targetStep))}
          </p>
        </div>
        <button
          onClick={onClose}
          class="icon-btn icon-btn-sm"
          aria-label={t(locale, 'ui.preview.popover.close', 'Close')}
        >
          <X class="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      {/* Tabs */}
      <div class="grid grid-cols-2 gap-1 p-1.5 border-b border-hairline shrink-0">
        {([
          ['tokens', t(locale, 'ui.preview.popover.tabCart', 'Cart')],
          ['palettes', t(locale, 'ui.preview.popover.tabPalettes', 'Palettes')],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            class={`chip border-0 justify-center ${
              tab === id ? 'bg-ink border-ink text-ink-inverse' : 'text-mute hover:text-body'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div class="flex-1 overflow-y-auto p-2.5 min-h-0">
        {tab === 'tokens' ? (
          rolesWithShades.length === 0 ? (
            <p class="prose-hud px-1 py-4 text-center">
              {t(locale, 'ui.preview.popover.emptyCart', 'No colors in your cart yet.')}
            </p>
          ) : (
            <div class="space-y-2">
              {rolesWithShades.map((role) => {
                const shades = SHADE_STEPS.filter((s) => role.shades[s]);
                return (
                  <div key={role.id}>
                    <p class="eyebrow block px-1 mb-1">{roleName(role)}</p>
                    <div class="grid grid-cols-6 gap-1">
                      {shades.map((step) => {
                        const token = role.shades[step]!;
                        const css = formatOklch(token.color);
                        const isTarget = role.id === targetRoleId && step === targetStep;
                        return (
                          <button
                            key={step}
                            onClick={() => onApplyColor(token.color, `${roleName(role)} ${step}`)}
                            aria-label={t(
                              locale,
                              'ui.preview.popover.applyAria',
                              'Apply {source} to --color-{role}-{step}'
                            )
                              .replace('{source}', `${roleName(role)} ${step}`)
                              .replace('{role}', targetRoleId)
                              .replace('{step}', String(targetStep))}
                            class={`h-8 rounded-md border transition-transform duration-150 hover:scale-110 ${
                              isTarget ? 'border-ink ring-1 ring-ink/50' : 'border-hairline hover:border-border-focus'
                            }`}
                            style={{ backgroundColor: css }}
                            title={t(
                              locale,
                              'ui.preview.popover.optionTitle',
                              '{source}: {value}'
                            )
                              .replace('{source}', `${roleName(role)} ${step}`)
                              .replace('{value}', css)}
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
          <div class="space-y-2">
            <input
              id="palette-filter"
              type="text"
              name="palette-filter"
              value={paletteQuery}
              aria-label={t(locale, 'ui.preview.popover.filterPalettesAria', 'Filter palettes')}
              onInput={(e) => setPaletteQuery((e.target as HTMLInputElement).value)}
              placeholder={t(
                locale,
                'ui.preview.popover.filterPalettesPlaceholder',
                'Filter palettes…'
              )}
              class="w-full px-2.5 py-1.5 rounded-md bg-canvas border border-hairline font-mono text-micro text-ink placeholder:text-faint focus:outline-none focus:border-border-focus transition-colors duration-150"
            />

            {filteredPalettes.length === 0 ? (
              <p class="prose-hud px-1 py-4 text-center">
                {t(
                  locale,
                  'ui.preview.popover.noMatch',
                  'No palettes match “{query}”.'
                ).replace('{query}', paletteQuery)}
              </p>
            ) : (
              filteredPalettes.map((palette) => (
                <div key={palette.id}>
                  <div class="flex items-center justify-between px-1 mb-1 gap-2">
                    <p class="eyebrow truncate">{palette.name}</p>
                    <span class="font-mono text-micro text-faint shrink-0">{palette.categoryLabel}</span>
                  </div>
                  <div class="grid grid-cols-6 gap-1">
                    {SHADE_STEPS.map((step) => {
                      const color = palette.shades[step];
                      const isTargetStep = step === targetStep;
                      return (
                        <button
                          key={step}
                          onClick={() => onApplyColor(color, `${palette.name} ${step}`)}
                          aria-label={t(
                            locale,
                            'ui.preview.popover.applyAria',
                            'Apply {source} to --color-{role}-{step}'
                          )
                            .replace('{source}', `${palette.name} ${step}`)
                            .replace('{role}', targetRoleId)
                            .replace('{step}', String(targetStep))}
                          class={`h-8 rounded-md border transition-transform duration-150 hover:scale-110 ${
                            isTargetStep ? 'border-ink ring-1 ring-ink/30' : 'border-hairline hover:border-border-focus'
                          }`}
                          style={{ backgroundColor: formatOklch(color) }}
                          title={t(
                            locale,
                            'ui.preview.popover.optionTitle',
                            '{source}: {value}'
                          )
                            .replace('{source}', `${palette.name} ${step}`)
                            .replace('{value}', formatOklch(color))}
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
      <div class="border-t border-hairline p-2.5 shrink-0 space-y-1.5">
        {/* Pickers */}
        <div class="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onOpenInPicker(targetColor)}
            class="btn btn-quiet h-8"
            title={
              targetColor
                ? t(
                    locale,
                    'ui.preview.popover.pickerPreloadedTitle',
                    'Open the full color picker preloaded with this color'
                  )
                : t(
                    locale,
                    'ui.preview.popover.pickerCreateTitle',
                    'Open the full color picker to create --color-{role}-{step}'
                  )
                    .replace('{role}', targetRoleId)
                    .replace('{step}', String(targetStep))
            }
          >
            <Paintbrush class="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span class="truncate">
              {targetColor
                ? t(locale, 'ui.preview.popover.picker', 'Picker')
                : t(locale, 'ui.preview.popover.newColor', 'New color')}
            </span>
          </button>
          <button
            onClick={() => setTab('palettes')}
            class="btn btn-quiet h-8"
            title={t(
              locale,
              'ui.preview.popover.choosePaletteTitle',
              'Choose a color from the palette library'
            )}
          >
            <PaletteIcon class="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span class="truncate">
              {t(locale, 'ui.preview.popover.tabPalettes', 'Palettes')}
            </span>
          </button>
        </div>

        {/* Delete row */}
        {pendingDelete === 'shade'
          ? confirmRow(
              <>
                {t(locale, 'ui.preview.popover.deleteShadePrefix', 'Delete')}{' '}
                <span class="text-ink">--color-{targetRoleId}-{targetStep}</span>
                {t(locale, 'ui.preview.popover.deleteShadeSuffix', '?')}
              </>,
              onDeleteShade
            )
          : pendingDelete === 'scale'
            ? confirmRow(
                <>
                  {t(
                    locale,
                    'ui.preview.popover.deleteScaleConfirmPrefix',
                    'Delete the full scale of'
                  )}{' '}
                  <span class="text-ink">{roleName(targetRole)}</span>{' '}
                  {t(
                    locale,
                    'ui.preview.popover.deleteScaleConfirmSuffix',
                    '({count} {color})?'
                  )
                    .replace('{count}', String(scaleCount))
                    .replace(
                      '{color}',
                      t(locale, 'ui.preview.common.colorPlural', 'colors')
                    )}
                </>,
                onDeleteFullScale
              )
            : (
              <div class="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setPendingDelete('shade')}
                  disabled={!targetToken}
                  class="btn btn-quiet h-8"
                  title={t(
                    locale,
                    'ui.preview.popover.removeShadeTitle',
                    'Remove only --color-{role}-{step}'
                  )
                    .replace('{role}', targetRoleId)
                    .replace('{step}', String(targetStep))}
                >
                  <Trash2 class="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  <span class="truncate">
                    {t(locale, 'ui.preview.popover.deleteColor', 'Delete color')}
                  </span>
                </button>
                <button
                  onClick={() => setPendingDelete('scale')}
                  disabled={scaleCount === 0}
                  class="btn btn-quiet h-8"
                  title={t(
                    locale,
                    'ui.preview.popover.deleteScaleTitle',
                    'Delete all {count} {color} of {role}'
                  )
                    .replace('{count}', String(scaleCount))
                    .replace(
                      '{color}',
                      t(locale, 'ui.preview.common.colorPlural', 'colors')
                    )
                    .replace('{role}', roleName(targetRole))}
                >
                  <Sparkles class="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  <span class="truncate">
                    {t(locale, 'ui.preview.popover.deleteScale', 'Delete scale')}
                  </span>
                </button>
              </div>
            )}
      </div>
    </div>
  );
}
