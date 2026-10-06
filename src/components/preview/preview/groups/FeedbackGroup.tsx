import { Rail, Specimen } from '../Specimen';
import { scorePair, worstOf, type AccentRole, type Paint } from '../slots';
import {
  KitAlert,
  KitBadge,
  KitButton,
  KitEmptyState,
  KitEdge,
  KitMuted,
  KitProgress,
  KitSurfaceish,
  KitText,
} from '../kit';

/**
 * Feedback — the group that finds the palette's worst day.
 *
 * WHY THIS IS THE GROUP MOST PALETTES FAIL
 *
 * Every other group paints an accent somewhere it *chose* to be looked at. This
 * one paints all four semantic roles at once, at the size they appear when
 * something has gone wrong — which is exactly when a user is least able to
 * afford an unreadable message.
 *
 * `success`, `warning`, `danger` and `info` are also the four roles most likely
 * to have been chosen independently, because a designer picks them when they are
 * needed and rarely checks them against each other. Four hues that each pass
 * against a neutral surface can still be indistinguishable from *one another*,
 * and a user who cannot tell a warning from an error is worse off than one who
 * gets no colour at all. That is why the first rail is one card per role at the
 * same size, and why the tone rail puts them next to each other on purpose.
 *
 * ALERTS USE A TINT, NOT A NEW TOKEN
 *
 * The soft fill is `ACCENT.softAlpha` over the card canvas and the edge is the
 * same hue at 42%. Both are derived from the slot the click target reports, so
 * editing `danger-500` repaints the fill, the edge, the title and the badge in
 * one go — and nothing here can hold a colour nobody set.
 */
const TONES: { role: AccentRole; title: string; body: string }[] = [
  { role: 'success', title: 'Scale generated', body: '11 steps from 50 to 950.' },
  { role: 'info', title: 'Clipped to sRGB', body: 'Two steps fell outside the gamut.' },
  { role: 'warning', title: 'Contrast is marginal', body: 'The badge reads 3.4:1 on surface.' },
  { role: 'danger', title: 'Token not found', body: '--color-primary-250 does not exist.' },
];

export function FeedbackGroup({ paint }: { paint: Paint }) {
  const worst = worstOf([
    scorePair('Success title on canvas', paint.accents.success.fill, paint.fixture.canvas),
    scorePair('Warning title on canvas', paint.accents.warning.fill, paint.fixture.canvas),
    scorePair('Danger title on canvas', paint.accents.danger.fill, paint.fixture.canvas),
    scorePair('Info title on canvas', paint.accents.info.fill, paint.fixture.canvas),
  ]);

  return (
    <div class="space-y-8">
      <Rail
        label="One Per Tone"
        description="All four semantic roles at the same size, on the same canvas — so a palette that only breaks on one of them cannot hide."
        hint={worst ? `worst ${worst.wcag}:1 · ${worst.grade}` : 'set the four tones to score'}
        hintPass={worst ? worst.grade !== 'Fail' : undefined}
      >
        {TONES.map(({ role, title, body }) => (
          <Specimen key={role} name="Alert" variant={role[0]!.toUpperCase() + role.slice(1)} paint={paint}>
            <KitAlert paint={paint} role={role} title={title} body={body} />
          </Specimen>
        ))}
      </Rail>

      <Rail
        label="Badges &amp; States"
        description="Badges carry tone at 11px with no body copy to fall back on, and the empty state is the one screen nobody ever designs."
      >
        <Specimen name="Badge" variant="Success" paint={paint}>
          <KitBadge paint={paint} role="success" label="Passing" variant="solid" />
        </Specimen>
        <Specimen name="Badge" variant="Warning" paint={paint}>
          <KitBadge paint={paint} role="warning" label="Marginal" variant="solid" />
        </Specimen>
        <Specimen name="Badge" variant="Danger" paint={paint}>
          <KitBadge paint={paint} role="danger" label="Fail" variant="solid" />
        </Specimen>
        <Specimen name="Badge" variant="Soft" paint={paint}>
          <KitBadge paint={paint} role="info" label="Draft" variant="soft" />
        </Specimen>

        <Specimen name="Empty state" variant="First run" paint={paint}>
          <KitEmptyState paint={paint} />
        </Specimen>
      </Rail>

      <Rail
        label="Progress &amp; Recovery"
        description="A bar and a toast: the two surfaces that appear mid-task, on top of whatever the user was already reading."
      >
        <Specimen name="Progress" variant="Bar" paint={paint}>
          <KitProgress paint={paint} role="primary" at={0.62} />
        </Specimen>
        <Specimen name="Progress" variant="Danger" paint={paint}>
          <KitProgress paint={paint} role="danger" at={0.24} />
        </Specimen>

        <Specimen name="Toast" variant="Success" paint={paint}>
          <KitSurfaceish paint={paint} tone="success">
            Copied --color-primary-500
          </KitSurfaceish>
        </Specimen>
        <Specimen name="Toast" variant="Error" paint={paint}>
          <KitSurfaceish paint={paint} tone="danger">
            Could not write to clipboard
          </KitSurfaceish>
        </Specimen>

        <Specimen name="Undo" variant="Offer" paint={paint}>
          <div class="w-full space-y-2.5">
            <KitText paint={paint} class="block text-[12px] leading-[16px]">
              2 shades removed from Crimson Danger.
            </KitText>
            <div class="flex items-center gap-1.5">
              <KitButton paint={paint} role="success" label="Undo" variant="soft" size="sm" />
              <KitButton paint={paint} role="secondary" label="Dismiss" variant="ghost" size="sm" />
            </div>
          </div>
        </Specimen>
      </Rail>
    </div>
  );
}
