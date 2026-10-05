import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { Check, Copy, Palette, Plus, X } from 'lucide-preact';
import type { LucideIcon } from 'lucide-preact';
import { formatOklch, getNearestShadeStep, type ColorModel, type ShadeStep } from '../../utils/color';
import ColorSwatch from '../common/ColorSwatch';

/** Distance kept between the menu and the viewport edge / the swatch. */
const VIEWPORT_PAD = 12;
const ANCHOR_GAP = 8;

/**
 * The per-swatch action menu: copy this value, save it as a CSS variable, or
 * collect it into the custom palette below the page.
 *
 * WHY A MENU AND NOT A FIXED BEHAVIOUR
 *
 * A click on a strip swatch means two different things depending on what the
 * user is doing — reading the scale and grabbing one value, or building a
 * palette and collecting it — and the strip is where both happen. Performing one
 * of them unconditionally is a guess, and it is wrong half the time: copying
 * silently rewrites a cart token, and filing silently leaves a clipboard the
 * user never asked for. Choosing per click costs one extra press and makes the
 * click's meaning the user's own.
 *
 * This is why the palette *cards* can keep plain labelled Copy / Cart buttons and
 * this cannot: eleven swatches across a contiguous bar leave no room for two
 * buttons per swatch, so the choice has to live one level up, in a menu.
 *
 * The menu is deliberately dumb about *what* the actions do — it hands the
 * values back to the caller. The store writes, the toast wording and the role
 * resolution all stay on the page that owns them.
 *
 * The destination variable is shown verbatim (`--color-brand-accent-500`) rather
 * than as a description of it, because the whole point of the menu is that the
 * user can see which variable they are about to write before they commit.
 */
export interface SwatchActionMenuProps {
  /** DOM id, so the trigger swatch can point at the menu it controls. */
  id: string;
  /** The swatch that was clicked. */
  color: ColorModel;
  /**
   * The scale step the swatch belongs to, or `null` for a harmony swatch.
   *
   * A step is not just a label here: it decides *which* store call the page
   * makes. A step means "write the exact slot the user clicked" (`--color-x-50`
   * stays 50), while `null` means "this colour has no step of its own, slot it by
   * lightness". `destination` below derives the same answer for the label, so the
   * menu and the write can never disagree about the slot.
   */
  step: ShadeStep | null;
  /** The swatch element to sit next to. Read live, so scrolling keeps it glued. */
  anchor: HTMLElement;
  /** Accessible name of what was clicked, e.g. `Step 500` or `Triadic 2`. */
  label: string;
  /** Slug of the destination role, e.g. `brand-accent` → `--color-brand-accent-*`. */
  targetSlug: string;
  /** Copy `value` to the clipboard and close. */
  onCopy: (value: string) => void;
  /**
   * Write the colour to the destination variable and close.
   * `alsoCopy` writes the value too, in one gesture.
   */
  onSave: (alsoCopy: boolean) => void;
  /**
   * Collect the colour into the custom palette below the page, as its own row.
   *
   * Optional because the destination does not exist everywhere this menu does: a
   * palette panel is a generator-only feature, and a menu that offered an action
   * with nothing behind it would be a dead row in the list.
   */
  onAddToPalette?: () => void;
  onClose: () => void;
}

