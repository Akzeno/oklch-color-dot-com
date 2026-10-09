import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { TargetedEvent, TargetedKeyboardEvent } from 'preact';
import { Check } from 'lucide-preact';
import type { LocaleCode } from '../../i18n/config';
import { t } from '../../i18n/translations';

/**
 * One row of the suggestion menu: the value that lands in the field, plus the
 * human name the role is known by.
 */
export interface VariableNameSuggestion {
  /** What lands in the field when the row is picked, e.g. `trusty-button`. */
  value: string;
  /** Human label, e.g. "Trusty Button". Shown only when it adds something. */
  label?: string;
}

export interface VariableNameInputProps {
  /**
   * DOM id of the input. Doubles as the combobox id and the target of the
   * wrapping `<label>`s `htmlFor`.
   */
  id: string;
  name?: string;
  /** Controlled field text. */
  value: string;
  /** Every keystroke and every picked row land here. */
  onChange: (next: string) => void;
  /**
   * Enter with no row highlighted: commit the typed name (resolve/create the
   * role, on the pages that do that).
   */
  onCommit: () => void;
  suggestions: VariableNameSuggestion[];
  placeholder?: string;
  ariaLabel?: string;
  /** Locale for the menu's own strings (aria-label, empty states). */
  locale?: LocaleCode;
  /** Classes for the wrapper the menu is positioned against — sizing lives here. */
  class?: string;
  /** Classes for the input itself. */
  inputClass?: string;
}

/**
 * A free-text variable name with a suggestion menu — the destination-variable
 * field shared by the color picker dock and the palette generator.
 *
 * WHY NOT A `<datalist>`
 *
 * The native datalist popup cannot be styled at all: its chrome, its row
 * height and its scrollbar are drawn by the browser, so it arrives as the one
 * control on the site that does not match the design system — a system whose
 * entire palette exists to stay neutral next to the colour swatches.
 *
 * Worse, it *filters on the value already in the field*. The field is usually
 * holding a real variable name, so opening the menu shows only names matching
 * that name — switching destination meant first deleting every character of the
 * current one. This menu opens with every suggestion listed, unfiltered, and a
 * click replaces the whole field contents. Typing is what narrows it: the first
 * keystroke since opening switches the list to substring matching (prefix hits
 * first), and until then the field's existing text is not a filter.
 *
 * The field keeps accepting names that do not exist yet — that is the point of
 * a text field here — so Enter still commits whatever is typed, and the menu is
 * only ever a shortcut to names that already do.
 */
