import { Rail, Specimen } from '../Specimen';
import {
  scorePair,
  worstOf,
  type ContrastPair,
  type Paint,
} from '../slots';
import { t } from '../../../../i18n/translations';
import {
  KitCheckboxRow,
  KitField,
  KitMuted,
  KitRadioRow,
  KitSearch,
  KitSlider,
  KitSwitchRow,
  KitText,
} from '../kit';

/**
 * Forms — the group that makes `background` and `text` matter.
 *
 * These two were orphaned before the semantic layer existed: the old preview
 * painted everything from the accent roles at step 500, so a field's surface and
 * its label were the same slot, and the page could not show whether text on a
 * background was readable at all.
 *
 * WHAT A FORM CARD IS FOR
 *
 * A form is the only place three neutral roles have to hold *simultaneously*:
 * the label in `text`, the value in `text` again on `surface`, and the edge in
 * `background`. Any two of them can pass alone and the field still fails — label
 * readable but value not, value readable but the hairline invisible against the
 * canvas. So each card is one field, at one size, on the same backdrop, and the
 * rail is ordered by how much it stresses that stack: rest, then the states that
 * add a fourth role to it.
 *
 * `invalid` is the card worth its space. It moves the edge and the message to
 * `danger`, and a palette that reads comfortably in grey and then fails the
 * moment red lands is the most common real defect this page finds.
 */
