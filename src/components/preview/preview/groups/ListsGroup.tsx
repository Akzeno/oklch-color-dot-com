import { Rail, Specimen } from '../Specimen';
import { scorePair, worstOf } from '../slots';
import { KitAvatar, KitBadge, KitEdge, KitListRow, KitMuted, KitText } from '../kit';
import type { Paint } from '../slots';

/**
 * Lists &amp; Data — where de-emphasis stops being optional.
 *
 * THE GROUP THAT FINDS THE SECOND-ORDER BUG
 *
 * Everywhere else, "is this readable" is a question about two colours: ink on a
 * surface. In a list it is a question about *three at once* — a title, a meta
 * line and a trailing number — and the two de-emphasised ones are usually the
 * same `muted` step. If `text-400` on `background-900` passes, the group says
 * the palette works, and the actual product still has an unreadable timestamp on
 * every row.
 *
 * So the cards here deliberately stack the quietest content the design allows:
 * meta under a title, a number at the far edge, a caption under a figure. If
 * those hold, everything louder holds.
 *
 * THE DIVIDER IS THE POINT
 *
 * Five cards, one per list shape, and every one of them separates rows with the
 * same hairline. A `background` scale whose 800 and 900 are four points apart
 * gives you a divider you cannot see, and rows that run together. The stripe
 * variant is included for the opposite reason: alternating `surface` on
 * `canvas` is the most common way a list breaks, because the step that works as
 * a card background is usually too close to the step it sits on.
 */
