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
import {
  addColorToCart,
  ensureRole,
  generateFullScaleForRole,
  setRoleShade,
  showToast,
  slugifyRoleName,
} from '../../stores/cartStore';
import { useCart } from '../../hooks/useCart';
import { useOpenInPicker } from '../../hooks/useOpenInPicker';
import ColorSwatch from '../common/ColorSwatch';
import SwatchStrip from '../palettes/SwatchStrip';

const PRESETS = [
  { label: 'Blue', hex: '#2563eb' },
  { label: 'Emerald', hex: '#10b981' },
  { label: 'Amber', hex: '#f59e0b' },
  { label: 'Rose', hex: '#f43f5e' },
  { label: 'Violet', hex: '#8b5cf6' },
];

/**
 * What clicking a swatch does.
 *
 * The first version of this page made one click do two things — copy *and* file
 * into the cart — which reads as helpful until you want one without the other:
 * browsing a scale quietly rewrites a token on every click, and copying a single
 * value leaves the cart changed from a gesture the user thinks is read-only. Both
 * are legitimate intents, so both are offered and the copy-and-file pairing
 * stays the default.
 */
type PickAction = 'both' | 'copy' | 'add';

const PICK_ACTIONS: { id: PickAction; label: string; hint: string }[] = [
  {
    id: 'both',
    label: 'Copy + cart',
    hint: 'Clicking a swatch copies its value and saves it to the variable',
  },
  {
    id: 'copy',
    label: 'Copy only',
    hint: 'Clicking a swatch only copies its value, leaving your cart untouched',
  },
  {
    id: 'add',
    label: 'Cart only',
    hint: 'Clicking a swatch only saves it to the variable, without copying',
  },
];

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
  const [pickAction, setPickAction] = useState<PickAction>('both');

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
   * "Change this colour" for the base swatch and the harmony swatches.
   *
   * The base colour is component state, not a cart token, so this opens the
   * picker in `'free'` mode: saving hands the colour back to `setBaseHex`
   * instead of writing a `--color-*` variable the page never mentions. Clicking
   * the swatch therefore preloads the picker with exactly the colour under the
   * cursor rather than the picker's own default.
   */
  const openInPicker = useOpenInPicker((picked) => setBaseHex(formatOklch(picked)));

  const fullScale = useMemo(() => generateFullScaleFromColor(baseColor), [baseColor]);
  const harmonies = useMemo(() => generateHarmonies(baseColor), [baseColor]);

  /**
   * Shared by the scale strip and the harmony strips: act on one colour
   * according to `pickAction`, with a single toast naming exactly what happened.
   *
   * The two destinations write to different slots on purpose. `setRoleShade`
   * takes the step the user actually clicked, so scale 50 stays `--color-x-50`.
   * `addColorToCart` re-slots by lightness, which is right for the harmony
   * swatches (they are generated at the base lightness, not at scale steps) and
   * is what every other "add a colour" affordance on the site does.
   *
   * Both store calls toast on their own; the toast raised here supersedes it so
   * the user sees one message. Under `addColorToCart` the returned step is used
   * so the toast cannot claim a step the colour did not land in.
   */
  const collect = (color: ColorModel, step?: ShadeStep) => {
    const value = formatOklch(color);

    if (pickAction === 'copy') {
      navigator.clipboard.writeText(value);
      showToast(`Copied ${value}`);
      return;
    }

    /*
     * Which slot the colour lands in depends on where it came from. A scale step
     * has a step the user actually clicked, and re-deriving it from lightness
     * would be both wrong and lossy — `setRoleShade` writes that exact slot. A
     * harmony swatch has no step of its own (harmonies are generated at the base
     * lightness), so it goes through `addColorToCart`, which re-slots by
     * lightness exactly as every other "add a colour" control on the site does.
     */
    const roleId = resolveTargetRole();
    const saved = step
      ? (setRoleShade(roleId, step, color, { silent: true }), { roleId, step })
      : addColorToCart(color, roleId);

    // Named from the *returned* step, not `opts.label`: `addColorToCart` picks
    // the step, so the label above would otherwise be a guess.
    const landed = `${cart.roles[saved.roleId]?.name ?? saved.roleId}-${saved.step}`;

    // Both store calls toast on their own; this one supersedes it so the user
    // sees a single message that accounts for the whole gesture.
    showToast(pickAction === 'both' ? `${value} → ${landed}` : `${landed} · ${value}`);
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

        {/* The variable the fill button and every swatch click will write to.
            Shown live so a typed name is never a leap of faith — the slug
            transform is not obvious, and `--color-Brand Accent-*` is not a
            variable anyone can write. */}
        <p class="font-mono text-micro text-faint">
          writes to <span class="text-mute">--color-{targetSlug}-*</span>
        </p>

        {/* What a swatch click does. Stated rather than assumed: the same click
            previously copied and filed unconditionally. */}
        <div class="flex items-center gap-2 flex-wrap">
          <span class="eyebrow mr-1">On click</span>
          <div class="flex items-center gap-1.5" role="group" aria-label="What clicking a swatch does">
            {PICK_ACTIONS.map((a) => (
              <button
                key={a.id}
                onClick={() => setPickAction(a.id)}
                aria-pressed={pickAction === a.id}
                title={a.hint}
                class={`chip !py-1 !px-2.5 !text-micro ${
                  pickAction === a.id ? '' : 'text-mute hover:text-body'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

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
          onPick={(color, step) => collect(color, step)}
          label="Generated scale"
        />
        <p class="mt-2 font-mono text-micro text-mute">
          {pickAction === 'copy'
            ? 'Click a step to copy its value.'
            : pickAction === 'add'
              ? `Click a step to save it as --color-${targetSlug}-<step>.`
              : 'Click a step to copy it and save it as --color-<role>-<step>.'}
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
                {g.colors.map((color, i) => (
                  <button
                    key={i}
                    type="button"
                    class="swatch-item"
                    style={{ backgroundColor: formatOklch(color) }}
                    onClick={() => collect(color)}
                    title={`${g.label} ${i + 1} — ${PICK_ACTIONS.find((a) => a.id === pickAction)!.hint.toLowerCase()}`}
                    aria-label={`${g.label} ${i + 1}: ${formatOklch(color)}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}