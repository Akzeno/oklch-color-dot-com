import type { ComponentChildren, JSX } from 'preact';
import { formatOklch, type ColorModel } from '../../utils/color';

/**
 * A colour rendered as a solid block of exactly the colour it represents.
 *
 * WHY THIS EXISTS
 *
 * Five places used to mark a swatch as "a swatch" by pairing an inline
 * `background-color` with the global `.checker-bg` class. That combination is
 * always wrong, because `background-image` paints ON TOP of `background-color`:
 * the checkerboard's four gradient layers are *opaque* `--color-canvas-elevated`
 * (#1f1f1f) squares, so they covered half of every swatch with dark grey. The
 * result read as a washed-out, semi-transparent chip no matter how saturated the
 * colour underneath was — an unfilled placeholder look on a colour that was in
 * fact fully filled.
 *
 * The checkerboard is only ever meaningful for a colour that genuinely has
 * alpha, and even then it has to sit *under* the fill. So:
 *
 *  - Opaque (the overwhelming majority): the element's own `background-color`
 *    is the whole story. No background-image is emitted at all.
 *  - Translucent: the checkerboard goes on the root as a background, and the
 *    colour goes on an absolutely-positioned layer above it. That is the one
 *    arrangement where the checkerboard is visible at all, because the
 *    translucent fill lets it through — which is the entire point of it.
 *
 * Extracted rather than patched per call site because the bug was never local:
 * five components had independently written the same broken pair, and a fix
 * applied to one of them would have left four copies of the defect behind.
 *
 * CLICKING
 *
 * Pass `onClick` and the swatch becomes a real `<button>` that opens the colour
 * picker on this exact colour. Interactive swatches were previously built as
 * decorative `<div aria-hidden>`s, which is why "change this colour" was
 * unreachable from the swatch itself — the value was on screen with no way to
 * act on it. `type="button"` is explicit because these sit inside forms and a
 * default `<button>` submits.
 */
export interface ColorSwatchProps {
  /** The colour to paint. `null` paints `fallbackCss` instead. */
  color: ColorModel | null;
  /** Paint used when `color` is `null` (an unset slot). */
  fallbackCss?: string;
  /**
   * Sizing, radius and border, applied verbatim to the root. A button needs
   * `cursor-pointer` here — Tailwind v4 does not add it to `button` on its own.
   */
  class?: string;
  /**
   * Opens the colour picker on this colour. Omit for a purely decorative
   * swatch, which renders as a `div` and is hidden from assistive tech.
   */
  onClick?: () => void;
  /** Tooltip. Also becomes the accessible name when no `aria-label` is given. */
  title?: string;
  /** Overrides `title` as the accessible name, for when they should differ. */
  ariaLabel?: string;
  /** Layers rendered on top of the fill (badges, controls, readout docks). */
  children?: ComponentChildren;
}

export default function ColorSwatch({
  color,
  fallbackCss = 'var(--color-canvas-sunken)',
  class: className = '',
  onClick,
  title,
  ariaLabel,
  children,
}: ColorSwatchProps) {
  const css = color ? formatOklch(color) : fallbackCss;
  const translucent = color !== null && color.alpha < 1;

  const interactive = typeof onClick === 'function';
  const El = (interactive ? 'button' : 'div') as 'div';

  /*
   * `relative` on the root is unconditional: callers layer badges and docks on
   * top of a swatch, and in the translucent branch the fill itself is an
   * absolutely-positioned child that must anchor to the swatch and not to
   * whatever ancestor happens to be positioned.
   */
  const rootClass = [
    'relative overflow-hidden',
    // Only translucent swatches get the checkerboard. Everything else is opaque.
    translucent ? 'checker-bg' : '',
    interactive ? 'cursor-pointer' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const fillStyle: JSX.CSSProperties = { backgroundColor: css };

  return (
    <El
      class={rootClass}
      // Opaque: the fill IS the element. Adding a background-image here is
      // exactly the defect this component exists to prevent.
      style={translucent ? undefined : fillStyle}
      {...(interactive
        ? { type: 'button' as const, onClick }
        : { 'aria-hidden': 'true' as const })}
      {...(title ? { title } : {})}
      {...(interactive ? { 'aria-label': ariaLabel ?? title } : {})}
    >
      {translucent && (
        // Sits above the checkerboard painted on the root, below anything else
        // in `children` (DOM order settles the tie at equal stacking level).
        <span class="absolute inset-0" style={fillStyle} />
      )}
      {children}
    </El>
  );
}