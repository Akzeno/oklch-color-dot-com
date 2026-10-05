import { useState, useMemo } from 'preact/hooks';
import { Paintbrush, Plus, Shuffle } from 'lucide-preact';
import {
  createOklchColor,
  formatOklch,
  parseAnyToOklch,
  generateFullScaleFromColor,
  generateHarmonies,
  randomOklchColor,
  SHADE_STEPS,
  type ColorModel,
  type ShadeStep,
} from '../../utils/color';
import { writeClipboard } from '../../utils/clipboard';
import {
  addColorToCart,
  ensureRole,
  generateFullScaleForRole,
  setRoleShade,
  showToast,
  slugifyRoleName,
} from '../../stores/cartStore';
import { setPaletteSlotColor } from '../../stores/customPaletteStore';
import { useCart } from '../../hooks/useCart';
import { useOpenInPicker } from '../../hooks/useOpenInPicker';
import ColorSwatch from '../common/ColorSwatch';
import SwatchStrip from '../palettes/SwatchStrip';
import SwatchActionMenu from './SwatchActionMenu';
import CustomPalettePanel from './CustomPalettePanel';

const PRESETS = [
  { label: 'Blue', hex: '#2563eb' },
  { label: 'Emerald', hex: '#10b981' },
  { label: 'Amber', hex: '#f59e0b' },
  { label: 'Rose', hex: '#f43f5e' },
  { label: 'Violet', hex: '#8b5cf6' },
];

/**
 * One menu serves every swatch on the page, so its id is a constant: a second
 * instance would mean a second menu, and there is never more than one open.
 */
const MENU_ID = 'generator-swatch-menu';

/**
 * What a swatch click is waiting on.
 *
 * The swatch is kept as a live element, not just its colour, because the menu is
 * positioned against it — a colour cannot say where on the page it was clicked.
 */
interface PendingSwatch {
  color: ColorModel;
  /** The scale step, or `null` for a harmony swatch. Decides which slot is written. */
  step: ShadeStep | null;
  anchor: HTMLElement;
  /** What was clicked, for the menu's heading: `Step 500`, `Triadic 2`. */
  label: string;
  /**
   * Identity of the swatch, stable across re-renders.
   *
   * Needed for two things the DOM node cannot answer: which swatch is currently
   * open (`aria-expanded` has to be true on one trigger, not eleven), and whether
   * this click is a second click on the same swatch. A harmony swatch carries no
   * step at all, so a step alone would leave all of them indistinguishable.
   */
  key: string;
}

