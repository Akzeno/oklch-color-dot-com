import {
  formatOklch,
  getWcagContrast,
  getApcaContrast,
  SHADE_STEPS,
  TARGET_LIGHTNESS,
  type ColorModel,
  type ShadeStep,
} from '../../../utils/color';
import type { CartState } from '../../../stores/cartStore';

/**
 * The semantic layer between "a token slot" and "a painted pixel".
 *
 * WHY THIS FILE EXISTS
 *
 * Every element in the showcase used to hardcode `data-context-step="500"`, so
 * the page could only ever paint mid-tones: a button had no `on-*` foreground
 * that differed from its fill, and a card had no surface distinct from the
 * canvas behind it. That made the preview unable to surface the two classes of
 * bug it exists to catch — unreadable text on a coloured fill, and surfaces
 * that do not stack.
 *
 * So a surface is declared here *semantically* ("an accent fill with its
 * foreground", "a card raised above the canvas") and resolved per theme into
 * concrete slots. Dark and light get different steps, because a real system
 * does too: `--color-primary-50` reads as near-white on a dark fill and as
 * near-black on a light one is the same idea expressed as 950.
 */

export type Theme = 'dark' | 'light';

/** A step that depends on the theme — the whole point of semantic pairing. */
export interface ThemeSteps {
  dark: ShadeStep;
  light: ShadeStep;
}

export interface ResolvedToken {
  css: string;
  hex: string;
  color: ColorModel;
  /** The step actually used — differs from the requested one when substituted. */
  step: ShadeStep;
  /** True when the exact requested step was empty and another one was used. */
  substituted: boolean;
}

/**
 * Neutral stand-ins, used only where a fallback cannot conceal a contrast bug.
 *
 * The rule is deliberate and asymmetric:
 *
 *  - The *stage* (canvas, card surface, hairline border) DOES fall back. Without
 *    a backdrop there is nothing to judge a foreground against, and a neutral
 *    grey cannot make a failing pair look like a passing one — it just means no
 *    token has been chosen yet, which `Swatch` discloses explicitly.
 *  - A foreground painted *onto a coloured fill* NEVER falls back. Guessing white
 *    for `on-danger` would produce text that is silently unreadable on a light
 *    danger fill, and the page would report "fine". A wrong guess there is the
 *    exact defect this tool exists to reveal, so it shows as unset instead.
 */
export interface Neutrals {
  dark: string;
  light: string;
}

/**
 * The stage. Neutral greys stand in for the app chrome so an empty cart still
 * renders something judgeable; every slot here is reported as "on fallback" in
 * the group that needs it so it is never mistaken for a chosen token.
 */
export const STAGE = {
  canvas: { role: 'background', steps: { dark: 950, light: 50 }, neutral: { dark: '#0f0f0f', light: '#ffffff' } },
  surface: { role: 'background', steps: { dark: 900, light: 100 }, neutral: { dark: '#181818', light: '#f9fafb' } },
  raised: { role: 'background', steps: { dark: 800, light: 200 }, neutral: { dark: '#1f1f1f', light: '#f3f4f6' } },
  border: { role: 'background', steps: { dark: 800, light: 200 }, neutral: { dark: '#262626', light: '#e5e7eb' } },
  /** Content on the stage. No fallback: text you cannot read is the bug. */
  text: { role: 'text', steps: { dark: 100, light: 900 } },
  muted: { role: 'text', steps: { dark: 400, light: 500 } },
  /** Hairline separators inside a surface. */
  divider: { role: 'background', steps: { dark: 800, light: 200 }, neutral: { dark: '#1f1f1f', light: '#e5e7eb' } },
} as const satisfies Record<string, SlotSpec>;

export interface SlotSpec {
  role: string;
  steps: ThemeSteps;
  /** Present ⇒ an unset slot falls back to this neutral. */
  neutral?: Neutrals;
}

