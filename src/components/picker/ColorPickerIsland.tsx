import { useState, useMemo, useEffect } from 'preact/hooks';
import { Check, Copy, Dices, Plus, ShoppingBag, X } from 'lucide-preact';
import {
  createOklchColor,
  formatOklch,
  parseAnyToOklch,
  oklchToRgbString,
  oklchToHslString,
  findMaxChromaInSRGB,
  getNearestShadeStep,
  TARGET_LIGHTNESS,
  BASE_SHADE_STEP,
  type ColorModel,
} from '../../utils/color';
import { goTo } from '../../utils/navigate';
import {
  addColorToCart,
  cartStore,
  setActiveRole,
  setRoleShade,
  isCartOpenStore,
  showToast,
  consumePickerHandoff,
  clearPickerHandoff,
  type PickerHandoff,
} from '../../stores/cartStore';
import { useCart } from '../../hooks/useCart';

/** Copies then confirms, so the flash is tied to the value that was copied. */
function copyValue(value: string, label: string) {
  navigator.clipboard.writeText(value);
  showToast(`${label} copied`);
}

export default function ColorPickerIsland() {
  const cart = useCart();

  const [l, setL] = useState(0.62);
  const [c, setC] = useState(0.19);
  const [h, setH] = useState(255);
  const [alpha, setAlpha] = useState(1);

  /**
   * Handoff coming from the UI preview ("Color Picker" action on a clicked
   * element). When present the sliders open preloaded with that token's color
   * and saving writes back to the exact --color-<role>-<step> slot.
   */
  const [handoff, setHandoff] = useState<PickerHandoff | null>(null);

  useEffect(() => {
    const pending = consumePickerHandoff();
    if (!pending) return;
    setHandoff(pending);
    setActiveRole(pending.roleId);

    if (pending.color) {
      setL(pending.color.l);
      setC(pending.color.c);
      setH(pending.color.h);
      setAlpha(pending.color.alpha);
      return;
    }

    // Empty slot: author a new token that already suits its step, instead of
    // opening on the picker's arbitrary default (which ignored the slot).
    // Chroma/hue are inherited from the role's own 500 so a generated scale stays
    // on-hue; lightness comes from the step so slot 950 opens dark and 50 light.
    const role = cartStore.get().roles[pending.roleId];
    const base = role?.shades[BASE_SHADE_STEP]?.color;
    setL(TARGET_LIGHTNESS[pending.step]);
    setC(base ? base.c : 0.12);
    setH(base ? base.h : 255);
    setAlpha(base ? base.alpha : 1);
  }, []);

  const color: ColorModel = useMemo(() => createOklchColor(l, c, h, alpha), [l, c, h, alpha]);

  const oklchString = formatOklch(color);
  const rgbString = useMemo(() => oklchToRgbString(color), [color]);
  const hslString = useMemo(() => oklchToHslString(color), [color]);
  const maxChroma = useMemo(() => findMaxChromaInSRGB(l, h), [l, h]);
  const nearestStep = useMemo(() => getNearestShadeStep(l), [l]);

  /*
   * Track gradients.
   *
   * The track *is* the control's documentation: each one renders the real colour
   * ramp reachable by moving that handle, so the user chooses by eye instead of
   * reading a number and imagining it. The chroma ramp deliberately runs past
   * the in-gamut maximum so the point where the colour starts clipping is
   * visible rather than discovered.
   */
  const lTrack = useMemo(() => {
    const stops = [0, 0.25, 0.5, 0.75, 1]
      .map((x) => `oklch(${(x * 100).toFixed(0)}% ${c.toFixed(3)} ${h.toFixed(1)})`)
      .join(', ');
    return `linear-gradient(to right, ${stops})`;
  }, [c, h]);

  const cTrack = useMemo(() => {
    const stops = [0, 0.1, 0.2, 0.3, 0.4]
      .map((x) => `oklch(${(l * 100).toFixed(0)}% ${x.toFixed(3)} ${h.toFixed(1)})`)
      .join(', ');
    return `linear-gradient(to right, ${stops})`;
  }, [l, h]);

  // Hue uses a damped chroma. At full chroma most hues are outside sRGB, which
  // would render as a flat clipped band and destroy the gradient's only job.
  const hTrack = useMemo(() => {
    const stops = [0, 60, 120, 180, 240, 300, 360]
      .map((x) => `oklch(${(l * 100).toFixed(0)}% ${Math.min(c, 0.2).toFixed(3)} ${x})`)
      .join(', ');
    return `linear-gradient(to right, ${stops})`;
  }, [l, c]);

  const alphaTrack = useMemo(
    () =>
      `linear-gradient(to right, transparent, oklch(${(l * 100).toFixed(0)}% ${c.toFixed(3)} ${h.toFixed(1)}))`,
    [l, c, h]
  );

  const handleInputChange = (raw: string) => {
    const parsed = parseAnyToOklch(raw);
    if (parsed) {
      setL(parsed.l);
      setC(parsed.c);
      setH(parsed.h);
      setAlpha(parsed.alpha);
    }
  };

  const randomizeColor = () => {
    setL(Number((0.3 + Math.random() * 0.55).toFixed(3)));
    setC(Number((0.08 + Math.random() * 0.22).toFixed(3)));
    setH(Math.round(Math.random() * 360));
  };

  const cancelHandoff = () => {
    setHandoff(null);
    clearPickerHandoff();
  };

  const handleAddToCart = () => {
    if (handoff) {
      // Handoff: write to the exact slot the color came from
      setRoleShade(handoff.roleId, handoff.step, color);
      // Where the picker was opened from, so the user lands back on the token
      // they just edited instead of stranded on the picker. Read before
      // clearing — `returnTo` is null when the picker was opened directly, in
      // which case saving keeps them here.
      const destination = handoff.returnTo;
      setHandoff(null);
      clearPickerHandoff();
      if (destination) goTo(destination);
      return;
    }
    addColorToCart(color, cart.activeRoleId);
  };

  const handoffRole = handoff ? cart.roles[handoff.roleId] : undefined;
  const handoffReturnTo = handoff?.returnTo ?? null;
  const activeRole = cart.roles[cart.activeRoleId] || Object.values(cart.roles)[0];

  const gamut = color.inSRGB
    ? { dot: 'bg-copy-success', text: 'sRGB' }
    : color.inP3
      ? { dot: 'bg-gamut-p3', text: 'Display-P3' }
      : { dot: 'bg-gamut-warning', text: 'Clipped' };

  const tokenCount = Object.values(cart.roles).reduce(
    (sum, role) => sum + Object.keys(role.shades).length,
    0
  );

  /** The format row: label, live value, editable input, copy. */
  const formatRows = [
    { label: 'OKLCH', value: oklchString },
    { label: 'HEX', value: color.hex },
    { label: 'RGB', value: rgbString },
    { label: 'HSL', value: hslString },
  ];

  return (
    <div class="space-y-4">
      {/*
        Handoff banner.

        Two paragraphs and a coloured border used to sit here. It is one line of
        mono type now: the banner exists to say *which slot is about to be
        overwritten*, and that is one fact. The accent border also went — it was
        the only place in the product using a chromatic border for state, and it
        pulled the eye toward chrome instead of the canvas.
      */}
      {handoff && (
        <div class="card !py-2.5 flex items-center gap-3 flex-wrap">
          <span
            class="w-6 h-6 rounded-md border border-hairline flex-shrink-0 checker-bg"
            style={{ backgroundColor: oklchString }}
            aria-hidden="true"
          />
          <span class="font-mono text-label text-body min-w-0 truncate">
            {handoff.color ? 'Editing' : 'Creating'}{' '}
            <span class="text-ink">--color-{handoff.roleId}-{handoff.step}</span>
            <span class="text-faint"> · {handoffRole?.name ?? handoff.roleId}</span>
          </span>

          <div class="flex items-center gap-1.5 ml-auto">
            {/* A real anchor, so the view-transition router intercepts the click
                instead of the browser performing a full document load. */}
            {handoffReturnTo && (
              <a href={handoffReturnTo} class="btn btn-quiet !min-h-8 !px-2.5">
                Back
              </a>
            )}
            <button onClick={cancelHandoff} class="btn btn-quiet !min-h-8 !px-2.5" aria-label="Cancel edit">
              <X class="w-3.5 h-3.5" aria-hidden="true" strokeWidth={2} />
            </button>
            <button onClick={handleAddToCart} class="btn btn-primary !min-h-8 !px-3">
              <Check class="w-3.5 h-3.5" aria-hidden="true" strokeWidth={2.5} />
              {handoffReturnTo ? 'Save & return' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div class="grid lg:grid-cols-12 gap-4">
        {/* ── Canvas ── */}
        <div class="lg:col-span-7">
          <div
            class="relative h-56 md:h-72 rounded-lg border border-hairline overflow-hidden checker-bg"
            id="picker-swatch-canvas"
          >
            <div class="absolute inset-0" style={{ backgroundColor: oklchString }} />

            {/* Gamut + nearest step, and randomize. Two badges, both answering
                "what am I looking at?" — the removed third one restated the
                lightness that the L slider already displays. */}
            <div class="absolute top-2 left-2 right-2 flex items-start justify-between gap-2">
              <span class="pill !bg-black/60 backdrop-blur-md !border-white/10">
                <span class={`w-1.5 h-1.5 rounded-full ${gamut.dot}`} />
                {gamut.text}
                <span class="text-faint">·</span>
                step {nearestStep}
              </span>

              <button
                onClick={randomizeColor}
                class="icon-btn !h-7 !w-7 !bg-black/60 backdrop-blur-md !border !border-white/10 text-ink hover:!bg-black/80"
                title="Randomise"
                aria-label="Randomise colour"
              >
                <Dices class="w-3.5 h-3.5" aria-hidden="true" strokeWidth={2} />
              </button>
            </div>

            {/* The live value, docked over the canvas. */}
            <div class="absolute bottom-2 left-2 right-2 dock !rounded-md flex items-center gap-2 !px-2.5 !py-1.5">
              <span class="flex-1 min-w-0 font-mono text-hud text-ink truncate">{oklchString}</span>
              <button
                onClick={() => copyValue(oklchString, 'OKLCH')}
                class="icon-btn !h-6 !w-6 hover:!bg-white/10"
                title="Copy oklch()"
                aria-label="Copy oklch value"
              >
                <Copy class="w-3.5 h-3.5 text-ink" aria-hidden="true" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Sliders ── */}
        {/*
          No card header and no stat tiles.

          "OKLCH Parameters" and "Live Dynamic Tracks" were captions for a list
          that is self-evidently a set of sliders. The two tiles underneath
          repeated the gamut badge (canvas) and the HEX value (format row). Both
          were removed rather than restyled, because a value shown three times
          is three chances to read the wrong one.
        */}
        <div class="lg:col-span-5 card space-y-4">
          {(
            [
              { key: 'L', label: 'Lightness', value: `${(l * 100).toFixed(1)}%`, min: 0, max: 1, step: 0.005, track: lTrack, set: setL },
              {
                key: 'C',
                label: 'Chroma',
                value: c.toFixed(3),
                // Sub-label marks the in-gamut ceiling on the ramp itself.
                note: `max ${maxChroma.toFixed(3)}`,
                min: 0,
                max: 0.37,
                step: 0.002,
                track: cTrack,
                set: setC,
              },
              { key: 'H', label: 'Hue', value: `${h.toFixed(1)}°`, min: 0, max: 360, step: 1, track: hTrack, set: setH },
              { key: 'A', label: 'Alpha', value: `${Math.round(alpha * 100)}%`, min: 0, max: 1, step: 0.01, track: alphaTrack, set: setAlpha },
            ] as const
          ).map((s) => (
            <div key={s.key}>
              <div class="flex items-baseline justify-between gap-2 mb-1.5">
                <span class="flex items-baseline gap-2 min-w-0">
                  <span class="font-mono text-label text-ink font-medium">{s.key}</span>
                  <span class="text-micro text-mute truncate">{s.label}</span>
                </span>
                <span class="flex items-baseline gap-2 shrink-0">
                  {'note' in s && s.note && <span class="font-mono text-micro text-faint">{s.note}</span>}
                  <span class="font-mono text-hud text-ink">{s.value}</span>
                </span>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={s.key === 'L' ? l : s.key === 'C' ? c : s.key === 'H' ? h : alpha}
                onInput={(e) => s.set(parseFloat((e.target as HTMLInputElement).value))}
                style={{ '--track-gradient': s.track }}
                aria-label={`${s.label} (${s.key})`}
                aria-valuetext={s.value}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Formats ──
          Typed values in every notation. Each is both a readout and an input:
          editing any one of them drives the same state, which is what makes
          "type or paste any format" true without a separate parse step. */}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {formatRows.map((f) => (
          <div key={f.label} class="min-w-0">
            <label class="eyebrow block mb-1">{f.label}</label>
            <div class="hud !py-1.5 flex items-center gap-1.5">
              <input
                type="text"
                value={f.value}
                spellcheck={false}
                autocomplete="off"
                aria-label={`${f.label} value`}
                onChange={(e) => handleInputChange((e.target as HTMLInputElement).value)}
                class="flex-1 min-w-0 bg-transparent font-mono text-hud text-ink focus:outline-none"
              />
              <button
                onClick={() => copyValue(f.value, f.label)}
                class="icon-btn !h-6 !w-6 shrink-0"
                title={`Copy ${f.label}`}
                aria-label={`Copy ${f.label} value`}
              >
                <Copy class="w-3.5 h-3.5" aria-hidden="true" strokeWidth={2} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Action dock ──
          The glass dock from DESIGN.md: role assignment and the one write action
          for the colour, held at the bottom of the viewport so it stays reachable
          while the format rows above are scrolled. */}
      <div class="sticky bottom-4 z-20">
        <div class="dock flex items-center gap-2 flex-wrap !px-3 !py-2.5">
          <label class="flex items-center gap-2 min-w-0">
            <span class="eyebrow shrink-0">Role</span>
            <select
              value={cart.activeRoleId}
              onChange={(e) => setActiveRole((e.target as HTMLSelectElement).value)}
              class="hud !py-1 !px-2 font-mono text-label min-w-0 max-w-[16rem] cursor-pointer"
            >
              {Object.values(cart.roles).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>

          <span class="pill ml-auto">
            <ShoppingBag class="w-3 h-3" aria-hidden="true" strokeWidth={2} />
            {tokenCount}
          </span>

          <button
            onClick={() => isCartOpenStore.set(true)}
            class="btn btn-quiet !min-h-9"
            title="Open the token drawer"
          >
            <span class="hidden sm:inline">Tokens</span>
            <span class="sm:hidden">Cart</span>
          </button>

          <button
            onClick={handleAddToCart}
            class="btn btn-primary !min-h-9"
            id="picker-add-to-cart-btn"
            title={
              handoff
                ? `Write to --color-${handoff.roleId}-${handoff.step}`
                : `Save as ${activeRole?.name}-${nearestStep}`
            }
          >
            <Plus class="w-4 h-4" aria-hidden="true" strokeWidth={2.5} />
            {handoff ? 'Save token' : `Add ${activeRole?.name}-${nearestStep}`}
          </button>
        </div>
      </div>
    </div>
  );
}