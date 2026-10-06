import type { ComponentChildren } from 'preact';
import { Swatch, unsetStyle } from './Swatch';
import { ACCENT, STAGE, tint, type AccentRole, type Paint, type SlotValue } from './slots';

/**
 * The dummy component kit.
 *
 * A shared vocabulary rather than one-off markup per group, for two reasons.
 *
 * First, and more importantly: a component that exists once cannot quietly mean
 * two different things. The buttons group and the overlays group both need a
 * solid button; if each drew its own, the two would drift — different padding,
 * different radius, different foreground step — and a palette that passed in one
 * group would fail in the other for no reason a user could see. One `KitButton`
 * means the same token pairing is tested in every place it appears.
 *
 * Second, it keeps each group file about *arrangement*. A group is a question
 * ("does this palette hold up in a nav bar?"), and the components are the fixed
 * vocabulary it asks the question with.
 *
 * THE ONE RULE
 *
 * No component invents a colour. Every fill, every edge, every piece of ink is a
 * `Swatch` over a slot resolved from the cart, so clicking any part of any
 * component in any group opens the popover for the exact token that painted it.
 * Where a component needs a *derivative* — a soft tint, a gradient's second
 * stop, a track behind a fill — it is derived from the same slot the click
 * target reports (`tint`, `AccentPair.soft`, `AccentPair.lift`), so the pixel
 * and the popover still cannot come apart.
 *
 * NOTHING HERE IS FUNCTIONAL. The controls are depictions, not controls: a
 * `Switch` card shows a switch at two positions, it does not toggle. They are
 * marked with `aria-hidden` and rendered as `div`s wherever the markup would
 * otherwise imply an interactive control, because a dead button that looks live
 * is worse on an accessibility-checking page than a static image of one.
 */

/* ───────────────────────────── Shared bits ───────────────────────────── */

/**
 * The three values in the fixture that are not tokens.
 *
 * All three are *shadow geometry*, not colour: a raised top edge, a lifted
 * control's drop shadow, a slider thumb's. They read as pure lightness on both
 * themes — a white overlay is a highlight over dark or light, and a black
 * shadow is a shadow over either — so there is nothing for a token to control
 * and nothing to make them drift between themes.
 *
 * Named rather than inlined because "the fixture invents no colours" is a claim
 * worth being able to check. Inlining `rgba(255,255,255,0.22)` at each call site
 * meant three separate justifications and no way to count them; here the
 * exemption is stated once, and the three uses are the whole of it.
 */
const RAISED_EDGE = 'inset 0 1px 0 rgba(255,255,255,0.22)';
const LIFTED = '0 1px 2px rgba(0,0,0,0.35)';
const LIFTED_HARD = '0 1px 3px rgba(0,0,0,0.3)';

/** The foreground step an accent uses on its own fill. */
const onStep = (paint: Paint) => ACCENT.on[paint.theme];

/** The caption-sized ink: `text` on the fixture surface, or disclosure chrome. */
function labelInk(paint: Paint): { css: string; slot: SlotValue | null } {
  return { css: paint.text?.css ?? paint.pendingInk, slot: paint.text };
}

/** Paint a block of label text, disclosed when `text` is unset. */
export function KitText({
  paint,
  children,
  class: className = '',
  as = 'span',
}: {
  paint: Paint;
  children: ComponentChildren;
  class?: string;
  as?: 'span' | 'div' | 'p';
}) {
  const ink = labelInk(paint);
  return (
    <Swatch
      slot={ink.slot}
      role="text"
      step={ink.slot?.requested ?? STAGE.text.steps[paint.theme]}
      pending={!ink.slot}
      pendingCss={paint.pendingInk}
      part="text"
      as={as}
      class={className}
      style={ink.slot ? undefined : unsetStyle(paint.theme)}
    >
      {children}
    </Swatch>
  );
}

/** The secondary ink: `text` at 400, or the fixture's own mid-grey. */
export function KitMuted({
  paint,
  children,
  class: className = '',
  as = 'span',
}: {
  paint: Paint;
  children: ComponentChildren;
  class?: string;
  as?: 'span' | 'div' | 'p';
}) {
  const slot = paint.muted;
  return (
    <Swatch
      slot={slot}
      role="text"
      step={slot?.requested ?? STAGE.muted.steps[paint.theme]}
      pending={!slot}
      pendingCss={paint.fixture.ink}
      part="text"
      as={as}
      class={className}
      style={slot ? undefined : unsetStyle(paint.theme)}
    >
      {children}
    </Swatch>
  );
}

/** A surface block: `background-900` in dark, `background-100` in light. */
export function KitSurface({
  paint,
  level = 'surface',
  class: className = '',
  style,
  children,
}: {
  paint: Paint;
  level?: 'surface' | 'raised';
  class?: string;
  style?: Record<string, string | number>;
  children?: ComponentChildren;
}) {
  const slot = level === 'raised' ? paint.fixture.raised : paint.fixture.surface;
  return (
    <Swatch
      slot={slot}
      role="background"
      step={slot?.requested ?? STAGE[level].steps[paint.theme]}
      pending={!slot}
      part="bg"
      class={className}
      style={{
        /*
          Callers ask for the edge with a bare `border` utility, and that
          utility sets a *width* only — Tailwind's preflight leaves the colour
          at `currentColor`, so every "rounded-xl border" card was drawing its
          hairline in the label's ink: a near-white 1px box on a light card, and
          the loudest line on the screen wherever the text was. The fixture's
          own border slot paints it instead, so the edge is a token like every
          other edge here.
        */
        borderColor: paint.fixture.border?.css ?? 'transparent',
        ...style,
        ...(slot ? {} : unsetStyle(paint.theme)),
      }}
    >
      {children}
    </Swatch>
  );
}

