import { useMemo, useState } from 'preact/hooks';
import { Check, Copy, Download, Plus } from 'lucide-preact';
import type { LocaleCode } from '../../i18n/config';
import { t } from '../../i18n/translations';
import { formatOklch, SHADE_STEPS, type ColorModel, type ShadeStep } from '../../utils/color';
import { ensureRole, setRoleShade, showToast, slugifyRoleName } from '../../stores/cartStore';
import { useCart } from '../../hooks/useCart';

interface PaletteDetailIslandProps {
  shades: Record<ShadeStep, ColorModel>;
  paletteName: string;
  paletteSlug: string;
  locale?: LocaleCode;
}

/**
 * The palette's own page: the scale as a grid of large colour cards.
 *
 * WHY A GRID AND NOT A STRIP
 *
 * The library cards and this page used to share one 48px strip, which made the
 * strip the only thing between the two pages. At that size a swatch could only
 * carry a click, so a card had to *guess* what the click meant — the library page
 * silently copied to the clipboard and filed into the cart, and the detail page
 * repeated the same guess. A card this size has room for the two actions to be
 * separate, labelled buttons, so "copy this value" and "put this in my cart"
 * stop competing for the same gesture.
 *
 * WHAT A CLICK DOES HERE
 *
 * The card body is the quick copy target — the one gesture that needs no choice
 * of destination, since a clipboard write needs no configuration. The action row
 * on hover holds the explicit pair: Copy, and Cart. Cart writes to whatever
 * `--color-<name>-*` the Variable field says, defaulting to the palette's own
 * slug, because "save this palette as `--color-gray-*`" is the overwhelmingly
 * common intent on a palette page.
 */