/**
 * The stand-ins used *inside the specimen cards*, and they are deliberately not
 * the site's own greys.
 *
 * WHY A SECOND RAMP
 *
 * The whole point of the showcase is to answer "does this palette work in an
 * app?". If the empty state fell back to this product's chrome — `#0a0a0a`
 * canvas, `#141414` cards, Geist — a card full of placeholder buttons would be
 * indistinguishable from the oklchcolor2 interface surrounding it. You would be
 * judging your palette against the one colour set you came here to escape, and
 * a passing result would mean nothing.
 *
 * So the fixture gets its own ramp: a slightly cool slate, a 12px radius, the
 * platform UI font, and control shapes the product does not use (12px-radius
 * buttons, full-round avatars). It reads as *some other app's* settings screen
 * from the first pixel, which is the only way "these colours hold up in the
 * wild" is a claim about your palette and not about ours.
 *
 * Deliberately desaturated and low-chroma. A saturated placeholder would bias
 * every judgement made against it, which is the exact failure the chrome ramp
 * in `global.css` was built to avoid — the same rule, a different hue.
 *
 * Foregrounds (`text`, `muted`) still get NO stand-in. See the asymmetry note on
 * `STAGE`: a guessed foreground hides the defect this page exists to find. The
 * fixture reveals an unset foreground through `Swatch`'s `pendingCss` instead,
 * which keeps the disclosure (dashed edge, tooltip, `data-pending`) while the
 * label stays readable.
 */
export const FIXTURE_NEUTRALS = {
  canvas: { dark: '#161a21', light: '#f2f5f8' },
  surface: { dark: '#1e242e', light: '#ffffff' },
  raised: { dark: '#28303c', light: '#e7ecf2' },
  border: { dark: '#333c4a', light: '#d8dfe8' },
  divider: { dark: '#333c4a', light: '#d8dfe8' },
  /** Only the ink for an unset *caption*, disclosed as pending like the rest. */
  muted: { dark: '#8c98a8', light: '#5b6673' },
} as const satisfies Record<string, Neutrals>;

/**
 * Ink for a foreground that is *provably* unset.
 *
 * `STAGE` deliberately gives `text` and `muted` no neutral stand-in, because
 * guessing a foreground is precisely how you ship unreadable content. But a
 * button label with no `--color-primary-50` behind it still has to be legible,
 * or the button renders as an empty box and you cannot tell "Save changes" from
 * "Delete" — the preview stops being able to do its job.
 *
 * So this is a separate, named thing rather than a fallback on `STAGE.text`:
 * chrome for a disclosure, never a stand-in for a token. It is reachable only
 * through `Swatch`'s `pendingCss`, which applies it when the slot is null *and*
 * the part is a foreground — so it always ships alongside the dashed edge, the
 * `data-pending` hook and the "not set — click to author it" tooltip.
 *
 * Mid-grey on purpose: it has to read as inert on either theme's canvas, and it
 * must never be mistaken for a colour somebody chose.
 */
export const PLACEHOLDER_INK: Record<Theme, string> = {
  dark: '#a3a3a3',
  light: '#6b7280',
};

/** Roles that read as "a colour with a foreground on it". */
export const ACCENT_ROLES = [
  'primary',
  'secondary',
  'trusty-button',
  'success',
  'danger',
  'warning',
  'info',
] as const;
export type AccentRole = (typeof ACCENT_ROLES)[number];

/**
 * An accent is its fill at 500 and its own foreground at the far end of the
 * scale. Dark surfaces take the light end (50), light surfaces the dark end
 * (950) — the same relationship a real design system encodes as
 * `text-primary-50` / `text-primary-950`.
 */
export const ACCENT = {
  fill: { dark: 500, light: 500 } satisfies ThemeSteps,
  on: { dark: 50, light: 950 } satisfies ThemeSteps,
  /** Outline variant: the fill colour used as a border on the stage. */
  outline: { dark: 500, light: 500 } satisfies ThemeSteps,
  /** Low-alpha fill for pills, soft badges and row hovers. */
  softAlpha: 0.16,
} as const;

/**
 * Resolve one slot.
 *
 * `neutral` is applied only when the slot is empty AND the spec declares one —
 * the stage does, foregrounds do not. The return value always reports which of
 * the two happened, because a fallback and a real token look identical once
 * they are painted, so every consumer must be able to tell them apart.
 */