/** A hairline edge. `side` picks which border is drawn. */
export function KitEdge({
  paint,
  slot,
  side = 'all',
  width = 1,
  radius,
  class: className = '',
  children,
}: {
  paint: Paint;
  /** Defaults to the fixture hairline. */
  slot?: SlotValue | null;
  side?: 'all' | 'top' | 'bottom';
  width?: number;
  radius?: string;
  class?: string;
  children?: ComponentChildren;
}) {
  const edge = slot === undefined ? paint.fixture.border : slot;
  const sides =
    side === 'all' ? '' : side === 'top' ? 'border-t' : 'border-b';
  return (
    <Swatch
      slot={edge}
      role="background"
      step={edge?.requested ?? STAGE.border.steps[paint.theme]}
      pending={!edge}
      part="border"
      class={`${sides} ${className}`}
      style={{
        ...(sides ? { borderTopWidth: side === 'top' ? width : 0, borderBottomWidth: side === 'bottom' ? width : 0 } : {}),
        ...(!sides ? { borderWidth: width } : {}),
        ...(radius ? { borderRadius: radius } : {}),
        ...(edge ? {} : unsetStyle(paint.theme)),
      }}
    >
      {children}
    </Swatch>
  );
}

/* ─────────────────────────────── Buttons ─────────────────────────────── */

export type ButtonVariant = 'classic' | 'solid' | 'soft' | 'outline' | 'ghost';

/**
 * The five button variants.
 *
 * `classic` is the one worth arguing about. A gradient button is the single most
 * common sight in the apps people actually judge palettes against — a product
 * that only ever tests flat fills is testing a case that does not occur — and a
 * gradient is exactly where a palette fails quietly, because the foreground sits
 * on a *range* of backgrounds, not one. Its worst-case pairing is the top stop
 * against the label, which is why `lift` exists (`AccentPair.lift`): the stop is
 * derived from the pair so testing the gradient needs no extra token.
 *
 * `ghost` is borderless and unfilled, so it is the one variant whose label sits
 * directly on the card's canvas — the strictest contrast test in the group, and
 * the one most palettes fail.
 */
export function KitButton({
  paint,
  role = 'trusty-button',
  label,
  variant = 'solid',
  size = 'md',
  withIcon = false,
}: {
  paint: Paint;
  role?: AccentRole;
  label: string;
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  withIcon?: boolean;
}) {
  const pair = paint.accents[role];
  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-[13px]';
  const base = `inline-flex items-center justify-center gap-1.5 rounded-xl font-medium whitespace-nowrap ${pad} transition-all duration-150`;

  if (variant === 'outline') {
    return (
      <KitEdge
        paint={paint}
        slot={pair.fill}
        radius="0.75rem"
        class={`${base} border ${pair.fill ? '' : 'border-dashed'}`}
      >
        <Swatch
          slot={pair.fill}
          role={role}
          step={ACCENT.fill[paint.theme]}
          pending={!pair.fill}
          part="text"
          as="span"
          style={pair.fill ? undefined : unsetStyle(paint.theme)}
        >
          {label}
        </Swatch>
      </KitEdge>
    );
  }

  if (variant === 'ghost') {
    return (
      <Swatch
        slot={pair.fill}
        role={role}
        step={ACCENT.fill[paint.theme]}
        pending={!pair.fill}
        pendingCss={paint.pendingInk}
        part="text"
        as="span"
        class={`${base} hover:bg-[var(--color-surface-raised)]`}
        style={pair.fill ? undefined : unsetStyle(paint.theme)}
      >
        {label}
      </Swatch>
    );
  }

  const gradient = variant === 'classic' && pair.lift;
  const soft = variant === 'soft';

  return (
    <Swatch
      slot={pair.fill}
      role={role}
      step={ACCENT.fill[paint.theme]}
      pending={!pair.fill}
      part="bg"
      class={`${base} ${soft ? '' : 'border'} ${gradient ? '' : soft ? '' : ''}`}
      style={{
        ...(gradient
          ? { backgroundImage: `linear-gradient(135deg, ${pair.lift}, ${pair.fill?.css})` }
          : soft && pair.soft
            ? { backgroundColor: pair.soft }
            : {}),
        /*
          A raised top edge on `classic` and `solid`, where the lift is the point.
          Not applied to `soft`, which has no fill to lift.
        */
        ...(soft
          ? {}
          : { boxShadow: RAISED_EDGE }),
        borderColor: pair.fill?.css ?? 'transparent',
        ...(!pair.fill ? unsetStyle(paint.theme) : {}),
      }}
    >
      <Swatch
        slot={pair.on}
        role={role}
        step={onStep(paint)}
        pending={!pair.on}
        pendingCss={paint.pendingInk}
        part="text"
        as="span"
        style={!pair.on ? unsetStyle(paint.theme) : undefined}
      >
        {label}
      </Swatch>
      {withIcon && <ArrowIcon css={pair.on?.css ?? paint.pendingInk} />}
    </Swatch>
  );
}

/** The chevron that sits in the reference button. Purely decorative. */
function ArrowIcon({ css }: { css: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={2}
      stroke={css}
      class="w-3.5 h-3.5 shrink-0"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  );
}

