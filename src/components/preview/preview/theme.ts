import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { Paint, Theme } from './slots';

/**
 * Both themes, resolved once, plus the page-wide default.
 *
 * WHY A PAIR AND NOT ONE PAINT
 *
 * Until now the showcase had exactly one theme at a time: the island resolved a
 * single `Paint` from `previewTheme` and handed it to the active group. That
 * made the Dark/Light control a *global* switch — flipping it repainted every
 * card at once, so there was no way to look at a dark button beside a light one
 * and ask which of the two the palette actually fails on.
 *
 * A card-level toggle needs the *other* theme's paint at the moment the card is
 * rendered, and it cannot resolve it itself: a `Paint` is built from the cart
 * (`createPaint` runs `formatOklch` through culori for every slot), so resolving
 * per card would redo the whole inventory 80-odd times per render.
 *
 * So the island builds both — once per cart, memoised — and every `Specimen`
 * picks the one its own toggle asks for. The pair is context rather than a prop
 * because the card's theme lives inside `Specimen`; threading it through eight
 * group files would put a value in a hundred call sites that only one component
 * ever reads.
 *
 * `globalTheme` is the page control's current setting. It is what an
 * un-toggled card follows, and it is what a *toggled* card is pinned against —
 * see the pin logic in `Specimen` for why the pair needs it as well as the two
 * paints.
 */
export interface PaintPair {
  dark: Paint;
  light: Paint;
  /** The theme the Dark/Light control at the top of the preview is set to. */
  globalTheme: Theme;
}

/**
 * Null rather than a default paint, because a `Specimen` without a pair is a
 * programming error, not an empty state: rendering the card against a made-up
 * palette would put a colour on screen that no token owns, which is the exact
 * lie `Swatch` exists to prevent. Throwing names the missing provider instead.
 */
export const PaintPairContext = createContext<PaintPair | null>(null);

export function usePaintPair(): PaintPair {
  const pair = useContext(PaintPairContext);
  if (!pair) {
    throw new Error(
      'PaintPairContext is missing — Specimen must render inside UIPreviewIsland.'
    );
  }
  return pair;
}