export function FormsGroup({ paint }: { paint: Paint }) {
  // The pairs that decide whether a form is usable: content on the surface, and
  // error content on that same surface.
  const scored: (ContrastPair | null)[] = [
    scorePair(
      t(paint.locale, 'ui.preview.forms.pairLabelOnSurface', 'Label on surface'),
      paint.text,
      paint.fixture.surface
    ),
    scorePair(
      t(paint.locale, 'ui.preview.forms.pairErrorTextOnSurface', 'Error text on surface'),
      paint.accents.danger.fill,
      paint.fixture.surface
    ),
  ];
  const worst = worstOf(scored);

  return (
    <div class="space-y-8">
      <Rail
        label={t(paint.locale, 'ui.preview.forms.fieldsTitle', 'Fields')}
        description={t(
          paint.locale,
          'ui.preview.forms.fieldsDesc',
          'Every field stacks label, value and edge. If any two of them fail alone, they still fail here.'
        )}
        hint={
          worst
            ? `${worst.wcag}:1`
            : t(paint.locale, 'ui.preview.forms.hintBgText', 'set background + text to score')
        }
        hintTitle={worst?.label}
        locale={paint.locale}
      >
        <Specimen
          name={t(paint.locale, 'ui.preview.forms.nameInput', 'Input')}
          variant={t(paint.locale, 'ui.preview.forms.variantRest', 'Rest')}
        >
          {(paint) => (
            <KitField
              paint={paint}
              label={t(paint.locale, 'ui.preview.forms.labelNamespace', 'Namespace')}
              value="--color-primary-500"
              hint={t(paint.locale, 'ui.preview.forms.hintSharedPrefix', 'Shared prefix.')}
            />
          )}
        </Specimen>

        <Specimen
          name={t(paint.locale, 'ui.preview.forms.nameInput', 'Input')}
          variant={t(paint.locale, 'ui.preview.forms.variantInvalid', 'Invalid')}
        >
          {(paint) => (
            <KitField
              paint={paint}
              label={t(paint.locale, 'ui.preview.forms.labelValue', 'Value')}
              value="oklch(banana)"
              invalid
              hint={t(paint.locale, 'ui.preview.forms.hintNotValid', 'Not a valid OKLCH triple.')}
            />
          )}
        </Specimen>

        <Specimen
          name={t(paint.locale, 'ui.preview.forms.nameTextarea', 'Textarea')}
          variant={t(paint.locale, 'ui.preview.forms.variantMulti', 'Multi')}
        >
          {(paint) => (
            <KitField
              paint={paint}
              label={t(paint.locale, 'ui.preview.forms.labelNotes', 'Notes')}
              value={t(paint.locale, 'ui.preview.forms.valueGamutClipped', 'Gamut-clipped to sRGB on export.')}
              kind="textarea"
            />
          )}
        </Specimen>

        <Specimen
          name={t(paint.locale, 'ui.preview.forms.nameSelect', 'Select')}
          variant={t(paint.locale, 'ui.preview.forms.variantClosed', 'Closed')}
        >
          {(paint) => (
            <KitField
              paint={paint}
              label={t(paint.locale, 'ui.preview.forms.labelColourModel', 'Colour model')}
              value="OKLCH"
              kind="select"
            />
          )}
        </Specimen>

        <Specimen
          name={t(paint.locale, 'ui.preview.forms.nameSearch', 'Search')}
          variant={t(paint.locale, 'ui.preview.forms.nameField', 'Field')}
        >
          {(paint) => (
            <div class="w-full space-y-1.5">
              <KitText paint={paint} class="block text-[12px]">
                {t(paint.locale, 'ui.preview.forms.labelLibrary', 'Library')}
              </KitText>
              <KitSearch
                paint={paint}
                placeholder={t(paint.locale, 'ui.preview.forms.placeholderSearchPalettes', 'Search palettes')}
              />
            </div>
          )}
        </Specimen>
      </Rail>

      <Rail
        label={t(paint.locale, 'ui.preview.forms.selectionTitle', 'Selection')}
        description={t(
          paint.locale,
          'ui.preview.forms.selectionDesc',
          'Four controls, four different answers to the same question: is the accent doing its job at this size?'
        )}
        locale={paint.locale}
      >
        <Specimen
          name={t(paint.locale, 'ui.preview.forms.nameCheckbox', 'Checkbox')}
          variant={t(paint.locale, 'ui.preview.forms.variantOn', 'On')}
        >
          {(paint) => (
            <div class="w-full space-y-2">
              <KitCheckboxRow
                paint={paint}
                label={t(paint.locale, 'ui.preview.forms.labelGenerateScale', 'Generate 50–950 scale')}
                checked
              />
              <KitCheckboxRow
                paint={paint}
                label={t(paint.locale, 'ui.preview.forms.labelClipToGamut', 'Clip to gamut silently')}
                checked={false}
              />
            </div>
          )}
        </Specimen>

        <Specimen
          name={t(paint.locale, 'ui.preview.forms.nameRadio', 'Radio')}
          variant={t(paint.locale, 'ui.preview.forms.variantGroup', 'Group')}
        >
          {(paint) => (
            <div class="w-full space-y-2">
              <KitRadioRow paint={paint} label="OKLCH" selected />
              <KitRadioRow paint={paint} label="sRGB" selected={false} />
            </div>
          )}
        </Specimen>

        <Specimen
          name={t(paint.locale, 'ui.preview.forms.nameSwitch', 'Switch')}
          variant={t(paint.locale, 'ui.preview.forms.variantOn', 'On')}
        >
          {(paint) => (
            <KitSwitchRow
              paint={paint}
              label={t(paint.locale, 'ui.preview.forms.labelNotifyMe', 'Notify me')}
            />
          )}
        </Specimen>

        {/*
          A slider is three roles of one scale in twenty pixels of height, which
          is why it is a whole card: the track is the raised step, the fill is
          500, and the thumb is the foreground with an accent edge.
        */}
        <Specimen
          name={t(paint.locale, 'ui.preview.forms.nameSlider', 'Slider')}
          variant={t(paint.locale, 'ui.preview.forms.variantRange', 'Range')}
        >
          {(paint) => (
            <KitSlider paint={paint} at={0.55} />
          )}
        </Specimen>

        <Specimen
          name={t(paint.locale, 'ui.preview.forms.nameField', 'Field')}
          variant={t(paint.locale, 'ui.preview.forms.variantLegend', 'Legend')}
        >
          {(paint) => (
            <div class="w-full space-y-1.5">
              <KitMuted paint={paint} class="block text-[11px]">
                {t(paint.locale, 'ui.preview.forms.contentDeltaE', 'Delta E · 0.84')}
              </KitMuted>
              <KitSlider paint={paint} at={0.28} />
              <KitMuted paint={paint} class="block text-[10px]">
                {t(paint.locale, 'ui.preview.forms.contentCloserBetter', 'Perceptually closer is better.')}
              </KitMuted>
            </div>
          )}
        </Specimen>
      </Rail>
    </div>
  );
}
