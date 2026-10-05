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
const CARD = 'w-[13rem] h-[13rem] shrink-0';

/**
 * A labelled horizontal rail of specimen cards.
 *
 * Horizontal scroll rather than a wrapping grid because the comparison is
 * *within* a rail: "Classic next to Solid next to Soft" is the question, and a
 * grid puts unrelated components on the same row and splits related ones across
 * a fold. The rail also holds a fixed card size, so a 3px switch is rendered at
 * the same scale in every group.
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
        `pb-1` so the scrollbar gutter never overlaps a card's caption, and
        `scroll-snap` so a partially-scrolled rail still lands on a card edge
        rather than between two of them.
      */}
      <div class="fixture-rail pb-1.5">
        {children}
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
      class={`${CARD} fixture rounded-xl border overflow-hidden flex flex-col`}
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
        class="flex-1 min-h-0 flex items-center justify-center p-3 rounded-t-xl border-b"
        style={{
          borderColor: (f.divider ?? f.border)?.css ?? 'transparent',
          ...(f.canvas ? {} : unsetStyle(paint.theme)),
        }}
      >
        {children}
      </Swatch>

      {/* The caption bar. A surface behind the ink, so the two stack visibly. */}
      <Swatch
        slot={f.surface}
        role="background"
        step={f.surface?.requested ?? STAGE.surface.steps[paint.theme]}
        pending={!f.surface}
        part="bg"
        class="h-7 shrink-0 flex items-center justify-center px-2"
        style={!f.surface ? unsetStyle(paint.theme) : undefined}
      >
        <span
          class="fixture-caption"
          style={{ color: f.ink }}
          title={`${name}${variant ? ` · ${variant}` : ''} — click any part to edit its token`}
        >
          {name}
          {variant && <span class="opacity-70"> · {variant}</span>}
        </span>
      </Swatch>
    </Swatch>
  );
}