export default function SwatchActionMenu({
  id,
  color,
  step,
  anchor,
  label,
  targetSlug,
  onCopy,
  onSave,
  onAddToPalette,
  onClose,
}: SwatchActionMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  /*
   * Null until the first measurement. The panel is rendered but invisible for
   * that one frame: position is only knowable after layout (it depends on the
   * panel's own height), and rendering at a guessed 0,0 first would show the
   * menu flashing in the corner before it jumps to the swatch.
   */
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const value = formatOklch(color);
  const hex = color.hex;
  /** The slot this colour will actually occupy — the step it was, or its lightness. */
  const destination = step ?? getNearestShadeStep(color.l);
  const variable = `--color-${targetSlug}-${destination}`;
  const isP3 = color.inP3 && !color.inSRGB;

  /**
   * Measure and place: centred under the swatch, flipped above it when there is
   * no room below, and clamped so neither edge can leave the viewport.
   */
  const place = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const rect = anchor.getBoundingClientRect();
    const { width, height } = panel.getBoundingClientRect();

    const left = Math.min(
      Math.max(VIEWPORT_PAD, rect.left + rect.width / 2 - width / 2),
      Math.max(VIEWPORT_PAD, window.innerWidth - width - VIEWPORT_PAD)
    );

    const below = rect.bottom + ANCHOR_GAP;
    const above = rect.top - height - ANCHOR_GAP;
    const top =
      below + height <= window.innerHeight - VIEWPORT_PAD
        ? below
        : above >= VIEWPORT_PAD
          ? above
          : Math.max(VIEWPORT_PAD, window.innerHeight - height - VIEWPORT_PAD);

    setPos({ left, top });
  }, [anchor]);

  useLayoutEffect(place, [place]);

  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, []);

  /**
   * Dismissal and re-anchoring.
   *
   * Scroll does *not* dismiss. A menu pinned to a viewport coordinate taken at
   * click time detaches from its swatch the moment the page moves, and the page
   * moves constantly here — nudging a scrollbar or reading the harmonies below
   * would slam the menu shut mid-decision. So scroll re-measures the anchor and
   * the menu follows it; only when the swatch itself leaves the viewport is
   * there nothing left to act on, and that does dismiss.
   *
   * The scroll listener is captured because scroll does not bubble: a bubbling
   * listener would miss every nested scroller on the page.
   */
  useEffect(() => {
    let frame = 0;

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = anchor.getBoundingClientRect();
        const gone =
          rect.bottom < 0 ||
          rect.top > window.innerHeight ||
          rect.right < 0 ||
          rect.left > window.innerWidth;
        if (gone) onClose();
        else place();
      });
    };

    const onPointerDown = (e: MouseEvent) => {
      // A press on the swatch that opened this menu is a *move*, not a dismissal:
      // it is handled separately, by re-pointing the menu at the new swatch.
      if (anchor.contains(e.target as Node)) return;
      if (panelRef.current?.contains(e.target as Node)) return;
      onClose();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', place);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [anchor, place, onClose]);

  /**
   * Escape closes and hands focus back to the swatch, so a keyboard user is not
   * dropped at the top of the document. Every other close is either a deliberate
   * action (focus moves to the toast) or a dismissal the user can see happen.
   */
  const close = (restoreFocus: boolean) => {
    onClose();
    if (restoreFocus) anchor.focus();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
      return;
    }

    const items = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []
    );
    if (items.length === 0) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      const at = items.indexOf(document.activeElement as HTMLElement);
      items[(at + delta + items.length) % items.length].focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0].focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1].focus();
    }
  };

  /**
   * One row: an action, and the exact value it acts on.
   *
   * The detail line is not decoration — "Save to variable" is a claim about a
   * variable name, and showing that name is what makes the claim checkable.
   */
  const item = (name: string, detail: string, IconGlyph: LucideIcon, run: () => void) => (
    <button
      type="button"
      role="menuitem"
      onClick={run}
      class="w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-canvas-elevated focus:bg-canvas-elevated focus:outline-none transition-colors duration-150"
    >
      <IconGlyph class="w-3.5 h-3.5 text-mute flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
      <span class="min-w-0 flex-1">
        <span class="block text-label text-ink truncate">{name}</span>
        <span class="block font-mono text-micro text-faint truncate">{detail}</span>
      </span>
    </button>
  );

  return (
    <div
      ref={panelRef}
      id={id}
      role="menu"
      aria-label={`Actions for ${label}`}
      onKeyDown={onKeyDown}
      class={`fixed z-[9999] dock w-[288px] max-w-[calc(100vw-1.5rem)] p-1.5 ${
        // The entrance animation scales the panel from 0.98, so it must not be
        // running while the panel measures itself — the measurement would place a
        // box 2% smaller than the one that ends up on screen.
        pos ? 'animate-popover-in' : 'invisible'
      }`}
      style={pos ? { left: `${pos.left}px`, top: `${pos.top}px` } : undefined}
    >
      {/* What am I acting on? */}
      <div class="flex items-center gap-2.5 px-1.5 py-1.5 mb-1 border-b border-hairline">
        <ColorSwatch
          color={color}
          class="w-7 h-7 rounded-md border border-hairline flex-shrink-0"
          title={value}
        />
        <div class="min-w-0 flex-1">
          <p class="text-label text-ink truncate">{label}</p>
          <p class="font-mono text-micro text-mute truncate">
            {value} · {hex}
          </p>
        </div>
        {isP3 && (
          <span class="font-mono text-micro text-gamut-p3 shrink-0" title="Inside Display-P3, outside sRGB">
            P3
          </span>
        )}
        <button
          type="button"
          onClick={() => close(false)}
          class="icon-btn icon-btn-xs shrink-0"
          aria-label="Close"
        >
          <X class="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      {/* Clipboard: needs no configuration, so it is the shortest route out. */}
      {item('Copy OKLCH', value, Copy, () => onCopy(value))}
      {item('Copy hex', hex, Copy, () => onCopy(hex))}

      {/* The cart writes are a separate group because they are the ones with a
          consequence: they change the variable the user is building. */}
      <div class="mt-1 pt-1 border-t border-hairline">
        {item('Save to variable', variable, Plus, () => onSave(false))}
        {item('Copy and save', `${variable} · ${value}`, Check, () => onSave(true))}
      </div>

      {/* Last, and in its own group, because it is the only destination that
          *adds* something rather than copying or overwriting. The scale is a
          reading surface and the palette is a writing one, so collecting a step
          has to be asked for separately — and the value travels verbatim, which
          is the entire point: the row is this swatch, not a hue-rotated
          neighbour. */}
      {onAddToPalette && (
        <div class="mt-1 pt-1 border-t border-hairline">
          {item('Add to custom palette', `${value} → new row`, Palette, onAddToPalette)}
        </div>
      )}
    </div>
  );
}