export interface SlotValue {
  /** A CSS colour ready to paint. */
  css: string;
  /** sRGB hex, for contrast scoring. `null` when the value came from a neutral. */
  hex: string | null;
  /** The backing token. Absent when the value came from a neutral. */
  color?: ColorModel;
  role: string;
  /** The step requested. */
  requested: ShadeStep;
  /** The step actually painted, when substituted. */
  step: ShadeStep;
  substituted: boolean;
  onNeutral: boolean;
}

export function resolveSlot(
  cart: CartState,
  roleId: string,
  requested: ShadeStep,
  theme: Theme,
  neutral?: Neutrals,
  allowSubstitute = true
): SlotValue | null {
  const role = cart.roles[roleId];
  if (!role) return null;

  const exact = role.shades[requested];
  // An accent must resolve *exactly*. See `accent()` for why.
  const step = exact ? requested : allowSubstitute ? pickSubstitute(role.shades, requested) : null;

  if (!step) {
    if (!neutral) return null;
    return {
      css: neutral[theme],
      hex: null,
      role: roleId,
      requested,
      step: requested,
      substituted: false,
      onNeutral: true,
    };
  }

  const token = role.shades[step]!;
  return {
    css: formatOklch(token.color),
    hex: token.color.hex,
    color: token.color,
    role: roleId,
    requested,
    step,
    substituted: step !== requested,
    onNeutral: false,
  };
}

/**
 * Deterministic substitution ladder, unchanged from the original preview: 500
 * first, then the available shade whose target lightness is nearest.
 *
 * This only ever kicks in for the *stage*, where a usable colour beats none.
 * Accent slots are requested at 500 and so resolve exactly or report unset.
 */
function pickSubstitute(shades: Partial<Record<ShadeStep, unknown>>, requested: ShadeStep): ShadeStep | null {
  const available = SHADE_STEPS.filter((s) => shades[s]);
  if (available.length === 0) return null;
  if (available.includes(500)) return 500;
  return available.reduce((best, s) =>
    Math.abs(TARGET_LIGHTNESS[s] - TARGET_LIGHTNESS[requested]) <
    Math.abs(TARGET_LIGHTNESS[best] - TARGET_LIGHTNESS[requested])
      ? s
      : best
  );
}

/** A stage slot, honouring its declared neutral fallback. */
export function stage(cart: CartState, which: keyof typeof STAGE, theme: Theme): SlotValue | null {
  const spec = STAGE[which] as SlotSpec;
  return resolveSlot(cart, spec.role, spec.steps[theme], theme, spec.neutral as Neutrals | undefined);
}

/**
 * A stage slot resolved with the *fixture's* stand-in rather than the site's.
 *
 * Same role, same step, same token — only the placeholder differs. That is the
 * whole trick: `--color-background-950` is what gets painted once you set it,
 * and `data-on-neutral` / the tooltip still disclose that nothing is set yet, so
 * the foreign ramp cannot be mistaken for a colour you chose.
 */
export function fixtureStage(
  cart: CartState,
  which: keyof typeof STAGE,
  theme: Theme
): SlotValue | null {
  const spec = STAGE[which] as SlotSpec;
  const neutral = FIXTURE_NEUTRALS[which as keyof typeof FIXTURE_NEUTRALS];
  return resolveSlot(
    cart,
    spec.role,
    spec.steps[theme],
    theme,
    neutral ? ({ ...neutral } as Neutrals) : undefined
  );
}

/**
 * An accent's fill and its foreground, as a matched pair.
 *
 * Both come from the SAME role, which is what makes this a semantic pair rather
 * than a second colour choice: setting `--color-danger-500` gives you a
 * `--color-danger-50` to put text on it, and the page will tell you when you
 * have not.
 *
 * NEITHER HALF EVER SUBSTITUTES
 *
 * The substitution ladder exists for the stage: given `background-700` and a
 * request for `background-950`, painting 700 beats painting nothing. Applied to
 * an accent it is actively harmful. A role with only `primary-500` set, asked
 * for `primary-50`, would substitute 500 — so the foreground would resolve to
 * the *same colour as its own fill*, the pair would report a comfortable 1:1,
 * and the missing token would be invisible. That is precisely the defect this
 * page exists to catch, reintroduced through the resolver. So both halves
 * resolve exactly or report unset.
 */
