import { useState, useEffect } from 'preact/hooks';
import {
  ArrowLeftRight,
  BookOpen,
  Code2,
  LayoutTemplate,
  Palette,
  Pipette,
  Sparkles,
} from 'lucide-preact';
import type { LucideIcon } from 'lucide-preact';
import { navigationConfig } from '../../config/navigation';

/**
 * Icons are referenced by the Lucide name stored in `navigation.ts` and
 * resolved here. The nav previously carried its own 70-line `switch` of
 * hand-copied SVG paths, which meant two sources of truth for the same glyph
 * and no way to tell a typo from a missing case.
 */
const ICONS: Record<string, LucideIcon> = {
  Pipette,
  Palette,
  Sparkles,
  ArrowLeftRight,
  LayoutTemplate,
  Code2,
  BookOpen,
};

interface SidebarProps {
  currentPath: string;
}

export default function SidebarIsland({ currentPath }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sidebar_collapsed');
      if (stored !== null) setCollapsed(stored === 'true');
    } catch {
      // Private-mode storage failures must not break navigation.
    }
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem('sidebar_collapsed', String(next));
    } catch {
      // ignore
    }
  };

  const normalize = (p: string) => p.replace(/\/$/, '') || '/';
  const normalizedCurrent = normalize(currentPath);

  const iconFor = (name: string, className: string) => {
    const Cmp = ICONS[name];
    if (!Cmp) return null;
    return <Cmp class={className} aria-hidden="true" strokeWidth={1.75} />;
  };

  /*
   * Active state is communicated three ways at once — a left rail bar, a
   * raised background, and ink-bright type — because this is the one control
   * whose state the user cannot infer from a colour change alone.
   */
  const itemClass = (active: boolean) =>
    active
      ? 'bg-canvas-elevated text-ink'
      : 'text-body hover:text-ink hover:bg-canvas-card';

  return (
    <aside
      class={`hidden md:flex flex-col shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] border-r border-hairline bg-canvas select-none transition-[width] duration-150 ${
        collapsed ? 'w-[52px]' : 'w-[208px]'
      }`}
      aria-label="Primary"
    >
      <nav class="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto no-scrollbar">
        {navigationConfig.map((item) => {
          const children = item.children ?? [];
          const isActive = normalize(item.path) === normalizedCurrent;
          const isChildActive = children.some((c) => normalize(c.path) === normalizedCurrent);

          if (children.length > 0) {
            return (
              <div key={item.id}>
                {/*
                  The group header is a static label, not a disclosure.

                  It used to be a button that toggled the six converters open
                  and shut, which meant the nav's real depth was hidden behind
                  an extra click and the rail's height changed depending on
                  remembered state. All eleven destinations are cheap enough to
                  show at all times, so there is nothing left to collapse.
                */}
                <div
                  class="flex items-center gap-2.5 px-2.5 pt-3 pb-1.5 first:pt-0"
                  aria-current={isChildActive ? 'true' : undefined}
                >
                  <span class={isChildActive ? 'text-ink' : 'text-mute'}>
                    {iconFor(item.icon, 'w-4 h-4')}
                  </span>
                  {!collapsed && (
                    <span class="eyebrow truncate">{item.defaultLabel}</span>
                  )}
                </div>
                {!collapsed && (
                  <div class="space-y-0.5 mt-0.5">
                    {children.map((child) => {
                      const on = normalize(child.path) === normalizedCurrent;
                      return (
                        <a
                          key={child.id}
                          href={child.path}
                          aria-current={on ? 'page' : undefined}
                          title={child.defaultLabel}
                          class={`flex items-center gap-2.5 pl-7 pr-2.5 py-1.5 rounded-md font-mono text-label transition-colors duration-150 ${itemClass(on)} ${
                            on ? 'font-medium' : ''
                          }`}
                        >
                          {child.defaultLabel}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <a
              key={item.id}
              href={item.path}
              aria-current={isActive ? 'page' : undefined}
              title={item.defaultLabel}
              class={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-label transition-colors duration-150 ${itemClass(isActive)}`}
            >
              <span class={isActive ? 'text-ink' : 'text-mute'}>
                {iconFor(item.icon, 'w-4 h-4')}
              </span>
              {!collapsed && <span class="truncate">{item.defaultLabel}</span>}
            </a>
          );
        })}
      </nav>

      <div class="p-2 border-t border-hairline-subtle">
        <button
          onClick={toggleCollapse}
          class={`icon-btn w-full ${collapsed ? '' : ''}`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
        >
          <svg
            class={`w-4 h-4 transition-transform duration-150 ${collapsed ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m11 17-5-5 5-5" />
            <path d="m18 17-5-5 5-5" />
          </svg>
        </button>
      </div>
    </aside>
  );
}