import { useStore } from '@nanostores/preact';
import { toastStore } from '../../stores/cartStore';

export default function Toast() {
  const toast = useStore(toastStore);

  if (!toast) return null;

  return (
    <div
      class="fixed bottom-20 md:bottom-8 right-6 z-50 flex items-center gap-2.5 px-3.5 py-2 rounded-md bg-[#1f1f1f] border border-[#262626] text-[#f5f5f5] text-xs font-mono shadow-2xl transition-all duration-150 animate-in fade-in slide-in-from-bottom-2 max-w-[calc(100vw-3rem)]"
      role="status"
      aria-live="polite"
    >
      <span
        class={`w-2 h-2 rounded-full inline-block animate-pulse flex-shrink-0 ${
          toast.type === 'info' ? 'bg-[#06b6d4]' : 'bg-[#22c55e]'
        }`}
      />
      <span class="truncate">{toast.message}</span>

      {/* Undo-style action for destructive one-click operations. */}
      {toast.action && (
        <button
          onClick={() => {
            toast.action!.run();
            toastStore.set(null);
          }}
          class="flex-shrink-0 px-2 py-0.5 rounded bg-[#262626] hover:bg-[#333333] text-[#f5f5f5] font-semibold transition-colors"
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
}