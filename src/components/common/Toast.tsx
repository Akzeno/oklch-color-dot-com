import { useStore } from '@nanostores/preact';
import { toastStore } from '../../stores/cartStore';

export default function Toast() {
  const toast = useStore(toastStore);

  if (!toast) return null;

  return (
    <div
      class="fixed bottom-20 md:bottom-8 right-6 z-50 flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#1f1f1f] border border-[#262626] text-[#f5f5f5] text-xs font-mono shadow-2xl transition-all duration-150 animate-in fade-in slide-in-from-bottom-2"
      role="status"
      aria-live="polite"
    >
      <span class="w-2 h-2 rounded-full bg-[#22c55e] inline-block animate-pulse" />
      <span>{toast.message}</span>
    </div>
  );
}