export default function PaletteGeneratorIsland() {
  const cart = useCart();
  const [baseHex, setBaseHex] = useState('#2563eb');
  /**
   * The destination variable, held as the *typed name* rather than a selected
   * role id. A `<select>` can only offer roles that already exist, so it cannot
   * express the most common request here: "put this in `--color-brand-*`",
   * before any `brand-*` role has been created anywhere in the app.
   */
  const [varNameInput, setVarNameInput] = useState('primary');
  /**
   * The swatch whose menu is open, if any.
   *
   * A click no longer *acts* — it asks. Copying and filing are both one click away
   * now because they are mutually exclusive in consequence: one touches the
   * clipboard, the other silently rewrites a `--color-*` token the user is
   * building. Doing either unconditionally means the click means different things
   * to the person making it and the person receiving it, and only one of them is
   * visible.
   */
  const [pending, setPending] = useState<PendingSwatch | null>(null);

  /**
   * Resolve the typed name to a real role, creating it on first use.
   *
   * Creation is deferred to the moment something is actually filed rather than
   * done on every keystroke: a half-typed "br" would otherwise leave a trail of
   * junk roles in a cart that persists to localStorage, and there is no undo for
   * a role. `ensureRole` reuses an existing role when the name slugifies to one.
   */
  const resolveTargetRole = () => ensureRole(varNameInput) ?? cart.activeRoleId;

  /*
   * The variable this page will write to, as it will literally appear in CSS.
   *
   * Falls back to the active role rather than the slug placeholder: `slugifyRoleName`
   * returns `'role'` for an unnameable input, so an empty field would otherwise
   * claim the writes are going to `--color-role-*` — a variable that would be
   * created nowhere, because `ensureRole` refuses that name. Showing where the
   * click actually lands is the whole point of this line.
   */
  const targetSlug = useMemo(() => {
    const trimmed = varNameInput.trim();
    if (!/^[a-z0-9]/i.test(trimmed)) return cart.activeRoleId;
    return slugifyRoleName(trimmed);
  }, [varNameInput, cart.activeRoleId]);

  const baseColor: ColorModel = useMemo(
    () => parseAnyToOklch(baseHex) || createOklchColor(0.55, 0.22, 255),
    [baseHex]
  );

  /**
   * "Change this colour", for the base swatch and for every custom-palette row.
   *
   * Both are component state rather than cart tokens, so this opens the picker in
   * `'free'` mode: saving hands the colour back here instead of writing a
   * `--color-*` variable the page never mentions. Clicking a swatch therefore
   * preloads the picker with exactly the colour under the cursor rather than the
   * picker's own default.
   *
   * `slot` is what makes one hook able to serve both. This page holds several free
   * colours — the base and every custom-palette row — and the picker hands back a
   * bare colour, so the edit has to arrive already addressed. A row that came back
   * untagged would otherwise land on the base colour, which is the one colour the
   * user did not click.
   */
  const openInPicker = useOpenInPicker((picked, slot) => {
    if (slot) {
      setPaletteSlotColor(slot, picked);
      return;
    }
    setBaseHex(formatOklch(picked));
  });

  const fullScale = useMemo(() => generateFullScaleFromColor(baseColor), [baseColor]);
  const harmonies = useMemo(() => generateHarmonies(baseColor), [baseColor]);

  /**
   * Point the menu at a swatch, or dismiss it if that swatch was already open.
   *
   * The toggle matters on touch, where there is no Escape and no outside-click
   * affordance to reach for — without it the only way to dismiss the menu is to
   * pick a different colour, which changes nothing about the page and leaves the
   * user stuck.
   */
  const openMenu = (next: PendingSwatch) =>
    setPending((current) => (current?.key === next.key ? null : next));

  /**
   * Copy one value and say what happened to it.
   *
   * `writeClipboard` reports failure because `navigator.clipboard.writeText`
   * rejects for reasons the page cannot fix — an insecure context, a permission
   * the user denied, a document that is not focused — and the old fire-and-forget
   * call turned each of those into an unhandled rejection plus a toast claiming
   * success.
   */
  const copyText = async (value: string) => {
    const copied = await writeClipboard(value);
    showToast(
      copied ? `Copied ${value}` : 'Clipboard blocked by the browser',
      copied ? 'success' : 'info'
    );
  };

  /** Menu action: put the value on the clipboard and leave the cart alone. */
  const copyOnly = async (value: string) => {
    setPending(null);
    await copyText(value);
  };

  /**
   * Write the colour into the destination variable and report the slot it landed
   * in, so the toast can name it.
   *
   * The two slots are chosen deliberately. `setRoleShade` takes the step the user
   * actually clicked, so scale 50 stays `--color-x-50`. `addColorToCart`
   * re-slots by lightness, which is right for the harmony swatches — they are
   * generated at the base lightness and belong to no step of their own — and is
   * what every other "add a colour" affordance on the site does.
   */
  const file = (color: ColorModel, step: ShadeStep | null) => {
    const roleId = resolveTargetRole();
    const saved = step
      ? (setRoleShade(roleId, step, color, { silent: true }), { roleId, step })
      : addColorToCart(color, roleId);

    // Named from the *returned* step, not the requested one: `addColorToCart`
    // picks the slot itself, so the step we asked for would be a guess.
    return `${cart.roles[saved.roleId]?.name ?? saved.roleId}-${saved.step}`;
  };

  /**
   * Menu action: write the variable, optionally with the value on the clipboard.
   *
   * The clipboard write is awaited first and reported in the *same* toast as the
   * save, so one gesture never produces two contradictory messages. Both store
   * calls toast on their own; this one supersedes them for the same reason.
   */
  const saveOnly = async (alsoCopy: boolean) => {
    if (!pending) return;
    const { color, step } = pending;
    const value = formatOklch(color);
    setPending(null);

    const copied = alsoCopy ? await writeClipboard(value) : false;
    const landed = file(color, step);

    if (alsoCopy) {
      showToast(
        copied ? `${value} → ${landed}` : `Clipboard blocked · saved to ${landed}`,
        copied ? 'success' : 'info'
      );
    } else {
      showToast(`${landed} · ${value}`);
    }
  };

  /**
   * The scale is rendered as one contiguous 48px bar rather than eleven separate
   * bordered cards. The card version spent more ink on borders and per-swatch
   * captions than on the colours themselves, and the borders fought the thing
   * being judged — a grid of boxes makes a smooth scale look like a set of
   * unrelated colours.
   */
  const scaleRecord = useMemo(() => {
    const out = {} as Record<ShadeStep, ColorModel>;
    for (const step of SHADE_STEPS) out[step] = fullScale[step];
    return out;
  }, [fullScale]);

  const harmonyGroups = [
    { label: 'Complementary', note: '180°', colors: harmonies.complementary },
    { label: 'Triadic', note: '±120°', colors: harmonies.triadic },
    { label: 'Analogous', note: '±30°', colors: harmonies.analogous },
  ];

  return (
    <div class="space-y-6">
      {/* ── Base colour ── */}
      <div class="card !p-4 space-y-3">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="eyebrow mr-1">Presets</span>
          {PRESETS.map((p) => (
            <button
              key={p.hex}
              onClick={() => setBaseHex(p.hex)}
              aria-pressed={baseHex.toLowerCase() === p.hex}
              class="chip !py-1 !px-2.5 !text-micro"
            >
              <span
                class="w-2.5 h-2.5 rounded-full border border-hairline"
                style={{ backgroundColor: p.hex }}
                aria-hidden="true"
              />
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setBaseHex(formatOklch(randomOklchColor()))}
            class="chip !py-1 !px-2.5 !text-micro ml-auto"
            title="Generate a random in-gamut base colour"
          >
            <Shuffle class="w-3 h-3" aria-hidden="true" strokeWidth={2} />
            Random
          </button>
        </div>

        <div class="grid sm:grid-cols-[auto_1fr] lg:grid-cols-[auto_1fr_auto] gap-2 items-center">
          <ColorSwatch
            color={baseColor}
            onClick={() => openInPicker(baseColor)}
            class="w-10 h-10 rounded-md border border-hairline hover:border-border-focus focus-visible:border-border-focus focus-visible:outline-none"
            title={`${formatOklch(baseColor)} — click to change this colour`}
            ariaLabel="Open the color picker to change the base colour"
          >
            {/* Painted on hover only, so the affordance is discoverable without
                ever tinting the colour the user is judging. Plain `:hover` works
                here rather than `group-hover`: the overlay is `inset-0`, so it
                covers the whole swatch and there is no gap to hover past it. */}
            <span class="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-150 hover:opacity-100">
              <Paintbrush class="w-4 h-4 text-ink" aria-hidden="true" strokeWidth={2} />
            </span>
          </ColorSwatch>

          <div class="hud flex items-center gap-2">
            <input
              type="text"
              value={baseHex}
              spellcheck={false}
              autocomplete="off"
              aria-label="Base colour in any format"
              onInput={(e) => setBaseHex((e.target as HTMLInputElement).value)}
              class="flex-1 min-w-0 bg-transparent font-mono text-hud text-ink focus:outline-none"
              placeholder="#2563eb · oklch(55% 0.22 255)"
            />
            <span class="eyebrow shrink-0 hidden sm:inline">
              L {(baseColor.l * 100).toFixed(0)} · C {baseColor.c.toFixed(2)} · H{' '}
              {baseColor.h.toFixed(0)}
            </span>
          </div>

          <label class="flex items-center gap-2 lg:ml-auto">
            <span class="eyebrow shrink-0">Variable</span>
            {/*
              A text field with a datalist of existing roles, not a `<select>`.
              It has to accept a name that does not exist yet — `--color-brand-*`
              is the whole point — while still offering the roles already in the
              cart as one-tap suggestions. The `datalist` gives that without a
              second control or a dropdown that can only ever be as long as the
              current cart.
            */}
            <input
              type="text"
              list="generator-role-suggestions"
              value={varNameInput}
              spellcheck={false}
              autocomplete="off"
              aria-label="Custom color variable name"
              onInput={(e) => setVarNameInput((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => {
                // Commit on Enter so a typed name is resolved (and the role
                // created) without requiring a swatch click first.
                if (e.key === 'Enter') {
                  e.preventDefault();
                  resolveTargetRole();
                }
              }}
              class="hud !py-1.5 font-mono text-label w-full lg:w-44 min-w-0 cursor-text"
              placeholder="brand-accent"
            />
            <datalist id="generator-role-suggestions">
              {Object.values(cart.roles).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </datalist>
          </label>
        </div>

        {/* The variable the fill button and every "Save to variable" will write
            to. Shown live so a typed name is never a leap of faith — the slug
            transform is not obvious, and `--color-Brand Accent-*` is not a
            variable anyone can write. */}
        <p class="font-mono text-micro text-faint">
          writes to <span class="text-mute">--color-{targetSlug}-*</span>
        </p>

        <button
          onClick={() => generateFullScaleForRole(resolveTargetRole(), baseColor)}
          class="btn btn-primary w-full sm:w-auto"
        >
          <Plus class="w-4 h-4" aria-hidden="true" strokeWidth={2.5} />
          Fill --color-{targetSlug}-* with all {SHADE_STEPS.length} steps
        </button>
      </div>

      {/* ── Generated scale ── */}
      <div>
        <div class="flex items-baseline justify-between gap-3 mb-2">
          <span class="eyebrow">50–950 scale</span>
          <span class="eyebrow">gamut-clamped</span>
        </div>
        <SwatchStrip
          shades={scaleRecord}
          onPick={(color, step, anchor) =>
            openMenu({ color, step, anchor, key: `step-${step}`, label: `Step ${step}` })
          }
          label="Generated scale"
          menu={{ id: MENU_ID, openStep: pending?.step ?? null }}
        />
        <p class="mt-2 font-mono text-micro text-mute">
          Click a step to copy its value or save it as --color-{targetSlug}-&lt;step&gt;.
        </p>
      </div>

      {/* ── Harmonies ── */}
      <div>
        <div class="mb-2">
          <span class="eyebrow">Hue harmonies</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {harmonyGroups.map((g) => (
            <div key={g.label} class="min-w-0">
              <div class="flex items-baseline justify-between gap-2 mb-1.5">
                <span class="font-mono text-label text-ink">{g.label}</span>
                <span class="eyebrow">{g.note}</span>
              </div>
              {/* Same contiguous-strip treatment as the scale, at a shorter
                  height because three hues read faster than eleven steps. */}
              <div class="swatch-strip !h-10">
                {g.colors.map((color, i) => {
                  const key = `${g.label}-${i}`;
                  const isOpen = pending?.key === key;
                  return (
                    <button
                      key={i}
                      type="button"
                      class="swatch-item"
                      style={{ backgroundColor: formatOklch(color) }}
                      onClick={(e) =>
                        openMenu({
                          color,
                          step: null,
                          anchor: e.currentTarget,
                          key,
                          label: `${g.label} ${i + 1}`,
                        })
                      }
                      title={`${g.label} ${i + 1}: ${formatOklch(color)} — click to copy or save it`}
                      aria-label={`${g.label} ${i + 1}: ${formatOklch(color)}`}
                      aria-haspopup="menu"
                      aria-expanded={isOpen}
                      aria-controls={isOpen ? MENU_ID : undefined}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Custom palette ──
          A different tool, not a mode of the one above: independent colours that
          share no scale, each editable in the picker and each emitted as its own
          variable. */}
      <CustomPalettePanel
        onEdit={(color, slotId) => openInPicker(color, { slot: slotId })}
      />

      {/* One menu, pointed at whichever swatch was clicked last. Rendered outside
          the strips so it is never clipped by a strip's own overflow, and last in
          the tree so it stacks above every swatch on the page. */}
      {pending && (
        <SwatchActionMenu
          id={MENU_ID}
          color={pending.color}
          step={pending.step}
          anchor={pending.anchor}
          label={pending.label}
          targetSlug={targetSlug}
          onCopy={copyOnly}
          onSave={saveOnly}
          onClose={() => setPending(null)}
        />
      )}
    </div>
  );
}