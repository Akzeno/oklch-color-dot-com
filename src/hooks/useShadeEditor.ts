import { useCallback, useEffect, useState } from 'preact/hooks';
import { cartStore, setRoleShade } from '../stores/cartStore';
import { parseAnyToOklch, type ShadeStep } from '../utils/color';

/**
 * The inline editor for one `--color-<role>-<step>` token, shared by every
 * surface that lists tokens.
 *
 * WHY A HOOK
 *
 * The design token panel on `/ui-preview` and the token drawer in the header are
 * two views of the same store with the same editing job, and the job is not
 * small: pick a colour by typing any format the site understands, nudge one axis
 * of L/C/H, and know when to close. Written twice it would drift, and the copy
 * that drifted would be the one nobody tested — so the behaviour lives here and
 * both surfaces only supply markup.
 */

/** The one slot being edited. Tokens are edited one at a time by construction. */
export interface ShadeEditTarget {
  roleId: string;
  step: ShadeStep;
}

/** The three numeric axes of an OKLCH colour, in the order they are displayed. */
export type ShadeAxis = 'l' | 'c' | 'h';

export interface ShadeEditor {
  /** The slot being edited, or `null` when nothing is. */
  editing: ShadeEditTarget | null;
  /**
   * Text in the free-form field.
   *
   * Owned here rather than seeded once on open, because it has to survive the
   * store writes its own keystrokes cause: a value the user is still typing is
   * not a colour yet, and re-deriving the field from the store would rewrite it
   * mid-edit.
   */
  value: string;
  /** Is this exact slot the one being edited? */
  isEditing: (roleId: string, step: ShadeStep) => boolean;
  /** Open the editor on a slot, seeded with the slot's current value. */
  beginEdit: (roleId: string, step: ShadeStep, currentValue: string) => void;
  /** Close the editor. */
  endEdit: () => void;
  /** Free-form field. Parses and writes on every keystroke. */
  changeValue: (roleId: string, step: ShadeStep, raw: string) => void;
  /** One field of the L/C/H row. */
  changeAxis: (roleId: string, step: ShadeStep, axis: ShadeAxis, raw: string) => void;
}

/**
 * Attribute that marks the subtree belonging to a given slot's editor.
 *
 * Put it on whatever wraps *both* the free-form field and the L/C/H row, and
 * spread `...shadeEditorBoundary()` as its value — that is what makes
 * "clicked outside" a question with a precise answer. The old per-field `onBlur`
 * could not be: focusing an L/C/H input blurred the text field, which ended the
 * edit and unmounted the very inputs the user had just clicked.
 */
export function shadeEditorBoundary(roleId: string, step: ShadeStep): string {
  return `${roleId}:${step}`;
}

export function useShadeEditor(): ShadeEditor {
  const [editing, setEditing] = useState<ShadeEditTarget | null>(null);
  const [value, setValue] = useState('');

  const endEdit = useCallback(() => {
    setEditing(null);
    setValue('');
  }, []);

  const beginEdit = useCallback((roleId: string, step: ShadeStep, currentValue: string) => {
    setEditing({ roleId, step });
    setValue(currentValue);
  }, []);

  /**
   * Both writes go through `setRoleShade`, never a hand-rolled store update.
   *
   * That is the point of the hook: a shade edited here used to be able to land
   * in memory and survive a reload differently from one edited anywhere else,
   * because this path carried its own `localStorage` write.
   *
   * `silent` because both editors fire on every keystroke, and a toast per
   * character would be unusable — as would a toast over the swatch being
   * adjusted, which already shows the result.
   */
  const changeValue = useCallback((roleId: string, step: ShadeStep, raw: string) => {
    setValue(raw);
    const parsed = parseAnyToOklch(raw);
    if (parsed) {
      setRoleShade(roleId, step, parsed, { silent: true });
    }
  }, []);

  const changeAxis = useCallback(
    (roleId: string, step: ShadeStep, axis: ShadeAxis, raw: string) => {
      const role = cartStore.get().roles[roleId];
      const token = role?.shades[step];
      if (!token) return;

      const numValue = parseFloat(raw);
      if (isNaN(numValue)) return;

      const { l, c, h } = token.color;
      const next = { ...token.color };

      // Clamped to the ranges the colour space can actually render, so a typed
      // value can never push the token to something the swatch cannot show.
      if (axis === 'l') next.l = Math.max(0, Math.min(1, numValue));
      else if (axis === 'c') next.c = Math.max(0, Math.min(0.4, numValue));
      else next.h = ((numValue % 360) + 360) % 360;

      setRoleShade(roleId, step, next, { silent: true });
    },
    []
  );

  /**
   * Close the editor on Escape, and on a press that lands outside it.
   *
   * Both listeners are captured on `document`, and each is here for a specific
   * reason:
   *
   *  - `mousedown`, not `blur`: blur cannot answer "did the user leave the
   *    editor", only "did this one field lose focus", and the editor is several
   *    fields. Pressing elsewhere also has to beat the focus change it causes.
   *  - Escape captured, so it is handled *before* the token drawer's own
   *    window-level listener. `stopPropagation` is what keeps one Escape from
   *    both ending the edit and closing the modal around it; the second Escape
   *    is then free to close it.
   */
  useEffect(() => {
    if (!editing) return;

    const boundary = `[data-shade-editor="${shadeEditorBoundary(editing.roleId, editing.step)}"]`;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      endEdit();
    };

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target;
      if (target instanceof Element && target.closest(boundary)) return;
      endEdit();
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('mousedown', onMouseDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('mousedown', onMouseDown, true);
    };
  }, [editing, endEdit]);

  const isEditing = useCallback(
    (roleId: string, step: ShadeStep) => editing?.roleId === roleId && editing.step === step,
    [editing]
  );

  return { editing, value, isEditing, beginEdit, endEdit, changeValue, changeAxis };
}