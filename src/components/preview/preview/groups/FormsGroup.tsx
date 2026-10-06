import { Rail, Specimen } from '../Specimen';
import {
  scorePair,
  worstOf,
  type ContrastPair,
  type Paint,
} from '../slots';
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
    scorePair('Label on surface', paint.text, paint.fixture.surface),
    scorePair('Error text on surface', paint.accents.danger.fill, paint.fixture.surface),
  ];
  const worst = worstOf(scored);

  return (
    <div class="space-y-8">
      <Rail
        label="Fields"
        description="Every field stacks label, value and edge. If any two of them fail alone, they still fail here."
        hint={worst ? `worst ${worst.wcag}:1 · ${worst.grade}` : 'set background + text to score'}
        hintPass={worst ? worst.grade !== 'Fail' : undefined}
      >
        <Specimen name="Input" variant="Rest">
          {(paint) => (
            <KitField paint={paint} label="Namespace" value="--color-primary-500" hint="Shared prefix." />
          )}
        </Specimen>

        <Specimen name="Input" variant="Invalid">
          {(paint) => (
            <KitField
              paint={paint}
              label="Value"
              value="oklch(banana)"
              invalid
              hint="Not a valid OKLCH triple."
            />
          )}
        </Specimen>

        <Specimen name="Textarea" variant="Multi">
          {(paint) => (
            <KitField
              paint={paint}
              label="Notes"
              value="Gamut-clipped to sRGB on export."
              kind="textarea"
            />
          )}
        </Specimen>

        <Specimen name="Select" variant="Closed">
          {(paint) => (
            <KitField paint={paint} label="Colour model" value="OKLCH" kind="select" />
          )}
        </Specimen>

        <Specimen name="Search" variant="Field">
          {(paint) => (
            <div class="w-full space-y-1.5">
              <KitText paint={paint} class="block text-[12px]">
                Library
              </KitText>
              <KitSearch paint={paint} placeholder="Search palettes" />
            </div>
          )}
        </Specimen>
      </Rail>

      <Rail
        label="Selection"
        description="Four controls, four different answers to the same question: is the accent doing its job at this size?"
      >
        <Specimen name="Checkbox" variant="On">
          {(paint) => (
            <div class="w-full space-y-2">
              <KitCheckboxRow paint={paint} label="Generate 50–950 scale" checked />
              <KitCheckboxRow paint={paint} label="Clip to gamut silently" checked={false} />
            </div>
          )}
        </Specimen>

        <Specimen name="Radio" variant="Group">
          {(paint) => (
            <div class="w-full space-y-2">
              <KitRadioRow paint={paint} label="OKLCH" selected />
              <KitRadioRow paint={paint} label="sRGB" selected={false} />
            </div>
          )}
        </Specimen>

        <Specimen name="Switch" variant="On">
          {(paint) => (
            <KitSwitchRow paint={paint} label="Notify me" />
          )}
        </Specimen>

        {/*
          A slider is three roles of one scale in twenty pixels of height, which
          is why it is a whole card: the track is the raised step, the fill is
          500, and the thumb is the foreground with an accent edge.
        */}
        <Specimen name="Slider" variant="Range">
          {(paint) => (
            <KitSlider paint={paint} at={0.55} />
          )}
        </Specimen>

        <Specimen name="Field" variant="Legend">
          {(paint) => (
            <div class="w-full space-y-1.5">
              <KitMuted paint={paint} class="block text-[11px]">
                Delta E · 0.84
              </KitMuted>
              <KitSlider paint={paint} at={0.28} />
              <KitMuted paint={paint} class="block text-[10px]">
                Perceptually closer is better.
              </KitMuted>
            </div>
          )}
        </Specimen>
      </Rail>
    </div>
  );
}
