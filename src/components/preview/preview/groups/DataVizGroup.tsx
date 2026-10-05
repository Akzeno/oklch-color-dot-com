import { Rail, Specimen } from '../Specimen';
import { ACCENT, scorePair, worstOf, type AccentRole, type Paint } from '../slots';
import { KitBars, KitDonut, KitEdge, KitMuted, KitText } from '../kit';

/**
 * Data Viz — where a palette is judged as a *set*, not as pairs.
 *
 * THE ONLY GROUP THAT CAN PASS PAIRWISE AND STILL FAIL
 *
 * Every other card asks "can you read this on that". This one asks whether six
 * hues are told apart from each other. Those are different questions and a
 * palette can answer the first six times and the seventh time not at all.
 *
 * The classic failure is `success` against `warning`: two hues that both clear
 * 4.5:1 on the canvas and still read as the same idea, because a legend entry
 * and a bar are the only things distinguishing them. The second is *adjacent*
 * pairs — bar 2 next to bar 3 — where a ramp that fans out in lightness but not
 * in hue looks fine sorted and looks like one blob in a chart.
 *
 * So the bars are in a fixed role order with no sorting and no grouping, because
 * sorting is what hides this failure: a sorted chart puts similar colours next to
 * each other by accident and looks worse than the palette deserves.
 *
 * WHY EVERYTHING IS AT 500
 *
 * A chart marks a *series*, not a state. Asking for 400 or 600 per series would
 * mean the same role appearing at four different steps in one figure, and then
 * "is my palette right" becomes "which of my thirty shades did I mean". One step
 * per role, and the whole question stays one question.
 *
 * THE GRID AND AXIS ARE NOT TOKENS
 *
 * A grid line is not a colour decision — it is structure, and it belongs to the
 * chart, not to the design system. So it is drawn from `fixture.raised`, the same
 * neutral as an empty slider track, which is what it is: a track. Making it a
 * token would add a stage slot that exists only to be set to a grey.
 */
const SERIES: { role: AccentRole; label: string }[] = [
  { role: 'primary', label: 'Primary' },
  { role: 'secondary', label: 'Secondary' },
  { role: 'success', label: 'Success' },
  { role: 'warning', label: 'Warning' },
  { role: 'danger', label: 'Danger' },
  { role: 'info', label: 'Info' },
];