export default function PaletteDetailIsland({
  shades,
  paletteName,
  paletteSlug,
  locale = 'en',
}: PaletteDetailIslandProps) {
  const cart = useCart();
  const [copied, setCopied] = useState(false);
  const [varNameInput, setVarNameInput] = useState(paletteSlug);

  /**
   * The destination variable, held as the typed name rather than a selected role
   * id — same reason as the generator: a `<select>` can only offer roles that
   * already exist, and `--color-<palette>-*` usually does not exist yet.
   */
  const targetSlug = useMemo(() => {
    const trimmed = varNameInput.trim();
    if (!/^[a-z0-9]/i.test(trimmed)) return cart.activeRoleId;
    return slugifyRoleName(trimmed);
  }, [varNameInput, cart.activeRoleId]);

  const suggestionId = `palette-detail-roles-${paletteSlug}`;

  const copyValue = (color: ColorModel) => {
    const value = formatOklch(color);
    navigator.clipboard.writeText(value);
    showToast(t(locale, 'ui.paletteDetail.copiedValue', 'Copied {value}').replace('{value}', value));
  };

  /**
   * File one colour into the typed variable.
   *
   * `setRoleShade` writes the step the user actually clicked, so shade 50 stays
   * `--color-<name>-50` instead of being re-slotted by lightness like a colour
   * picked out of thin air. `ensureRole` is silenced because the toast below
   * already reports where the colour landed; the role-creation toast would
   * supersede it with a less useful message.
   */
  const addToCart = (color: ColorModel, step: ShadeStep) => {
    const roleId = ensureRole(varNameInput, { silent: true }) ?? cart.activeRoleId;
    if (!setRoleShade(roleId, step, color, { silent: true })) {
      showToast(
        t(locale, 'ui.paletteDetail.writeFailed', 'Could not write to {token}').replace(
          '{token}',
          `--color-${roleId}-${step}`
        ),
        'info'
      );
      return;
    }
    const roleName = cart.roles[roleId]?.name ?? roleId;
    showToast(
      t(locale, 'ui.paletteDetail.cartSaved', '{role} {step} → {token}')
        .replace('{role}', t(locale, `ui.roles.${roleId}`, roleName))
        .replace('{step}', String(step))
        .replace('{token}', `--color-${roleId}-${step}`)
    );
  };

  const cssBlock = `@theme {\n${SHADE_STEPS.map(
    (s) => `  --color-${paletteSlug}-${s}: ${formatOklch(shades[s])};`
  ).join('\n')}\n}`;

  const copyCss = () => {
    navigator.clipboard.writeText(cssBlock);
    setCopied(true);
    showToast(t(locale, 'ui.paletteDetail.themeCopied', '@theme block copied'));
    setTimeout(() => setCopied(false), 1400);
  };

  const downloadJson = () => {
    const tokens = Object.fromEntries(
      SHADE_STEPS.map((s) => [String(s), formatOklch(shades[s])])
    );
    const blob = new Blob([JSON.stringify({ [paletteSlug]: tokens }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${paletteSlug}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(
      t(locale, 'ui.paletteDetail.jsonDownloaded', '{file} downloaded').replace(
        '{file}',
        `${paletteSlug}.json`
      )
    );
  };

  return (
    <div class="space-y-3">
      {/* ── Controls for the whole scale ── */}
      <div class="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div class="space-y-1">
          <span class="eyebrow">
            {t(locale, 'ui.paletteDetail.scaleEyebrow', '{name} scale').replace('{name}', paletteName)}
          </span>
          <p class="font-mono text-label text-body">
            {t(locale, 'ui.paletteDetail.stepCountHint', '{count} colors · click a card to copy').replace(
              '{count}',
              String(SHADE_STEPS.length)
            )}
          </p>
        </div>

        <div class="flex items-end gap-2 flex-wrap">
          <label class="flex items-center gap-2 min-w-0">
            <span class="eyebrow shrink-0">
              {t(locale, 'ui.paletteDetail.variableLabel', 'Variable')}
            </span>
            {/*
              A text field with a datalist of the cart's existing roles, not a
              `<select>`: the destination is usually a variable that does not
              exist yet, and the datalist still offers the known names as
              one-tap suggestions.
            */}
            <input
              id={`palette-detail-variable-${suggestionId}`}
              type="text"
              name="variable"
              list={suggestionId}
              value={varNameInput}
              spellcheck={false}
              autocomplete="off"
              aria-label={t(locale, 'ui.paletteDetail.variableAria', 'Custom color variable name')}
              onInput={(e) => setVarNameInput((e.target as HTMLInputElement).value)}
              class="hud !py-1.5 font-mono text-label w-40 min-w-0 cursor-text"
              placeholder="brand-accent"
            />
            <datalist id={suggestionId}>
              {Object.values(cart.roles).map((r) => (
                <option key={r.id} value={r.id}>
                  {t(locale, `ui.roles.${r.id}`, r.name)}
                </option>
              ))}
            </datalist>
          </label>

          <button
            onClick={copyCss}
            class="btn btn-quiet"
            title={t(locale, 'ui.paletteDetail.copyCssTitle', 'Copy as a Tailwind v4 @theme block')}
          >
            {copied ? (
              <Check class="w-3.5 h-3.5 text-copy-success" aria-hidden="true" strokeWidth={2.5} />
            ) : (
              <Copy class="w-3.5 h-3.5" aria-hidden="true" strokeWidth={2} />
            )}
            <span>
              {copied
                ? t(locale, 'ui.paletteDetail.copied', 'Copied')
                : t(locale, 'ui.paletteDetail.copyCss', 'Copy CSS')}
            </span>
          </button>
          <button
            onClick={downloadJson}
            class="btn btn-quiet"
            title={t(locale, 'ui.paletteDetail.downloadJsonTitle', 'Download as JSON tokens')}
          >
            <Download class="w-3.5 h-3.5" aria-hidden="true" strokeWidth={2} />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Where the Cart action writes. Shown live so a typed name is never a leap
          of faith: `--color-Brand Accent-*` is not a variable anyone can write. */}
      <p class="font-mono text-micro text-faint">
        {t(locale, 'ui.paletteDetail.cartWritesTo', 'cart writes to')}{' '}
        <span class="text-mute">{`--color-${targetSlug}-*`}</span>
      </p>

      {/* ── The scale ── */}
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {SHADE_STEPS.map((step) => {
          const color = shades[step];
          const value = formatOklch(color);
          const isP3 = color.inP3 && !color.inSRGB;

          return (
            <div
              class="group relative flex flex-col justify-end overflow-hidden rounded-lg border border-hairline hover:border-border-focus transition-colors duration-150 h-[150px] sm:h-[210px] lg:h-[280px]"
              style={{ backgroundColor: value }}
            >
              {/*
                The card itself is the quick copy target, as a sibling overlay
                button rather than as the card element — the action row below
                holds real buttons, and a button inside a button is invalid markup
                whose interactive areas browsers resolve inconsistently.
              */}
              <button
                type="button"
                class="absolute inset-0 z-0 cursor-pointer"
                onClick={() => copyValue(color)}
                aria-label={t(locale, 'ui.paletteDetail.copyCardAria', 'Copy {value}, hex {hex}')
                  .replace('{value}', value)
                  .replace('{hex}', color.hex)}
                title={t(locale, 'ui.paletteDetail.copyValueTitle', 'Copy {value}').replace(
                  '{value}',
                  value
                )}
              />

              {/*
                Rendered only on hover/focus. A permanently mounted row that is
                merely transparent still swallows clicks at its own position, so
                an invisible "Cart" button would eat half of the card's copy
                target. `hidden` removes it from hit-testing entirely.
              */}
              <div class="absolute inset-0 z-10 hidden group-hover:flex group-focus-within:flex items-center justify-center gap-2 bg-black/35">
                <button
                  type="button"
                  onClick={() => copyValue(color)}
                  class="btn btn-quiet !min-h-0 !py-1.5 !px-2.5 !text-micro"
                  aria-label={t(locale, 'ui.paletteDetail.copyValueTitle', 'Copy {value}').replace(
                    '{value}',
                    value
                  )}
                  title={t(
                    locale,
                    'ui.paletteDetail.copyClipboardTitle',
                    'Copy this value to the clipboard'
                  )}
                >
                  <Copy class="w-3.5 h-3.5" aria-hidden="true" strokeWidth={2} />
                  <span>{t(locale, 'ui.paletteDetail.copy', 'Copy')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => addToCart(color, step)}
                  class="btn btn-primary !min-h-0 !py-1.5 !px-2.5 !text-micro"
                  title={t(locale, 'ui.paletteDetail.saveAsTitle', 'Save as {token}').replace(
                    '{token}',
                    `--color-${targetSlug}-${step}`
                  )}
                  aria-label={t(
                    locale,
                    'ui.paletteDetail.saveStepAria',
                    'Save step {step} to the color cart as {token}'
                  )
                    .replace('{step}', String(step))
                    .replace('{token}', `--color-${targetSlug}-${step}`)}
                >
                  <Plus class="w-3.5 h-3.5" aria-hidden="true" strokeWidth={2.5} />
                  <span>{t(locale, 'ui.paletteDetail.cart', 'Cart')}</span>
                </button>
              </div>

              {/* Labels live above the hover row so the two never overlap. */}
              <div class="pointer-events-none absolute inset-x-0 top-0 p-2.5 flex items-start justify-between gap-2">
                <span class="font-mono text-micro px-1.5 py-0.5 rounded bg-badge-surface text-white/90">
                  {step}
                </span>
                {isP3 && (
                  <span
                    class="font-mono text-[9px] leading-none px-1 py-0.5 rounded bg-badge-surface text-gamut-p3"
                    title={t(
                      locale,
                      'ui.paletteDetail.p3Title',
                      'Inside Display-P3, outside sRGB — browsers will clamp it'
                    )}
                  >
                    P3
                  </span>
                )}
              </div>

              <div class="pointer-events-none absolute inset-x-0 bottom-0 p-2.5">
                <span
                  class="block font-mono text-micro px-1.5 py-1 rounded bg-badge-surface text-white max-w-full truncate"
                  title={value}
                >
                  {value}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
