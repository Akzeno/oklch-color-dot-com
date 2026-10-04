import { isCartOpenStore, getCartTotalCount } from '../../stores/cartStore';
import { useCart } from '../../hooks/useCart';

/**
 * Opens the token drawer.
 *
 * The count is the reason this control earns header space — it is the only
 * place in the shell that answers "have I collected anything yet?" without the
 * user having to go look. On small screens the word drops and the badge carries
 * the meaning on its own, rather than shrinking the badge to fit both.
 */
export default function CartTriggerButton() {
  const cart = useCart();
  const totalCount = getCartTotalCount(cart);

  return (
    <button
      onClick={() => isCartOpenStore.set(true)}
      class="group flex items-center gap-2 h-8 pl-2.5 pr-2 rounded-full border border-hairline bg-canvas-card hover:border-border-focus transition-colors duration-150"
      aria-label={`Open design token cart, ${totalCount} token${totalCount === 1 ? '' : 's'}`}
      id="cart-trigger-btn"
    >
      <svg
        class="w-4 h-4 text-mute group-hover:text-ink transition-colors"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
      <span class="hidden sm:inline font-mono text-label text-body group-hover:text-ink transition-colors">
        Tokens
      </span>
      <span class="min-w-5 h-5 px-1.5 rounded-full bg-canvas-elevated font-mono text-micro font-semibold text-ink flex items-center justify-center">
        {totalCount}
      </span>
    </button>
  );
}