/**
 * A square icon-only button.
 *
 * The icon inside is `currentColor` — an icon is not a colour decision, it is
 * whatever the button's own foreground is, so giving it a slot of its own would
 * let a user set a border colour and an icon colour that disagree. It is marked
 * `aria-hidden` because there is no accessible name to give it: it is a
 * depiction, and pretending otherwise adds an empty button to the tab order.
 */
export function KitIconButton({
  paint,
  role = 'primary',
  glyph,
  variant = 'soft',
}: {
  paint: Paint;
  role?: AccentRole;
  glyph: 'plus' | 'check' | 'x' | 'dots';
  variant?: 'solid' | 'soft' | 'outline';
}) {
  const pair = paint.accents[role];
  return (
    <Swatch
      slot={pair.fill}
      role={role}
      step={ACCENT.fill[paint.theme]}
      pending={!pair.fill}
      part={variant === 'outline' ? 'border' : 'bg'}
      aria-hidden="true"
      class="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all duration-150"
      style={{
        ...(variant !== 'outline' && variant === 'soft' && pair.soft
          ? { backgroundColor: pair.soft }
          : {}),
        ...(variant === 'outline' ? { borderWidth: 1, borderColor: pair.fill?.css ?? 'transparent' } : {}),
        ...(!pair.fill ? unsetStyle(paint.theme) : {}),
      }}
    >
      <Glyph name={glyph} css={pair.on?.css ?? paint.pendingInk} />
    </Swatch>
  );
}

function Glyph({ name, css }: { name: 'plus' | 'check' | 'x' | 'dots'; css: string }) {
  const common = { stroke: css, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" class="w-4 h-4" {...common}>
      {name === 'plus' && <path d="M12 5v14M5 12h14" />}
      {name === 'check' && <path d="m4 12 5 5L20 6" />}
      {name === 'x' && <path d="M6 6l12 12M18 6 6 18" />}
      {name === 'dots' && (
        <>
          <circle cx="5" cy="12" r="1.6" fill={css} stroke="none" />
          <circle cx="12" cy="12" r="1.6" fill={css} stroke="none" />
          <circle cx="19" cy="12" r="1.6" fill={css} stroke="none" />
        </>
      )}
    </svg>
  );
}

/** A row of icon buttons — the shape a toolbar actually takes. */
export function KitIconRow({ paint, role = 'primary' }: { paint: Paint; role?: AccentRole }) {
  return (
    <div class="flex items-center gap-1.5">
      <KitIconButton paint={paint} role={role} glyph="plus" variant="solid" />
      <KitIconButton paint={paint} role={role} glyph="check" variant="soft" />
      <KitIconButton paint={paint} role={role} glyph="dots" variant="outline" />
    </div>
  );
}

/* ─────────────────────────── Selection controls ─────────────────────── */

/**
 * A switch, drawn at one position.
 *
 * The knob is painted from the accent's *own* foreground, not from white. White
 * is what a real switch uses, and that is precisely why it is wrong here: a knob
 * that is always white cannot tell you whether `--color-primary-50` exists, and
 * it is the one element sitting directly on the fill where a broken pair is
 * least visible. Painting it from `on` turns the switch into a second, smaller
 * copy of the button's own test.
 */
export function KitSwitch({ paint, role = 'primary', on = true }: { paint: Paint; role?: AccentRole; on?: boolean }) {
  const pair = paint.accents[role];
  const track = on ? pair.fill : paint.fixture.border;
  return (
    <Swatch
      slot={track}
      role={on ? role : 'background'}
      step={on ? ACCENT.fill[paint.theme] : (paint.fixture.border?.requested ?? 800)}
      pending={!track}
      part="bg"
      aria-hidden="true"
      class="w-12 h-7 shrink-0 rounded-full flex items-center p-0.5 transition-all duration-150"
      style={!track ? unsetStyle(paint.theme) : undefined}
    >
      <span
        class="w-6 h-6 rounded-full shrink-0"
        style={{
          transform: `translateX(${on ? 22 : 0}px)`,
          backgroundColor: (on ? (pair.on?.css ?? paint.pendingInk) : paint.fixture.ink),
          boxShadow: LIFTED,
        }}
      />
    </Swatch>
  );
}

/** A switch with its label — the form control people actually ship. */
export function KitSwitchRow({ paint, role = 'primary', label = 'Notify me' }: { paint: Paint; role?: AccentRole; label?: string }) {
  return (
    <div class="flex items-center justify-between gap-3 w-full">
      <KitText paint={paint}>{label}</KitText>
      <KitSwitch paint={paint} role={role} on />
    </div>
  );
}

/** A checkbox at one state. The tick sits on the fill, so it is painted `on`. */
export function KitCheckbox({ paint, role = 'primary', checked = true }: { paint: Paint; role?: AccentRole; checked?: boolean }) {
  const pair = paint.accents[role];
  return (
    <Swatch
      slot={pair.fill}
      role={role}
      step={ACCENT.fill[paint.theme]}
      pending={!pair.fill}
      part={checked ? 'bg' : 'border'}
      aria-hidden="true"
      class="w-5 h-5 shrink-0 rounded flex items-center justify-center transition-all duration-150"
      style={{
        ...(checked ? {} : { borderWidth: 1.5 }),
        borderColor: pair.fill?.css ?? 'transparent',
        ...(!pair.fill ? unsetStyle(paint.theme) : {}),
      }}
    >
      {checked && (
        <svg aria-hidden="true" viewBox="0 0 16 16" fill={pair.on?.css ?? paint.pendingInk} class="w-3.5 h-3.5">
          <path
            fill-rule="evenodd"
            d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
            clip-rule="evenodd"
          />
        </svg>
      )}
    </Swatch>
  );
}