export function DataVizGroup({ paint }: { paint: Paint }) {
  const worst = worstOf(
    SERIES.map(({ role, label }) =>
      scorePair(`${label} series on canvas`, paint.accents[role].fill, paint.fixture.canvas)
    )
  );

  return (
    <div class="space-y-8">
      <Rail
        label="Series"
        description="Six roles, one step each, in a fixed order — so adjacent pairs are the ones you are asked to judge."
        hint={worst ? `worst ${worst.wcag}:1 · ${worst.grade}` : 'set the accent roles to score'}
        hintPass={worst ? worst.grade !== 'Fail' : undefined}
      >
        <Specimen name="Chart" variant="Bars" paint={paint}>
          <KitBars paint={paint} />
        </Specimen>

        <Specimen name="Chart" variant="Donut" paint={paint}>
          <KitDonut paint={paint} />
        </Specimen>

        <Specimen name="Chart" variant="Stacked" paint={paint}>
          <div class="w-full space-y-2">
            <div class="flex h-16 rounded-lg overflow-hidden">
              {SERIES.map(({ role }, i) => (
                <span
                  key={role}
                  class="h-full"
                  style={{
                    flex: [3, 2, 4, 1, 2, 3][i],
                    backgroundColor: paint.accents[role].fill?.css ?? 'transparent',
                  }}
                />
              ))}
            </div>
            <KitMuted paint={paint} class="block text-[10px] leading-[14px]">
              Stacked segments touch, so this is the strictest separation test on
              the page — no canvas between them.
            </KitMuted>
          </div>
        </Specimen>

        <Specimen name="Chart" variant="Lines" paint={paint}>
          <div class="w-full">
            <svg viewBox="0 0 100 40" class="w-full h-20" preserveAspectRatio="none" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <line
                  key={i}
                  x1="0"
                  x2="100"
                  y1={i * 13}
                  y2={i * 13}
                  stroke={paint.fixture.raised?.css ?? 'transparent'}
                  strokeWidth="0.6"
                />
              ))}
              {SERIES.slice(0, 3).map(({ role }, si) => (
                <polyline
                  key={role}
                  fill="none"
                  stroke={paint.accents[role].fill?.css ?? 'transparent'}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  points={[
                    [0, 30 - si * 3],
                    [20, 18 + si * 4],
                    [40, 26 - si * 2],
                    [60, 10 + si * 5],
                    [80, 20 - si],
                    [100, 8 + si * 3],
                  ]
                    .map(([x, y]) => `${x},${y}`)
                    .join(' ')}
                />
              ))}
            </svg>
            <KitMuted paint={paint} class="block text-[10px]">
              Three lines, 1.6px, no markers.
            </KitMuted>
          </div>
        </Specimen>

        <Specimen name="Chart" variant="Heatmap" paint={paint}>
          <div class="w-full grid grid-cols-6 gap-1">
            {SERIES.map(({ role }) =>
              [0.9, 0.6, 0.3].map((alpha) => (
                <span
                  key={`${role}-${alpha}`}
                  class="h-6 rounded-sm"
                  style={{
                    backgroundColor: paint.accents[role].fill?.css ?? 'transparent',
                    opacity: alpha,
                  }}
                />
              ))
            )}
          </div>
          <div class="w-full pt-2">
            <KitMuted paint={paint} class="block text-[10px] leading-[14px]">
              Same six hues at three opacities. If the faint row vanishes, the
              scale has no room for a tint.
            </KitMuted>
          </div>
        </Specimen>
      </Rail>

      <Rail
        label="Reading It Back"
        description="Numbers, deltas and legends — the parts that turn a chart into a sentence someone has to trust."
      >
        <Specimen name="Delta" variant="Up" paint={paint}>
          <div class="flex items-baseline gap-2">
            <KitText paint={paint} class="text-[20px] font-semibold leading-none tabular-nums">
              98.4%
            </KitText>
            <span
              class="text-[11px] font-medium inline-flex items-center gap-0.5"
              style={{ color: paint.accents.success.fill?.css ?? paint.pendingInk }}
            >
              <svg viewBox="0 0 24 24" class="w-3 h-3" fill="none" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M6 11l6-6 6 6" />
              </svg>
              2.1
            </span>
          </div>
        </Specimen>

        <Specimen name="Delta" variant="Down" paint={paint}>
          <div class="flex items-baseline gap-2">
            <KitText paint={paint} class="text-[20px] font-semibold leading-none tabular-nums">
              3.2:1
            </KitText>
            <span
              class="text-[11px] font-medium inline-flex items-center gap-0.5"
              style={{ color: paint.accents.danger.fill?.css ?? paint.pendingInk }}
            >
              <svg viewBox="0 0 24 24" class="w-3 h-3" fill="none" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M6 13l6 6 6-6" />
              </svg>
              Fail
            </span>
          </div>
        </Specimen>

        <Specimen name="Legend" variant="Inline" paint={paint}>
          <div class="w-full grid grid-cols-2 gap-x-2 gap-y-1">
            {SERIES.map(({ role, label }) => (
              <span key={role} class="flex items-center gap-1.5">
                <span
                  class="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: paint.accents[role].fill?.css ?? 'transparent' }}
                />
                <KitMuted paint={paint} class="text-[10px] truncate">
                  {label}
                </KitMuted>
              </span>
            ))}
          </div>
        </Specimen>

        <Specimen name="Axis" variant="Labels" paint={paint}>
          <div class="w-full">
            <div class="flex h-12 items-end gap-1.5" aria-hidden="true">
              {[0.4, 0.75, 0.55].map((h, i) => (
                <span
                  key={i}
                  class="flex-1 rounded-t-sm"
                  style={{
                    height: `${h * 100}%`,
                    backgroundColor: paint.accents[SERIES[i]!.role].fill?.css ?? 'transparent',
                  }}
                />
              ))}
            </div>
            <KitEdge paint={paint} side="top" class="block" />
            <div class="flex justify-between pt-1">
              <KitMuted paint={paint} class="text-[9px]">
                0
              </KitMuted>
              <KitMuted paint={paint} class="text-[9px]">
                50
              </KitMuted>
              <KitMuted paint={paint} class="text-[9px]">
                100
              </KitMuted>
            </div>
          </div>
        </Specimen>

        <Specimen name="Table" variant="In chart" paint={paint}>
          <table class="w-full text-[10px]">
            <tbody>
              {SERIES.slice(0, 4).map(({ role, label }) => (
                <tr key={role}>
                  <td class="py-1">
                    <span class="flex items-center gap-1.5">
                      <span
                        class="w-2 h-2 rounded-sm"
                        style={{ backgroundColor: paint.accents[role].fill?.css ?? 'transparent' }}
                      />
                      <KitMuted paint={paint}>{label}</KitMuted>
                    </span>
                  </td>
                  <td class="py-1 text-right">
                    <KitText paint={paint} class="tabular-nums">
                      {`${100 - SERIES.indexOf(SERIES.find((s) => s.role === role)!) * 11}%`}
                    </KitText>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Specimen>
      </Rail>
    </div>
  );
}
