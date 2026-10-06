import { Rail, Specimen } from '../Specimen';
import { scorePair, worstOf } from '../slots';
import {
  KitAvatar,
  KitBadge,
  KitButton,
  KitEdge,
  KitField,
  KitMenu,
  KitMenuRow,
  KitMuted,
  KitSearch,
  KitSurface,
  KitText,
} from '../kit';
import type { Paint } from '../slots';

/**
 * Overlays — surfaces stacked on top of a scrim, and one hairline that decides
 * whether any of it reads.
 *
 * THE HARDEST COLOUR PROBLEM ON THE PAGE
 *
 * Everything else in this showcase puts one surface on one canvas. An overlay
 * puts three: the scrim, the panel above it, and the content *behind* it that
 * the scrim is there to suppress. Three failures are possible at once and they
 * have opposite fixes.
 *
 *  - The scrim is too weak, so the panel does not detach — the content behind
 *    competes and the panel's own borders stop meaning anything.
 *  - The scrim is too strong, so the panel reads as a hole rather than a
 *    surface, and on a light theme it turns the whole page grey.
 *  - The panel's border disappears against the *scrimmed* content rather than
 *    against its own canvas, which is the failure that only appears here.
 *
 * None of them are visible in a palette. So each card draws the thing that
 * fails: a scrim with content behind it, a panel with its own edge, and copy on
 * both.
 *
 * WHY THERE IS NO TOOLTIP CARD
 *
 * A tooltip is a hover state. A static card of one would be a caption the DOM
 * does not support — the exact thing the buttons group used to do with six
 * buttons labelled "Hover" — so it is not here. `Popover · Anchored` covers the
 * same colour problem without claiming an interaction that never happens.
 *
 * The scrim is `color-mix` of the fixture's own canvas, so it is derived from a
 * slot rather than invented, and it is deliberately not a token: it is a
 * property of the backdrop, and giving it one would mean a ninth stage role for
 * a value every design system hardcodes.
 */
