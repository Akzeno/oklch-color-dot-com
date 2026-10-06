import { useEffect, useState } from 'preact/hooks';
import { isCartOpenStore, getCartTotalCount } from '../../stores/cartStore';
import { useCart } from '../../hooks/useCart';

/**
 * Opens the token drawer.
 *
 * The count is the reason this control earns header space — it is the only
 * place in the shell that answers "have I collected anything yet?" without the
 * user having to go look. On small screens the word drops and the badge carries
 * the meaning on its own, rather than shrinking the badge to fit both.
 *
 * HOW THE NOTIFICATION READS
 *
 * The badge is drawn the way every notification dot is drawn: a red bubble
 * pinned to the top-right corner of the cart icon, with a pure-white bold
 * numeral on a solid `danger` fill and a 2px halo of the button's own surface
 * around it. The halo is what separates the dot from the icon underneath — a
 * hard edge against the icon would read as a rendering glitch; the gap makes
 * it look laid on top.
 *
 * What it deliberately does NOT do:
 *
 *  - No tint on the button itself. The first version borrowed the "notification
 *    treatment" style of coloured button borders and 10% fills; next to a
 *    colour tool that reads as a fault in the swatches, not as a badge. The
 *    control stays on its neutral pill (it is a control; the badge is the
 *    notification) and the badge carries all the meaning.
 *  - No `0` badge. The dot appears only when there is something to report, and
 *    disappears when the cart is emptied — the empty state is still covered by
 *    the accessible name.
 *  - The badge pops once per *change* (`animate-cart-bump` + `key={count}`),
 *    because the confirmation lives in the header, 56px away from the click
 *    that caused it. It deliberately does not replay on arrival: Astro rebuilds
 *    the header on every view transition, so a mount is indistinguishable from
 *    a navigation, and a pop on every single page change would read as a
 *    glitch, not as a notification. The pop is gated on the count moving after
 *    mount, and `transition:persist` (Header.astro) keeps this button mounted
 *    across navigations so a re-mount never masquerades as a change.
 *
 * The numeral is 11px 700-weight in pure white. `#db2b33` is DESIGN.md's own
 * danger value — the red in the system (and, as it happens, the one that still
 * clears 4.5:1 against white at small sizes). A lighter red would pop harder
 * but would fail the numeral, and the numeral is content, not trim.
 */
export default function CartTriggerButton() {
  const cart = useCart();
  const totalCount = getCartTotalCount(cart);
  const hasColors = totalCount > 0;

  // The pop announces a *change*, never a page load or a navigation.
  // `ClientRouter` rebuilds the header on every hop and the store is a module
  // singleton that survives it, so a remount is not the same as a change —
  // animating on mount is exactly the every-page flicker a badge must not
  // have. `shouldPop` therefore turns on only when the count moves *after*
  // this button exists on the page, so "add another" pops (1 → 2 → 3 …) but a
  // navigation does not. With `transition:persist` on the button, navigating
  // does not even remount it, so there is no mount-time pseudo-change either.
  //
  // Mount tracking is pinned to the same first render `useCart` renders
  // (DEFAULT_CART_SNAPSHOT, count 3), so this state is hydration-safe; the
  // only pop on a cold load is the storage-restore 3 → live-count case, which
  // is the "your colours are here" signal.
  const [mountedCount, setMountedCount] = useState(totalCount);
  const [shouldPop, setShouldPop] = useState(false);
  useEffect(() => {
    if (totalCount !== mountedCount) {
      setMountedCount(totalCount);
      setShouldPop(true);
    }
  }, [totalCount]);

  return (
    <button
      onClick={() => isCartOpenStore.set(true)}
      class="group flex items-center gap-2 h-9 pl-3 pr-3 rounded-full border border-hairline bg-canvas-card hover:border-border-focus transition-colors duration-150"
      aria-label={`Open design token cart, ${totalCount} token${totalCount === 1 ? '' : 's'}`}
      id="cart-trigger-btn"
    >
      {/* The icon is the badge's anchor: the dot pins to its top-right corner,
          like every other notification dot, instead of sitting inline where it
          could be mistaken for a counter chip. */}
      <span class="relative inline-flex">
        <svg
          class="w-5 h-5 text-ink transition-colors"
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
        {hasColors && (
          <span
            key={totalCount}
            class={`absolute -top-2.5 -right-3 min-w-4 h-4 px-1 rounded-full bg-danger text-white ring-2 ring-canvas-card font-mono text-[11px] font-bold leading-none tabular-nums inline-flex items-center justify-center${shouldPop ? ' animate-cart-bump' : ''}`}
          >
            {totalCount}
          </span>
        )}
      </span>
      <span class="hidden sm:inline font-mono text-label text-body group-hover:text-ink transition-colors">
        Tokens
      </span>
    </button>
  );
}