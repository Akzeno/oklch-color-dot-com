import type { ComponentChildren } from 'preact';

/**
 * The bordered canvas each group variant sits on.
 *
 * Extracted from the 790-line island so group files can own their own layout
 * without every group re-deriving the label / hint / stagger markup.
 */
export interface PreviewFrameProps {
  /** Small uppercase label above the canvas. */
  label: string;
  /** One line explaining what this variant is for. */
  description?: string;
  /** Right-aligned status pill, e.g. a contrast grade. */
  hint?: string;
  hintPass?: boolean;
  canvasBg: string;
  borderCol: string;
  /** Drives the staggered entry animation. */
  index: number;
  /** Stretch across both columns of the frames grid. */
  span?: boolean;
  children: ComponentChildren;
}

export function PreviewFrame({
  label,
  description,
  hint,
  hintPass,
  canvasBg,
  borderCol,
  index,
  span = false,
  children,
}: PreviewFrameProps) {
  return (
    <div
      class={`space-y-2 animate-frame-in ${span ? '@3xl:col-span-2' : ''}`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <span class="eyebrow block">{label}</span>
          {description && <p class="mt-1 prose-hud text-[12px] leading-[17px]">{description}</p>}
        </div>
        {hint && (
          /*
            The contrast grade. It was `emerald-400` on green wash for a pass and
            `amber-400` on amber for a fail — a traffic light, on a page whose
            subject is judging colour, with amber already meaning "outside sRGB".
            Two meanings for one hue teaches the reader that the hue is not the
            message. The grade is now carried by ink weight instead: a failure
            is ink on a raised fill, a pass is mute on nothing.
          */
          <span
            class={`pill shrink-0 ${
              hintPass === false
                ? 'bg-canvas-elevated border-border-focus text-ink'
                : hintPass === true
                  ? 'border-transparent text-mute'
                  : 'border-transparent text-faint'
            }`}
          >
            {hint}
          </span>
        )}
      </div>

      <div
        class="rounded-lg border p-4 md:p-5 transition-colors duration-150"
        style={{ backgroundColor: canvasBg, borderColor: borderCol }}
      >
        {children}
      </div>
    </div>
  );
}
