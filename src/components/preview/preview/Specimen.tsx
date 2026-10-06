import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { Swatch, unsetStyle } from './Swatch';
import { FIXTURE_NEUTRALS, STAGE, type Paint, type Theme } from './slots';
import { usePaintPair } from './theme';

/**
 * The rail and the card each dummy component is mounted on.
 *
 * WHY A CARD AND NOT A LOOSE ROW OF BUTTONS
 *
 * The showcase used to lay components straight onto a wide bordered canvas, and
 * it read as *part of this site*: same grey ramp, same hairlines, same mono
 * captions, same button geometry. That is actively harmful here. The page's
 * claim is "these colours survive contact with a real product", and it cannot
 * make that claim while the product it is imitating is the one wrapping it.
 *
 * So each component gets a fixed square with its own app background, its own
 * surface behind the caption, and a caption that reads like a component
 * catalogue entry — `Button · Classic`, not `Solid`. Nine cards in a rail, each
 * the same size, so two components are always compared at the same scale and on
 * the same backdrop. That is the comparison the page is for; a dense canvas
 * never made it, because a 3px switch and a 44px button competed for attention
 * rather than being judged side by side.
 *
 * WHAT IS DELIBERATELY NOT HERE
 *
 * No motion. The reference markup this replaced carried a 1000ms
 * `transition-all` and a drifting marquee, which meant a component could be
 * halfway through a colour interpolation at the moment you looked at it — the
 * preview would report a contrast ratio for a colour nobody could see. Nothing
 * here animates in or moves; the only transition on the page is the 150ms
 * colour change when you retune a token, so a repaint reads as a direct
 * consequence of your edit.
 */

/** Fixed card width. Every specimen is the same size, so nothing out-scales. */
const CARD = 'w-[16rem] h-[16rem] shrink-0 lg:w-[18rem] lg:h-[18rem]';

/**
 * A labelled horizontal rail of specimen cards.
 *
 * RESPONSIVE, AND WHO DECIDES
 *
 * The wrap/scroll decision belongs to `.fixture-rail` in `global.css`, not to
 * utilities here, because it is a *container* question: the preview column can
 * be wide or narrow at any viewport (the token panel beside it is variable
 * width), so a `lg:` viewport variant would wrap cards the reader cannot
 * actually fit and scroll cards they could. The rail therefore wraps once its
 * own container reaches 48rem — see the `@container` block in `global.css`.
 *
 * Below that, the rail scrolls sideways with a visible scrollbar and a fade at
 * the right edge. That is the mobile contract: a rail always reads
 * left-to-right as one comparison set, and cards never stack into a column you
 * have to scroll *down* through to reach the panel below.
 */
export function Rail({
  label,
  description,
  hint,
  hintPass,
  children,
}: {
  label: string;
  description?: string;
  hint?: string;
  hintPass?: boolean;
  children: ComponentChildren;
}) {
  return (
    <section class="space-y-2.5">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <span class="eyebrow block">{label}</span>
          {description && <p class="mt-1 prose-hud text-[12px] leading-[17px]">{description}</p>}
        </div>
        {hint && (
          /*
            The grade is carried by ink weight, never by a hue. A traffic light
            here would teach the reader that amber means "failed contrast" and
            also "outside sRGB", and on a page about colour that is one
            ambiguity too many.
          */
          <span
            class={`pill shrink-0 ${
              hintPass === false
                ? 'bg-canvas-elevated border-border-focus text-ink'
                : hintPass === true
                  ? 'border-transparent text-mute'
                  : 'border-transparent text-faint'
            }`}
          >
            {hint}
          </span>
        )}
      </div>

      {/*
        The rail bleeds to the viewport edges below `lg` so a card can be
        scrolled fully into view rather than stopping 16px short of the edge;
        the horizontal scroll itself, the wrap breakpoint and the scrollbar
        gutter are all owned by `.fixture-rail` — see `Rail` above for why.
      */}
      <div class="relative">
        <div class="fixture-rail -mx-4 px-4 lg:mx-0 lg:px-0">{children}</div>
        {/* Right-edge scroll hint. Hidden by container query once the rail wraps. */}
        <div
          class="rail-fade absolute inset-x-0 bottom-0 h-4 bg-gradient-to-l from-canvas via-canvas/50 to-transparent pointer-events-none"
          aria-hidden="true"
        />
      </div>
    </section>
  );
}

