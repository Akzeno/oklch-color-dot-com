import type { ComponentChildren, CSSProperties, JSX } from 'preact';
import { ACCENT, type SlotValue, type Theme } from './slots';
import { formatOklch, type ShadeStep } from '../../../utils/color';
import { t } from '../../../i18n/translations';
import type { LocaleCode } from '../../../i18n/config';

/**
 * The only way a colour is allowed onto the showcase canvas.
 *
 * WHY A PRIMITIVE
 *
 * Colorability used to be per-element plumbing: each coloured element had to
 * remember `data-context-role` and `data-context-step` by hand, and the unset
 * state, the tooltip and the click target were re-derived every time. Across the
 * ~150 elements this page is heading for, that gets forgotten — and a forgotten
 * attribute means an element that silently ignores your tokens while looking
 * like it participates.
 *
 * Going through one primitive makes it structural instead:
 *
 *  - The slot being painted is the same value used to resolve the colour, so the
 *    tooltip, the popover target and the pixel can never disagree.
 *  - An unset slot renders an explicit dashed affordance rather than a
 *    plausible-looking stand-in. The page must not lie about your design system.
 *  - A slot resolved to a neutral fallback says so, in the tooltip and in the
 *    `data-on-neutral` hook every consumer reads.
 *  - `part` decides which CSS property the slot drives, so a nested element can
 *    paint its own text without its parent's background leaking into the
 *    tooltip target.
 *
 * The preview shell's click handler walks up with `.closest('[data-context-role]')`,
 * so nesting Swatches works: the innermost one wins, which is what you want when
 * a coloured fill contains text painted from a different step of the same role.
 */

/**
 * `soft` paints a low-alpha version of the slot instead of the solid colour.
 *
 * It exists because pills, badges and row hovers want a *tint* of a role, not a
 * separate light step. Routing that through its own slot would reintroduce the
 * "two places disagree about one role" bug that `TokenAlert` used to have, where
 * clicking a token updated the border while the tinted background kept the old
 * colour. Because the tint is derived from the very slot the swatch reports, the
 * painted pixel and the click target still cannot diverge.
 */
export type SwatchPart = 'bg' | 'border' | 'text' | 'soft';

export interface SwatchProps {
  /**
   * The resolved slot. `null` when nothing is painted yet.
   *
   * `null` is the common case on a fresh cart, where six of the nine accent
   * roles are empty — so it must still carry a target, which is what `role` and
   * `step` are for. Authoring a token is the primary action on this page, so an
   * unset element that silently ignores clicks would make the empty slots the
   * least reachable part of the interface.
   */
  slot: SlotValue | null;
  /**
   * The slot a click would author. Required in practice whenever `slot` is
   * `null`; without it the element renders its children and stays inert.
   */
  role?: string;
  step?: ShadeStep;
  /** Force the dashed unset affordance even when a value is present. */
  pending?: boolean;
  /**
   * Readable colour to use while pending, for foreground parts.
   *
   * A foreground slot with no value paints transparent, which is correct for
   * contrast honesty but useless for a button *label* — an invisible label makes
   * the button unreadable, so you cannot tell which button is which. This gives
   * pending foregrounds chrome to be read in while keeping the dashed border, the
   * `data-pending` hook and the "not set — click to author it" tooltip.
   *
   * It is never applied to a slot that has a real value, so it cannot mask a
   * chosen colour.
   */
  pendingCss?: string;
  /** Which CSS property the slot drives on this element. */
  part: SwatchPart;
  /** Overrides the default tooltip for a resolved slot. */
  note?: string;
  /** Locale for human-facing chrome (the tooltip). */
  locale?: LocaleCode;
  /** Render as something other than a `div`. */
  as?: keyof JSX.IntrinsicElements;
  class?: string;
  style?: CSSProperties;
  children?: ComponentChildren;
  /** Forwarded to the underlying element (e.g. `disabled`, `type`, `onClick`). */
  [key: string]: unknown;
}