export function ListsGroup({ paint }: { paint: Paint }) {
  const worst = worstOf([
    scorePair('Muted on surface', paint.muted, paint.fixture.surface),
    scorePair('Text on surface', paint.text, paint.fixture.surface),
  ]);

  const rows = [
    { title: 'Trusty Blue', meta: 'Generated · 4m ago', trailing: '11' },
    { title: 'Crimson Danger', meta: 'Imported · 2h ago', trailing: '11' },
    { title: 'Forest Calm', meta: 'Generated · 1d ago', trailing: '11' },
  ];

  return (
    <div class="space-y-8">
      <Rail
        label="Lists"
        description="Title, meta and a trailing number — three ink levels stacked in one row, on a hairline."
        hint={worst ? `worst ${worst.wcag}:1 · ${worst.grade}` : 'set background + text to score'}
        hintPass={worst ? worst.grade !== 'Fail' : undefined}
      >
        <Specimen name="List" variant="Plain">
          {(paint) => (
            <div class="w-full">
              {rows.map((row, i) => (
                <div key={row.title}>
                  {i > 0 && <KitEdge paint={paint} side="top" class="block" />}
                  <KitListRow paint={paint} {...row} />
                </div>
              ))}
            </div>
          )}
        </Specimen>

        <Specimen name="List" variant="With meta">
          {(paint) => (
            <div class="w-full">
              {rows.map((row, i) => (
                <div key={row.title}>
                  {i > 0 && <KitEdge paint={paint} side="top" class="block" />}
                  <KitListRow paint={paint} {...row} role="secondary" />
                </div>
              ))}
            </div>
          )}
        </Specimen>

        <Specimen name="List" variant="Striped">
          {(paint) => (
            <div class="w-full rounded-xl overflow-hidden">
              {rows.map((row, i) => (
                <div
                  key={row.title}
                  class="px-2"
                  style={i % 2 === 1 ? { backgroundColor: paint.fixture.surface?.css ?? 'transparent' } : undefined}
                >
                  <KitListRow paint={paint} {...row} />
                </div>
              ))}
            </div>
          )}
        </Specimen>

        <Specimen name="List" variant="Selected">
          {(paint) => (
            <div class="w-full rounded-xl overflow-hidden">
              {rows.map((row, i) => (
                <div
                  key={row.title}
                  class="px-2 rounded-lg"
                  style={
                    i === 1 && paint.accents.primary.soft
                      ? { backgroundColor: paint.accents.primary.soft }
                      : undefined
                  }
                >
                  <KitListRow paint={paint} {...row} role="primary" />
                </div>
              ))}
            </div>
          )}
        </Specimen>

        <Specimen name="List" variant="Bordered">
          {(paint) => (
            <>
              {/* A bare `border` has no colour — it would inherit `currentColor`
                  (the row labels' ink) instead of the fixture hairline. */}
              <div
                class="w-full rounded-xl border p-2 space-y-1"
                style={{ borderColor: paint.fixture.border?.css ?? 'transparent' }}
              >
                {rows.map((row) => (
                  <div
                    key={row.title}
                    class="rounded-lg border px-2"
                    style={{ borderColor: paint.fixture.border?.css ?? 'transparent' }}
                  >
                    <KitListRow paint={paint} {...row} />
                  </div>
                ))}
              </div>
            </>
          )}
        </Specimen>
      </Rail>

      <Rail
        label="Data"
        description="Tables, key/value blocks and a timeline — the shapes where a caption sits *under* the thing it explains."
      >
        <Specimen name="Table" variant="Three rows">
          {(paint) => (
            <table class="w-full text-[11px] border-collapse">
              <thead>
                <tr>
                  {['Token', 'L', 'C'].map((h) => (
                    <th
                      key={h}
                      class="text-left py-1 px-1.5 font-medium uppercase tracking-wide text-[9px]"
                      style={{ color: paint.fixture.ink, borderBottom: `1px solid ${paint.fixture.border?.css ?? 'transparent'}` }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['--color-primary-500', '0.58', '0.22'],
                  ['--color-primary-50', '0.96', '0.02'],
                  ['--color-primary-950', '0.18', '0.05'],
                ].map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, i) => (
                      <td
                        key={i}
                        class="py-1 px-1.5 font-mono"
                        style={{ color: i === 0 ? (paint.text?.css ?? paint.pendingInk) : (paint.muted?.css ?? paint.fixture.ink) }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Specimen>

        <Specimen name="Definition" variant="Pairs">
          {(paint) => (
            <dl class="w-full space-y-1.5">
              {[
                ['Model', 'OKLCH'],
                ['Steps', '50–950'],
                ['Gamma', 'sRGB'],
              ].map(([k, v]) => (
                <div key={k} class="flex items-baseline justify-between gap-3">
                  <dt>
                    <KitMuted paint={paint} class="text-[11px]">
                      {k}
                    </KitMuted>
                  </dt>
                  <dd>
                    <KitText paint={paint} class="text-[11px] font-medium">
                      {v}
                    </KitText>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </Specimen>

        <Specimen name="Timeline" variant="Events">
          {(paint) => (
            <ol class="w-full space-y-2">
              {[
                ['Scale generated', '4m'],
                ['Exported to JSON', '2h'],
                ['Role renamed', '1d'],
              ].map(([event, when], i) => (
                <li key={event} class="flex items-center gap-2">
                  <span
                    class="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        i === 0
                          ? (paint.accents.primary.fill?.css ?? 'transparent')
                          : (paint.fixture.border?.css ?? 'transparent'),
                    }}
                  />
                  <KitText paint={paint} class="text-[11px] flex-1 truncate">
                    {event}
                  </KitText>
                  <KitMuted paint={paint} class="text-[10px] tabular-nums shrink-0">
                    {when}
                  </KitMuted>
                </li>
              ))}
            </ol>
          )}
        </Specimen>

        <Specimen name="Row" variant="With badge">
          {(paint) => (
            <div class="w-full">
              <KitListRow paint={paint} title="Crimson Danger" meta="Imported" trailing="2h" />
              <div class="pt-2 flex items-center gap-1.5">
                <KitAvatar paint={paint} role="danger" initials="CD" size={22} />
                <KitBadge paint={paint} role="danger" label="Out of P3" variant="soft" />
              </div>
            </div>
          )}
        </Specimen>

        <Specimen name="Table" variant="Caption">
          {(paint) => (
            <div class="w-full space-y-1.5">
              <KitText paint={paint} class="block text-[15px] font-semibold tabular-nums">
                1,284
              </KitText>
              <KitMuted paint={paint} class="block text-[10px]">
                Tokens across 9 roles
              </KitMuted>
              <KitEdge paint={paint} side="top" class="block" />
              <KitMuted paint={paint} class="block text-[10px] leading-[14px]">
                A 15px figure over a 10px caption. The gap is the whole design.
              </KitMuted>
            </div>
          )}
        </Specimen>
      </Rail>
    </div>
  );
}
