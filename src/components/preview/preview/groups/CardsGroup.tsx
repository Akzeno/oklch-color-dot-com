import { Rail, Specimen } from '../Specimen';
import { scorePair, worstOf } from '../slots';
import {
  KitAvatar,
  KitBadge,
  KitButton,
  KitEdge,
  KitListRow,
  KitMuted,
  KitStat,
  KitSurface,
  KitText,
} from '../kit';
import type { Paint } from '../slots';

/**
 * Cards — the group that asks whether surfaces stack.
 *
 * THE ONLY GROUP WITH A Z-ORDER PROBLEM
 *
 * Everywhere else, a component sits on the canvas and that is the end of it. A
 * card puts *two* neutral surfaces on top of each other: `surface` on `canvas`,
 * and on the third level, `raised` for a toolbar or a nested panel. A palette
 * whose steps are too close together renders a card that is technically two
 * colours and visually one — and the failure is invisible in a strip, because
 * the strip shows the steps side by side, which is the one framing in which
 * every scale looks separated.
 *
 * So each card here is a different depth. Flat card, card with a toolbar, media
 * card, stat card, nested panel: five depths, one question.
 *
 * WHY THE CARD IS NOT A PREVIEW OF OUR OWN CARDS
 *
 * This product has a `.card` component, and it is ink-on-black with a 14px
 * radius and a hairline. Painting the fixture with it would make this group
 * measure whether the palette flatters *us*. It uses a 12px radius, the platform
 * type stack and a raised inner toolbar instead. See `kit.tsx`.
 */
