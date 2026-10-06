import type { ComponentChildren } from 'preact';
import { Swatch, unsetStyle } from './Swatch';
import { STAGE, type Paint } from './slots';

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
 * Responsive: horizontal scroll on mobile (< lg), flex-wrap on desktop (>= lg).
 * The comparison is *within* a rail: "Classic next to Solid next to Soft" is the question.
 * On mobile, scroll keeps cards at fixed size; on desktop, they wrap naturally.
 * Scrollbar is visible on the rail as an affordance; snap points align cards.
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
        Responsive rail: horizontal scroll on mobile, flex-wrap on desktop.
        `pb-1` so the scrollbar gutter never overlaps a card's caption on mobile,
        and `scroll-snap` so a partially-scrolled rail still lands on a card edge.
        The `.fixture-rail` class keeps scrollbars visible as an affordance.
      */}
      <div class="relative">
        <div class="fixture-rail flex flex-wrap gap-4 lg:pb-0 pb-1.5 lg:overflow-visible -mx-4 lg:mx-0 px-4 lg:px-0">
          {children}
        </div>
        {/* Mobile scroll indicator */}
        <div class="lg:hidden absolute bottom-0 right-0 left-0 h-4 bg-gradient-to-l from-canvas via-canvas/50 to-transparent pointer-events-none" aria-hidden="true" />
      </div>
    </section>
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
 * Each card is now an independent, isolated preview — changing colors in one
 * card doesn't affect others. Every visual element (border, background, surface,
 * text, accent fills) maps to its own token slot and is independently clickable.
 *
 * Hover/focus reveals the selectable zones (border, canvas, surface) with subtle
 * outlines so users know exactly what they're clicking.
 */
export function Specimen({
  name,
  variant,
  paint,
  children,
}: {
  /** The component, e.g. `Button`. */
  name: string;
  /** The variant, e.g. `Classic`. Rendered after a middot. */
  variant?: string;
  paint: Paint;
  children: ComponentChildren;
}) {
  const f = paint.fixture;

  return (
    <Swatch
      slot={f.border}
      role="background"
      step={f.border?.requested ?? STAGE.border.steps[paint.theme]}
      pending={!f.border}
      part="border"
      class={`${CARD} fixture rounded-2xl border overflow-hidden flex flex-col bg-canvas transition-all duration-150 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:ring-1 hover:ring-ink/20 focus-within:ring-2 focus-within:ring-ink/40`}
      style={!f.border ? unsetStyle(paint.theme) : undefined}
    >
      {/*
        The component's own backdrop. `flex-1` rather than a fixed height so the
        card stays exactly one size whether the caption is one line or two.
      */}
      <Swatch
        slot={f.canvas}
        role="background"
        step={f.canvas?.requested ?? STAGE.canvas.steps[paint.theme]}
        pending={!f.canvas}
        part="bg"
        class="flex-1 min-h-0 flex items-center justify-center p-4 rounded-t-2xl border-b relative group/selectable"
        style={{
          borderColor: (f.divider ?? f.border)?.css ?? 'transparent',
          ...(f.canvas ? {} : unsetStyle(paint.theme)),
        }}
      >
        {children}
        {/* Selectable zone indicator - shows on hover/focus */}
        <div class="absolute inset-0 rounded-t-2xl border-2 border-transparent transition-colors duration-150 group-hover/selectable:border-ink/30 group-focus-within/selectable:border-ink/50 pointer-events-none" aria-hidden="true" />
      </Swatch>

      {/* The caption bar. A surface behind the ink, so the two stack visibly. */}
      <Swatch
        slot={f.surface}
        role="background"
        step={f.surface?.requested ?? STAGE.surface.steps[paint.theme]}
        pending={!f.surface}
        part="bg"
        class="h-8 shrink-0 flex items-center justify-center px-3 rounded-b-2xl group/selectable-surface transition-colors duration-150 hover:bg-ink/5 focus-within:bg-ink/10"
        style={!f.surface ? unsetStyle(paint.theme) : undefined}
      >
        <span
          class="fixture-caption text-[11px] font-medium tracking-wide"
          style={{ color: f.ink }}
          title={`${name}${variant ? ` · ${variant}` : ''} — click any part to edit its token`}
        >
          {name}
          {variant && <span class="opacity-60"> · {variant}</span>}
        </span>
      </Swatch>
    </Swatch>
  );
}