export function KitCheckboxRow({ paint, label, role = 'primary', checked = true }: { paint: Paint; label: string; role?: AccentRole; checked?: boolean }) {
  return (
    <div class="flex items-center gap-2.5">
      <KitCheckbox paint={paint} role={role} checked={checked} />
      <KitText paint={paint}>{label}</KitText>
    </div>
  );
}

/** A radio at one state. The dot is the fill itself, inside an `on` ring. */
export function KitRadio({ paint, role = 'primary', selected = true }: { paint: Paint; role?: AccentRole; selected?: boolean }) {
  const pair = paint.accents[role];
  return (
    <Swatch
      slot={pair.fill}
      role={role}
      step={ACCENT.fill[paint.theme]}
      pending={!pair.fill}
      part="border"
      aria-hidden="true"
      class="w-5 h-5 shrink-0 rounded-full flex items-center justify-center transition-all duration-150"
      style={{ borderWidth: 1.5, ...(!pair.fill ? unsetStyle(paint.theme) : {}) }}
    >
      {selected && (
        <span
          class="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: pair.fill?.css ?? 'transparent' }}
        />
      )}
    </Swatch>
  );
}

export function KitRadioRow({ paint, label, role = 'primary', selected = true }: { paint: Paint; label: string; role?: AccentRole; selected?: boolean }) {
  return (
    <div class="flex items-center gap-2.5">
      <KitRadio paint={paint} role={role} selected={selected} />
      <KitText paint={paint}>{label}</KitText>
    </div>
  );
}

/**
 * A slider at one position.
 *
 * Three slots in five pixels of height, which is why it earns a card: the track
 * is the *raised* step, the fill is the accent at 500, and the thumb is the
 * accent's foreground with an accent border — three different roles of the same
 * scale, stacked, in the tightest space on the page. A palette that separates
 * `primary-400` from `primary-500` shows it here first.
 */
export function KitSlider({ paint, role = 'primary', at = 0.5 }: { paint: Paint; role?: AccentRole; at?: number }) {
  const pair = paint.accents[role];
  const pct = Math.round(Math.min(1, Math.max(0, at)) * 100);
  return (
    <div class="w-full py-4" aria-hidden="true">
      <div class="relative h-3 rounded-full overflow-hidden" style={{ backgroundColor: paint.fixture.raised?.css ?? 'transparent' }}>
        <Swatch
          slot={pair.fill}
          role={role}
          step={ACCENT.fill[paint.theme]}
          pending={!pair.fill}
          part="bg"
          class="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, backgroundColor: pair.fill?.css ?? 'transparent' }}
        />
      </div>
      <div class="relative h-0">
        <span
          class="absolute w-5 h-5 rounded-full"
          style={{
            left: `${pct}%`,
            transform: 'translateX(-50%)',
            top: '-19px',
            backgroundColor: pair.on?.css ?? paint.pendingInk,
            border: `2px solid ${pair.fill?.css ?? 'transparent'}`,
            boxShadow: LIFTED_HARD,
          }}
        />
      </div>
    </div>
  );
}

/* ──────────────────────────── Badges & avatars ──────────────────────── */

export function KitBadge({
  paint,
  role = 'info',
  label = 'New',
  variant = 'solid',
}: {
  paint: Paint;
  role?: AccentRole;
  label?: string;
  variant?: 'solid' | 'soft' | 'outline';
}) {
  const pair = paint.accents[role];
  const base = 'px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all duration-150';

  if (variant === 'outline') {
    return (
      <KitEdge paint={paint} slot={pair.fill} radius="9999px" class={base}>
        <Swatch slot={pair.fill} role={role} step={ACCENT.fill[paint.theme]} pending={!pair.fill} part="text" as="span" style={pair.fill ? undefined : unsetStyle(paint.theme)}>
          {label}
        </Swatch>
      </KitEdge>
    );
  }

  return (
    <Swatch
      slot={pair.fill}
      role={role}
      step={ACCENT.fill[paint.theme]}
      pending={!pair.fill}
      part="bg"
      class={base}
      style={{
        ...(variant === 'soft' && pair.soft ? { backgroundColor: pair.soft } : {}),
        ...(!pair.fill ? unsetStyle(paint.theme) : {}),
      }}
    >
      <Swatch
        slot={pair.on}
        role={role}
        step={onStep(paint)}
        pending={!pair.on}
        pendingCss={paint.pendingInk}
        part="text"
        as="span"
        style={!pair.on ? unsetStyle(paint.theme) : undefined}
      >
        {label}
      </Swatch>
    </Swatch>
  );
}

/**
 * An initial avatar.
 *
 * `gradient` exists for the same reason `classic` does on the button: a real app
 * shows gradient avatars constantly, and a gradient is a second, differently
 * weighted test of the same pair. The ring around it is `on` — a thin light edge
 * is how avatars stay legible when they overlap, which is the other thing a
 * palette gets wrong.
 */
