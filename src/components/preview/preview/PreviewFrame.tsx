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
  /** Right-aligned pill: a contrast ratio, or a note that there is none yet. */
  hint?: string;
  /** The pair the ratio belongs to, used as the pill's hover title. */
  hintTitle?: string;
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
  hintTitle,
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
            One pill, one meaning, no state. It was first a traffic light
            (`emerald-400` on green for a pass, `amber-400` for a fail — with
            amber already meaning "outside sRGB" on this page), then an
            ink-weight scheme that still drew a failure as ink on the hover fill
            behind the focus-ring border: a control state rendered permanently,
            which read as something stuck rather than as a grade. The verdict is
            not printed any more — the ratio is — so there is nothing left to
            dress up.
          */
          <span
            class="pill shrink-0"
            title={hintTitle ? `${hint} · weakest pair: ${hintTitle}` : undefined}
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