export interface AccentPair {
  role: AccentRole;
  fill: SlotValue | null;
  on: SlotValue | null;
  /** Low-alpha version of the fill, for soft badges and row hovers. */
  soft: string | null;
  /**
   * A second gradient stop, derived from the pair — see `liftOf`.
   *
   * `null` when either half is missing, so a caller can fall back to the flat
   * fill instead of painting a gradient with a hole in it.
   */
  lift: string | null;
  /** True when either half is missing, so callers can render an unset state. */
  incomplete: boolean;
}

/**
 * The lighter stop of a two-stop fill, derived from the pair itself.
 *
 * WHY DERIVED AND NOT A THIRD SLOT
 *
 * A real gradient needs a stop that is neither the fill nor its foreground. The
 * honest-looking answer is a third token — `role-400` for a "classic" button —
 * but that would make the showcase report a slot as *missing* for a component
 * that renders perfectly well without it, and would put a ninth requested step
 * in the inventory for every accent role. A tool that claims to be missing a
 * token when it is not is worse than one that shows a slightly softer sheen.
 *
 * So the stop is mixed from the two halves that already exist, and reported
 * alongside `soft` — the same rule: derived from the slot the swatch reports,
 * so the painted pixel and the click target still cannot diverge. `color-mix`
 * interpolates in OKLab, which keeps the mixed stop perceptually between its
 * parents instead of drifting through mud.
 *
 * `on` is the *far* end of the scale, so this is deliberately partial (38%): at
 * full strength a dark-theme button would wash out to near-white.
 */
function liftOf(fill: SlotValue | null, on: SlotValue | null): string | null {
  if (!fill || !on) return null;
  return `color-mix(in oklab, ${on.css} 38%, ${fill.css})`;
}

export function accent(cart: CartState, role: AccentRole, theme: Theme): AccentPair {
  const fill = resolveSlot(cart, role, ACCENT.fill[theme], theme, undefined, false);
  const on = resolveSlot(cart, role, ACCENT.on[theme], theme, undefined, false);
  return {
    role,
    fill,
    on,
    soft: fill?.color ? formatOklch({ ...fill.color, alpha: ACCENT.softAlpha }) : null,
    lift: liftOf(fill, on),
    incomplete: !fill || !on,
  };
}

/**
 * A slot painted at an alpha, as a CSS value.
 *
 * The fixture components need tinted fills — a track behind a slider fill, a
 * hover wash, a soft badge — and every one of those tints is a *derivative of a
 * slot*, not a seventh colour the designer picked. Deriving it here (rather than
 * letting each widget hand-write `color-mix`) means the alpha lives in one place
 * and a widget cannot accidentally invent an opacity that no token accounts for.
 */
export function tint(css: string, alpha: number): string {
  return `color-mix(in oklab, ${css} ${Math.round(alpha * 100)}%, transparent)`;
}

/* ─────────────────────── Contrast sweeping ─────────────────────── */

/**
 * One scored foreground-on-background pair.
 *
 * APCA is reported alongside WCAG because the two disagree often enough that
 * reporting only one is misleading: WCAG 2.1 is what most tooling enforces, but
 * it under-weights saturated blues and over-penalises light text on dark. The
 * preview scores both and labels which is which.
 */
export interface ContrastPair {
  /** e.g. "Trusty Button fill" / "on Trusty Button". */
  label: string;
  fg: string;
  bg: string;
  wcag: number | null;
  apca: number | null;
  /** WCAG grade, or null when a half of the pair is unset. */
  grade: 'AAA' | 'AA' | 'Fail' | null;
  /** The slot this pair is scored against, so the UI can link to it. */
  role: string;
  step: ShadeStep;
}

