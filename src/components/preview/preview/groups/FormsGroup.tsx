import { PreviewFrame } from '../PreviewFrame';
import { Swatch, unsetStyle } from '../Swatch';
import { scorePair, type ContrastPair, type Paint } from '../slots';
import { Check } from 'lucide-preact';

/**
 * Forms — the group that makes the `background` and `text` roles matter.
 *
 * These two were orphaned before the semantic layer existed: the old preview
 * painted everything from the accent roles at step 500, so a field's surface and
 * its label were the same slot and the page could not show whether text on a
 * background, or a focus ring against either, was readable.
 *
 * KEPT DELIBERATELY PLAIN
 *
 * One card of the four text-field states that actually differ — rest, focus,
 * error, disabled — plus one row of the common selection controls. An earlier
 * version also had a six-input grid (including a deliberately over-long value to
 * watch truncate), a three-item radio group, a three-item checkbox group, a
 * switch pair and a slider, all on one screen. None of that found a bug that the
 * four field states do not, and it buried the two questions that matter: is the
 * label readable on the surface, and does the error text read as an error.
 */

/** Shared field chrome so label / control / help / error stay consistent. */
function Field({
  paint,
  label,
  hint,
  error,
  id,
  children,
}: {
  paint: Paint;
  label: string;
  hint?: string;
  error?: string;
  id: string;
  children: preact.ComponentChildren;
}) {
  const labelSlot = error ? paint.accents.danger.fill : paint.text;
  return (
    <div class="space-y-1.5">
      <label
        for={id}
        class="block text-label"
        style={labelSlot ? { color: labelSlot.css } : undefined}
      >
        {label}
      </label>
      {children}
      {error ? (
        <p class="font-mono text-micro" style={{ color: paint.accents.danger.fill?.css }}>
          {error}
        </p>
      ) : hint ? (
        <p class="font-mono text-micro" style={{ color: paint.muted?.css }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * One input: fill from the surface slot, edge from the border slot, content from
 * the text slot. Invalid takes the edge to `danger`; focused adds a real ring.
 */
function TextInput({
  paint,
  value,
  id,
  invalid = false,
  disabled = false,
  focused = false,
}: {
  paint: Paint;
  value: string;
  id: string;
  invalid?: boolean;
  disabled?: boolean;
  focused?: boolean;
}) {
  const edge = invalid ? paint.accents.danger.fill : focused ? paint.accents.primary.fill : paint.border;

  return (
    <Swatch
      slot={edge}
      role={edge?.role ?? 'background'}
      step={edge?.requested ?? 800}
      pending={!edge}
      part="border"
      as="input"
      id={id}
      type="text"
      value={value}
      readOnly
      disabled={disabled}
      tabIndex={focused ? 0 : -1}
      class={`w-full px-3 py-2 rounded-md font-mono text-micro ${focused ? 'outline-none' : ''}`}
      style={{
        backgroundColor: paint.surface?.css,
        color: paint.text?.css,
        // A 2px ring rather than a 1px border change: that is what focus actually
        // looks like, and faking it as a colour swap hides ring-vs-border problems.
        boxShadow: focused && !disabled && edge ? `0 0 0 3px ${edge.css}33` : 'none',
        opacity: disabled ? '0.45' : '1',
        ...(edge ? {} : unsetStyle(paint.theme)),
      }}
    />
  );
}

/** Checkbox, radio and switch: the three common selection controls. */
function SelectionControls({ paint }: { paint: Paint }) {
  const accent = paint.accents.primary.fill;
  const box = 'w-3.5 h-3.5 flex items-center justify-center flex-shrink-0 border';

  return (
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* Radio */}
      <div class="space-y-2">
        <span class="eyebrow block">Radio</span>
        {['OKLCH', 'sRGB'].map((label, i) => (
          <label key={label} class="flex items-center gap-2 text-label" style={{ color: paint.text?.css }}>
            <Swatch
              slot={i === 0 ? accent : paint.border}
              role={i === 0 ? 'primary' : 'background'}
              step={i === 0 ? 500 : (paint.border?.requested ?? 800)}
              pending={i === 0 ? !accent : !paint.border}
              part="border"
              class={`${box} rounded-full`}
            >
              {i === 0 && (
                <span
                  class="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: accent?.css ?? 'transparent' }}
                />
              )}
            </Swatch>
            <span>{label}</span>
          </label>
        ))}
      </div>

      {/* Checkbox */}
      <div class="space-y-2">
        <span class="eyebrow block">Checkbox</span>
        {['Generate 50–950 scale', 'Gamut clip silently'].map((label, i) => (
          <label key={label} class="flex items-center gap-2 text-label" style={{ color: paint.text?.css }}>
            <Swatch
              slot={i === 0 ? accent : paint.border}
              role={i === 0 ? 'primary' : 'background'}
              step={i === 0 ? 500 : (paint.border?.requested ?? 800)}
              pending={i === 0 ? !accent : !paint.border}
              part="border"
              class={`${box} rounded`}
              style={i === 0 && accent ? { backgroundColor: accent.css } : undefined}
            >
              {i === 0 && (
                <Check
                  class="w-2.5 h-2.5"
                  strokeWidth={3.5}
                  stroke={paint.accents.primary.on?.css ?? '#fff'}
                  aria-hidden="true"
                />
              )}
            </Swatch>
            <span>{label}</span>
          </label>
        ))}
      </div>

      {/* Switch */}
      <div class="space-y-2">
        <span class="eyebrow block">Switch</span>
        {[true, false].map((on) => (
          <div key={String(on)} class="flex items-center justify-between gap-3">
            <span class="text-label" style={{ color: paint.text?.css }}>
              {on ? 'Enabled' : 'Disabled'}
            </span>
            <Swatch
              slot={on ? accent : paint.border}
              role={on ? 'primary' : 'background'}
              step={on ? 500 : (paint.border?.requested ?? 800)}
              pending={on ? !accent : !paint.border}
              part="bg"
              class="w-9 h-5 rounded-full flex items-center px-0.5"
            >
              <span
                class="w-4 h-4 rounded-full bg-white"
                style={{ transform: `translateX(${on ? 16 : 0}px)` }}
              />
            </Swatch>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FormsGroup({ paint }: { paint: Paint }) {
  const canvas = paint.canvas?.css ?? '#0f0f0f';
  const frameBorder = paint.border?.css ?? '#262626';

  // The pairs that decide whether a form is usable: content on the surface, and
  // error content on that same surface.
  const scored = [
    scorePair('Label on surface', paint.text, paint.surface),
    scorePair('Input content on surface', paint.text, paint.surface),
    scorePair('Error text on surface', paint.accents.danger.fill, paint.surface),
  ].filter((p): p is ContrastPair => p !== null);
  const worst = scored.reduce<ContrastPair | null>(
    (acc, p) => (acc === null || (p.wcag ?? 0) < (acc.wcag ?? 0) ? p : acc),
    null
  );

  return (
    <>
      <PreviewFrame
        label="Text Fields"
        description="Surface for the fill, text for the content, border for the edge."
        hint={worst ? `worst ${worst.wcag}:1 · ${worst.grade}` : 'set background + text to score'}
        hintPass={worst ? worst.grade !== 'Fail' : undefined}
        canvasBg={canvas}
        borderCol={frameBorder}
        index={0}
      >
        <div
          class="p-4 rounded-lg border space-y-3.5 max-w-md"
          style={{ backgroundColor: paint.surface?.css, borderColor: frameBorder }}
        >
          <Field paint={paint} id="f-namespace" label="Design Token Namespace" hint="Shared prefix for every generated variable.">
            <TextInput paint={paint} id="f-namespace" value="--color-primary-500" />
          </Field>

          <Field paint={paint} id="f-focus" label="Focus" hint="Ring is primary-500 at low alpha.">
            <TextInput paint={paint} id="f-focus" value="Focused input" focused />
          </Field>

          <Field paint={paint} id="f-error" label="Validation" error="Not a valid OKLCH triple — expected L, C, H.">
            <TextInput paint={paint} id="f-error" value="oklch(banana)" invalid />
          </Field>

          <Field paint={paint} id="f-disabled" label="Disabled">
            <TextInput paint={paint} id="f-disabled" value="Cannot edit" disabled />
          </Field>
        </div>
      </PreviewFrame>

      <PreviewFrame
        label="Selection Controls"
        description="Checkbox, radio and switch. Checked state is the primary accent."
        canvasBg={canvas}
        borderCol={frameBorder}
        index={1}
      >
        <div
          class="p-4 rounded-lg border"
          style={{ backgroundColor: paint.surface?.css, borderColor: frameBorder }}
        >
          <SelectionControls paint={paint} />
        </div>
      </PreviewFrame>
    </>
  );
}