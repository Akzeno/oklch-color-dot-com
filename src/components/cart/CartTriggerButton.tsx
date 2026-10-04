import { isCartOpenStore, getCartTotalCount } from '../../stores/cartStore';
import { useCart } from '../../hooks/useCart';

export default function CartTriggerButton() {
  const cart = useCart();
  const totalCount = getCartTotalCount(cart);

  return (
    <button
      onClick={() => isCartOpenStore.set(true)}
      class="relative touch-target px-3 py-1.5 rounded-full bg-[#141414] hover:bg-[#1f1f1f] border border-[#262626] hover:border-[#525252] transition-colors duration-150 text-[#f5f5f5] text-xs font-mono flex items-center gap-2 group"
      aria-label={`Open color cart with ${totalCount} items`}
      id="cart-trigger-btn"
    >
      <svg class="w-4 h-4 text-[#a3a3a3] group-hover:text-[#f5f5f5] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
      </svg>
      <span class="hidden sm:inline text-[#a3a3a3] group-hover:text-[#f5f5f5]">Cart</span>
      <span class="px-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#262626] group-hover:bg-[#333333] text-[#f5f5f5]">
        {totalCount}
      </span>
    </button>
  );
}
