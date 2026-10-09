import { useState, useMemo, useEffect, useRef } from 'preact/hooks';
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
import type { LocaleCode } from '../../i18n/config';
import { t } from '../../i18n/translations';
import {
  addColorToCart,
  cartStore,
  setActiveRole,
  setRoleShade,
  ensureRole,
  slugifyRoleName,
  isCartOpenStore,
  showToast,
  consumePickerHandoff,
  clearPickerHandoff,
  savePickerResult,
  clearPickerResult,
  saveCartReopen,
  type PickerHandoff,
} from '../../stores/cartStore';
import { useCart } from '../../hooks/useCart';
import ColorSwatch from '../common/ColorSwatch';
import VariableNameInput from '../common/VariableNameInput';

/** Copies then confirms, so the flash is tied to the value that was copied. */
function copyValue(locale: LocaleCode, value: string, label: string) {
  navigator.clipboard.writeText(value);
  showToast(t(locale, 'ui.picker.copied', '{label} copied').replace('{label}', label));
}

interface Props {
  locale?: LocaleCode;
}

export default function ColorPickerIsland({ locale = 'en' }: Props) {
  const cart = useCart();

  const [l, setL] = useState(0.62);
  const [c, setC] = useState(0.19);
  const [h, setH] = useState(255);
  const [alpha, setAlpha] = useState(1);

  /**
   * Handoff coming from a swatch click ("Color Picker" action on a clicked
   * element). When present the sliders open preloaded with that colour.
   *
   * `'token'` writes back to the exact `--color-<role>-<step>` slot on save.
   * `'free'` writes no slot — the colour is handed back to the page that sent it,
   * because that swatch was never a token to begin with (see `useOpenInPicker`).
   */
  const [handoff, setHandoff] = useState<PickerHandoff | null>(null);

  useEffect(() => {
    const pending = consumePickerHandoff();
    if (!pending) return;
    setHandoff(pending);
    // 'free' has no slot, so claiming the active role would silently re-point
    // the picker's own "Add to cart" at whatever role was last touched.
    if (pending.mode !== 'free') setActiveRole(pending.roleId);

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

  /**
   * The destination variable, held as the *typed name* rather than a selected
   * role id — the same reason the generator and the palette pages made this
   * switch. A `<select>` can only offer roles that already exist, so it cannot
   * name the variable the user is inventing (`--color-brand-accent-*`), and it
   * cannot correct a name they mistyped once it exists either. The suggestion
   * menu keeps the one-tap picking of the `<select>` without inheriting its
   * ceiling.
   *
   * `null` means "nothing typed but uncommitted", and the field then mirrors the
   * store's active role. That is what keeps the text honest when the role is
   * changed from somewhere else — a token handoff, or the token drawer — rather
   * than stranding text the user never committed over a role that moved.
   */
  const [varNameEdit, setVarNameEdit] = useState<string | null>(null);

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

  /**
   * Abandon the pending edit.
   *
   * Both channels are cleared, not just the one in play: leaving a stale result
   * parked would hand a colour to the next page that happened to be addressed,
   * long after the user abandoned this one.
   */
  const cancelHandoff = () => {
    setHandoff(null);
    clearPickerHandoff();
    clearPickerResult();
  };

  /**
   * Resolve the typed variable name to a real role id, creating it on first use.
   *
   * Creation is deferred to the moment something is actually written, not to
   * every keystroke: a half-typed "br" would otherwise leave a trail of junk
   * roles in a cart that persists to localStorage, and there is no undo for a
   * role. `ensureRole` reuses a role whose slug already matches, so editing a
   * name back to one that exists selects that role instead of duplicating it.
   *
   * The edit is cleared only on success. A name that cannot be resolved stays in
   * the field so the user can see what they typed and fix it, rather than having
   * it silently replaced by whatever role was active.
   */
  const resolveTargetRole = (options: { silent?: boolean } = {}): string => {
    if (varNameEdit === null) return cart.activeRoleId;
    const roleId = ensureRole(varNameEdit, options);
    if (roleId) setVarNameEdit(null);
    return roleId ?? cart.activeRoleId;
  };

  /**
   * The variable the Add button will write to, as it will literally appear.
   *
   * Resolved live from the uncommitted text rather than from the active role, so
   * the button's label is the confirmation that the name was understood:
   * `--color-Brand Accent-*` is not a variable anyone can write, and the slug
   * transform is not obvious. Falls back to the active role for input that
   * `ensureRole` would refuse, because `slugifyRoleName`'s `'role'` fallback
   * would claim the writes are going to a variable created nowhere.
   */
  const pendingRoleId = useMemo(() => {
    const trimmed = (varNameEdit ?? '').trim();
    if (!/^[a-z0-9]/i.test(trimmed)) return cart.activeRoleId;
    return slugifyRoleName(trimmed);
  }, [varNameEdit, cart.activeRoleId]);

  const handleAddToCart = () => {
    if (handoff) {
      // Where the picker was opened from, so the user lands back on the element
      // they just edited instead of stranded on the picker. Read before
      // clearing — `returnTo` is null when the picker was opened directly, in
      // which case saving keeps them here.
      const destination = handoff.returnTo;

      // Ask for the drawer to reopen on arrival — but only when the *modal* is what
      // sent the user here. The `/ui-preview` token panel hands off the same way and
      // is still on screen when they return, so honouring its round trip would cover
      // the panel they just used with a modal they never asked for.
      //
      // Parked here, at the end of a completed session, rather than at handoff time.
      // That is the whole reason the flag cannot be claimed by the picker page: it
      // does not exist until the user has committed to a colour, so arriving here to
      // pick one never opens anything over the sliders. A session abandoned halfway
      // likewise leaves nothing behind to surprise a later visit.
      const reopenOnReturn = handoff.mode === 'token' && handoff.reopenCart === true;

      if (handoff.mode === 'free') {
        // No slot to write: hand the colour back to the originating page, which
        // decides where it goes. Writing a token here would put a colour into a
        // `--color-*` variable the user never asked for and never sees.
        //
        // `slot` is carried verbatim because it identifies *which* of the page's
        // free colours was opened — the picker can only echo it.
        savePickerResult({ color, returnTo: destination, slot: handoff.slot ?? null });
      } else {
        setRoleShade(handoff.roleId, handoff.step, color);
      }

      setHandoff(null);
      clearPickerHandoff();
      if (destination) {
        if (reopenOnReturn) saveCartReopen(destination);
        goTo(destination);
      }
      return;
    }

    // Silenced because `addColorToCart` toasts the variable the colour landed in
    // moments later, and the creation toast would supersede the useful one.
    addColorToCart(color, resolveTargetRole({ silent: true }));
  };

  const handoffRole = handoff ? cart.roles[handoff.roleId] : undefined;
  const handoffReturnTo = handoff?.returnTo ?? null;

  /** 'free' handoffs have no slot to name, so they get their own wording. */
  const handoffIsFree = handoff?.mode === 'free';
  const handoffActionLabel = handoffIsFree
    ? t(locale, 'ui.picker.useColour', 'Use colour')
    : handoffReturnTo
      ? t(locale, 'ui.picker.saveAndReturn', 'Save & return')
      : t(locale, 'ui.picker.save', 'Save');

  const gamut = color.inSRGB
    ? { dot: 'bg-copy-success', text: 'sRGB', faq: 'faq-gamut-srgb' }
    : color.inP3
      ? { dot: 'bg-gamut-p3', text: 'Display-P3', faq: 'faq-gamut-p3' }
      : {
          dot: 'bg-gamut-warning',
          // sRGB / Display-P3 are proper gamut names and stay untranslated;
          // "Clipped" is ordinary prose (pt.json renders it "Recortado").
          text: t(locale, 'ui.picker.gamutClipped', 'Clipped'),
          faq: 'faq-gamut-clipped',
        };

  /*
   * The badge is the only place on this page where gamut jargon lands with no
   * explanation, so it opens the FAQ entry that decodes its current word —
   * sRGB, Display-P3 or Clipped each has its own card, and the id travels on
   * `gamut` above so the jump can never point at the wrong state. If a card is
   * missing (a copy of this island on a page without the FAQ), the click is a
   * no-op rather than an error.
   *
   * The ring is a `data` attribute, not state: it has no bearing on what the
   * component renders, so putting it in React state would re-render the whole
   * picker to drive one decoration. Removing it and forcing a reflow before
   * re-adding is what makes a *second* click replay the animation — setting
   * the same attribute twice is a no-op to CSS.
   */
  const faqFlashEl = useRef<HTMLElement | null>(null);
  const faqFlashTimer = useRef<number>(0);

  const showGamutFaq = (faqId: string) => {
    const card = document.getElementById(faqId);
    if (!card) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });

    // Use requestAnimationFrame instead of forced reflow (offsetWidth) to avoid
    // layout thrashing. This schedules the attribute change after the current
    // frame's style/layout pass, achieving the same re-trigger effect without
    // blocking the main thread.
    faqFlashEl.current?.removeAttribute('data-flash');
    requestAnimationFrame(() => {
      card.setAttribute('data-flash', '');
      faqFlashEl.current = card;

      window.clearTimeout(faqFlashTimer.current);
      faqFlashTimer.current = window.setTimeout(() => {
        card.removeAttribute('data-flash');
        faqFlashEl.current = null;
      }, 1500);
    });
  };

  const tokenCount = Object.values(cart.roles).reduce(
    (sum, role) => sum + Object.keys(role.shades).length,
    0
  );

  /**
   * The format row: label, live value, editable input, copy.
   *
   * `key` is the lowercased notation, and it is load-bearing: it becomes the
   * input's `id`, which is what the row's `<label htmlFor>` points at. Without a
   * stable, unique id per notation the label is attached to nothing.
   */
  const formatRows = [
    { key: 'oklch', label: 'OKLCH', value: oklchString },
    { key: 'hex', label: 'HEX', value: color.hex },
    { key: 'rgb', label: 'RGB', value: rgbString },
    { key: 'hsl', label: 'HSL', value: hslString },
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
          <ColorSwatch color={color} class="w-6 h-6 rounded-md border border-hairline flex-shrink-0" />
          <span class="font-mono text-label text-body min-w-0 truncate">
            {handoffIsFree ? (
              <>
                {t(locale, 'ui.picker.editing', 'Editing')}{' '}
                <span class="text-ink">
                  {t(locale, 'ui.picker.colourSentFrom', 'colour sent from {source}').replace(
                    '{source}',
                    handoffReturnTo ?? t(locale, 'ui.picker.thisPage', 'this page')
                  )}
                </span>
              </>
            ) : (
              <>
                {handoff.color
                  ? t(locale, 'ui.picker.editing', 'Editing')
                  : t(locale, 'ui.picker.creating', 'Creating')}{' '}
                <span class="text-ink">--color-{handoff.roleId}-{handoff.step}</span>
                <span class="text-faint">
                  {' · '}
                  {t(
                    locale,
                    'ui.roles.' + handoff.roleId,
                    handoffRole?.name ?? handoff.roleId
                  )}
                </span>
              </>
            )}
          </span>

          <div class="flex items-center gap-1.5 ml-auto">
            {/* A real anchor, so the view-transition router intercepts the click
                instead of the browser performing a full document load. */}
            {handoffReturnTo && (
              <a href={handoffReturnTo} class="btn btn-quiet !min-h-8 !px-2.5">
                {t(locale, 'ui.picker.back', 'Back')}
              </a>
            )}
            <button
              onClick={cancelHandoff}
              class="btn btn-quiet !min-h-8 !px-2.5"
              aria-label={t(locale, 'ui.picker.cancelEdit', 'Cancel edit')}
            >
              <X class="w-3.5 h-3.5" aria-hidden="true" strokeWidth={2} />
            </button>
            <button onClick={handleAddToCart} class="btn btn-primary !min-h-8 !px-3">
              <Check class="w-3.5 h-3.5" aria-hidden="true" strokeWidth={2.5} />
              {handoffActionLabel}
            </button>
          </div>
        </div>
      )}

      <div class="grid lg:grid-cols-12 gap-4">
        {/* ── Canvas ── */}
        <div class="lg:col-span-7">
          <ColorSwatch
            color={color}
            class="h-56 md:h-72 rounded-lg border border-hairline"
            {...{ id: 'picker-swatch-canvas' }}
          >
            {/* Gamut + nearest step, and randomize. Two badges, both answering
                "what am I looking at?" — the removed third one restated the
                lightness that the L slider already displays.

                Both are `dark-scope`: they are laid over a black scrim whose
                only job is to hold type still against whatever colour is
                underneath, so they keep the dark theme's inks in both themes —
                unpainted, the light theme would resolve them dark-on-dark and
                the gamut dot would turn to mud.

                The badge is a real `<button>`: it opens the FAQ entry for its
                current gamut word (sRGB / Display-P3 / Clipped), because those
                three words are the only jargon on this page a first-time
                visitor has no way to decode. The whole badge is the button
                rather than just the word — a reader who taps it after dragging
                a slider expects *the badge* to respond — and `title` becomes
                the accessible description, so the accessible name stays the
                literal label that is also visible on screen. The card it opens
                explains the gamut word, which is the half that changes as
                L/C/H move; "step N" just reports the nearest shade slot. */}
            <div class="absolute top-2 left-2 right-2 flex items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => showGamutFaq(gamut.faq)}
                class="pill pill-link dark-scope !bg-black/60 backdrop-blur-md !border-white/10 hover:!bg-black/80 transition-colors"
                title={t(locale, 'ui.picker.gamutFaqHint', 'What does this label mean?')}
              >
                <span class={`w-1.5 h-1.5 rounded-full ${gamut.dot}`} />
                {gamut.text}
                <span class="text-faint">·</span>
                {t(locale, 'ui.picker.step', 'step {step}').replace('{step}', String(nearestStep))}
              </button>

              <button
                onClick={randomizeColor}
                class="icon-btn dark-scope !h-7 !w-7 !bg-black/60 backdrop-blur-md !border !border-white/10 hover:!bg-black/80"
                title={t(locale, 'ui.picker.randomise', 'Randomise')}
                aria-label={t(locale, 'ui.picker.randomiseColour', 'Randomise colour')}
              >
                <Dices class="w-3.5 h-3.5" aria-hidden="true" strokeWidth={2} />
              </button>
            </div>

            {/* The live value, docked over the canvas. */}
            <div class="absolute bottom-2 left-2 right-2 dock !rounded-md flex items-center gap-2 !px-2.5 !py-1.5">
              <span class="flex-1 min-w-0 font-mono text-hud text-ink truncate">{oklchString}</span>
              <button
                onClick={() => copyValue(locale, oklchString, 'OKLCH')}
                class="icon-btn !h-6 !w-6 hover:!bg-ink/10"
                title={t(locale, 'ui.picker.copyOklch', 'Copy oklch()')}
                aria-label={t(locale, 'ui.picker.copyOklchValue', 'Copy oklch value')}
              >
                <Copy class="w-3.5 h-3.5 text-ink" aria-hidden="true" strokeWidth={2} />
              </button>
            </div>
          </ColorSwatch>
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
              { key: 'L', label: t(locale, 'ui.picker.lightness', 'Lightness'), value: `${(l * 100).toFixed(1)}%`, min: 0, max: 1, step: 0.005, track: lTrack, set: setL },
              {
                key: 'C',
                label: t(locale, 'ui.picker.chroma', 'Chroma'),
                value: c.toFixed(3),
                // Sub-label marks the in-gamut ceiling on the ramp itself.
                note: t(locale, 'ui.picker.maxNote', 'max {value}').replace(
                  '{value}',
                  maxChroma.toFixed(3)
                ),
                min: 0,
                max: 0.37,
                step: 0.002,
                track: cTrack,
                set: setC,
              },
              { key: 'H', label: t(locale, 'ui.picker.hue', 'Hue'), value: `${h.toFixed(1)}°`, min: 0, max: 360, step: 1, track: hTrack, set: setH },
              { key: 'A', label: t(locale, 'ui.picker.alpha', 'Alpha'), value: `${Math.round(alpha * 100)}%`, min: 0, max: 1, step: 0.01, track: alphaTrack, set: setAlpha },
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
                id={`picker-slider-${s.key.toLowerCase()}`}
                type="range"
                name={s.key.toLowerCase()}
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
            {/* `htmlFor` is what makes this a label rather than a stray `<label>`:
                the input is a sibling, not a child, so without it the element is
                associated with nothing and Chrome reports an unlabelled form field
                — four times over, once per notation. */}
            <label htmlFor={`picker-format-${f.key}`} class="eyebrow block mb-1">
              {f.label}
            </label>
            <div class="hud !py-1.5 flex items-center gap-1.5">
              <input
                id={`picker-format-${f.key}`}
                type="text"
                value={f.value}
                spellcheck={false}
                autocomplete="off"
                aria-label={t(locale, 'ui.picker.valueOf', '{label} value').replace('{label}', f.label)}
                onChange={(e) => handleInputChange((e.target as HTMLInputElement).value)}
                class="flex-1 min-w-0 bg-transparent font-mono text-hud text-ink focus:outline-none"
              />
              <button
                onClick={() => copyValue(locale, f.value, f.label)}
                class="icon-btn !h-6 !w-6 shrink-0"
                title={t(locale, 'ui.picker.copyLabel', 'Copy {label}').replace('{label}', f.label)}
                aria-label={t(locale, 'ui.picker.copyLabelValue', 'Copy {label} value').replace(
                  '{label}',
                  f.label
                )}
              >
                <Copy class="w-3.5 h-3.5" aria-hidden="true" strokeWidth={2} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Action dock ──
          The glass dock from DESIGN.md: the destination variable and the one write
          action for the colour, held at the bottom of the viewport so it stays
          reachable while the format rows above are scrolled. */}
      <div class="sticky bottom-4 z-20">
        <div class="dock flex items-center gap-2 flex-wrap !px-3 !py-2.5">
          <label class="flex items-center gap-2 min-w-0" htmlFor="picker-variable-name">
            <span class="eyebrow shrink-0">{t(locale, 'ui.picker.variable', 'Variable')}</span>
            {/*
              A text field with a suggestion menu of the cart's roles, not a
              `<select>` and not a `<datalist>` anymore. It has to accept a name
              that does not exist yet — this page's whole job is authoring one —
              while offering every known name as a one-tap switch.

              The native datalist failed the second half: it draws its own
              unstyleable popup and, worse, filters on the text already in the
              field, so picking a *different* variable meant first deleting the
              current one character by character. This menu opens on focus with
              every role listed and a click replaces the field wholesale; typing
              is what filters it.
            */}
            <VariableNameInput
              id="picker-variable-name"
              name="variable"
              locale={locale}
              value={varNameEdit ?? cart.activeRoleId}
              onChange={setVarNameEdit}
              onCommit={resolveTargetRole}
              suggestions={Object.values(cart.roles).map((r) => ({
                value: r.id,
                label: t(locale, 'ui.roles.' + r.id, r.name),
              }))}
              class="min-w-0 max-w-[16rem]"
              inputClass="hud !py-3 !px-3 font-mono text-label w-full min-w-0 cursor-text"
              ariaLabel={t(locale, 'ui.picker.variableNameAria', 'Custom color variable name')}
              placeholder="brand-accent"
            />
          </label>

          <span class="pill ml-auto">
            <ShoppingBag class="w-3 h-3" aria-hidden="true" strokeWidth={2} />
            {tokenCount}
          </span>

          <button
            onClick={() => isCartOpenStore.set(true)}
            class="btn btn-quiet !min-h-9"
            title={t(locale, 'ui.picker.openTokenDrawer', 'Open the token drawer')}
          >
            <span class="hidden sm:inline">{t(locale, 'ui.picker.tokens', 'Tokens')}</span>
            <span class="sm:hidden">{t(locale, 'ui.picker.cart', 'Cart')}</span>
          </button>

          <button
            onClick={handleAddToCart}
            class="btn btn-primary !min-h-9"
            id="picker-add-to-cart-btn"
            title={
              handoff
                ? handoffIsFree
                  ? t(
                      locale,
                      'ui.picker.useColourOn',
                      'Use this colour back on {source}'
                    ).replace(
                      '{source}',
                      handoffReturnTo ??
                        t(locale, 'ui.picker.pageYouCameFrom', 'the page you came from')
                    )
                  : t(locale, 'ui.picker.writeTo', 'Write to {variable}').replace(
                      '{variable}',
                      `--color-${handoff.roleId}-${handoff.step}`
                    )
                : t(locale, 'ui.picker.saveAs', 'Save as {variable}').replace(
                    '{variable}',
                    `--color-${pendingRoleId}-${nearestStep}`
                  )
            }
          >
            <Plus class="w-4 h-4" aria-hidden="true" strokeWidth={2.5} />
            {handoff
              ? handoffActionLabel
              : t(locale, 'ui.picker.addStep', 'Add {name}').replace(
                  '{name}',
                  `${pendingRoleId}-${nearestStep}`
                )}
          </button>
        </div>
      </div>
    </div>
  );
}