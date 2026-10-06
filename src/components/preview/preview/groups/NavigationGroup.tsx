import { Rail, Specimen } from '../Specimen';
import { scorePair, worstOf } from '../slots';
import {
  KitAvatar,
  KitBadge,
  KitBreadcrumbs,
  KitButton,
  KitEdge,
  KitIconButton,
  KitMenuRow,
  KitMuted,
  KitNavRow,
  KitSearch,
  KitSurface,
  KitTabs,
  KitText,
  KitToolbar,
} from '../kit';
import type { Paint } from '../slots';

/**
 * Navigation — the group where the neutral roles have to work hardest.
 *
 * WHY NAVIGATION LEADS WITH THE NEUTRALS
 *
 * Everywhere else on this page an accent is doing the talking. Navigation is
 * mostly hairlines, dividers and two steps of one neutral scale, and it is the
 * only group a real product spends most of its pixels on. A palette with a
 * beautiful `primary-500` and a `background` scale whose 200 and 800 are four
 * points apart ships a nav bar where you cannot see where one region ends and
 * the next begins — and that failure is invisible in a palette strip, because
 * the strip shows the steps *next to each other*, which is the one comparison
 * that makes any scale look separated.
 *
 * So each card is a different amount of the same surface. Top bar, sidebar,
 * dock, tabs, breadcrumbs: the same three neutrals stacked five different ways,
 * which is how you find out whether they stack at all.
 *
 * THE ACTIVE STATE
 *
 * `primary` appears in exactly one role here — marking where you are — and it is
 * painted three ways at once in the sidebar (dot, weight, tint) and twice in the
 * tabs (ink and a 2px rule). If the accent cannot carry that alone, no amount of
 * contrast elsewhere will save the product.
 */
export function NavigationGroup({ paint }: { paint: Paint }) {
  const worst = worstOf([
    scorePair('Primary on canvas', paint.accents.primary.fill, paint.fixture.canvas),
    scorePair('Text on canvas', paint.text, paint.fixture.canvas),
    scorePair('Muted on surface', paint.muted, paint.fixture.surface),
  ]);

  return (
    <div class="space-y-8">
      <Rail
        label="Chrome"
        description="The same three neutrals stacked five ways. If the steps between them are too close, this is where it shows."
        hint={worst ? `worst ${worst.wcag}:1 · ${worst.grade}` : 'set background + text to score'}
        hintPass={worst ? worst.grade !== 'Fail' : undefined}
      >
        <Specimen name="Top bar" variant="Solid">
          {(paint) => (
            <KitToolbar paint={paint} title="Acme" />
          )}
        </Specimen>

        <Specimen name="Sidebar" variant="Rails">
          {(paint) => (
            <KitSurface paint={paint} class="w-full rounded-xl border p-2 space-y-0.5">
              {['Overview', 'Palettes', 'Tokens', 'Exports'].map((item, i) => (
                <KitNavRow key={item} paint={paint} label={item} active={i === 1} trailing={i === 1 ? '24' : undefined} />
              ))}
            </KitSurface>
          )}
        </Specimen>

        <Specimen name="Tabs" variant="Underline">
          {(paint) => (
            <KitTabs paint={paint} items={['Home', 'Profile', 'Settings']} active={1} />
          )}
        </Specimen>

        <Specimen name="Breadcrumbs" variant="Trail">
          {(paint) => (
            <div class="w-full space-y-2.5">
              <KitBreadcrumbs paint={paint} items={['Projects', 'Acme', 'Tokens']} />
              <KitEdge paint={paint} side="bottom" />
              <KitMuted paint={paint} class="block text-[10px] leading-[14px]">
                Only the last crumb is ink. Everything behind it has to read as
                de-emphasised without disappearing.
              </KitMuted>
            </div>
          )}
        </Specimen>

        <Specimen name="Dock" variant="Mobile">
          {(paint) => (
            <KitSurface paint={paint} class="w-full rounded-xl border p-2">
              <div class="grid grid-cols-4 gap-1">
                {['Home', 'Search', 'Save', 'You'].map((item, i) => (
                  <div key={item} class="flex flex-col items-center gap-1 py-1">
                    <span
                      class="w-5 h-5 rounded-md"
                      style={{
                        backgroundColor:
                          i === 0
                            ? (paint.accents.primary.fill?.css ?? 'transparent')
                            : (paint.fixture.raised?.css ?? 'transparent'),
                      }}
                    />
                    <KitMuted
                      paint={paint}
                      class="text-[9px]"
                    >
                      {item}
                    </KitMuted>
                  </div>
                ))}
              </div>
            </KitSurface>
          )}
        </Specimen>
      </Rail>

      <Rail
        label="Identity &amp; Actions"
        description="What a nav bar carries beside its links. The accent has to hold a 30px avatar and a 9px tab label at once."
      >
        <Specimen name="Account" variant="Avatar">
          {(paint) => (
            <div class="flex items-center gap-2.5">
              <KitAvatar paint={paint} role="primary" initials="EV" size={30} />
              <div class="min-w-0">
                <KitText paint={paint} class="block text-[12px] font-semibold truncate">
                  Ella Vance
                </KitText>
                <KitMuted paint={paint} class="block text-[10px] truncate">
                  Pro workspace
                </KitMuted>
              </div>
            </div>
          )}
        </Specimen>

        <Specimen name="Notifications" variant="Count">
          {(paint) => (
            <div class="flex items-center gap-2">
              <KitIconButton paint={paint} role="primary" glyph="dots" variant="soft" />
              <KitBadge paint={paint} role="danger" label="3" variant="solid" />
            </div>
          )}
        </Specimen>

        <Specimen name="Command" variant="Trigger">
          {(paint) => (
            <div class="w-full space-y-2">
              <KitSearch paint={paint} placeholder="Search or jump to…" />
              <KitButton paint={paint} role="trusty-button" label="New palette" variant="solid" size="sm" />
            </div>
          )}
        </Specimen>

        <Specimen name="Menu" variant="In bar">
          {(paint) => (
            <KitSurface paint={paint} level="raised" class="w-full rounded-xl border p-1 space-y-0.5">
              <KitMenuRow paint={paint} label="Duplicate" glyph="plus" />
              <KitMenuRow paint={paint} label="Move to…" glyph="dots" />
              <KitMenuRow paint={paint} label="Delete" glyph="x" />
            </KitSurface>
          )}
        </Specimen>

        <Specimen name="Pagination" variant="Pages">
          {(paint) => (
            <div class="flex items-center gap-1">
              {[1, 2, 3].map((n) => (
                <span
                  key={n}
                  class="w-7 h-7 rounded-lg text-[11px] flex items-center justify-center font-medium"
                  style={
                    n === 2 && paint.accents.primary.fill
                      ? { backgroundColor: paint.accents.primary.fill.css, color: paint.accents.primary.on?.css ?? 'transparent' }
                      : /*
                          Unset pages inherit the *host's* text colour otherwise,
                          so a light card in a dark session printed white digits
                          on white. The fixture's caption ink keeps them on the
                          card's side of the glass.
                        */
                        { color: paint.fixture.ink }
                  }
                >
                  {n}
                </span>
              ))}
              <KitMuted paint={paint} class="px-1">
                …
              </KitMuted>
            </div>
          )}
        </Specimen>
      </Rail>
    </div>
  );
}