/**
 * Score a pair, refusing to score against a neutral fallback.
 *
 * `fg`/`bg` hex are `null` when the slot resolved to a stand-in. Scoring a
 * stand-in would report a confident, meaningless AA grade for a colour the user
 * never chose, so an unscored pair is surfaced as "set the slot" instead.
 */
export function scorePair(
  label: string,
  fg: SlotValue | null,
  bg: SlotValue | null
): ContrastPair | null {
  if (!fg || !bg || !fg.hex || !bg.hex) return null;
  const wcag = getWcagContrast(fg.hex, bg.hex);
  return {
    label,
    fg: fg.css,
    bg: bg.css,
    wcag,
    apca: getApcaContrast(fg.hex, bg.hex),
    grade: wcag >= 7 ? 'AAA' : wcag >= 4.5 ? 'AA' : 'Fail',
    role: fg.role,
    step: fg.step,
  };
}

/**
 * The worst pair on the page, by WCAG ratio.
 *
 * Every group needs exactly one grade to put in its rail header, and every group
 * was writing the same four-line `reduce` to get it. Duplicated, those copies
 * drifted: one ranked on `wcag ?? 0`, which silently ranks an unscored pair
 * (both halves unset) above a genuinely failing one, because `null ?? 0` is a
 * ratio of zero and a *bad* ratio is not. So a group could report `Fail` for a
 * pair nobody had set while a real 2.1:1 sat unnoticed in the same list.
 *
 * Unscored pairs are therefore excluded rather than treated as zero: no ratio is
 * not a worse ratio. `null` comes back when nothing could be scored at all,
 * which is the only honest answer for a group with an empty cart.
 */
export function worstOf(pairs: (ContrastPair | null)[]): ContrastPair | null {
  let worst: ContrastPair | null = null;
  for (const pair of pairs) {
    if (!pair || pair.wcag === null) continue;
    if (worst === null || (pair.wcag ?? 0) < (worst.wcag ?? 0)) worst = pair;
  }
  return worst;
}

/* ─────────────────────────── Paint context ─────────────────────────── */

/**
 * Every slot the showcase needs, resolved once per render.
 *
 * Groups receive this instead of the raw cart. Two reasons:
 *
 *  - `formatOklch` goes through culori, and the page paints well over a hundred
 *    elements. Resolving per element meant re-formatting the same `--color-*`
 *    slot dozens of times per render for no benefit.
 *  - It makes the *set* of painted slots explicit, which is what the group
 *    rails and the contrast sweep iterate over. Adding a group that paints a
 *    new slot therefore shows up in the inventory automatically, rather than
 *    needing to be remembered in a second list.
 */
export interface Paint {
  theme: Theme;
  /** The stage. `canvas` is what every other surface is judged against. */
  canvas: SlotValue | null;
  surface: SlotValue | null;
  raised: SlotValue | null;
  border: SlotValue | null;
  divider: SlotValue | null;
  /** Content on the stage, and its de-emphasised companion. */
  text: SlotValue | null;
  muted: SlotValue | null;
  /**
   * The same stage, resolved against the *fixture* stand-ins.
   *
   * Not a second source of truth: `role` and `step` are identical to the fields
   * above, so this is the same token under a different placeholder. The split
   * exists purely so a card full of dummy components cannot inherit the shape of
   * this site's own chrome and quietly flatter the palette. See
   * `FIXTURE_NEUTRALS`.
   *
   * `text` is intentionally absent — an unset foreground has no stand-in in
   * either ramp, and is disclosed through `pendingInk` instead.
   */
  fixture: {
    canvas: SlotValue | null;
    surface: SlotValue | null;
    raised: SlotValue | null;
    border: SlotValue | null;
    divider: SlotValue | null;
    /** Caption ink — see the note where it is built. */
    ink: string;
  };
  /**
   * Ink for a foreground with no token behind it. Chrome for a disclosure, not a
   * colour the page is claiming you chose — see `PLACEHOLDER_INK`.
   */
  pendingInk: string;
  /** Accent pairs, one per accent role. */
  accents: Record<AccentRole, AccentPair>;
  /** Every accent role painted this render, for the sweep. */
  accentRoles: AccentRole[];
  /** Every slot the showcase intends to paint, with its resolved value. */
  inventory: IntendedSlot[];
}