/** Where the tooltip points, and what "unset" looks like, in one place. */
function tooltip(slot: SlotValue, pending: boolean, locale: LocaleCode, note?: string): string {
  const target = `--color-${slot.role}-${slot.requested}`;
  if (pending)
    return t(
      locale,
      'ui.preview.swatch.notSetAuthor',
      `${target} not set — click to author it`
    ).replace('{target}', target);
  if (slot.onNeutral)
    return t(
      locale,
      'ui.preview.swatch.placeholderNeutral',
      `${target} not set — showing a placeholder neutral`
    ).replace('{target}', target);
  if (slot.substituted)
    return t(
      locale,
      'ui.preview.swatch.substituted',
      `${target} not set — substituted {step}`
    )
      .replace('{target}', target)
      .replace('{step}', String(slot.step));
  return note ?? `${target} · ${slot.css}`;
}

export function Swatch(props: SwatchProps) {
  const {
    part,
    note,
    as = 'div',
    class: className,
    style,
    children,
    // Pulled out explicitly so they are never spread onto the DOM node — a
    // `pending="true"` attribute in the markup would be both noise and a lie
    // about what the element is.
    slot: _slot,
    role: _role,
    step: _step,
    pending = false,
    locale = 'en',
    pendingCss,
    ...rest
  } = props;

  const slot: SlotValue | null =
    _slot ??
    // Synthesise the target so the click target, the tooltip and the dashed
    // affordance all read from one value. Painting nothing is fine; refusing to
    // carry the slot is not.
    (_role && _step
      ? {
          css: 'transparent',
          hex: null,
          role: _role,
          requested: _step,
          step: _step,
          substituted: false,
          onNeutral: true,
        }
      : null);

  const El = as as 'div';

  // No slot at all: render the children untouched rather than inventing one.
  if (!slot) {
    return (
      <El class={className} style={style}>
        {children}
      </El>
    );
  }

  // Each part drives exactly one property, so a nested Swatch cannot clobber
  // its parent's fill.
  const isForeground = part === 'text';

  // A pending foreground paints nothing, so fall back to readable chrome. A
  // background or border part stays transparent — an unset fill must not look
  // filled.
  const effective = pending && isForeground && !_slot ? (pendingCss ?? 'transparent') : slot.css;

  const painted: CSSProperties =
    part === 'bg'
      ? { backgroundColor: effective }
      : part === 'border'
        ? { borderColor: effective }
        : part === 'soft'
          ? // A tint needs the underlying colour model, which a stand-in or a
            // synthesised target does not have — so it stays transparent rather
            // than inventing one.
            {
              backgroundColor: slot.color
                ? formatOklch({ ...slot.color, alpha: ACCENT.softAlpha })
                : 'transparent',
            }
          : { color: effective };

  const unset = pending || slot.onNeutral;

  return (
    <El
      // Replaced, not merged: a caller's `style` must not be able to silently
      // override the colour this element exists to paint.
      style={{ ...style, ...painted }}
      class={className}
      data-context-role={slot.role}
      data-context-step={slot.requested}
      data-swatch-part={part}
      // `pending` gets its own hook: a placeholder neutral still puts a plausible
      // colour on screen, so a consumer has to tell it apart from a hole.
      data-on-neutral={unset && !pending ? 'true' : undefined}
      data-pending={pending ? 'true' : undefined}
      title={tooltip(slot, pending, locale, note)}
      {...rest}
    >
      {children}
    </El>
  );
}

/**
 * The affordance shown when a slot has no value.
 *
 * Rendered as a dashed outline rather than nothing, because an element that
 * paints *something* but is visibly not yours is far easier to notice — and to
 * click — than a hole in the layout.
 */
export function unsetStyle(theme: Theme): CSSProperties {
  return { borderStyle: 'dashed', borderColor: theme === 'dark' ? '#525252' : '#d4d4d8' };
}