export function KitAvatar({
  paint,
  role = 'primary',
  initials = 'EV',
  variant = 'solid',
  size = 40,
}: {
  paint: Paint;
  role?: AccentRole;
  initials?: string;
  variant?: 'solid' | 'gradient' | 'soft' | 'ring';
  size?: number;
}) {
  const pair = paint.accents[role];
  const box = { width: size, height: size };
  const textSize = Math.max(11, size * 0.325);
  return (
    <div
      aria-hidden="true"
      class="rounded-full shrink-0 flex items-center justify-center font-semibold"
      style={{ ...box, fontSize: textSize }}
    >
      <Swatch
        slot={pair.fill}
        role={role}
        step={ACCENT.fill[paint.theme]}
        pending={!pair.fill}
        part="bg"
        class="w-full h-full rounded-full flex items-center justify-center"
        style={{
          ...(variant === 'gradient' && pair.lift
            ? { backgroundImage: `linear-gradient(135deg, ${pair.lift}, ${pair.fill?.css})` }
            : {}),
          ...(variant === 'soft' && pair.soft ? { backgroundColor: pair.soft } : {}),
          ...(variant === 'ring' && pair.on?.css ? { boxShadow: `inset 0 0 0 2px ${pair.on.css}` } : {}),
          ...(!pair.fill ? unsetStyle(paint.theme) : {}),
        }}
      >
        <Swatch
          slot={pair.on}
          role={role}
          step={onStep(paint)}
          pending={!pair.on}
          pendingCss={paint.pendingInk}
          part="text"
          as="span"
          style={!pair.on ? unsetStyle(paint.theme) : undefined}
        >
          {initials}
        </Swatch>
      </Swatch>
    </div>
  );
}

/** Overlapping avatars — the density test, and where a ring earns its place. */
export function KitAvatarStack({ paint, role = 'primary' }: { paint: Paint; role?: AccentRole }) {
  const others: AccentRole[] = ['success', 'warning', 'danger'];
  return (
    <div class="flex items-center">
      <KitAvatar paint={paint} role={role} initials="EV" variant="ring" size={30} />
      {others.map((r, i) => (
        // A div, not a span: KitAvatar's root is a div, and the HTML parser
        // re-parents a div out of a span — which would detach the avatar from
        // the click target its slot owns.
        <div key={r} style={{ marginLeft: i === 0 ? -10 : 0 }}>
          <KitAvatar paint={paint} role={r} initials={r.slice(0, 2).toUpperCase()} variant="ring" size={30} />
        </div>
      ))}
      <KitBadge paint={paint} role={role} label="+9" variant="soft" />
    </div>
  );
}

/* ──────────────────────────────── Inputs ─────────────────────────────── */

export type FieldKind = 'input' | 'textarea' | 'select';

/**
 * A labelled field.
 *
 * The whole point of a form card is the *stack* of three roles in one control:
 * the label in `text`, the content in `text` on `surface`, the edge in
 * `background`. Every one of those has to hold at once or the field is unusable,
 * which is why the field is a single card here rather than a row of inputs.
 *
 * `invalid` is the state worth showing: it moves the edge to `danger` and the
 * message to `danger`, and a palette that reads fine in grey and then fails once
 * the red lands is the most common failure this page finds.
 *
 * Each part (label, input background, input border, input text, error text) is
 * independently selectable for token testing.
 */
export function KitField({
  paint,
  label,
  value,
  kind = 'input',
  invalid = false,
  hint,
}: {
  paint: Paint;
  label: string;
  value: string;
  kind?: FieldKind;
  invalid?: boolean;
  hint?: string;
}) {
  const edge = invalid ? paint.accents.danger.fill : paint.fixture.border;
  const rows = kind === 'textarea' ? 3 : 1;

  return (
    <div class="w-full space-y-1.5">
      <KitText paint={paint} class="block text-[12px] font-medium">
        {label}
      </KitText>

      <Swatch
        slot={edge}
        role={invalid ? 'danger' : 'background'}
        step={edge?.requested ?? 800}
        pending={!edge}
        part="border"
        class={`w-full rounded-xl px-3 py-2.5 text-[13px] ${rows > 1 ? 'leading-[18px]' : ''}`}
        style={{
          backgroundColor: paint.fixture.surface?.css ?? 'transparent',
          borderWidth: 1,
          ...(rows > 1 ? { height: 'auto', minHeight: '72px' } : {}),
          ...(edge ? {} : unsetStyle(paint.theme)),
        }}
      >
        <Swatch
          slot={paint.text}
          role="text"
          step={paint.text?.requested ?? STAGE.text.steps[paint.theme]}
          pending={!paint.text}
          pendingCss={paint.pendingInk}
          part="text"
          as="span"
          style={paint.text ? undefined : unsetStyle(paint.theme)}
        >
          {value}
        </Swatch>
        {kind === 'select' && (
          <svg aria-hidden="true" viewBox="0 0 24 24" class="w-3.5 h-3.5 shrink-0" fill="none" strokeWidth={2} stroke={paint.fixture.ink}>
            <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
          </svg>
        )}
      </Swatch>

      {invalid ? (
        <Swatch
          slot={paint.accents.danger.fill}
          role="danger"
          step={ACCENT.fill[paint.theme]}
          pending={!paint.accents.danger.fill}
          pendingCss={paint.pendingInk}
          part="text"
          as="span"
          class="block text-[11px]"
          style={paint.accents.danger.fill ? undefined : unsetStyle(paint.theme)}
        >
          {hint ?? 'That value is not a valid OKLCH triple.'}
        </Swatch>
      ) : hint ? (
        <KitMuted paint={paint} class="block text-[11px]">
          {hint}
        </KitMuted>
      ) : null}
    </div>
  );
}