export default function VariableNameInput({
  id,
  name,
  value,
  onChange,
  onCommit,
  suggestions,
  placeholder,
  ariaLabel,
  locale = 'en',
  class: wrapperClass = '',
  inputClass = '',
}: VariableNameInputProps) {
  const listId = `${id}-suggestions`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);

  const [open, setOpen] = useState(false);
  /**
   * Whether the user has typed since the menu (re)opened. While false the menu
   * lists everything; the first keystroke turns matching on. This is the whole
   * fix for "I have to delete the text before I can pick another variable".
   */
  const [filtering, setFiltering] = useState(false);
  /** Keyboard-highlighted row, or -1. The mouse does not own this state. */
  const [active, setActive] = useState(-1);
  /** Set when the menu has to open upward — the picker's dock sits at the viewport bottom. */
  const [dropUp, setDropUp] = useState(false);

  const query = filtering ? value.trim().toLowerCase() : '';

  const matches = useMemo(() => {
    if (!query) return suggestions;
    const heads: VariableNameSuggestion[] = [];
    const rest: VariableNameSuggestion[] = [];
    for (const s of suggestions) {
      const v = s.value.toLowerCase();
      const l = (s.label ?? '').toLowerCase();
      if (v.startsWith(query)) heads.push(s);
      else if (v.includes(query) || l.includes(query)) rest.push(s);
    }
    return [...heads, ...rest];
  }, [suggestions, query]);

  /** Keep the keyboard-highlighted row inside the menu's small viewport. */
  useEffect(() => {
    if (!open || active < 0) return;
    optionRefs.current[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  /**
   * Open downward; flip upward only when there is genuinely more room above —
   * measured rather than assumed, because the field lives in a sticky dock at
   * the bottom of the viewport on one page and in normal flow on the other.
   *
   * Height is *calculated* from the item count to avoid a forced synchronous
   * layout (offsetHeight). Each row is ~32px (padding + line-height); the menu
   * caps at 224px (max-h-56). This avoids the reflow that Lighthouse flags.
   */
  useLayoutEffect(() => {
    if (!open) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    // Each item ~32px; menu max-height 224px (max-h-56).
    const itemHeight = 32;
    const maxHeight = 224;
    const height = Math.min(matches.length * itemHeight, maxHeight) || maxHeight;
    const below = window.innerHeight - rect.bottom;
    const next = below < height + 8 && rect.top > below;
    if (next !== dropUp) setDropUp(next);
  }, [open, matches]);

  /** Replace the whole field contents with the picked name and settle. */
  const pick = (s: VariableNameSuggestion) => {
    onChange(s.value);
    setFiltering(false);
    setOpen(false);
    setActive(-1);
    inputRef.current?.focus();
  };

  const handleInput = (e: TargetedEvent<HTMLInputElement, Event>) => {
    onChange((e.target as HTMLInputElement).value);
    setFiltering(true);
    setOpen(true);
    setActive(-1);
  };

  const handleFocus = () => {
    // Focus means browsing: list every variable, whatever the field holds.
    setFiltering(false);
    setOpen(true);
    setActive(-1);
  };

  const handleBlur = () => {
    // The menu's own rows cancel their mousedown, so focus never leaves the
    // input while the user is picking — this only ever runs for a real departure.
    setOpen(false);
    setFiltering(false);
    setActive(-1);
  };

  const handleKeyDown = (e: TargetedKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setFiltering(false);
        setOpen(true);
        setActive(e.key === 'ArrowDown' ? 0 : Math.max(matches.length - 1, 0));
        return;
      }
      if (matches.length === 0) return;
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      setActive((at) => (at + delta + matches.length) % matches.length);
      return;
    }

    if (e.key === 'Escape') {
      // Consumed only while the menu is open, so Escape keeps its usual meaning
      // (get out of this control) everywhere else.
      if (!open) return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      setFiltering(false);
      setActive(-1);
      return;
    }

    if (e.key === 'Enter') {
      // A highlighted row wins: accepting the suggestion *is* the intent when
      // one is highlighted. With no highlight this is the plain commit the
      // field has always done on Enter — typing a name that exists nowhere and
      // pressing Enter still works, suggestion menu or not.
      e.preventDefault();
      const hit = open && active >= 0 ? matches[active] : undefined;
      if (hit) {
        pick(hit);
        return;
      }
      setOpen(false);
      setFiltering(false);
      setActive(-1);
      onCommit();
      return;
    }

    if (e.key === 'Tab') setOpen(false);
  };

  const optionId = (index: number) => `${listId}-option-${index}`;

  /**
   * The human label only earns a second line when it says something the slug
   * does not: "Trusty Button" under `trusty-button` is the same words twice,
   * while "Brand Accent" under `brand` is a name the slug threw away. Compared
   * through a slugify of the label rather than as raw strings, so casing and
   * spacing do not decide whether the line appears.
   */
  const labelIsRedundant = (s: VariableNameSuggestion) => {
    if (!s.label) return true;
    const slug = s.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug === s.value.toLowerCase();
  };

  return (
    <div ref={wrapRef} class={`relative ${wrapperClass}`}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        name={name}
        value={value}
        spellcheck={false}
        autocomplete="off"
        placeholder={placeholder}
        aria-label={ariaLabel}
        role="combobox"
        aria-expanded={open ? 'true' : 'false'}
        // Always set, never dangling: ARIA 1.2 makes `aria-controls` a
        // *required* property of role="combobox", so an audit flags the
        // collapsed state where this used to drop to `undefined`. The listbox
        // it names therefore stays mounted (see below) rather than
        // conditionally rendered.
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 && matches[active] ? optionId(active) : undefined}
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={() => {
          // Escape (or a pick) can close the menu while focus stays put; a
          // fresh click on the field is a request to see the list again.
          if (open) return;
          setFiltering(false);
          setOpen(true);
          setActive(-1);
        }}
        class={inputClass}
      />

      {/*
        Always mounted, hidden while collapsed — the same bargain the sidebar's
        Learn section makes (see SidebarIsland): `aria-controls` must name a
        real element at all times, and a listbox that unmounts when the menu
        shuts would leave the combobox pointing at an id that no longer exists.
        `hidden` keeps it out of both the layout and the accessibility tree, so
        the collapsed state is indistinguishable from the old unmounted one —
        display:none also cancels `animate-popover-in` and restarts it on the
        next open, so the entrance still plays every time.
      */}
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        hidden={!open}
        aria-label={
          ariaLabel
            ? t(locale, 'ui.variableName.suggestionsFor', '{label} suggestions').replace(
                '{label}',
                ariaLabel
              )
            : t(locale, 'ui.variableName.suggestions', 'Suggestions')
        }
        // Cancelling mousedown keeps focus on the input — without it, pressing
        // a row blurs the field, the menu unmounts, and the click lands on
        // nothing. It also stops a scrollbar press from shutting the menu
        // mid-drag.
        onMouseDown={(e) => e.preventDefault()}
        class={`absolute left-0 z-40 w-full min-w-[13rem] max-w-[calc(100vw-1.5rem)] max-h-56 overflow-y-auto overscroll-contain p-1 dock rounded-md suggest-menu animate-popover-in ${
          dropUp ? 'bottom-full mb-1' : 'top-full mt-1'
        }`}
        style={dropUp ? { transformOrigin: 'bottom left' } : undefined}
      >
        {matches.length === 0 ? (
          <li
            role="option"
            aria-disabled="true"
            aria-selected="false"
            class="px-2.5 py-1.5 font-mono text-micro text-faint"
          >
            {suggestions.length === 0
              ? t(
                  locale,
                  'ui.variableName.noVariables',
                  'No variables saved yet — press Enter to use this name'
                )
              : t(
                  locale,
                  'ui.variableName.noMatch',
                  'No match — press Enter to use "{value}"'
                ).replace('{value}', value.trim())}
          </li>
        ) : (
          matches.map((s, i) => {
            const isActive = i === active;
            const isCurrent = s.value === value;
            return (
              <li
                key={s.value}
                id={optionId(i)}
                ref={(el) => {
                  optionRefs.current[i] = el;
                }}
                role="option"
                aria-selected={isCurrent}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(s)}
                class={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors duration-150 ${
                  isActive ? 'bg-canvas-elevated' : 'hover:bg-canvas-elevated'
                }`}
              >
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-mono text-label text-ink">{s.value}</span>
                  {!labelIsRedundant(s) && (
                    <span class="block truncate text-micro text-faint">{s.label}</span>
                  )}
                </span>
                {isCurrent && (
                  <Check class="w-3 h-3 shrink-0 text-ink" strokeWidth={2.5} aria-hidden="true" />
                )}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
