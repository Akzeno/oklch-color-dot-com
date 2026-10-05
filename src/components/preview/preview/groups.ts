/**
 * The group registry — the single source of truth for the tab strip.
 *
 * `implemented` is explicit rather than inferred, because a tab that renders a
 * blank panel is indistinguishable from a tab that failed to load. Eight groups
 * ship; a ninth registered later would render this "planned" panel instead,
 * which shows the information architecture up front so it can be reacted to
 * before the components exist.
 *
 * There is deliberately no Overview group. An earlier version had one, carrying a
 * slot-coverage table and a generated contrast sweep. It was reporting, not
 * previewing — it is a different page wearing this page's clothes — and it made
 * the component showcase open on a report instead of on a component. What was
 * genuinely useful in it (which slots are still unset) now appears inline, in the
 * group that needs them, and the one contrast number per rail stays in the rail's
 * header.
 *
 * WHAT A GROUP IS NOW
 *
 * Not a wide canvas of loose components. Each group is one or more *rails* of
 * fixed-size specimen cards — see `Specimen.tsx` — so the comparison inside a
 * group is between things that share a size and a backdrop, and the components
 * are painted from a fixture ramp that deliberately does not match this site's
 * own chrome. A group file is therefore about *arrangement*: the components
 * themselves come from `kit.tsx`, so the same button cannot mean two different
 * things in two groups.
 */

export type GroupId =
  | 'navigation'
  | 'buttons'
  | 'forms'
  | 'cards'
  | 'lists'
  | 'feedback'
  | 'overlays'
  | 'dataviz';

export interface GroupDef {
  id: GroupId;
  label: string;
  /** Shown in the tab tooltip and the planned panel. */
  blurb: string;
  /** Slots this group is the reason to set. */
  slots: string[];
  implemented: boolean;
}

/**
 * Where the page opens.
 *
 * Stated explicitly rather than inferred from list order, so reordering the
 * registry for reading convenience cannot silently change the landing tab.
 */
export const DEFAULT_GROUP: GroupId = 'buttons';

export const GROUPS: GroupDef[] = [
  {
    id: 'navigation',
    label: 'Navigation',
    blurb:
      'Top bar, sidebar, mobile dock, tabs, breadcrumbs, pagination and account menus — the neutral roles stacked five ways.',
    slots: ['background', 'text', 'primary'],
    implemented: true,
  },
  {
    id: 'buttons',
    label: 'Buttons',
    blurb:
      'Classic, solid, soft, outline and ghost, plus icon buttons, a toolbar, and the badges and avatars that take the same pair.',
    slots: ['trusty-button', 'primary', 'secondary', 'success', 'danger', 'warning', 'info'],
    implemented: true,
  },
  {
    id: 'forms',
    label: 'Forms',
    blurb:
      'Input, textarea, select, search, checkbox, radio, switch and slider — each one stacking label, value and edge at once.',
    slots: ['background', 'text', 'primary', 'danger'],
    implemented: true,
  },
  {
    id: 'cards',
    label: 'Cards',
    blurb:
      'Flat, toolbar, media, stat, nested, list and pricing — one per depth, for surfaces that have to stack.',
    slots: ['background', 'text', 'primary'],
    implemented: true,
  },
  {
    id: 'lists',
    label: 'Lists & Data',
    blurb:
      'Plain, meta, striped, selected and bordered lists, plus a table, a definition list and a timeline.',
    slots: ['background', 'text', 'primary'],
    implemented: true,
  },
  {
    id: 'feedback',
    label: 'Feedback',
    blurb: 'Alerts in all four tones, badges, progress, toasts, an undo offer and an empty state.',
    slots: ['success', 'danger', 'warning', 'info'],
    implemented: true,
  },
  {
    id: 'overlays',
    label: 'Overlays',
    blurb:
      'Modal, drawer, dropdown, combobox, popover, command palette and banner — surfaces stacked over a scrim.',
    slots: ['background', 'text', 'primary'],
    implemented: true,
  },
  {
    id: 'dataviz',
    label: 'Data Viz',
    blurb:
      'Bars, donut, stacked segments, lines and a heatmap per accent role — where six hues have to be told apart, not just read.',
    slots: ['primary', 'secondary', 'success', 'danger', 'warning', 'info'],
    implemented: true,
  },
];

export const IMPLEMENTED_GROUPS = GROUPS.filter((g) => g.implemented);

/**
 * Narrow an untrusted id — a URL parameter — to a group that exists.
 *
 * Exported rather than inlined in the island's reader so the predicate has one
 * home. It is a type guard as well as a filter: the id that survives is known
 * to the compiler to be a `GroupId`, which is why the router needs no cast.
 */
export function isGroupId(raw: string | null | undefined): raw is GroupId {
  return GROUPS.some((g) => g.id === raw);
}

export function findGroup(id: string | null): GroupDef {
  return GROUPS.find((g) => g.id === id) ?? findGroup(DEFAULT_GROUP);
}
