import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  isCartOpenStore,
  showToast,
  savePickerHandoff,
  setRoleShade,
  removeShadeFromRole,
  clearRoleScale,
} from '../../stores/cartStore';
import { useCart } from '../../hooks/useCart';
import type { ShadeStep, ColorModel } from '../../utils/color';
import { goTo } from '../../utils/navigate';
import ColorActionPopover from './ColorActionPopover';
import { createPaint, type Theme, type Paint } from './preview/slots';
import { GROUPS, DEFAULT_GROUP, findGroup, isGroupId, type GroupId } from './preview/groups';
import { PreviewFrame } from './preview/PreviewFrame';
import { ButtonsGroup } from './preview/groups/ButtonsGroup';
import { CardsGroup } from './preview/groups/CardsGroup';
import { DataVizGroup } from './preview/groups/DataVizGroup';
import { FeedbackGroup } from './preview/groups/FeedbackGroup';
import { FormsGroup } from './preview/groups/FormsGroup';
import { ListsGroup } from './preview/groups/ListsGroup';
import { NavigationGroup } from './preview/groups/NavigationGroup';
import { OverlaysGroup } from './preview/groups/OverlaysGroup';

/**
 * The preview shell: tab strip, URL sync, and click routing.
 *
 * It holds no colours of its own. Everything painted inside the preview column
 * comes from a `Swatch` wrapping a slot resolved by `createPaint`, which is what
 * makes "every element is selectable" a structural property rather than a
 * convention each group has to remember.
 *
 * The one thing this file does own is the click contract: any element carrying
 * `data-context-role` opens the colour popover for that exact slot. Groups get
 * that for free by going through `Swatch`, which writes those attributes from the
 * same value it used to resolve the colour — so the tooltip, the popover target
 * and the painted pixel cannot drift apart.
 *
 * The Design Tokens panel is not in this file. `/ui-preview` puts it in a row
 * beside the page title so it can start at the top of the workspace rather than
 * below the intro block, which means the row — and the column widths — belong to
 * the page. See `CartSidebar`.
 */

/* ─────────────────────── URL sync ─────────────────────── */

/**
 * Read `?group=` from the URL.
 *
 * Only accepts an id the registry knows, so a hand-edited or stale URL falls back
 * to the default rather than rendering nothing. That matters because the island
 * rehydrates on every `ClientRouter` navigation: a `?group=buttons` deep link that
 * lost its query string must not strand the user on a blank panel.
 *
 * Client-only by design. The *initial* group is seeded from `DEFAULT_GROUP`
 * instead — reading `location` during render would make every shared link
 * server-render the default and then swap groups after hydration. See
 * `useLayoutEffect` in the island for why the URL cannot be adopted earlier.
 */
function readGroupFromUrl(): GroupId {
  if (typeof window === 'undefined') return DEFAULT_GROUP;
  const raw = new URLSearchParams(window.location.search).get('group');
  return isGroupId(raw) ? raw : DEFAULT_GROUP;
}

/**
 * Write `?group=` without navigating.
 *
 * `replaceState`, not `pushState`: switching tabs is a view change inside the
 * page, not a history entry, and pushing would make the back button walk through
 * every tab the user glanced at before leaving. It also keeps the tab shareable —
 * a bookmark reopens the group you were looking at.
 */
function writeGroupToUrl(id: GroupId) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (id === DEFAULT_GROUP) url.searchParams.delete('group');
  else url.searchParams.set('group', id);
  window.history.replaceState(window.history.state, '', url);
}

/* ─────────────────────── Tab strip ─────────────────────── */

/**
 * Horizontal tab strip.
 *
 * A strip rather than a left rail because the preview column is already narrow:
 * the sidebar takes ~300px, and a second 200px rail would squeeze the group out
 * of the column it has to scroll in. The strip scrolls instead, so all eight
 * groups stay reachable without taking width from the thing being judged.
 *
 * Arrow keys, Home and End are wired because this is a tablist: a strip that
 * only responds to clicks is unusable by keyboard, and silently is worse than
 * absent.
 */
