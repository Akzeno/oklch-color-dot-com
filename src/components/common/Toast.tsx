import { toastStore } from '../../stores/cartStore';
import { useHydratedStore } from '../../hooks/useHydratedStore';

export default function Toast() {
  // Pinned to the server's value (no toast) for the first render. Without this,
  // saving a colour on the picker raises a toast and then immediately navigates
  // back to /ui-preview, so the island arrives with the server's empty markup
  // while `toastStore` is full — and Preact hydration then duplicates the node.
  const toast = useHydratedStore(toastStore, null);

  /**
   * The wrapper is rendered unconditionally, with or without a toast. Both halves
   * of this matter, and neither is sufficient alone:
   *
   * 1. This island is mounted on every page, so it re-hydrates on every
   *    client-side route change (<ClientRouter />). The router fetches the page
   *    from the server, so the island arrives carrying the SERVER's markup,
   *    while `toastStore` is a module singleton that survives the navigation.
   *    `useHydratedStore` above pins the first render to the server's value, so
   *    the two trees agree before Preact looks at them. That is the half that
   *    actually fixes hydration.
   *
   * 2. Keeping the root element unconditional means the island is never a
   *    zero-byte container. An island that renders nothing on the server but
   *    something on the client is the same class of bug, one level in.
   *
   * Keeping the live region permanently mounted is also the correct pattern for
   * assistive tech: a `role="status"` container inserted at the same moment as
   * its text is frequently missed, because the announcement needs the region to
   * already exist when the text lands in it.
   */
  return (
    <div
      class="fixed bottom-20 md:bottom-8 right-4 md:right-6 z-50 pointer-events-none max-w-[calc(100vw-2rem)]"
      role="status"
      aria-live="polite"
    >
      {toast && (
        <div
          // `key` remounts the toast on every new message. Without it, changing
          // only the text would leave the element in place and the entry
          // animation would not replay for the second toast onwards.
          key={toast.id}
          class="dock pointer-events-auto flex items-center gap-2.5 px-3 py-2 animate-dock-in"
        >
          {/*
            The dot is the one thing in the toast allowed a colour, and it means
            something: green is a confirmation the user just did something, cyan
            is information. It no longer pulses. A permanent `animate-pulse` on a
            8px dot is motion that carries no state — the toast already has a
            dismiss timer, and the pulse just outlasts the user's attention.
            `info` also matters: an earlier version coloured info cyan and
            success green with a shape difference of zero, so the two were only
            separable by hue.
          */}
          <span
            class={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              toast.type === 'info' ? 'bg-gamut-p3' : 'bg-copy-success'
            }`}
            aria-hidden="true"
          />
          <span class="font-mono text-micro text-ink truncate">{toast.message}</span>

          {/* Undo-style action for destructive one-click operations. */}
          {toast.action && (
            <button
              onClick={() => {
                toast.action!.run();
                toastStore.set(null);
              }}
              class="shrink-0 px-2 py-0.5 rounded bg-canvas-elevated hover:bg-canvas-raised border border-hairline font-mono text-micro text-ink transition-colors duration-150"
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
