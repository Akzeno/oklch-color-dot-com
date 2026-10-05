import { useCallback, useEffect } from 'preact/hooks';
import {
  consumePickerResult,
  savePickerHandoff,
} from '../stores/cartStore';
import { getNearestShadeStep, type ColorModel, type ShadeStep } from '../utils/color';
import { goTo } from '../utils/navigate';

/** Where the picker should put the colour the user saves. */
export interface OpenInPickerOptions {
  /**
   * Token slot to write on save. Omit for a swatch that is *not* a cart token —
   * the colour is handed back to `onPicked` instead.
   */
  roleId?: string;
  /**
   * Step of that slot. Defaults to the nearest step for the colour's lightness,
   * the same rule `addColorToCart` uses.
   */
  step?: ShadeStep;
  /**
   * Identifies which of several free colours on this page is being edited, so
   * `onPicked` can be told which one came back.
   *
   * Only meaningful without a `roleId`: in `'token'` mode the destination is
   * already fully determined by the role and step.
   */
  slot?: string;
  /** Page the picker returns to. Defaults to the current one. */
  returnTo?: string;
}

/**
 * The one route from "a colour is on screen" to "the user can change it".
 *
 * WHY A HOOK AND NOT AN INLINE `savePickerHandoff` CALL
 *
 * Handing a colour to the picker needs four things in the right order: write the
 * handoff, choose the slot it writes to, navigate, and — on the way back — read
 * whatever the user chose. The last one is the part that is genuinely easy to
 * omit, because nothing fails visibly when you do: the page comes back, the
 * colour is simply unchanged, and it reads as the picker ignoring them. Several
 * call sites needed exactly this, so it lives here rather than being re-derived.
 *
 * THE SLOT IS A TRAP
 *
 * The picker writes to a `--color-<role>-<step>` variable — that is what makes
 * "edit this exact token" work. But most swatches on the site are *not* tokens:
 * the palette generator's base colour and a converter's input are plain component
 * state. Filing those into a token slot would show a base colour that had
 * silently become some role's 500.
 *
 * So the two cases are distinguished by whether a `roleId` is supplied:
 *
 *  - With one → `'token'` mode. Saving writes the cart slot and returns. This is
 *    the sidebar / preview / export path, unchanged.
 *  - Without one → `'free'` mode. Saving touches no cart slot and parks the
 *    colour for `onPicked`, which owns where it actually goes.
 *
 * A missing `roleId` means `'free'` because a swatch that is not obviously a
 * token usually is not one, and wrongly writing to the cart is the worse failure.
 *
 * ONE PAGE CAN HOLD SEVERAL FREE COLOURS
 *
 * `'free'` answers "is this a cart token?", not "which colour is it?". A page
 * with two or more of them — the palette generator has its base colour plus
 * every row of its custom palette — has to name the one it is opening, which is
 * what `options.slot` does. The id travels out with the handoff and back with
 * the result, so `onPicked` receives it as its second argument and can write to
 * the right destination instead of guessing. Without it, a returned colour is
 * only as meaningful as the page's ability to guess.
 *
 * @param onPicked Receives the colour the user saved in `'free'` mode, plus the
 *   slot it was for (`null` when the swatch named none). Ignored in `'token'`
 *   mode, where the value already went to the cart.
 * @param returnTo Default destination for every open made by the returned
 *   handler; per-call `options.returnTo` still wins.
 * @returns A click handler that opens the picker on the supplied colour.
 */
export function useOpenInPicker(
  onPicked?: (color: ColorModel, slot: string | null) => void,
  returnTo?: string
): (color: ColorModel, options?: OpenInPickerOptions) => void {
  // Collected in an effect, never during render, so the first client paint still
  // matches the server HTML. The result is a one-shot handoff, so this runs on
  // mount only — re-reading it per render would fight the island's own state.
  useEffect(() => {
    if (!onPicked || typeof window === 'undefined') return;
    const picked = consumePickerResult(window.location.pathname);
    if (picked) onPicked(picked.color, picked.slot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useCallback(
    (color: ColorModel, options: OpenInPickerOptions = {}) => {
      const destination =
        options.returnTo ?? returnTo ?? window.location.pathname;

      savePickerHandoff({
        mode: options.roleId ? 'token' : 'free',
        // Unused in 'free' mode, but the field is still validated on read: a
        // colour that came back with neither a usable role nor a usable step is
        // not something to write anywhere.
        roleId: options.roleId ?? 'trusty-button',
        step: options.step ?? getNearestShadeStep(color.l),
        color,
        returnTo: destination,
        slot: options.slot ?? null,
      });

      goTo('/');
    },
    [returnTo]
  );
}