function TabStrip({
  active,
  onSelect,
}: {
  active: GroupId;
  onSelect: (id: GroupId) => void;
}) {
  const strip = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: KeyboardEvent) => {
    const i = GROUPS.findIndex((g) => g.id === active);
    let next: number | null = null;

    if (e.key === 'ArrowRight') next = (i + 1) % GROUPS.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + GROUPS.length) % GROUPS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = GROUPS.length - 1;
    if (next === null) return;

    e.preventDefault();
    const id = GROUPS[next]!.id;
    onSelect(id);
    // Move focus with the selection, so a second arrow press continues from
    // where the user is looking rather than from the previously focused tab.
    strip.current?.querySelector<HTMLElement>(`[data-group="${id}"]`)?.focus();
  };

  return (
    <div
      ref={strip}
      role="tablist"
      aria-label="Preview groups"
      onKeyDown={onKeyDown}
      class="sticky top-14 z-30 flex items-center gap-1 overflow-x-auto no-scrollbar -mx-4 px-4 py-2.5 bg-canvas/95 backdrop-blur border-b border-hairline"
    >
      {GROUPS.map((g) => {
        const on = g.id === active;
        return (
          <button
            key={g.id}
            type="button"
            role="tab"
            data-group={g.id}
            aria-selected={on}
            // Roving tabindex: one stop in the tab order, arrows move within.
            tabIndex={on ? 0 : -1}
            onClick={() => onSelect(g.id)}
            title={g.blurb}
            class={`chip shrink-0 ${
              on
                ? 'bg-ink border-ink text-ink-inverse'
                : 'bg-transparent border-transparent text-mute hover:text-body'
            }`}
          >
            {g.label}
            {!g.implemented && (
              <span
                class="w-1.5 h-1.5 rounded-full bg-faint flex-shrink-0"
                title="Planned — shows what it will cover, not yet built"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────── Planned panel ─────────────────────── */

/**
 * Shown for a group that is registered but not built yet.
 *
 * Deliberately not a blank canvas. A group registered ahead of its components
 * is indistinguishable from a group that failed to load — which would read as a
 * bug rather than as "not built". Listing what the group will cover, and which
 * of its slots are currently set, keeps the information architecture reviewable
 * before the components exist. Nothing in this slice currently reaches it; it is
 * the path a ninth group takes rather than dead code to delete.
 */
function PlannedGroup({ paint, id }: { paint: Paint; id: GroupId }) {
  const group = findGroup(id);

  // Look up this group's slots in the shared inventory, so the panel reports the
  // real state of each one instead of restating that the group is missing.
  const slots = group.slots.map((role) => {
    const entries = paint.inventory.filter((i) => i.role === role);
    const set = entries.filter((i) => i.state === 'set').length;
    return { role, total: entries.length, set };
  });

  return (
    <PreviewFrame
      label={group.label}
      description="Planned — not built in this slice."
      hint="coming next"
      canvasBg={paint.canvas?.css ?? '#0f0f0f'}
      borderCol={paint.border?.css ?? '#262626'}
      index={0}
      span
    >
      <div class="py-4 max-w-xl mx-auto">
        <p class="prose-hud">{group.blurb}</p>

        <div class="mt-4 pt-4 border-t border-hairline">
          <span class="eyebrow block mb-2">Slots this group needs</span>
          <div class="flex items-center gap-1.5 flex-wrap">
            {slots.map((s) => (
              <span
                key={s.role}
                /* Set slots are ink, unset ones are faint. They used to be
                   `emerald-400` and `dashed`, which made the coverage report
                   green-on-black — a third chromatic language on a page whose
                   whole subject is colour, used here to mean only "you filled
                   this in", which is what the count already says. */
                class={`pill ${s.set > 0 ? 'text-ink border-border-focus' : 'text-faint border-dashed'}`}
                title={
                  s.set > 0
                    ? `--color-${s.role}: ${s.set} of ${s.total} steps set`
                    : `--color-${s.role} is not set at all`
                }
              >
                {s.role}
                <span class="text-faint">
                  {s.set}/{s.total}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </PreviewFrame>
  );
}

/* ─────────────────────── Main Island ──────────────────────── */
export default function UIPreviewIsland() {
  const cart = useCart();
  const [previewTheme, setPreviewTheme] = useState<Theme>('dark');
  /**
   * Seeded with the default, never with `window.location`.
   *
   * The site is statically prerendered, so `Astro.url` arrives with no query
   * string — a `?group=forms` link genuinely cannot be server-rendered as Forms
   * without an SSR adapter. Seeding from the URL during render would therefore
   * disagree with the server's markup on every shared link: a hydration
   * mismatch on the tab strip's `aria-selected`, plus a re-render that throws
   * away and rebuilds every swatch. The layout effect below adopts the real URL
   * before the browser paints, so the swap is never seen.
   */
  const [activeGroup, setActiveGroup] = useState<GroupId>(DEFAULT_GROUP);

  /**
   * Every slot, resolved once per render.
   *
   * Memoised because `createPaint` runs `formatOklch` through culori for each
   * slot, and the page paints well over a hundred elements from them. Resolving
   * per element meant re-formatting the same `--color-*` value dozens of times
   * per render for no benefit.
   */
  const paint = useMemo(() => createPaint(cart, previewTheme), [cart, previewTheme]);

  /**
   * Adopt the real URL, before paint.
   *
   * Two jobs, and the timing matters for both:
   *
   *  - A shared `?group=forms` link lands on Forms instead of the default.
   *  - A `ClientRouter` swap restores a history entry whose query string only
   *    exists once Astro has settled the final URL.
   *
   * `useLayoutEffect`, not `useEffect`: it runs after the DOM is reconciled but
   * before the browser paints, so neither the initial group nor a route change
   * is ever visible in the wrong state. `popstate` is kept because
   * `replaceState` does not fire it, but the back button still has to work.
   */
  useLayoutEffect(() => {
    const sync = () => setActiveGroup(readGroupFromUrl());
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const selectGroup = useCallback((id: GroupId) => {
    setActiveGroup(id);
    writeGroupToUrl(id);
  }, []);

  const active = findGroup(activeGroup);

  /* ── Popover: opened by left- or right-click on any coloured element ── */

  const [popover, setPopover] = useState<{
    x: number;
    y: number;
    roleId: string;
    step: ShadeStep;
  } | null>(null);

  /**
   * Route a click to the slot it landed on.
   *
   * `closest()` rather than `target.dataset`, because painted elements nest: a
   * solid button is a fill swatch containing a label swatch for the `on-*`
   * step. The innermost match wins, which is the one the user aimed at — and
   * for the nested case it is the `on-*` slot, the one most worth editing.
   *
   * `preventDefault` only fires when a slot was actually hit, so ordinary
   * clicks elsewhere on the page are untouched.
   */
  const openPopoverFromEvent = (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[data-context-role]') as HTMLElement | null;
    if (!target) return;
    e.preventDefault();
    const roleId = target.dataset.contextRole!;
    const step = (Number(target.dataset.contextStep) || 500) as ShadeStep;
    setPopover({ x: e.clientX, y: e.clientY, roleId, step });
  };

  const handlePreviewClick = (e: MouseEvent) => {
    if (e.button !== 0) return;
    openPopoverFromEvent(e);
  };

  const handlePreviewContextMenu = (e: MouseEvent) => {
    if (e.button !== 2) return;
    openPopoverFromEvent(e);
  };

  // Apply a picked colour (from cart or palette library) to the clicked slot
  const handleApplyColor = (color: ColorModel, sourceLabel: string) => {
    if (!popover) return;
    setRoleShade(popover.roleId, popover.step, color, { silent: true });
    showToast(`${sourceLabel} → --color-${popover.roleId}-${popover.step}`);
    setPopover(null);
  };

  // Delete only the clicked colour token
  const handleDeleteShade = () => {
    if (!popover) return;
    removeShadeFromRole(popover.roleId, popover.step);
    showToast(`Removed --color-${popover.roleId}-${popover.step}`);
    setPopover(null);
  };

  // Delete every colour of the parent role (its full 50–950 scale)
  const handleDeleteFullScale = () => {
    if (!popover) return;
    clearRoleScale(popover.roleId);
    setPopover(null);
  };

  // Hand the exact slot over to the full colour picker page. Works for an unset
  // slot too (`color: null`), which the picker treats as "author new".
  // `returnTo` brings the user back here after they save.
  const handleOpenInPicker = (color: ColorModel | null) => {
    if (!popover) return;
    savePickerHandoff({
      roleId: popover.roleId,
      step: popover.step,
      color,
      returnTo: window.location.pathname,
    });
    setPopover(null);
    goTo('/');
  };

  return (
    <div class="space-y-4">
      {/* ─────── Main Preview Area ───────
            Container context for the frames grid below, and the boundary of the
            click contract.

            The Design Tokens panel used to be the second child of a flex row
            that wrapped both columns, so the click routing had to be attached
            to something wider than the preview. It is a sibling of this island
            now (the page owns the row, because the panel shares it with the
            page title) and it paints no slots of its own — so the handlers
            belong here, on the only subtree that can contain one. */}
      <div
        class="min-w-0 space-y-4 @container"
        onClick={handlePreviewClick}
        onContextMenu={handlePreviewContextMenu}
      >
        {/*
          Controls row.

          The title and the two-line explanation this used to carry are gone.
          "Every coloured element is a token slot — click one to swap it…" is
          the page's one real instruction, so it belongs in the page header
          where it is read once, not in a card above every tab. What is left
          here is the row's actual content: which surface the canvas is
          previewed on, and the shortcut to the role list.
        */}
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <div class="flex items-center gap-1 p-0.5 rounded-full border border-hairline bg-canvas-card">
            {(['dark', 'light'] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={previewTheme === t}
                onClick={() => setPreviewTheme(t)}
                class={`chip border-0 ${previewTheme === t ? '' : 'text-mute hover:text-body'}`}
              >
                {t === 'dark' ? 'Dark' : 'Light'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => isCartOpenStore.set(true)}
            class="btn btn-quiet h-8"
          >
            Manage roles
          </button>
        </div>

        <TabStrip active={activeGroup} onSelect={selectGroup} />

        {/*
          Groups are rails, so the layout is a single full-width column.

          It used to be a two-column grid of frames, driven by a `@3xl` container
          query. That breakpoint was chosen to fit two *canvases* of loose
          components side by side; a rail has the opposite shape — it wants the
          full width and scrolls — so splitting it in half would have put five
          cards behind a fold for no gain and broken the left-to-right reading
          order a rail depends on.
        */}
        <div class="space-y-8">
          {!active.implemented && <PlannedGroup paint={paint} id={activeGroup} />}
          {activeGroup === 'navigation' && <NavigationGroup paint={paint} />}
          {activeGroup === 'buttons' && <ButtonsGroup paint={paint} />}
          {activeGroup === 'forms' && <FormsGroup paint={paint} />}
          {activeGroup === 'cards' && <CardsGroup paint={paint} />}
          {activeGroup === 'lists' && <ListsGroup paint={paint} />}
          {activeGroup === 'feedback' && <FeedbackGroup paint={paint} />}
          {activeGroup === 'overlays' && <OverlaysGroup paint={paint} />}
          {activeGroup === 'dataviz' && <DataVizGroup paint={paint} />}
        </div>
      </div>

      {/* Action popover shown when a coloured element is clicked / right-clicked */}
      {popover && (
        <ColorActionPopover
          x={popover.x}
          y={popover.y}
          targetRoleId={popover.roleId}
          targetStep={popover.step}
          onApplyColor={handleApplyColor}
          onDeleteShade={handleDeleteShade}
          onDeleteFullScale={handleDeleteFullScale}
          onOpenInPicker={handleOpenInPicker}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  );
}