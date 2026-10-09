import { useState, useEffect } from 'preact/hooks';
import {
  isCartOpenStore,
  generateFullScaleForRole,
  removeShadeWithUndo,
  clearRoleScale,
  renameRole,
  createCustomRole,
  deleteRole,
  setActiveRole,
  showToast,
  savePickerHandoff,
  consumeCartReopen,
} from '../../stores/cartStore';
import {
  SHADE_STEPS,
  BASE_SHADE_STEP,
  formatOklch,
  type ShadeStep,
  type ColorModel,
} from '../../utils/color';
import { useCart } from '../../hooks/useCart';
import { useHydratedStore } from '../../hooks/useHydratedStore';
import { useShadeEditor, shadeEditorBoundary } from '../../hooks/useShadeEditor';
import { goTo } from '../../utils/navigate';
import {
  ArrowRight,
  Copy,
  LayoutTemplate,
  Pencil,
  Paintbrush,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-preact';
import { buildLocalizedPath, type LocaleCode } from '../../i18n/config';
import { t } from '../../i18n/translations';

interface Props {
  locale?: LocaleCode;
}

/**
 * The mobile / wide-screen modal cart.
 *
 * It exists because the sidebar panel — the same role list, same shade grid —
 * is a `lg:` breakpoint and up. Below that there is nowhere to put it, so the
 * data would simply not exist on a phone. Same information, same store, laid
 * out for a sheet.
 *
 * WHAT IT LEAVES OUT
 *
 * The header's green/cyan gradient icon box, and the "N empty slots remaining ·
 * Use Generate Full Scale to fill all" line. Both restate something on screen:
 * the icon box is decoration next to colour swatches, and the slot line is a
 * count the header's own "N/11 filled" already gives and the Generate button
 * already acts on.
 *
 * EDITING, ADDING, REMOVING
 *
 * All three now work here exactly as they do in the `/ui-preview` design token
 * panel, which is the same store and the same grid rendered for a sheet rather
 * than a rail. A token can be re-picked in the full colour picker (swatch click
 * or the paintbrush), nudged in place (the L/C/H row), copied, or removed with
 * an Undo toast. The role's empty slots are buttons, so a role with no colours
 * has a way into the picker from every step of the scale and not just the base.
 */

export default function CartDrawerIsland({ locale = 'en' }: Props) {
  const cart = useCart();
  // Pinned to the server's value (closed) for the first render — see
  // `useHydratedStore`. `isCartOpenStore` is a module singleton, so opening the
  // drawer and then navigating would otherwise hydrate this island's empty SSR
  // markup against a full modal tree.
  const isOpen = useHydratedStore(isCartOpenStore, false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleInputName, setRoleInputName] = useState('');
  const [newRoleInput, setNewRoleInput] = useState('');
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [confirmingClearScale, setConfirmingClearScale] = useState(false);

  /*
   * The inline L/C/H + value editor. Same hook the `/ui-preview` token panel
   * uses, so a slot behaves identically whichever surface is open.
   */
  const editor = useShadeEditor();

  // `editor` is a fresh object each render, so depending on it would re-run
  // every effect below on every render. `endEdit` is the stable member of it.
  const { endEdit } = editor;

  // Reopen once the picker sends the user back. `returnTo` in the handoff brings
  // the page; this brings the drawer, because arriving at a shut drawer with a
  // changed swatch and no indication you were mid-edit is the confusing outcome.
  //
  // This also runs on the picker page, where the drawer is mounted but must stay
  // shut while the user is picking. That is safe only because the picker parks the
  // flag on the way *back* (`saveCartReopen`), so there is nothing here to claim
  // until a session has actually finished.
  useEffect(() => {
    if (consumeCartReopen(window.location.pathname)) {
      isCartOpenStore.set(true);
    }
  }, []);

  // Close on Escape key
  //
  // Registered in the *bubble* phase on purpose. `useShadeEditor` captures
  // Escape at the document and stops it there to close an open editor, so this
  // handler never sees that first press — a second Escape, with nothing left to
  // edit, is what closes the drawer. If this also captured, one Escape would
  // both end the edit and close the surface around it.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        isCartOpenStore.set(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Reset transient state whenever the drawer closes or the active role changes.
  // The editor resets with everything else: it targets a slot of a specific role,
  // so switching tabs must not leave an editor pointed at the previous role's
  // colour.
  useEffect(() => {
    setConfirmingClearScale(false);
    setEditingRoleId(null);
    endEdit();
  }, [isOpen, cart.activeRoleId, endEdit]);

  // NOTE: there is deliberately no `if (!isOpen) return null` here — see the
  // note on the wrapper at the bottom of this component.

  const activeRole = cart.roles[cart.activeRoleId] || Object.values(cart.roles)[0];
  // Localized display name for the active role: seeded roles resolve through
  // `ui.roles.*`, user-created roles keep the name they were given.
  const activeRoleLabel = activeRole
    ? t(locale, 'ui.roles.' + activeRole.id, activeRole.name)
    : '';
  const filledShadesCount = activeRole ? Object.keys(activeRole.shades).length : 0;
  const totalTokens = Object.values(cart.roles).reduce((sum, r) => sum + Object.keys(r.shades).length, 0);

  /**
   * Send an exact token slot to the full color picker page.
   *
   * `color` is `null` for an empty slot, which tells the picker to author a new
   * token there — seeded from that step's target lightness and the role's own hue
   * — instead of preloading something unrelated. Either way the picker writes
   * back to this very slot, never a nearest-lightness one.
   *
   * The drawer closes itself first, and that is load-bearing rather than tidy.
   * `isCartOpenStore` is a module singleton, so it survives the client-side
   * navigation to the picker — and the picker page mounts this same drawer in its
   * layout, since <AppLayout> wraps every page. Leaving it `true` let the drawer
   * follow the user there: it arrived shut for a frame (the hydration pin draws
   * the server's value first) then sprang open on top of the picker, which is
   * exactly the "closes itself, reopens itself, picker stuck behind it" report.
   *
   * `reopenCart` is the other half of that fix. The drawer is genuinely gone while
   * the user picks, so something has to put it back when they come home. The flag
   * rides the handoff rather than being parked here, because the picker is the only
   * party that knows the round trip finished; parking it on the way out would let
   * the picker page claim it on arrival — `/` is both where the picker lives and a
   * page that opens this drawer, so path equality alone cannot tell the two apart.
   */
  const openPicker = (roleId: string, step: ShadeStep, color: ColorModel | null) => {
    const returnTo = window.location.pathname;
    isCartOpenStore.set(false);
    savePickerHandoff({ roleId, step, color, returnTo, reopenCart: true });
    goTo(buildLocalizedPath('/', locale));
  };

  // The root element is rendered unconditionally, closed or not.
  //
  // A client-side route change (<ClientRouter />) fetches this page from the server,
  // so the island arrives carrying the SERVER's markup — which for a closed drawer is
  // nothing at all — while `isCartOpenStore` is a module singleton that survives the
  // navigation. Navigating with the drawer open therefore asks Preact to hydrate an
  // empty container with a non-empty tree, and it throws "Cannot read properties of
  // null (reading 'map')". Keeping the root unconditional makes server and client
  // agree on the DOM shape; only the children differ, which hydrates cleanly.
  //
  // `display: contents` generates no box, so this wrapper cannot become the containing
  // block for the `fixed` panel inside it — the drawer still anchors to the viewport
  // exactly as it did with no wrapper at all.
  return (
    <div class="contents">
      {isOpen && (
        <div class="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-8">
          {/* Backdrop */}
          <div
            class="fixed inset-0 bg-black/75 backdrop-blur-sm animate-fade-in"
            onClick={() => isCartOpenStore.set(false)}
            aria-hidden="true"
          />

          {/* Modal panel. `rounded-t-lg` on mobile because it is a bottom sheet
              there, `rounded-lg` from `md:` up once it is a centred dialog. */}
          <div
            class="relative z-10 w-full md:max-w-2xl max-h-[85vh] md:max-h-[80vh] bg-canvas-sunken border border-hairline rounded-t-lg md:rounded-lg flex flex-col overflow-hidden animate-dock-in"
            role="dialog"
            aria-modal="true"
            aria-label={t(locale, 'ui.cart.dialogLabel', 'Design Token Cart')}
          >
            {/* Header */}
            <div class="px-4 py-3 border-b border-hairline flex items-center justify-between gap-3">
              <h2 class="text-title text-ink">
                {t(locale, 'ui.cart.title', 'Design Tokens')}
              </h2>
              <div class="flex items-center gap-2">
                <span class="pill">
                  {t(locale, 'ui.cart.tokenCount', '{count} tokens').replace(
                    '{count}',
                    String(totalTokens)
                  )}
                </span>
                <button
                  onClick={() => isCartOpenStore.set(false)}
                  class="icon-btn"
                  aria-label={t(locale, 'ui.cart.closeCart', 'Close cart')}
                >
                  <X class="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Role tabs */}
            {/*
             * "New role" used to be a `link-hud` text link tucked to the right
             * of the Roles eyebrow: 12px, `body` grey, no icon, no box — the
             * quietest control on the surface, and the one people could not
             * find. It is now a full-width `.btn-lg` sitting directly under the
             * section label, so it is the first control in this block and the
             * largest one in it.
             *
             * The create field takes the button's exact place, so the row the
             * user is looking at becomes the row that answers it.
             */}
            <div class="px-4 py-3 border-b border-hairline-subtle bg-canvas">
              <div class="eyebrow mb-2">
                {t(locale, 'ui.cart.rolesLabel', 'Roles')}
              </div>

              {isCreatingRole ? (
                <div class="flex items-center gap-1.5 mb-2.5">
                  <input
                    id="cart-drawer-new-role"
                    type="text"
                    name="role"
                    value={newRoleInput}
                    aria-label={t(locale, 'ui.cart.newRoleNameLabel', 'New role name')}
                    onInput={(e) => setNewRoleInput((e.target as HTMLInputElement).value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newRoleInput.trim()) {
                        createCustomRole(newRoleInput.trim());
                        setNewRoleInput('');
                        setIsCreatingRole(false);
                      }
                      if (e.key === 'Escape') {
                        setNewRoleInput('');
                        setIsCreatingRole(false);
                      }
                    }}
                    placeholder="brand-accent"
                    class="flex-1 min-w-0 h-11 px-3 rounded-md bg-canvas-raised border border-hairline font-mono text-label text-ink placeholder:text-faint focus:outline-none focus:border-border-focus transition-colors duration-150"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      if (newRoleInput.trim()) {
                        createCustomRole(newRoleInput.trim());
                        setNewRoleInput('');
                        setIsCreatingRole(false);
                      }
                    }}
                    class="btn btn-quiet btn-lg"
                  >
                    {t(locale, 'ui.cart.create', 'Create')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreatingRole(true)}
                  class="btn btn-quiet btn-lg w-full mb-2.5"
                  aria-expanded={isCreatingRole}
                >
                  <Plus class="w-4 h-4 flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  <span>{t(locale, 'ui.cart.newRole', 'New role')}</span>
                </button>
              )}

              <div class="flex flex-wrap gap-1.5">
                {Object.values(cart.roles).map((role) => {
                  const count = Object.keys(role.shades).length;
                  return (
                    <button
                      key={role.id}
                      onClick={() => setActiveRole(role.id)}
                      aria-pressed={role.id === cart.activeRoleId}
                      class={`chip ${role.id === cart.activeRoleId ? '' : 'text-body'}`}
                    >
                      <span>{t(locale, 'ui.roles.' + role.id, role.name)}</span>
                      {count > 0 && (
                        <span
                          class={`font-mono text-micro ${
                            role.id === cart.activeRoleId ? 'text-ink-inverse/70' : 'text-faint'
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active role content */}
            {activeRole && (
              <div class="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                <div class="card">
                  <div class="flex items-center justify-between gap-2">
                    {editingRoleId === activeRole.id ? (
                      <div class="flex items-center gap-1.5 flex-1 min-w-0">
                        <input
                          id="cart-drawer-role-name"
                          type="text"
                          name="role"
                          value={roleInputName}
                          aria-label={t(
                            locale,
                            'ui.cart.renameRoleInputAria',
                            'Rename {name}'
                          ).replace('{name}', activeRoleLabel)}
                          onInput={(e) => setRoleInputName((e.target as HTMLInputElement).value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (roleInputName.trim()) {
                                renameRole(activeRole.id, roleInputName.trim());
                              }
                              setEditingRoleId(null);
                            }
                          }}
                          class="px-2.5 py-1.5 rounded-md bg-canvas-raised border border-hairline font-mono text-micro text-ink flex-1 min-w-0 focus:outline-none focus:border-border-focus"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            if (roleInputName.trim()) {
                              renameRole(activeRole.id, roleInputName.trim());
                            }
                            setEditingRoleId(null);
                          }}
                          class="btn btn-quiet h-8"
                        >
                          {t(locale, 'ui.cart.save', 'Save')}
                        </button>
                      </div>
                    ) : (
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="text-card text-ink truncate">{activeRoleLabel}</span>
                        <button
                          onClick={() => {
                            setRoleInputName(activeRole.name);
                            setEditingRoleId(activeRole.id);
                          }}
                          class="icon-btn icon-btn-sm"
                          title={t(locale, 'ui.cart.renameRole', 'Rename role')}
                          aria-label={t(
                            locale,
                            'ui.cart.renameRoleButtonAria',
                            'Rename role {name}'
                          ).replace('{name}', activeRoleLabel)}
                        >
                          <Pencil class="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
                        </button>
                      </div>
                    )}

                    {!activeRole.isDefault && (
                      <button
                        onClick={() => deleteRole(activeRole.id)}
                        class="link-hud text-danger-ink"
                        title={t(
                          locale,
                          'ui.cart.deleteRoleTitle',
                          'Delete role {name}'
                        ).replace('{name}', activeRoleLabel)}
                      >
                        {t(locale, 'ui.cart.deleteRole', 'Delete role')}
                      </button>
                    )}
                  </div>

                  <div class="mt-1.5 font-mono text-micro text-mute">
                    --color-{activeRole.id}-*
                    <span class="mx-1.5 text-faint">·</span>
                    {t(locale, 'ui.cart.filled', '{filled}/{total} filled')
                      .replace('{filled}', String(filledShadesCount))
                      .replace('{total}', String(SHADE_STEPS.length))}
                  </div>

                  {/* Generate / Clear Full Scale */}
                  <div class="mt-3 pt-3 border-t border-hairline-subtle">
                    {confirmingClearScale ? (
                      <div class="rounded-md border border-hairline bg-canvas-sunken p-2.5 space-y-2">
                        <p class="font-mono text-micro text-body leading-tight">
                          {t(locale, 'ui.cart.deleteScaleConfirmPrefix', 'Delete {count} color{s} from')
                            .replace('{count}', String(filledShadesCount))
                            .replace('{s}', filledShadesCount === 1 ? '' : 's')}{' '}
                          <span class="text-ink">{activeRoleLabel}</span>
                          {t(locale, 'ui.cart.deleteScaleConfirmSuffix', '?')}
                        </p>
                        <div class="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => setConfirmingClearScale(false)}
                            class="btn btn-quiet h-8"
                          >
                            {t(locale, 'ui.cart.cancel', 'Cancel')}
                          </button>
                          <button
                            onClick={() => {
                              clearRoleScale(activeRole.id);
                              setConfirmingClearScale(false);
                            }}
                            class="btn btn-danger h-8"
                          >
                            {t(locale, 'ui.cart.deleteScale', 'Delete scale')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div class="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => generateFullScaleForRole(activeRole.id)}
                          disabled={filledShadesCount === 0}
                          class="btn btn-quiet h-8"
                          title={t(locale, 'ui.cart.generateScaleTitle', 'Generate the full 50–950 scale from the base color')}
                        >
                          <Sparkles class="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
                          <span class="truncate">{t(locale, 'ui.cart.generateScale', 'Generate scale')}</span>
                        </button>
                        <button
                          onClick={() => setConfirmingClearScale(true)}
                          disabled={filledShadesCount === 0}
                          class="btn btn-quiet h-8"
                          title={t(locale, 'ui.cart.deleteScaleTitle', 'Delete all {count} colors of {role}')
                            .replace('{count}', String(filledShadesCount))
                            .replace('{role}', activeRoleLabel)}
                        >
                          <Trash2 class="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
                          <span class="truncate">{t(locale, 'ui.cart.deleteScale', 'Delete scale')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/*
                 * Every step of the scale, filled or not.
                 *
                 * This used to render cards for the filled steps only, behind an
                 * if/else whose empty branch was a sentence telling the user to
                 * "add colors in the picker" — a page that was not reachable from
                 * here, so an empty role was a dead end with no button on screen.
                 * Rendering all 11 steps closes that for free: an empty slot is a
                 * dashed cell that opens the picker on that exact
                 * `--color-<role>-<step>`, which is strictly more useful than one
                 * button for the base slot because the user picks the shade they
                 * meant rather than getting whatever the picker seeded.
                 *
                 * It also matches the `/ui-preview` panel, which has always shown
                 * the whole scale, filled and dashed alike.
                 */}
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SHADE_STEPS.map((step) => {
                    const token = activeRole.shades[step];
                    const isEditing = editor.isEditing(activeRole.id, step);

                    if (!token) {
                      return (
                        <button
                          key={step}
                          type="button"
                          onClick={() => openPicker(activeRole.id, step, null)}
                          title={t(locale, 'ui.cart.authorSlotTitle', 'Author {variable} in the color picker')
                            .replace('{variable}', `--color-${activeRole.id}-${step}`)}
                          aria-label={t(locale, 'ui.cart.authorSlotAria', 'Author {variable}')
                            .replace('{variable}', `--color-${activeRole.id}-${step}`)}
                          class="group flex flex-col rounded-lg border border-dashed border-hairline bg-canvas-card/40 hover:border-border-focus transition-colors duration-150"
                        >
                          <span class="h-14 w-full flex items-center justify-center">
                            <Plus
                              class="w-4 h-4 text-faint group-hover:text-body transition-colors duration-150"
                              strokeWidth={1.75}
                              aria-hidden="true"
                            />
                          </span>
                          <span class="px-2 py-1.5 text-left font-mono text-micro text-faint">
                            {step}
                          </span>
                        </button>
                      );
                    }

                    const oklchCss = formatOklch(token.color);

                    return (
                      <div
                        key={step}
                        data-shade-editor={shadeEditorBoundary(activeRole.id, step)}
                        class="group bg-canvas-card rounded-lg border border-hairline hover:border-faint transition-colors duration-150 overflow-hidden"
                      >
                        <div
                          class="h-14 w-full relative"
                          style={{ backgroundColor: oklchCss || token.color.hex }}
                        >
                          {/*
                            The swatch is the picker, not a dead colour block:
                            click reopens the colour picker preloaded with this
                            token, right-click removes it with an Undo toast. The
                            action row below stops propagation so both still work
                            while editing is off.
                          */}
                          {!isEditing && (
                            <button
                              type="button"
                              class="absolute inset-0 z-0 cursor-pointer"
                              aria-label={t(locale, 'ui.cart.editSlotPickerAria', 'Edit {variable} in the color picker')
                                .replace('{variable}', `--color-${activeRole.id}-${step}`)}
                              title={t(locale, 'ui.cart.swatchTitle', '{value} · click to edit, right-click to remove')
                                .replace('{value}', oklchCss)}
                              onClick={() => openPicker(activeRole.id, step, token.color)}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                removeShadeWithUndo(activeRole.id, step);
                              }}
                            />
                          )}
                          {token.color.inP3 && !token.color.inSRGB && (
                            <span
                              class="absolute top-1 right-1 font-mono text-[9px] leading-none px-1 py-0.5 rounded bg-badge-surface text-gamut-p3"
                              title={t(locale, 'ui.cart.p3Title', 'Inside Display-P3, outside sRGB — browsers will clamp it')}
                            >
                              P3
                            </span>
                          )}
                          {isEditing && (
                            <div class="absolute inset-0 bg-canvas-sunken/90 flex items-center">
                              <input
                                id={`cart-drawer-value-${activeRole.id}-${step}`}
                                type="text"
                                name="value"
                                value={editor.value}
                                aria-label={t(locale, 'ui.cart.valueAria', 'Value of {variable}')
                                  .replace('{variable}', `--color-${activeRole.id}-${step}`)}
                                onInput={(e) =>
                                  editor.changeValue(activeRole.id, step, (e.target as HTMLInputElement).value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    endEdit();
                                  }
                                }}
                                class="w-full min-w-0 px-1 py-0.5 bg-canvas border border-border-focus rounded text-[10px] font-mono text-ink focus:outline-none"
                                autoFocus
                              />
                            </div>
                          )}
                        </div>

                        {isEditing ? (
                          /* Inline L/C/H row, for exactly the slot being edited.
                             Escape or a click outside closes it — both handled by
                             `useShadeEditor`. */
                          <div class="px-2 pb-2 pt-1.5 grid grid-cols-3 gap-1 min-w-0">
                            {(['l', 'c', 'h'] as const).map((axis) => (
                              <input
                                key={axis}
                                id={`cart-drawer-${axis}-${activeRole.id}-${step}`}
                                type="number"
                                step="0.01"
                                min="0"
                                max={axis === 'h' ? '360' : axis === 'c' ? '0.4' : '1'}
                                name={axis}
                                value={
                                  axis === 'l'
                                    ? token.color.l.toFixed(2)
                                    : axis === 'c'
                                      ? token.color.c.toFixed(2)
                                      : Math.round(token.color.h)
                                }
                                onChange={(e) =>
                                  editor.changeAxis(activeRole.id, step, axis, (e.target as HTMLInputElement).value)
                                }
                                aria-label={t(locale, 'ui.cart.axisAria', '{axis} of {variable}')
                                  .replace('{axis}', axis.toUpperCase())
                                  .replace('{variable}', `--color-${activeRole.id}-${step}`)}
                                class="w-full min-w-0 px-1.5 py-1 rounded bg-canvas-raised border border-hairline font-mono text-micro text-ink focus:outline-none focus:border-border-focus [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                            ))}
                          </div>
                        ) : (
                          <div class="px-2 py-1.5 flex items-center justify-between gap-1">
                            <span class="font-mono text-micro text-ink">{step}</span>
                            <div class="flex items-center gap-0.5">
                              <button
                                onClick={() => {
                                  if (oklchCss) {
                                    navigator.clipboard.writeText(oklchCss);
                                    showToast(
                                      t(locale, 'ui.cart.copied', 'Copied {value}').replace('{value}', oklchCss)
                                    );
                                  }
                                }}
                                class="icon-btn icon-btn-xs"
                                title={t(locale, 'ui.cart.copyTitle', 'Copy {value}').replace('{value}', oklchCss)}
                                aria-label={t(locale, 'ui.cart.copyStepAria', 'Copy {step} value').replace('{step}', String(step))}
                              >
                                <Copy class="w-3 h-3" strokeWidth={1.75} aria-hidden="true" />
                              </button>
                              {/*
                                The pencil is the explicit route to the picker,
                                and the one affordance that stays reachable by
                                keyboard: clicking the swatch alone would leave
                                editing to a pointer.
                              */}
                              <button
                                onClick={() => openPicker(activeRole.id, step, token.color)}
                                class="icon-btn icon-btn-xs"
                                title={t(locale, 'ui.cart.editInPickerTitle', 'Edit {value} in the color picker').replace('{value}', oklchCss)}
                                aria-label={t(locale, 'ui.cart.editInPickerAria', 'Edit {step} in the color picker').replace('{step}', String(step))}
                              >
                                <Paintbrush class="w-3 h-3" strokeWidth={1.75} aria-hidden="true" />
                              </button>
                              <button
                                onClick={() => editor.beginEdit(activeRole.id, step, oklchCss)}
                                class="icon-btn icon-btn-xs"
                                title={t(locale, 'ui.cart.editInPlaceTitle', 'Edit {value} in place').replace('{value}', oklchCss)}
                                aria-label={t(locale, 'ui.cart.editInPlaceAria', 'Edit {step} in place').replace('{step}', String(step))}
                              >
                                <Pencil class="w-3 h-3" strokeWidth={1.75} aria-hidden="true" />
                              </button>
                              {/*
                                Undoable, like the sidebar's. This is a small
                                target in a grid of 11, so a stray click is
                                cheap to make and must be cheap to undo — a
                                confirm dialog would turn every removal into two
                                clicks to no benefit.
                              */}
                              <button
                                onClick={() => removeShadeWithUndo(activeRole.id, step)}
                                class="icon-btn icon-btn-xs"
                                title={t(locale, 'ui.cart.removeShadeTitle', 'Remove shade (undoable)')}
                                aria-label={t(locale, 'ui.cart.removeShadeAria', 'Remove {step}').replace('{step}', String(step))}
                              >
                                <Trash2 class="w-3 h-3" strokeWidth={1.75} aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/*
                  A role with no colours is a dead end without one guaranteed way
                  forward, and the dashed slots above are easy to read as
                  decoration. This targets the base step, which is the anchor the
                  generator and the picker both agree on, so "Add color" then
                  "Generate scale" derives from the colour just added.
                */}
                {filledShadesCount === 0 && (
                  <button
                    onClick={() => openPicker(activeRole.id, BASE_SHADE_STEP, null)}
                    title={t(locale, 'ui.cart.authorBaseTitle', 'Author the base shade ({step}) in the color picker').replace('{step}', String(BASE_SHADE_STEP))}
                    class="btn btn-quiet w-full h-8"
                  >
                    <Plus class="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
                    <span>{t(locale, 'ui.cart.addColor', 'Add color')}</span>
                  </button>
                )}
              </div>
            )}

            {/* Footer CTAs */}
            <div class="px-4 py-3 border-t border-hairline grid grid-cols-2 gap-2">
              <a
                href={buildLocalizedPath('/ui-preview', locale)}
                onClick={() => isCartOpenStore.set(false)}
                class="btn btn-quiet"
              >
                <LayoutTemplate class="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span>{t(locale, 'ui.cart.livePreview', 'Live Preview')}</span>
              </a>
              <a
                href={buildLocalizedPath('/export', locale)}
                onClick={() => isCartOpenStore.set(false)}
                class="btn btn-primary"
              >
                <span>{t(locale, 'ui.cart.exportCode', 'Export Code')}</span>
                <ArrowRight class="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