export function createPaint(cart: CartState, theme: Theme): Paint {
  const accents = Object.fromEntries(
    ACCENT_ROLES.map((role) => [role, accent(cart, role, theme)])
  ) as Record<AccentRole, AccentPair>;

  return {
    theme,
    canvas: stage(cart, 'canvas', theme),
    surface: stage(cart, 'surface', theme),
    raised: stage(cart, 'raised', theme),
    border: stage(cart, 'border', theme),
    divider: stage(cart, 'divider', theme),
    text: stage(cart, 'text', theme),
    muted: stage(cart, 'muted', theme),
    fixture: {
      canvas: fixtureStage(cart, 'canvas', theme),
      surface: fixtureStage(cart, 'surface', theme),
      raised: fixtureStage(cart, 'raised', theme),
      border: fixtureStage(cart, 'border', theme),
      divider: fixtureStage(cart, 'divider', theme),
      // The caption ink. A `string` rather than a `SlotValue` because it is the
      // one place the two ramps are allowed to blend: the `text` role when it is
      // set, and the fixture's own mid-grey when it is not. That is disclosure
      // chrome in the sense `PLACEHOLDER_INK` already describes — legible, and
      // visibly not a colour anybody picked.
      ink: stage(cart, 'muted', theme)?.css ?? FIXTURE_NEUTRALS.muted[theme],
    },
    pendingInk: PLACEHOLDER_INK[theme],
    accents,
    accentRoles: [...ACCENT_ROLES],
    inventory: slotInventory(cart, theme),
  };
}

/* ─────────────────────────── Slot inventory ─────────────────────────── */

/** What each stage slot is for, and which groups lean on it. */
const STAGE_INTENT: Record<keyof typeof STAGE, { purpose: string; usedBy: string[] }> = {
  canvas: { purpose: 'Canvas — the stage every other surface is judged against', usedBy: ['all'] },
  surface: { purpose: 'Card / panel surface, stacked on the canvas', usedBy: ['forms', 'cards', 'lists'] },
  raised: { purpose: 'Nested surface — toolbars, menus, popovers', usedBy: ['navigation', 'overlays'] },
  border: { purpose: 'Hairline edges, dividers, input strokes', usedBy: ['all'] },
  divider: { purpose: 'Separator rules inside a surface', usedBy: ['lists', 'cards'] },
  text: { purpose: 'Primary content', usedBy: ['all'] },
  muted: { purpose: 'Helper and de-emphasised content', usedBy: ['all'] },
};

/** What each accent role is *for* — a role with no job is just a colour. */
const ACCENT_INTENT: Record<AccentRole, string> = {
  primary: 'Links, active nav, focus rings, selection',
  secondary: 'Secondary actions and neutral emphasis',
  'trusty-button': 'The primary action button',
  success: 'Positive confirmation',
  danger: 'Destructive actions and error text',
  warning: 'Caution',
  info: 'Informational notices',
};

export type SlotState = 'set' | 'placeholder' | 'missing';

/**
 * One slot the showcase intends to paint, together with its resolved value.
 *
 * This is the one inventory that the planned-group panel audits and the contrast
 * sweep reads, so the two cannot disagree about how many slots exist or which
 * are unset.
 *
 * It is derived from the `STAGE` and `ACCENT` specs rather than hand-listed,
 * and that is the point: a hand-written list would be a second source of truth
 * which drifts the first time a spec changes, and it would report a slot as
 * "covered" whether or not anything painted it. Deriving it means adding a stage
 * slot or an accent role shows up here automatically.
 *
 * It is also how `background`, `text` and `secondary` were found to be
 * orphaned: they were in the cart and painted nowhere, which neither the cart
 * nor a per-element read of the DOM would have told you.
 */
