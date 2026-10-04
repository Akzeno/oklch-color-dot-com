import { PreviewFrame } from '../PreviewFrame';
import { Swatch, unsetStyle } from '../Swatch';
import { ACCENT, scorePair, type AccentRole, type ContrastPair, type Paint } from '../slots';

/**
 * Buttons — solid, outline and ghost, once per accent role.
 *
 * KEPT DELIBERATELY PLAIN
 *
 * This group earns its place by testing the semantic pair: a solid button takes
 * its fill from `<role>-500` and its label from the far end of the *same* role's
 * scale. Getting that wrong is invisible in a palette and glaring here.
 *
 * It does not need more than that to do the job, and an earlier version had
 * several frames that actively hurt it:
 *
 *  - A "States" row of six identical buttons captioned Resting / Hover /
 *    Focus-visible / Active / Loading / Disabled. Nothing was hovered, focused or
 *    pressed — the captions were claims the DOM did not support. On a page whose
 *    entire purpose is not lying about colours, a fake state demo is the worst
 *    thing it can ship. Real interaction states are now left to real interaction.
 *  - Placeholder icon buttons ("S", "B", "U") and a Day/Week/Month segment
 *    control: pure filler, inventing components the page has no opinion about.
 *
 * Three frames, all common buttons, all really painted.
 */

/** Fill at 500, label at the far end of the same scale. */
function SolidButton({
  paint,
  role,
  label,
  size = 'md',
  disabled = false,
}: {
  paint: Paint;
  role: AccentRole;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}) {
  const pair = paint.accents[role];
  const onStep = ACCENT.on[paint.theme];

  const pad =
    size === 'sm' ? 'px-2.5 py-1 text-[10px]' : size === 'lg' ? 'px-5 py-2.5 text-sm' : 'px-4 py-2 text-xs';

  // Disabled is a real `disabled` button painted from the stage rather than from
  // an accent. It stays clickable for its own slot, because a designer still
  // needs to judge that disabled colour against the canvas — what it must not do
  // is pretend to be a primary action.
  if (disabled) {
    return (
      <Swatch
        slot={paint.border}
        role="background"
        step={paint.border?.requested ?? 800}
        pending={!paint.border}
        part="border"
        class={`${pad} rounded-lg border opacity-40 cursor-not-allowed`}
        style={{ color: paint.muted?.css }}
      >
        {label}
      </Swatch>
    );
  }

  return (
    // Both children are spans, not Swatch's default div. A <div> is flow content
    // and the HTML parser cannot keep one inside a <span>: it closes the span and
    // re-parents the divs as siblings, so the server-rendered DOM no longer
    // matches the tree Preact tries to hydrate — which detaches the click targets
    // and leaves the fill and label painted by the wrong nodes.
    <span class={`inline-flex rounded-lg overflow-hidden shadow-sm`}>
      {/* Fill. No padding of its own — the label carries it, so putting padding
          on both would leave an empty coloured block down one side. */}
      <Swatch
        slot={pair.fill}
        role={role}
        step={ACCENT.fill[paint.theme]}
        pending={!pair.fill}
        part="bg"
        as="span"
        class="self-stretch"
        style={!pair.fill ? unsetStyle(paint.theme) : undefined}
      />
      <Swatch
        slot={pair.on}
        role={role}
        step={onStep}
        pending={!pair.on}
        // Without this the label would paint transparent and the button would be
        // unreadable — you could not tell "Save changes" from "Delete".
        pendingCss={paint.pendingInk}
        part="text"
        as="span"
        class={`${pad} rounded-lg font-medium`}
        style={!pair.on ? unsetStyle(paint.theme) : undefined}
      >
        {label}
      </Swatch>
    </span>
  );
}

/** No fill: the accent becomes the border and the content. */
function OutlineButton({ paint, role, label }: { paint: Paint; role: AccentRole; label: string }) {
  const pair = paint.accents[role];
  return (
    <Swatch
      slot={pair.fill}
      role={role}
      step={ACCENT.fill[paint.theme]}
      pending={!pair.fill}
      part="border"
      class="px-4 py-2 rounded-lg text-xs font-medium border"
      style={{
        color: pair.on?.css,
        ...(pair.fill ? {} : unsetStyle(paint.theme)),
      }}
    >
      {label}
    </Swatch>
  );
}

/** Borderless until hovered; the accent is the content. */
function GhostButton({ paint, role, label }: { paint: Paint; role: AccentRole; label: string }) {
  const pair = paint.accents[role];
  return (
    <Swatch
      slot={pair.fill}
      role={role}
      step={ACCENT.fill[paint.theme]}
      pending={!pair.fill}
      pendingCss={paint.pendingInk}
      part="text"
      class="px-4 py-2 rounded-lg text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5"
      style={pair.fill ? undefined : unsetStyle(paint.theme)}
    >
      {label}
    </Swatch>
  );
}

