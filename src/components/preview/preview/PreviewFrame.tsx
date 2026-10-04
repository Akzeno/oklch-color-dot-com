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
      class={`space-y-2.5 animate-frame-in ${span ? '@3xl:col-span-2' : ''}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div class="flex items-start justify-between px-1 gap-3">
        <div class="min-w-0">
          <span class="text-[11px] font-mono font-semibold uppercase tracking-widest text-[#525252]">
            {label}
          </span>
          {description && (
            <p class="text-[11px] font-mono text-[#404040] mt-0.5 leading-snug">{description}</p>
          )}
        </div>
        {hint && (
          <span
            class={`text-[11px] font-mono px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${
              hintPass === true
                ? 'bg-emerald-500/10 text-emerald-400'
                : hintPass === false
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'text-[#404040]'
            }`}
          >
            {hint}
          </span>
        )}
      </div>

      <div
        class="rounded-2xl border p-5 md:p-6 transition-colors duration-200 shadow-lg shadow-black/20"
        style={{ backgroundColor: canvasBg, borderColor: borderCol }}
      >
        {children}
      </div>
    </div>
  );
}
