import { Rail, Specimen } from '../Specimen';
import { Swatch, unsetStyle } from '../Swatch';
import { t } from '../../../../i18n/translations';
import {
  ACCENT,
  scorePair,
  worstOf,
  type AccentRole,
  type ContrastPair,
  type Paint,
} from '../slots';
import {
  KitAvatar,
  KitAvatarStack,
  KitBadge,
  KitButton,
  KitIconButton,
  KitIconRow,
  type ButtonVariant,
} from '../kit';

/**
 * Buttons — the group that tests the accent pair, once per variant.
 *
 * WHAT CHANGED, AND WHY
 *
 * This used to be three wide canvases of buttons stacked by *variant*, with one
 * button per accent role inside each. Two things were wrong with that.
 *
 * The comparison it asked for was cross-eyed. "Solid" held seven buttons at
 * once, so reading it meant holding seven pairs in your head, and the thing it
 * was for — *is this role's 500 readable under its own 50* — had to be done by
 * eye across a crowded row. One card per variant, same card size, same backdrop,
 * side by side in a rail, turns that into the comparison a rail is for.
 *
 * And the components looked like oklchcolor2. Ink-on-black mono chips in a
 * hairline grid is this product's own button, so a palette that flattered it
 * flattered itself. The fixture uses a different type stack, a 12px radius and
 * gradient fills — see `kit.tsx` — so the answer is about the palette.
 *
 * THE VARIANTS
 *
 * `classic`, `solid`, `soft`, `outline`, `ghost` is the real set: a filled
 * control, its flat cousin, the tinted variant, the edged variant, and the one
 * with no fill at all. `ghost` earns its card because its label sits directly on
 * the card's canvas — the strictest contrast test in the group, and the one most
 * palettes fail without noticing.
 */

/** The role the variant cards are painted from. */
const ROLE: AccentRole = 'trusty-button';

const VARIANTS: { variant: ButtonVariant; name: string }[] = [
  { variant: 'classic', name: 'Classic' },
  { variant: 'solid', name: 'Solid' },
  { variant: 'soft', name: 'Soft' },
  { variant: 'outline', name: 'Outline' },
  { variant: 'ghost', name: 'Ghost' },
];

/** Roles with a 500, and those still waiting on one. */
function split(paint: Paint) {
  return {
    ready: paint.accentRoles.filter((r) => paint.accents[r].fill),
    waiting: paint.accentRoles.filter((r) => !paint.accents[r].fill),
  };
}

/** The label a role gets on a button: its own localized name, title-cased. */
function actionLabel(paint: Paint, role: AccentRole) {
  const titleCased = role
    .split('-')
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(' ');
  return t(paint.locale, `ui.roles.${role}`, titleCased);
}

/** The semantic pair this group exists for, scored for one role. */
function accentPair(paint: Paint, role: AccentRole): ContrastPair | null {
  const pair = paint.accents[role];
  return scorePair(
    t(paint.locale, 'ui.preview.buttons.pairContentOnFill', '{role} content on fill').replace(
      '{role}',
      actionLabel(paint, role)
    ),
    pair.on,
    pair.fill
  );
}