/** Roles with a 500 set, and those still waiting on one. */
function split(paint: Paint) {
  return {
    ready: paint.accentRoles.filter((r) => paint.accents[r].fill),
    waiting: paint.accentRoles.filter((r) => !paint.accents[r].fill),
  };
}

/** The label a role gets on a button: its own name, title-cased. */
function actionLabel(role: AccentRole) {
  if (role === 'trusty-button') return 'Save changes';
  if (role === 'primary') return 'Continue';
  if (role === 'secondary') return 'Cancel';
  if (role === 'success') return 'Confirm';
  if (role === 'danger') return 'Delete';
  if (role === 'warning') return 'Review';
  return 'Notify';
}

export function ButtonsGroup({ paint }: { paint: Paint }) {
  const { ready, waiting } = split(paint);
  const canvas = paint.canvas?.css ?? '#0f0f0f';
  const frameBorder = paint.border?.css ?? '#262626';

  // One grade for the frame header: the worst solid-button pair on the page.
  // Enough to catch a broken pairing without turning the group into a report.
  const pairs: ContrastPair[] = [];
  for (const role of ready) {
    const p = scorePair(
      `${role} content on fill`,
      paint.accents[role].on,
      paint.accents[role].fill
    );
    if (p) pairs.push(p);
  }
  const worst = pairs.reduce<ContrastPair | null>(
    (acc, p) => (acc === null || (p.wcag ?? 0) < (acc.wcag ?? 0) ? p : acc),
    null
  );

  return (
    <>
      <PreviewFrame
        label="Solid"
        description="Fill from the 500 slot, label from the far end of the same role."
        hint={worst ? `worst ${worst.wcag}:1 · ${worst.grade}` : 'set an accent to score'}
        hintPass={worst ? worst.grade !== 'Fail' : undefined}
        canvasBg={canvas}
        borderCol={frameBorder}
        index={0}
      >
        <div class="flex items-center gap-3 flex-wrap">
          {ready.map((role) => (
            <SolidButton key={role} paint={paint} role={role} label={actionLabel(role)} />
          ))}
          {ready.length === 0 && (
            <p class="text-xs font-mono text-[#737373]">
              No accent roles set yet — add one in the Design Tokens panel.
            </p>
          )}
        </div>
      </PreviewFrame>

      <PreviewFrame
        label="Outline & Ghost"
        description="The same accent as a border, and as plain content."
        canvasBg={canvas}
        borderCol={frameBorder}
        index={1}
      >
        <div class="space-y-3">
          <div class="flex items-center gap-3 flex-wrap">
            {ready.map((role) => (
              <OutlineButton key={role} paint={paint} role={role} label={actionLabel(role)} />
            ))}
          </div>
          <div class="flex items-center gap-3 flex-wrap">
            {ready.map((role) => (
              <GhostButton key={role} paint={paint} role={role} label={actionLabel(role)} />
            ))}
          </div>
        </div>
      </PreviewFrame>

      <PreviewFrame
        label="Sizes & Disabled"
        description="Three sizes on the primary action, and a genuinely inert button."
        canvasBg={canvas}
        borderCol={frameBorder}
        index={2}
      >
        <div class="flex items-end gap-3 flex-wrap">
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <SolidButton
              key={size}
              paint={paint}
              role="trusty-button"
              label={actionLabel('trusty-button')}
              size={size}
            />
          ))}
          <SolidButton paint={paint} role="trusty-button" label="Disabled" disabled />
        </div>
      </PreviewFrame>

      {/* Roles with no 500. Clickable, because authoring that token is the point. */}
      {waiting.length > 0 && (
        <PreviewFrame
          label="Awaiting Tokens"
          description="Accent roles with no 500 slot — click one to author it."
          canvasBg={canvas}
          borderCol={frameBorder}
          index={3}
        >
          <div class="flex items-center gap-2 flex-wrap">
            {waiting.map((role) => (
              <Swatch
                key={role}
                slot={null}
                role={role}
                step={ACCENT.fill[paint.theme]}
                pending
                part="bg"
                class="px-3 py-1.5 rounded-lg text-[11px] font-mono border"
                style={unsetStyle(paint.theme)}
              >
                --color-{role}-{ACCENT.fill[paint.theme]}
              </Swatch>
            ))}
          </div>
        </PreviewFrame>
      )}
    </>
  );
}