export function CardsGroup({ paint }: { paint: Paint }) {
  const worst = worstOf([
    scorePair('Text on surface', paint.text, paint.fixture.surface),
    scorePair('Muted on surface', paint.muted, paint.fixture.surface),
    scorePair('Text on raised', paint.text, paint.fixture.raised),
  ]);

  return (
    <div class="space-y-8">
      <Rail
        label="Depth"
        description="Surface on canvas, then raised on surface. Each card sits one level deeper than the last."
        hint={worst ? `worst ${worst.wcag}:1 · ${worst.grade}` : 'set background + text to score'}
        hintPass={worst ? worst.grade !== 'Fail' : undefined}
      >
        <Specimen name="Card" variant="Flat">
          {(paint) => (
            <KitSurface paint={paint} class="w-full rounded-xl border p-3 space-y-1.5">
              <KitText paint={paint} class="block text-[13px] font-semibold">
                Slate
              </KitText>
              <KitMuted paint={paint} class="block text-[11px] leading-[15px]">
                A cool neutral ramp, generated at hue 250.
              </KitMuted>
              <div class="flex items-center gap-1.5 pt-1">
                <KitBadge paint={paint} role="info" label="50–950" variant="soft" />
              </div>
            </KitSurface>
          )}
        </Specimen>

        <Specimen name="Card" variant="Toolbar">
          {(paint) => (
            <KitSurface paint={paint} class="w-full rounded-xl border overflow-hidden">
              <KitSurface paint={paint} level="raised" class="flex items-center gap-2 px-3 py-2 border-b">
                <KitAvatar paint={paint} role="primary" initials="SL" size={20} />
                <KitText paint={paint} class="text-[11px] font-semibold flex-1 truncate">
                  Slate
                </KitText>
                <KitBadge paint={paint} role="success" label="Saved" variant="soft" />
              </KitSurface>
              <div class="px-3 py-2.5">
                <KitMuted paint={paint} class="block text-[11px] leading-[15px]">
                  Nine hundred and fifty steps of the same hue.
                </KitMuted>
              </div>
            </KitSurface>
          )}
        </Specimen>

        <Specimen name="Card" variant="Media">
          {(paint) => (
            <KitSurface paint={paint} class="w-full rounded-xl border overflow-hidden">
              <div
                class="h-14 w-full"
                style={{
                  backgroundImage: `linear-gradient(120deg, ${
                    paint.accents.primary.lift ?? paint.accents.primary.fill?.css ?? 'transparent'
                  }, ${paint.accents.secondary.fill?.css ?? 'transparent'})`,
                }}
              />
              <div class="px-3 py-2.5 space-y-1">
                <KitText paint={paint} class="block text-[12px] font-semibold">
                  Violet Pulse
                </KitText>
                <KitMuted paint={paint} class="block text-[10px]">
                  11 steps · hue 300
                </KitMuted>
              </div>
            </KitSurface>
          )}
        </Specimen>

        <Specimen name="Card" variant="Stat">
          {(paint) => (
            <KitSurface paint={paint} class="w-full rounded-xl border p-3">
              <KitStat paint={paint} label="Tokens" value="1,284" delta="+96" />
            </KitSurface>
          )}
        </Specimen>

        <Specimen name="Card" variant="Nested">
          {(paint) => (
            <KitSurface paint={paint} class="w-full rounded-xl border p-2.5 space-y-2">
              <KitText paint={paint} class="block text-[12px] font-semibold px-0.5">
                Recent
              </KitText>
              <KitSurface paint={paint} level="raised" class="rounded-lg px-2.5 py-1.5">
                <KitListRow paint={paint} title="Trusty Blue" meta="11 steps" trailing="4d" />
              </KitSurface>
              <KitEdge paint={paint} side="bottom" />
              <KitMuted paint={paint} class="block text-[10px] px-0.5">
                Raised on surface on canvas — three steps, one card.
              </KitMuted>
            </KitSurface>
          )}
        </Specimen>
      </Rail>

      <Rail
        label="Cards in Context"
        description="A card with a list in it, and a card with actions in it — where the divider has to separate two things that are the same colour."
      >
        <Specimen name="Card" variant="List">
          {(paint) => (
            <KitSurface paint={paint} class="w-full rounded-xl border p-2.5">
              {['Trusty Blue', 'Crimson', 'Forest'].map((t, i) => (
                <div key={t}>
                  {i > 0 && <KitEdge paint={paint} side="top" class="block" />}
                  <KitListRow paint={paint} title={t} meta={`${11 + i} steps`} trailing={`${i + 2}h`} role={i === 0 ? 'primary' : 'secondary'} />
                </div>
              ))}
            </KitSurface>
          )}
        </Specimen>

        <Specimen name="Card" variant="Actions">
          {(paint) => (
            <KitSurface paint={paint} class="w-full rounded-xl border p-3 space-y-2.5">
              <KitText paint={paint} class="block text-[13px] font-semibold">
                Upgrade to Pro
              </KitText>
              <KitMuted paint={paint} class="block text-[11px] leading-[15px]">
                Unlimited palettes and a shareable token URL.
              </KitMuted>
              <div class="flex items-center gap-1.5">
                <KitButton paint={paint} role="trusty-button" label="Upgrade" variant="solid" size="sm" />
                <KitButton paint={paint} role="secondary" label="Later" variant="ghost" size="sm" />
              </div>
            </KitSurface>
          )}
        </Specimen>

        <Specimen name="Card" variant="Profile">
          {(paint) => (
            <div class="w-full flex flex-col items-center gap-1.5 text-center">
              <KitAvatar paint={paint} role="primary" initials="EV" size={44} variant="gradient" />
              <KitText paint={paint} class="block text-[12px] font-semibold">
                Ella Vance
              </KitText>
              <KitMuted paint={paint} class="block text-[10px]">
                oklchcolor2.com
              </KitMuted>
            </div>
          )}
        </Specimen>

        <Specimen name="Card" variant="Pricing">
          {(paint) => (
            <KitSurface paint={paint} level="raised" class="w-full rounded-xl border p-3 space-y-1.5">
              <div class="flex items-baseline gap-1">
                <KitText paint={paint} class="text-[20px] font-semibold leading-none">
                  $9
                </KitText>
                <KitMuted paint={paint} class="text-[10px]">
                  /mo
                </KitMuted>
              </div>
              <KitMuted paint={paint} class="block text-[10px] leading-[14px]">
                Per seat. Cancel any time.
              </KitMuted>
              <KitButton paint={paint} role="trusty-button" label="Choose" variant="classic" size="sm" />
            </KitSurface>
          )}
        </Specimen>

        <Specimen name="Card" variant="Skeleton">
          {(paint) => (
            <div class="w-full space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  class="h-3 rounded-md"
                  style={{
                    width: `${100 - i * 22}%`,
                    backgroundColor: paint.fixture.raised?.css ?? 'transparent',
                  }}
                />
              ))}
              <KitMuted paint={paint} class="block text-[10px] pt-0.5">
                Placeholder blocks are a colour too, and the only one nobody checks.
              </KitMuted>
            </div>
          )}
        </Specimen>
      </Rail>
    </div>
  );
}