export function ButtonsGroup({ paint }: { paint: Paint }) {
  const { ready, waiting } = split(paint);

  // One number for the first rail: the weakest accent pairing on the page.
  // Enough to catch a broken pair without turning the group into a report.
  const worst = worstOf(ready.map((role) => accentPair(paint, role)));

  return (
    <div class="space-y-8">
      <Rail
        label={t(paint.locale, 'ui.preview.buttons.variantsTitle', 'Variants')}
        description={t(
          paint.locale,
          'ui.preview.buttons.variantsDesc',
          'One card per variant, all painted from the Trusty Button role on an identical backdrop.'
        )}
        hint={
          worst
            ? `${worst.wcag}:1`
            : t(paint.locale, 'ui.preview.buttons.scoreHint', 'set an accent to score')
        }
        hintTitle={worst?.label}
        locale={paint.locale}
      >
        {VARIANTS.map(({ variant, name }) => (
          <Specimen
            key={variant}
            name={t(paint.locale, 'ui.preview.buttons.nameButton', 'Button')}
            variant={t(paint.locale, `ui.preview.buttons.variant${name}`, name)}
          >
            {(paint) => (
              <KitButton
                paint={paint}
                role={ROLE}
                label={t(paint.locale, 'ui.preview.buttons.labelContinue', 'Continue')}
                variant={variant}
                withIcon
              />
            )}
          </Specimen>
        ))}
      </Rail>

      <Rail
        label={t(paint.locale, 'ui.preview.buttons.sizesTitle', 'Sizes & Icon Buttons')}
        description={t(
          paint.locale,
          'ui.preview.buttons.sizesDesc',
          'The same fill at three sizes, then the icon-only control in each of its three treatments.'
        )}
        locale={paint.locale}
      >
        <Specimen
          name={t(paint.locale, 'ui.preview.buttons.nameButton', 'Button')}
          variant={t(paint.locale, 'ui.preview.buttons.variantSmall', 'Small')}
        >
          {(paint) => (
            <KitButton
              paint={paint}
              role={ROLE}
              label={t(paint.locale, 'ui.preview.buttons.labelSaveChanges', 'Save changes')}
              size="sm"
            />
          )}
        </Specimen>

        <Specimen
          name={t(paint.locale, 'ui.preview.buttons.nameIconButton', 'Icon button')}
          variant={t(paint.locale, 'ui.preview.buttons.variantSolid', 'Solid')}
        >
          {(paint) => (
            <KitIconButton paint={paint} role={ROLE} glyph="plus" variant="solid" />
          )}
        </Specimen>

        <Specimen
          name={t(paint.locale, 'ui.preview.buttons.nameIconButton', 'Icon button')}
          variant={t(paint.locale, 'ui.preview.buttons.variantSoft', 'Soft')}
        >
          {(paint) => (
            <KitIconButton paint={paint} role={ROLE} glyph="check" variant="soft" />
          )}
        </Specimen>

        <Specimen
          name={t(paint.locale, 'ui.preview.buttons.nameIconButton', 'Icon button')}
          variant={t(paint.locale, 'ui.preview.buttons.variantOutline', 'Outline')}
        >
          {(paint) => (
            <KitIconButton paint={paint} role={ROLE} glyph="dots" variant="outline" />
          )}
        </Specimen>

        <Specimen
          name={t(paint.locale, 'ui.preview.buttons.nameIconRow', 'Icon row')}
          variant={t(paint.locale, 'ui.preview.buttons.variantToolbar', 'Toolbar')}
        >
          {(paint) => (
            <KitIconRow paint={paint} role={ROLE} />
          )}
        </Specimen>
      </Rail>

      {/*
        A second rail for the shapes that are not buttons but are painted from
        the same pair, because a palette that survives a button and then fails a
        badge has not survived the button.
      */}
      <Rail
        label={t(paint.locale, 'ui.preview.buttons.shapesTitle', 'Same Pair, Other Shapes')}
        description={t(
          paint.locale,
          'ui.preview.buttons.shapesDesc',
          'Badges and avatars take the same fill and foreground as the button — over a tenth of its area.'
        )}
        locale={paint.locale}
      >
        <Specimen
          name={t(paint.locale, 'ui.preview.buttons.nameBadge', 'Badge')}
          variant={t(paint.locale, 'ui.preview.buttons.variantSolid', 'Solid')}
        >
          {(paint) => (
            <KitBadge
              paint={paint}
              role="info"
              label={t(paint.locale, 'ui.preview.buttons.badgeNew', 'New')}
              variant="solid"
            />
          )}
        </Specimen>
        <Specimen
          name={t(paint.locale, 'ui.preview.buttons.nameBadge', 'Badge')}
          variant={t(paint.locale, 'ui.preview.buttons.variantSoft', 'Soft')}
        >
          {(paint) => (
            <KitBadge
              paint={paint}
              role="info"
              label={t(paint.locale, 'ui.preview.buttons.badgeDraft', 'Draft')}
              variant="soft"
            />
          )}
        </Specimen>
        <Specimen
          name={t(paint.locale, 'ui.preview.buttons.nameBadge', 'Badge')}
          variant={t(paint.locale, 'ui.preview.buttons.variantOutline', 'Outline')}
        >
          {(paint) => (
            <KitBadge
              paint={paint}
              role="info"
              label={t(paint.locale, 'ui.preview.buttons.badgeBeta', 'Beta')}
              variant="outline"
            />
          )}
        </Specimen>
        <Specimen
          name={t(paint.locale, 'ui.preview.buttons.nameAvatar', 'Avatar')}
          variant={t(paint.locale, 'ui.preview.buttons.variantSolid', 'Solid')}
        >
          {(paint) => (
            <KitAvatar paint={paint} role="primary" initials="EV" variant="solid" />
          )}
        </Specimen>
        <Specimen
          name={t(paint.locale, 'ui.preview.buttons.nameAvatar', 'Avatar')}
          variant={t(paint.locale, 'ui.preview.buttons.variantGradient', 'Gradient')}
        >
          {(paint) => (
            <KitAvatar paint={paint} role="primary" initials="EV" variant="gradient" />
          )}
        </Specimen>
        <Specimen
          name={t(paint.locale, 'ui.preview.buttons.nameAvatar', 'Avatar')}
          variant={t(paint.locale, 'ui.preview.buttons.variantStack', 'Stack')}
        >
          {(paint) => (
            <KitAvatarStack paint={paint} />
          )}
        </Specimen>
      </Rail>

      <Rail
        label={t(paint.locale, 'ui.preview.buttons.rolesTitle', 'Every Accent Role')}
        description={t(
          paint.locale,
          'ui.preview.buttons.rolesDesc',
          'One card per role, so a palette that only breaks on `danger` cannot hide behind six healthy buttons.'
        )}
        locale={paint.locale}
      >
        {ready.length === 0 && (
          <p class="prose-hud self-center pr-4">
            {t(
              paint.locale,
              'ui.preview.buttons.noAccents',
              'No accent roles set yet — add one in the Design Tokens panel.'
            )}
          </p>
        )}
        {ready.map((role) => (
          <Specimen
            key={role}
            name={actionLabel(paint, role)}
            variant={t(paint.locale, 'ui.preview.buttons.variantSolid', 'Solid')}
          >
            {(paint) => (
              <KitButton
                paint={paint}
                role={role}
                label={actionLabel(paint, role)}
                variant="solid"
                size="sm"
              />
            )}
          </Specimen>
        ))}
      </Rail>

      {/* Roles with no 500. Clickable, because authoring that token is the point. */}
      {waiting.length > 0 && (
        <Rail
          label={t(paint.locale, 'ui.preview.buttons.awaitingTitle', 'Awaiting Tokens')}
          description={t(
            paint.locale,
            'ui.preview.buttons.awaitingDesc',
            'Accent roles with no 500 slot — click one to author it.'
          )}
          locale={paint.locale}
        >
          {waiting.map((role) => (
            <Specimen
              key={role}
              name={actionLabel(paint, role)}
              variant={t(paint.locale, 'ui.preview.buttons.variantNotSet', 'Not set')}
            >
              {(paint) => (
                <Swatch
                  slot={null}
                  role={role}
                  step={ACCENT.fill[paint.theme]}
                  pending
                  part="bg"
                  locale={paint.locale}
                  class="px-2.5 py-1.5 rounded-lg font-mono text-[10px] border text-center"
                  style={unsetStyle(paint.theme)}
                >
                  --color-{role}-{ACCENT.fill[paint.theme]}
                </Swatch>
              )}
            </Specimen>
          ))}
        </Rail>
      )}
    </div>
  );
}
