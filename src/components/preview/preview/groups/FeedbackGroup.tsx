import { Rail, Specimen } from '../Specimen';
import { scorePair, worstOf, type AccentRole, type Paint } from '../slots';
import { t } from '../../../../i18n/translations';
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
export function FeedbackGroup({ paint }: { paint: Paint }) {
  /** A role's own localized name, title-cased — `Success`, `Warning`, … */
  const roleName = (role: AccentRole) =>
    t(paint.locale, `ui.roles.${role}`, role[0]!.toUpperCase() + role.slice(1));
  const pairLabel = (role: AccentRole) =>
    t(paint.locale, 'ui.preview.feedback.pairTitleOnCanvas', '{role} title on canvas').replace(
      '{role}',
      roleName(role)
    );

  const TONES: { role: AccentRole; title: string; body: string }[] = [
    {
      role: 'success',
      title: t(paint.locale, 'ui.preview.feedback.toneSuccessTitle', 'Scale generated'),
      body: t(paint.locale, 'ui.preview.feedback.toneSuccessBody', '11 steps from 50 to 950.'),
    },
    {
      role: 'info',
      title: t(paint.locale, 'ui.preview.feedback.toneInfoTitle', 'Clipped to sRGB'),
      body: t(paint.locale, 'ui.preview.feedback.toneInfoBody', 'Two steps fell outside the gamut.'),
    },
    {
      role: 'warning',
      title: t(paint.locale, 'ui.preview.feedback.toneWarningTitle', 'Contrast is marginal'),
      body: t(paint.locale, 'ui.preview.feedback.toneWarningBody', 'The badge reads 3.4:1 on surface.'),
    },
    {
      role: 'danger',
      title: t(paint.locale, 'ui.preview.feedback.toneDangerTitle', 'Token not found'),
      body: t(paint.locale, 'ui.preview.feedback.toneDangerBody', '--color-primary-250 does not exist.'),
    },
  ];

  const worst = worstOf([
    scorePair(pairLabel('success'), paint.accents.success.fill, paint.fixture.canvas),
    scorePair(pairLabel('warning'), paint.accents.warning.fill, paint.fixture.canvas),
    scorePair(pairLabel('danger'), paint.accents.danger.fill, paint.fixture.canvas),
    scorePair(pairLabel('info'), paint.accents.info.fill, paint.fixture.canvas),
  ]);

  return (
    <div class="space-y-8">
      <Rail
        label={t(paint.locale, 'ui.preview.feedback.onePerToneTitle', 'One Per Tone')}
        description={t(
          paint.locale,
          'ui.preview.feedback.onePerToneDesc',
          'All four semantic roles at the same size, on the same canvas — so a palette that only breaks on one of them cannot hide.'
        )}
        hint={
          worst
            ? `${worst.wcag}:1`
            : t(paint.locale, 'ui.preview.feedback.scoreHint', 'set the four tones to score')
        }
        hintTitle={worst?.label}
        locale={paint.locale}
      >
        {TONES.map(({ role, title, body }) => (
          <Specimen
            key={role}
            name={t(paint.locale, 'ui.preview.feedback.nameAlert', 'Alert')}
            variant={roleName(role)}
          >
            {(paint) => (
              <KitAlert paint={paint} role={role} title={title} body={body} />
            )}
          </Specimen>
        ))}
      </Rail>

      <Rail
        label={t(paint.locale, 'ui.preview.feedback.badgesTitle', 'Badges & States')}
        description={t(
          paint.locale,
          'ui.preview.feedback.badgesDesc',
          'Badges carry tone at 11px with no body copy to fall back on, and the empty state is the one screen nobody ever designs.'
        )}
        locale={paint.locale}
      >
        <Specimen
          name={t(paint.locale, 'ui.preview.feedback.nameBadge', 'Badge')}
          variant={t(paint.locale, 'ui.preview.feedback.variantSuccess', 'Success')}
        >
          {(paint) => (
            <KitBadge
              paint={paint}
              role="success"
              label={t(paint.locale, 'ui.preview.feedback.badgePassing', 'Passing')}
              variant="solid"
            />
          )}
        </Specimen>
        <Specimen
          name={t(paint.locale, 'ui.preview.feedback.nameBadge', 'Badge')}
          variant={t(paint.locale, 'ui.preview.feedback.variantWarning', 'Warning')}
        >
          {(paint) => (
            <KitBadge
              paint={paint}
              role="warning"
              label={t(paint.locale, 'ui.preview.feedback.badgeMarginal', 'Marginal')}
              variant="solid"
            />
          )}
        </Specimen>
        <Specimen
          name={t(paint.locale, 'ui.preview.feedback.nameBadge', 'Badge')}
          variant={t(paint.locale, 'ui.preview.feedback.variantDanger', 'Danger')}
        >
          {(paint) => (
            <KitBadge
              paint={paint}
              role="danger"
              label={t(paint.locale, 'ui.preview.feedback.badgeFail', 'Fail')}
              variant="solid"
            />
          )}
        </Specimen>
        <Specimen
          name={t(paint.locale, 'ui.preview.feedback.nameBadge', 'Badge')}
          variant={t(paint.locale, 'ui.preview.feedback.variantSoft', 'Soft')}
        >
          {(paint) => (
            <KitBadge
              paint={paint}
              role="info"
              label={t(paint.locale, 'ui.preview.feedback.badgeDraft', 'Draft')}
              variant="soft"
            />
          )}
        </Specimen>

        <Specimen
          name={t(paint.locale, 'ui.preview.feedback.nameEmptyState', 'Empty state')}
          variant={t(paint.locale, 'ui.preview.feedback.variantFirstRun', 'First run')}
        >
          {(paint) => (
            <KitEmptyState paint={paint} />
          )}
        </Specimen>
      </Rail>

      <Rail
        label={t(paint.locale, 'ui.preview.feedback.progressTitle', 'Progress & Recovery')}
        description={t(
          paint.locale,
          'ui.preview.feedback.progressDesc',
          'A bar and a toast: the two surfaces that appear mid-task, on top of whatever the user was already reading.'
        )}
        locale={paint.locale}
      >
        <Specimen
          name={t(paint.locale, 'ui.preview.feedback.nameProgress', 'Progress')}
          variant={t(paint.locale, 'ui.preview.feedback.variantBar', 'Bar')}
        >
          {(paint) => (
            <KitProgress paint={paint} role="primary" at={0.62} />
          )}
        </Specimen>
        <Specimen
          name={t(paint.locale, 'ui.preview.feedback.nameProgress', 'Progress')}
          variant={t(paint.locale, 'ui.preview.feedback.variantDanger', 'Danger')}
        >
          {(paint) => (
            <KitProgress paint={paint} role="danger" at={0.24} />
          )}
        </Specimen>

        <Specimen
          name={t(paint.locale, 'ui.preview.feedback.nameToast', 'Toast')}
          variant={t(paint.locale, 'ui.preview.feedback.variantSuccess', 'Success')}
        >
          {(paint) => (
            <KitSurfaceish paint={paint} tone="success">
              {t(paint.locale, 'ui.preview.feedback.toastCopied', 'Copied --color-primary-500')}
            </KitSurfaceish>
          )}
        </Specimen>
        <Specimen
          name={t(paint.locale, 'ui.preview.feedback.nameToast', 'Toast')}
          variant={t(paint.locale, 'ui.preview.feedback.variantError', 'Error')}
        >
          {(paint) => (
            <KitSurfaceish paint={paint} tone="danger">
              {t(paint.locale, 'ui.preview.feedback.toastClipboardError', 'Could not write to clipboard')}
            </KitSurfaceish>
          )}
        </Specimen>

        <Specimen
          name={t(paint.locale, 'ui.preview.feedback.nameUndo', 'Undo')}
          variant={t(paint.locale, 'ui.preview.feedback.variantOffer', 'Offer')}
        >
          {(paint) => (
            <div class="w-full space-y-2.5">
              <KitText paint={paint} class="block text-[12px] leading-[16px]">
                {t(paint.locale, 'ui.preview.feedback.undoText', '2 shades removed from Crimson Danger.')}
              </KitText>
              <div class="flex items-center gap-1.5">
                <KitButton
                  paint={paint}
                  role="success"
                  label={t(paint.locale, 'ui.preview.feedback.labelUndo', 'Undo')}
                  variant="soft"
                  size="sm"
                />
                <KitButton
                  paint={paint}
                  role="secondary"
                  label={t(paint.locale, 'ui.preview.feedback.labelDismiss', 'Dismiss')}
                  variant="ghost"
                  size="sm"
                />
              </div>
            </div>
          )}
        </Specimen>
      </Rail>
    </div>
  );
}