/* ─────────────────────────── Navigation pieces ──────────────────────── */

/**
 * An underline tab strip.
 *
 * The active tab is the accent used three ways at once — text, 2px underline,
 * and nothing else — which makes it the tightest test of `primary-500` against
 * `primary-50` in the whole showcase: two of the three pairings sit only a few
 * pixels apart, so any drift between the steps is visible here before it is
 * visible anywhere else.
 */
export function KitTabs({ paint, items, active = 0 }: { paint: Paint; items: string[]; active?: number }) {
  const pair = paint.accents.primary;
  return (
    <div class="w-full">
      <KitEdge paint={paint} side="bottom" slot={paint.fixture.border} class="flex items-end gap-1">
        {items.map((item, i) => {
          const on = i === active;
          return (
            <div key={item} class={`px-3 py-2.5 text-[13px] font-medium whitespace-nowrap ${on ? '' : ''}`}>
              <Swatch
                slot={on ? pair.fill : paint.text}
                role={on ? 'primary' : 'text'}
                step={on ? ACCENT.fill[paint.theme] : (paint.text?.requested ?? 100)}
                pending={on ? !pair.fill : !paint.text}
                pendingCss={paint.pendingInk}
                part="text"
                as="span"
                style={on ? undefined : { color: paint.text ? undefined : undefined }}
              >
                {item}
              </Swatch>
              {on && (
                <span
                  class="block h-0.5 rounded-full mt-1.5"
                  style={{ backgroundColor: pair.fill?.css ?? 'transparent' }}
                />
              )}
            </div>
          );
        })}
      </KitEdge>
    </div>
  );
}

/**
 * A search field with a leading glyph.
 *
 * The glyph is `muted`, not the accent: an icon that shares a colour with the
 * text it sits beside cannot be told apart from it, and a search box where the
 * magnifier and the query look the same is the classic way a de-emphasis role
 * quietly stops working.
 */
export function KitSearch({ paint, placeholder = 'Search palettes' }: { paint: Paint; placeholder?: string }) {
  return (
    <Swatch
      slot={paint.fixture.border}
      role="background"
      step={paint.fixture.border?.requested ?? 800}
      pending={!paint.fixture.border}
      part="border"
      class="w-full rounded-xl px-3.5 py-2.5 flex items-center gap-2 transition-all duration-150"
      style={{ backgroundColor: paint.fixture.surface?.css ?? 'transparent', borderWidth: 1, ...(paint.fixture.border ? {} : unsetStyle(paint.theme)) }}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" class="w-3.5 h-3.5 shrink-0" fill="none" strokeWidth={2} stroke={paint.fixture.ink}>
        <circle cx="11" cy="11" r="7" />
        <path stroke-linecap="round" d="m20 20-3.5-3.5" />
      </svg>
      <KitMuted paint={paint} class="text-[12px] flex-1">
        {placeholder}
      </KitMuted>
    </Swatch>
  );
}