export function OverlaysGroup({ paint }: { paint: Paint }) {
  const worst = worstOf([
    scorePair('Panel title on raised', paint.text, paint.fixture.raised),
    scorePair('Panel body on raised', paint.muted, paint.fixture.raised),
  ]);

  /** The backdrop every card in this group sits on: real content, dimmed. */
  const Backdrop = ({ children }: { children: preact.ComponentChildren }) => (
    <div class="absolute inset-0 p-3 space-y-1.5 overflow-hidden">
      {children}
    </div>
  );

  const Scrim = () => (
    <span
      aria-hidden="true"
      class="absolute inset-0"
      style={{ backgroundColor: paint.fixture.canvas?.css ?? 'transparent' }}
    />
  );

  return (
    <div class="space-y-8">
      <Rail
        label="Over a Scrim"
        description="Content behind, scrim, panel. The panel's own edge has to separate it from what it is covering."
        hint={worst ? `worst ${worst.wcag}:1 · ${worst.grade}` : 'set background + text to score'}
        hintPass={worst ? worst.grade !== 'Fail' : undefined}
      >
        <Specimen name="Modal" variant="Dialog">
          {(paint) => (
            <div class="relative w-full h-full">
              <Backdrop>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    class="h-2 rounded"
                    style={{
                      width: `${96 - i * 11}%`,
                      backgroundColor: paint.fixture.raised?.css ?? 'transparent',
                    }}
                  />
                ))}
              </Backdrop>
              <Scrim />
              <KitSurface
                paint={paint}
                level="raised"
                class="absolute inset-x-3 top-4 rounded-xl border p-2.5 shadow-lg space-y-1.5"
              >
                <KitText paint={paint} class="block text-[12px] font-semibold">
                  Delete palette?
                </KitText>
                <KitMuted paint={paint} class="block text-[10px] leading-[14px]">
                  Crimson Danger and its 11 shades will be removed.
                </KitMuted>
                <div class="flex items-center gap-1.5 pt-0.5">
                  <KitButton paint={paint} role="danger" label="Delete" variant="solid" size="sm" />
                  <KitButton paint={paint} role="secondary" label="Cancel" variant="ghost" size="sm" />
                </div>
              </KitSurface>
            </div>
          )}
        </Specimen>

        <Specimen name="Drawer" variant="Side">
          {(paint) => (
            <div class="relative w-full h-full">
              <Backdrop>
                <div class="grid grid-cols-3 gap-1.5">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      class="h-8 rounded"
                      style={{ backgroundColor: paint.fixture.raised?.css ?? 'transparent' }}
                    />
                  ))}
                </div>
              </Backdrop>
              <Scrim />
              <KitSurface
                paint={paint}
                level="raised"
                class="absolute inset-y-0 right-0 w-2/3 border-l p-2.5 space-y-2"
              >
                <div class="flex items-center gap-2">
                  <KitAvatar paint={paint} role="primary" initials="EV" size={22} />
                  <KitText paint={paint} class="text-[11px] font-semibold truncate">
                    Details
                  </KitText>
                </div>
                {[0, 1, 2].map((i) => (
                  <div key={i}>
                    {i > 0 && <KitEdge paint={paint} side="top" class="block" />}
                    <KitMenuRow paint={paint} label={['Owner', 'Updated', 'Colour space'][i]!} trailing={['EV', '4m ago', 'sRGB'][i]!} />
                  </div>
                ))}
              </KitSurface>
            </div>
          )}
        </Specimen>

        <Specimen name="Menu" variant="Dropdown">
          {(paint) => (
            <div class="relative w-full h-full flex items-start justify-center pt-3">
              <KitButton paint={paint} role="primary" label="Options" variant="outline" size="sm" />
              <KitSurface paint={paint} level="raised" class="absolute top-11 w-[9.5rem] rounded-xl border p-1 shadow-lg">
                <KitMenu
                  paint={paint}
                  selected={1}
                  rows={[
                    { label: 'Rename', trailing: '⌘R' },
                    { label: 'Duplicate' },
                    { label: 'Export JSON' },
                    { label: 'Delete' },
                  ]}
                />
              </KitSurface>
            </div>
          )}
        </Specimen>

        <Specimen name="Select" variant="Combobox">
          {(paint) => (
            <div class="relative w-full h-full">
              <KitField paint={paint} label="Colour model" value="OKLCH" kind="select" />
              <KitSurface paint={paint} level="raised" class="absolute top-[3.4rem] inset-x-0 rounded-xl border p-1 shadow-lg">
                <KitMenu
                  paint={paint}
                  selected={0}
                  rows={[{ label: 'OKLCH' }, { label: 'sRGB' }, { label: 'Display-P3' }]}
                />
              </KitSurface>
            </div>
          )}
        </Specimen>

        <Specimen name="Popover" variant="Anchored">
          {(paint) => (
            <div class="relative w-full h-full">
              <KitSurface paint={paint} class="w-full rounded-xl border p-2.5 space-y-2">
                <KitText paint={paint} class="block text-[12px] font-semibold">
                  primary-500
                </KitText>
                <div class="flex items-center gap-1.5">
                  <KitBadge paint={paint} role="info" label="in sRGB" variant="soft" />
                  <KitBadge paint={paint} role="warning" label="out of P3" variant="outline" />
                </div>
              </KitSurface>
              <span
                class="absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 border-b border-r"
                style={{
                  bottom: 30,
                  backgroundColor: paint.fixture.raised?.css ?? 'transparent',
                  borderColor: paint.fixture.border?.css ?? 'transparent',
                }}
              />
              <KitSurface
                paint={paint}
                level="raised"
                class="absolute inset-x-0 bottom-0 rounded-xl border p-2.5 shadow-lg"
              >
                <KitMuted paint={paint} class="block text-[10px] leading-[14px]">
                  The arrow is filled with the panel and edged with its border, so
                  it can never disagree with either.
                </KitMuted>
              </KitSurface>
            </div>
          )}
        </Specimen>
      </Rail>

      <Rail
        label="Palette &amp; Command"
        description="Two overlays with no scrim — they replace the page rather than sit over it, so they stack two surfaces and nothing else."
      >
        <Specimen name="Palette" variant="Picker">
          {(paint) => (
            <KitSurface paint={paint} class="w-full rounded-xl border p-2.5 space-y-2">
              <KitText paint={paint} class="block text-[11px] font-semibold">
                Shade
              </KitText>
              <div class="flex gap-1">
                {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((step) => (
                  <span
                    key={step}
                    class="flex-1 h-6 rounded-sm"
                    style={{
                      backgroundColor:
                        step === 500
                          ? (paint.accents.primary.fill?.css ?? 'transparent')
                          : (paint.fixture.raised?.css ?? 'transparent'),
                    }}
                  />
                ))}
              </div>
              <KitMuted paint={paint} class="block text-[10px]">
                50 · 100 · … · 950
              </KitMuted>
            </KitSurface>
          )}
        </Specimen>

        <Specimen name="Command" variant="Palette">
          {(paint) => (
            <KitSurface paint={paint} level="raised" class="w-full rounded-xl border p-1.5 space-y-1.5 shadow-lg">
              <KitSearch paint={paint} placeholder="Type a command…" />
              <KitEdge paint={paint} side="top" class="block" />
              {['Generate scale', 'Export as JSON', 'Copy token URL'].map((c, i) => (
                <KitMenuRow key={c} paint={paint} label={c} selected={i === 0} glyph="check" />
              ))}
            </KitSurface>
          )}
        </Specimen>

        <Specimen name="Banner" variant="Dismissible">
          {(paint) => (
            <div class="w-full rounded-xl border p-2.5" style={{ borderColor: paint.fixture.border?.css ?? 'transparent', backgroundColor: paint.fixture.surface?.css ?? 'transparent' }}>
              <div class="flex items-start gap-2">
                <span
                  class="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: paint.accents.info.fill?.css ?? 'transparent' }}
                />
                <KitText paint={paint} class="flex-1 text-[11px] leading-[15px]">
                  You are previewing on a light canvas.
                </KitText>
                <span aria-hidden="true" style={{ color: paint.fixture.ink }}>
                  <svg viewBox="0 0 24 24" class="w-3 h-3" fill="none" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </span>
              </div>
            </div>
          )}
        </Specimen>
      </Rail>
    </div>
  );
}
