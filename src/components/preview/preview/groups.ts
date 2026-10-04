/**
 * The group registry — the single source of truth for the tab strip.
 *
 * `implemented` is explicit rather than inferred, because this slice ships a few
 * groups out of eight. Tabs for the rest render a "planned" panel instead of a
 * blank canvas: it shows the information architecture up front so it can be
 * reacted to before the components exist, and it cannot be mistaken for a group
 * that loaded empty.
 *
 * There is deliberately no Overview group. An earlier version had one, carrying a
 * slot-coverage table and a generated contrast sweep. It was reporting, not
 * previewing — it is a different page wearing this page's clothes — and it made
 * the component showcase open on a report instead of on a component. What was
 * genuinely useful in it (which slots are still unset) now appears inline, in the
 * group that needs them, and the one contrast number per frame stays in the
 * frame's header.
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
      'Three top bars (solid, elevated, translucent), a sidebar, a mobile bar, breadcrumbs, tabs and pagination.',
    slots: ['background', 'text', 'primary'],
    implemented: false,
  },
  {
    id: 'buttons',
    label: 'Buttons',
    blurb:
      'Solid, outline, ghost and link variants across every accent role, plus icon buttons, groups, a FAB and the full state set.',
    slots: ['trusty-button', 'primary', 'secondary', 'success', 'danger', 'warning', 'info'],
    implemented: true,
  },
  {
    id: 'forms',
    label: 'Forms',
    blurb:
      'Input, textarea, select, checkbox, radio, switch, slider and upload, each with label, help, error and focus states.',
    slots: ['background', 'text', 'primary', 'danger'],
    implemented: true,
  },
  {
    id: 'cards',
    label: 'Cards',
    blurb:
      'Basic, media, stat/KPI, pricing and profile cards, flat against elevated, with footer actions.',
    slots: ['background', 'text', 'primary'],
    implemented: false,
  },
  {
    id: 'lists',
    label: 'Lists & Data',
    blurb: 'Simple list, list with meta, striped and bordered tables, definition list and timeline.',
    slots: ['background', 'text', 'primary'],
    implemented: false,
  },
  {
    id: 'feedback',
    label: 'Feedback',
    blurb: 'Alerts, toasts, badges, progress, spinners, skeletons and empty states.',
    slots: ['success', 'danger', 'warning', 'info'],
    implemented: false,
  },
  {
    id: 'overlays',
    label: 'Overlays',
    blurb: 'Modal, drawer, dropdown, tooltip, popover and command palette — surfaces stacked over a scrim.',
    slots: ['background', 'text', 'primary'],
    implemented: false,
  },
  {
    id: 'dataviz',
    label: 'Data Viz',
    blurb: 'Bars per role, chart grid and axis colours, stat deltas up and down.',
    slots: ['primary', 'secondary', 'success', 'danger', 'warning', 'info'],
    implemented: false,
  },
];

export const IMPLEMENTED_GROUPS = GROUPS.filter((g) => g.implemented);

/**
 * Narrow an untrusted id — a URL parameter — to a group that exists.
 *
 * Exported because three separate places need it: the page, to decide what to
 * server-render, and the island, on both the initial read and the read after a
 * `ClientRouter` swap. Inlining `GROUPS.some(...)` in each is three chances to
 * disagree about which ids are valid.
 */
export function isGroupId(raw: string | null | undefined): raw is GroupId {
  return GROUPS.some((g) => g.id === raw);
}

export function findGroup(id: string | null): GroupDef {
  return GROUPS.find((g) => g.id === id) ?? findGroup(DEFAULT_GROUP);
}