/** A dropdown row: leading glyph, label, trailing affordance. */
export function KitMenuRow({
  paint,
  label,
  trailing,
  selected = false,
  role = 'primary',
  glyph = 'dots',
}: {
  paint: Paint;
  label: string;
  trailing?: string;
  selected?: boolean;
  role?: AccentRole;
  glyph?: 'plus' | 'check' | 'x' | 'dots';
}) {
  const pair = paint.accents[role];
  return (
    <div
      class={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] ${selected ? '' : ''}`}
      style={selected && pair.soft ? { backgroundColor: pair.soft } : undefined}
    >
      <span class="shrink-0" style={{ color: selected ? (pair.fill?.css ?? paint.pendingInk) : paint.fixture.ink }}>
        <Glyph name={glyph} css={selected ? (pair.fill?.css ?? paint.pendingInk) : paint.fixture.ink} />
      </span>
      <KitText paint={paint} class="flex-1 truncate">
        {label}
      </KitText>
      {trailing && <KitMuted paint={paint} class="text-[11px]">{trailing}</KitMuted>}
    </div>
  );
}

/** A stacked set of menu rows inside one raised surface. */
export function KitMenu({ paint, rows, selected = 0 }: { paint: Paint; rows: { label: string; trailing?: string }[]; selected?: number }) {
  return (
    <KitSurface paint={paint} level="raised" class="w-full rounded-xl border p-1" style={undefined}>
      {rows.map((row, i) => (
        <KitMenuRow key={row.label} paint={paint} label={row.label} trailing={row.trailing} selected={i === selected} />
      ))}
    </KitSurface>
  );
}

/* ─────────────────────────── Feedback & data ────────────────────────── */

export function KitProgress({ paint, role = 'primary', at = 0.62 }: { paint: Paint; role?: AccentRole; at?: number }) {
  const pair = paint.accents[role];
  return (
    <div class="w-full space-y-1.5">
      <div class="h-2.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: paint.fixture.raised?.css ?? 'transparent' }}>
        <Swatch
          slot={pair.fill}
          role={role}
          step={ACCENT.fill[paint.theme]}
          pending={!pair.fill}
          part="bg"
          class="h-full rounded-full"
          style={{ width: `${Math.round(at * 100)}%`, backgroundColor: pair.fill?.css ?? 'transparent' }}
        />
      </div>
      <KitMuted paint={paint} class="text-[11px]">
        Converting · {Math.round(at * 100)}%
      </KitMuted>
    </div>
  );
}

/**
 * An alert. The soft fill is the accent at `ACCENT.softAlpha` over the canvas —
 * a tint, not a token, so the four tones can share one card without the page
 * needing four more slots per role.
 */
export function KitAlert({
  paint,
  role,
  title,
  body,
}: {
  paint: Paint;
  role: AccentRole;
  title: string;
  body: string;
}) {
  const pair = paint.accents[role];
  return (
    <Swatch
      slot={pair.fill}
      role={role}
      step={ACCENT.fill[paint.theme]}
      pending={!pair.fill}
      part="soft"
      class="w-full rounded-xl border px-3 py-2.5"
      style={{
        backgroundColor: pair.soft ?? 'transparent',
        borderColor: pair.fill ? tint(pair.fill.css, 0.42) : 'transparent',
        borderWidth: 1,
      }}
    >
      <Swatch
        slot={pair.fill}
        role={role}
        step={ACCENT.fill[paint.theme]}
        pending={!pair.fill}
        part="text"
        as="span"
        class="block text-[12px] font-semibold"
        style={pair.fill ? undefined : { borderStyle: 'dashed' }}
      >
        {title}
      </Swatch>
      <KitMuted paint={paint} class="block text-[11px] mt-0.5 leading-[15px]">
        {body}
      </KitMuted>
    </Swatch>
  );
}

/** A stat tile: big value, small caption, optional delta. */
export function KitStat({
  paint,
  label,
  value,
  delta,
  deltaRole = 'success',
}: {
  paint: Paint;
  label: string;
  value: string;
  delta?: string;
  deltaRole?: AccentRole;
}) {
  return (
    <div class="w-full space-y-1">
      <KitMuted paint={paint} class="block text-[11px] uppercase tracking-wide">
        {label}
      </KitMuted>
      <div class="flex items-baseline gap-2">
        <KitText paint={paint} class="text-[22px] font-semibold leading-none tracking-tight">
          {value}
        </KitText>
        {delta && (
          <Swatch
            slot={paint.accents[deltaRole].fill}
            role={deltaRole}
            step={ACCENT.fill[paint.theme]}
            pending={!paint.accents[deltaRole].fill}
            pendingCss={paint.pendingInk}
            part="text"
            as="span"
            class="text-[11px] font-medium"
            style={paint.accents[deltaRole].fill ? undefined : { borderStyle: 'dashed' }}
          >
            {delta}
          </Swatch>
        )}
      </div>
    </div>
  );
}

/**
 * A bar chart.
 *
 * Bars are painted from the six accent roles at 500, in a fixed order, on the
 * canvas. It is the only place all six are adjacent, so it is where two roles
 * that are too close together to tell apart on their own become obvious — and
 * `success` against `warning` is the classic offender.
 */
export function KitBars({ paint, values }: { paint: Paint; values?: number[] }) {
  const roles: AccentRole[] = ['primary', 'secondary', 'success', 'warning', 'danger', 'info'];
  const data = values ?? [0.82, 0.61, 0.74, 0.45, 0.33, 0.68];
  return (
    <div class="w-full space-y-2">
      <div class="flex items-end gap-1.5 h-28" aria-hidden="true">
        {roles.map((role, i) => (
          <Swatch
            key={role}
            slot={paint.accents[role].fill}
            role={role}
            step={ACCENT.fill[paint.theme]}
            pending={!paint.accents[role].fill}
            part="bg"
            class="flex-1 rounded-t-md transition-all duration-150 hover:scale-y-[1.05] origin-bottom"
            style={{ height: `${Math.round(data[i]! * 100)}%`, backgroundColor: paint.accents[role].fill?.css ?? 'transparent' }}
          />
        ))}
      </div>
      <KitEdge paint={paint} side="bottom" class="flex items-center gap-1.5">
        <span class="flex-1" />
      </KitEdge>
      <div class="flex items-center gap-1.5">
        {roles.map((role) => (
          <span key={role} class="flex-1 flex justify-center">
            <span
              class="w-2 h-2 rounded-sm"
              style={{ backgroundColor: paint.accents[role].fill?.css ?? 'transparent' }}
            />
          </span>
        ))}
      </div>
      <KitMuted paint={paint} class="block text-center text-[10px]">
        One bar per accent role
      </KitMuted>
    </div>
  );
}

/** A donut: four arcs of the accent roles on one ring. */
export function KitDonut({ paint }: { paint: Paint }) {
  const roles: AccentRole[] = ['primary', 'success', 'warning', 'info'];
  return (
    <div class="flex flex-col items-center gap-2.5">
      <svg viewBox="0 0 36 36" class="w-28 h-28 -rotate-90" aria-hidden="true">
        <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="5" stroke={paint.fixture.raised?.css ?? 'transparent'} />
        {roles.map((role, i) => (
          <circle
            key={role}
            cx="18"
            cy="18"
            r="15.9"
            fill="none"
            strokeWidth="5"
            stroke={paint.accents[role].fill?.css ?? 'transparent'}
            strokeDasharray={`${[30, 22, 16, 12][i]!} ${100 - [30, 22, 16, 12][i]!}`}
            strokeDashoffset={-[0, -32, -56, -74][i]!}
          />
        ))}
      </svg>
      <div class="flex items-center gap-2.5">
        {roles.map((role) => (
          <span key={role} class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-sm" style={{ backgroundColor: paint.accents[role].fill?.css ?? 'transparent' }} />
            <KitMuted paint={paint} class="text-[10px]">
              {role.slice(0, 4)}
            </KitMuted>
          </span>
        ))}
      </div>
    </div>
  );
}

/** A list row: leading avatar, two lines of text, trailing value. */
export function KitListRow({
  paint,
  title,
  meta,
  trailing,
  role = 'primary',
}: {
  paint: Paint;
  title: string;
  meta?: string;
  trailing?: string;
  role?: AccentRole;
}) {
  return (
    <div class="flex items-center gap-2.5 py-2">
      <KitAvatar paint={paint} role={role} initials={title.slice(0, 2).toUpperCase()} size={28} />
      <div class="min-w-0 flex-1">
        <KitText paint={paint} class="block text-[12px] truncate">
          {title}
        </KitText>
        {meta && (
          <KitMuted paint={paint} class="block text-[10px] truncate">
            {meta}
          </KitMuted>
        )}
      </div>
      {trailing && (
        <KitMuted paint={paint} class="text-[11px] shrink-0 tabular-nums">
          {trailing}
        </KitMuted>
      )}
    </div>
  );
}

/** A nav row for a sidebar: glyph, label, and a trailing count. */
export function KitNavRow({
  paint,
  label,
  active = false,
  trailing,
}: {
  paint: Paint;
  label: string;
  active?: boolean;
  trailing?: string;
}) {
  const pair = paint.accents.primary;
  return (
    <div
      class={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] ${active ? 'font-semibold' : ''}`}
      style={active && pair.soft ? { backgroundColor: pair.soft } : undefined}
    >
      <span
        class="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: active ? (pair.fill?.css ?? 'transparent') : paint.fixture.border?.css ?? 'transparent' }}
      />
      <KitText paint={paint} class="flex-1 truncate">
        {label}
      </KitText>
      {trailing && (
        <KitMuted paint={paint} class="text-[10px] tabular-nums">
          {trailing}
        </KitMuted>
      )}
    </div>
  );
}