/**
 * The Dark/Light pills in a card's caption bar.
 *
 * Chrome, not a specimen: this is the fixture's own furniture, so it is painted
 * from the card's caption ink (`f.ink`) and hairline rather than from a token
 * slot — it must never become something the reader thinks they authored. It
 * carries no `data-context-role`, and it stops propagation, so clicking it
 * flips the theme instead of opening the colour popover for the card's edge.
 */
function ThemeToggle({
  theme,
  active,
  ink,
  onInk,
  edge,
  onPick,
}: {
  theme: Theme;
  active: boolean;
  /** Caption ink — the one colour this chrome is allowed to borrow. */
  ink: string;
  /** What to write *on* that ink: the bar's own surface, so the pill inverts to match it. */
  onInk: string;
  /** The card's hairline, for the inactive state's edge. */
  edge: string;
  onPick: (t: Theme) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`Paint this card with the ${theme} theme`}
      title={`Paint this card with the ${theme} theme — this card only, the rest of the page follows the Dark/Light control above`}
      onClick={(e) => {
        // The card's own edge is a swatch, and every click in the preview
        // column routes through `closest('[data-context-role]')` — without
        // this, picking a theme would open the colour popover for
        // `--color-background-*` instead of repainting the card.
        e.stopPropagation();
        onPick(theme);
      }}
      onContextMenu={(e) => e.stopPropagation()}
      class="shrink-0 flex items-center h-[18px] px-1.5 rounded-full border text-[9px] font-bold uppercase tracking-[0.07em] leading-none"
      style={{
        borderColor: active ? ink : edge,
        backgroundColor: active ? ink : 'transparent',
        /*
          Both states sit at full ink, deliberately: this is a page about
          contrast, so a de-emphasised label at 70% would be the one element on
          it failing the ratio it advertises. The *fill* is the state — a solid
          pill against an outlined one reads at any contrast, and the inactive
          edge falls back to the card's hairline rather than a colour anyone
          chose.
        */
        color: active ? onInk : ink,
      }}
    >
      {theme === 'dark' ? 'Dark' : 'Light'}
    </button>
  );
}

/**
 * One square card: the component on its own app background, captioned below.
 *
 * Four slots are painted here — border, canvas, surface, caption ink — and all
 * four go through `Swatch`, so the chrome of the fixture is as editable as the
 * component inside it. A user whose only complaint is "my hairlines vanish"
 * should be able to fix it by clicking the card's edge, not just by editing the
 * button.
 *
 * EACH CARD PICKS ITS OWN THEME
 *
 * `children` is a *function* of the paint, not a value: the island resolves
 * dark and light once (see `theme.ts`) and every card renders its body from the
 * one its own toggle asks for. That is what disconnects the cards — flipping a
 * card to Light repaints that card and nothing else, so a dark button can be
 * judged beside a light one on the same rail, which is the comparison the
 * global switch made impossible.
 *
 * The pin is stored against the global setting it was taken from
 * (`{ theme, base }`), so a card only stays pinned while the page-wide
 * Dark/Light control still sits where the pin was made. Move the global
 * control and every card follows it again — the page control is "apply to
 * all", the card control is "this one only".
 *
 * Hover/focus reveals the selectable zones (border, canvas, surface) with
 * outlines drawn in `--fixture-ring`, which is keyed off `data-fixture-theme`:
 * a ring derived from the host's ink is invisible on whichever of a dark and a
 * light card it lands on.
 */