export interface IntendedSlot {
  role: string;
  /** The step requested for the active theme. */
  step: ShadeStep;
  purpose: string;
  usedBy: string[];
  /** `null` when the slot has neither a token nor a declared neutral. */
  slot: SlotValue | null;
  state: SlotState;
}

function intended(
  role: string,
  step: ShadeStep,
  purpose: string,
  usedBy: string[],
  slot: SlotValue | null
): IntendedSlot {
  return {
    role,
    step,
    purpose,
    usedBy,
    slot,
    state: !slot ? 'missing' : slot.onNeutral ? 'placeholder' : 'set',
  };
}

/**
 * Every slot the showcase intends to paint, resolved for one theme.
 *
 * Theme-dependent because the stage and the `on-*` halves deliberately request
 * opposite ends of the scale in light and dark — so on a light theme the same
 * inventory asks for `background-50` and `danger-950`, and coverage genuinely
 * differs between themes. Toggling the theme can therefore change which slots
 * read as set, which is correct rather than a bug.
 */
export function slotInventory(cart: CartState, theme: Theme): IntendedSlot[] {
  const out: IntendedSlot[] = [];

  for (const which of Object.keys(STAGE) as (keyof typeof STAGE)[]) {
    const spec = STAGE[which] as SlotSpec;
    const meta = STAGE_INTENT[which];
    out.push(
      intended(
        spec.role,
        spec.steps[theme],
        meta.purpose,
        meta.usedBy,
        stage(cart, which, theme)
      )
    );
  }

  for (const role of ACCENT_ROLES) {
    const pair = accent(cart, role, theme);
    out.push(
      intended(
        role,
        pair.fill?.requested ?? ACCENT.fill[theme],
        `${ACCENT_INTENT[role]} — fill`,
        ['buttons', 'cards', 'feedback'],
        pair.fill
      )
    );
    out.push(
      intended(
        role,
        pair.on?.requested ?? ACCENT.on[theme],
        `Content on the ${role} fill`,
        ['buttons', 'navigation'],
        pair.on
      )
    );
  }

  return mergeDuplicates(out);
}

/**
 * Collapse entries that resolve to the same `role-step`.
 *
 * `raised`, `border` and `divider` all request `background-800` in dark and
 * `background-200` in light — one token doing three jobs. That is worth
 * *saying* (the purposes differ) but not worth counting three times: a
 * coverage summary that reads "background-800: set, set, set" makes the numbers
 * meaningless and hides which slots are genuinely missing.
 *
 * So duplicate slots are merged into one row carrying every purpose and every
 * group that uses it. The count then answers the question a user is actually
 * asking — "how many of the slots I need do I have" — rather than "how many
 * times did the spec mention one token".
 */
function mergeDuplicates(entries: IntendedSlot[]): IntendedSlot[] {
  const merged = new Map<string, IntendedSlot>();

  for (const entry of entries) {
    const key = `${entry.role}-${entry.step}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...entry, usedBy: [...entry.usedBy] });
      continue;
    }

    // A slot can't be both set and missing; if the specs disagree, keep the
    // weaker claim so the table errs toward reporting a problem.
    const state: SlotState =
      existing.state === 'missing' || entry.state === 'missing'
        ? 'missing'
        : existing.state === 'placeholder' || entry.state === 'placeholder'
          ? 'placeholder'
          : 'set';

    merged.set(key, {
      ...existing,
      purpose: mergeText(existing.purpose, entry.purpose),
      usedBy: [...new Set([...existing.usedBy, ...entry.usedBy])],
      // Keep a real value over a neutral, so the row can still be clicked.
      slot: existing.slot && !existing.slot.onNeutral ? existing.slot : entry.slot ?? existing.slot,
      state,
    });
  }

  return [...merged.values()];
}

/** Join distinct phrases without repeating a shared prefix or duplicating text. */
function mergeText(a: string, b: string): string {
  if (a === b) return a;
  if (a.includes(b)) return a;
  if (b.includes(a)) return b;

  const prefix = a.split(',')[0]!.trim();
  if (prefix && b.startsWith(prefix)) return a;
  return `${a}; ${b}`;
}