/** A toolbar: a title, a search, and one icon action. */
export function KitToolbar({ paint, title, role = 'primary' }: { paint: Paint; title: string; role?: AccentRole }) {
  return (
    <div class="w-full space-y-2.5">
      <div class="flex items-center gap-2.5">
        <KitAvatar paint={paint} role={role} initials={title.slice(0, 2).toUpperCase()} size={28} />
        <KitText paint={paint} class="text-[12px] font-semibold flex-1 truncate">
          {title}
        </KitText>
        <KitIconButton paint={paint} role={role} glyph="plus" variant="soft" />
      </div>
      <KitSearch paint={paint} />
    </div>
  );
}

/** A breadcrumb trail. The current page is ink; everything before it is muted. */
export function KitBreadcrumbs({ paint, items }: { paint: Paint; items: string[] }) {
  return (
    <div class="flex items-center gap-1.5 text-[11px] flex-wrap">
      {items.map((item, i) => (
        <span key={item} class="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden="true" style={{ color: paint.fixture.ink }}>/</span>}
          {i === items.length - 1 ? (
            <KitText paint={paint} class="font-medium">
              {item}
            </KitText>
          ) : (
            <KitMuted paint={paint}>{item}</KitMuted>
          )}
        </span>
      ))}
    </div>
  );
}

/** An empty state: glyph, headline, one line of guidance, one action. */
export function KitEmptyState({ paint }: { paint: Paint }) {
  return (
    <div class="flex flex-col items-center gap-2.5 text-center p-2">
      <div
        class="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ backgroundColor: paint.fixture.raised?.css ?? 'transparent' }}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" class="w-6 h-6" fill="none" strokeWidth={1.75} stroke={paint.fixture.ink}>
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M4 12h10M4 17h7" />
        </svg>
      </div>
      <KitText paint={paint} class="text-[12px] font-semibold">
        Nothing saved yet
      </KitText>
      <KitMuted paint={paint} class="text-[10px] leading-[14px]">
        Collections you pin will show up here.
      </KitMuted>
      <KitButton paint={paint} role="trusty-button" label="New palette" variant="soft" size="sm" />
    </div>
  );
}

/** A two-column key/value block — the shape a settings page actually has. */
export function KitSettingRow({ paint, label, control }: { paint: Paint; label: string; control?: ComponentChildren }) {
  return (
    <div class="flex items-center justify-between gap-3 py-2">
      <KitText paint={paint} class="text-[12px]">
        {label}
      </KitText>
      {control ?? <KitSwitch paint={paint} role="primary" on={false} />}
    </div>
  );
}

/**
 * A toast-like surface with a tone rule down its leading edge.
 * Used in FeedbackGroup for toast previews.
 */
export function KitSurfaceish({
  paint,
  tone,
  children,
}: {
  paint: Paint;
  tone: AccentRole;
  children: preact.ComponentChildren;
}) {
  const pair = paint.accents[tone];
  return (
    <div class="w-full flex items-stretch gap-2.5">
      <span
        class="w-[3px] rounded-full shrink-0"
        style={{ backgroundColor: pair.fill?.css ?? 'transparent' }}
      />
      <div class="flex-1 rounded-xl border px-3 py-2" style={{ borderColor: paint.fixture.border?.css ?? 'transparent', backgroundColor: paint.fixture.raised?.css ?? 'transparent' }}>
        <KitText paint={paint} class="block text-[12px] leading-[16px]">
          {children}
        </KitText>
        <KitMuted paint={paint} class="block text-[10px] mt-0.5">
          just now
        </KitMuted>
      </div>
    </div>
  );
}