export function Specimen({
  name,
  variant,
  children,
}: {
  /** The component, e.g. `Button`. */
  name: string;
  /** The variant, e.g. `Classic`. Rendered after a middot. */
  variant?: string;
  /** The card's body, rendered from whichever paint this card has pinned. */
  children: (paint: Paint) => ComponentChildren;
}) {
  const pair = usePaintPair();
  const [pin, setPin] = useState<{ theme: Theme; base: Theme } | null>(null);

  // A pin made against a global setting the reader has since moved is stale:
  // the global control has already said "everything is dark now", so a card
  // still showing light would be the bug. Drop the pin and follow.
  const theme: Theme =
    pin && pin.base === pair.globalTheme ? pin.theme : pair.globalTheme;
  const paint: Paint = theme === 'dark' ? pair.dark : pair.light;
  const f = paint.fixture;
  // What the active pill writes *on* its ink fill: the bar's surface when one
  // is set, the fixture's stand-in when it is not — never the host's chrome.
  const onInk = f.surface?.css ?? FIXTURE_NEUTRALS.surface[theme];

  return (
    <Swatch
      slot={f.border}
      role="background"
      step={f.border?.requested ?? STAGE.border.steps[theme]}
      pending={!f.border}
      part="border"
      data-fixture-theme={theme}
      class={`${CARD} fixture fixture-card rounded-2xl border overflow-hidden flex flex-col bg-canvas transition-all duration-150 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]`}
      style={!f.border ? unsetStyle(theme) : undefined}
    >
      {/*
        The component's own backdrop. `flex-1` rather than a fixed height so the
        card stays exactly one size whether the caption is one line or two.
      */}
      <Swatch
        slot={f.canvas}
        role="background"
        step={f.canvas?.requested ?? STAGE.canvas.steps[theme]}
        pending={!f.canvas}
        part="bg"
        class="flex-1 min-h-0 flex items-center justify-center p-4 rounded-t-2xl border-b relative"
        style={{
          borderColor: (f.divider ?? f.border)?.css ?? 'transparent',
          ...(f.canvas ? {} : unsetStyle(theme)),
        }}
      >
        {/*
          No overlay element here: the canvas swatch already carries
          `data-context-role`, so `.fixture [data-context-role]:hover` draws the
          ring — one inset outline in the card's own `--fixture-ring`, instead of
          that outline plus a second translucent border drawn a pixel inside it.
        */}
        {children(paint)}
      </Swatch>

      {/* The caption bar. A surface behind the ink, so the two stack visibly. */}
      <Swatch
        slot={f.surface}
        role="background"
        step={f.surface?.requested ?? STAGE.surface.steps[theme]}
        pending={!f.surface}
        part="bg"
        class="h-8 shrink-0 flex items-center gap-1.5 px-2 rounded-b-2xl transition-colors duration-150 hover:bg-ink/5 focus-within:bg-ink/10"
        style={!f.surface ? unsetStyle(theme) : undefined}
      >
        {/*
          The catalogue entry, left-weighted so the toggle pair can own the
          right edge without ever colliding with a long variant name — the
          caption truncates instead of pushing the pills off the card.
        */}
        <span
          class="fixture-caption flex-1 min-w-0"
          style={{ color: f.ink }}
          title={`${name}${variant ? ` · ${variant}` : ''} — click any part to edit its token`}
        >
          {name}
          {variant && <span class="opacity-60"> · {variant}</span>}
        </span>

        <span
          class="flex items-center gap-1 shrink-0"
          role="group"
          aria-label={`Theme for ${name}${variant ? ` · ${variant}` : ''}`}
        >
          {(['dark', 'light'] as const).map((t) => (
            <ThemeToggle
              key={t}
              theme={t}
              active={theme === t}
              ink={f.ink}
              onInk={onInk}
              edge={f.border?.css ?? 'transparent'}
              onPick={(picked) => setPin({ theme: picked, base: pair.globalTheme })}
            />
          ))}
        </span>
      </Swatch>
    </Swatch>
  );
}
