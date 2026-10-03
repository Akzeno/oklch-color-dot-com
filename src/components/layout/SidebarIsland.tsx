import { useState, useEffect } from 'preact/hooks';
import { navigationConfig, type NavItem } from '../../config/navigation';

interface SidebarProps {
  currentPath: string;
}

export default function SidebarIsland({ currentPath }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [convertersOpen, setConvertersOpen] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sidebar_collapsed');
      if (stored !== null) {
        setCollapsed(stored === 'true');
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem('sidebar_collapsed', String(next));
    } catch (e) {
      // ignore
    }
  };

  const normalizedCurrent = currentPath.replace(/\/$/, '') || '/';

  // Simple icon renderer
  const renderIcon = (name: string, className: string = 'w-4 h-4') => {
    switch (name) {
      case 'Pipette':
        return (
          <svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z"/><path d="m5 2 5 5"/><path d="m2 5 5 5"/>
          </svg>
        );
      case 'Palette':
        return (
          <svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
          </svg>
        );
      case 'Sparkles':
        return (
          <svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>
          </svg>
        );
      case 'ArrowLeftRight':
        return (
          <svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>
          </svg>
        );
      case 'LayoutTemplate':
        return (
          <svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="7" x="3" y="3" rx="1"/><rect width="9" height="7" x="3" y="14" rx="1"/><rect width="5" height="7" x="16" y="14" rx="1"/>
          </svg>
        );
      case 'Code2':
        return (
          <svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>
          </svg>
        );
      case 'BookOpen':
        return (
          <svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        );
      case 'Hash':
        return (
          <svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/>
          </svg>
        );
      case 'FileCode2':
        return (
          <svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m5 12-3 3 3 3"/><path d="m9 18 3-3-3-3"/>
          </svg>
        );
      case 'SlidersHorizontal':
        return (
          <svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>
          </svg>
        );
      default:
        return (
          <svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
          </svg>
        );
    }
  };

  return (
    <aside
      class={`hidden md:flex flex-col border-r border-[#262626] bg-[#0a0a0a] transition-all duration-200 select-none flex-shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Navigation Links */}
      <div class="flex-1 py-4 px-2 space-y-1 overflow-y-auto no-scrollbar">
        {navigationConfig.map((item) => {
          const hasChildren = item.children && item.children.length > 0;
          const isActive = (item.path.replace(/\/$/, '') || '/') === normalizedCurrent;
          const isChildActive = hasChildren && item.children?.some(c => (c.path.replace(/\/$/, '') || '/') === normalizedCurrent);

          if (hasChildren) {
            return (
              <div key={item.id} class="space-y-1">
                <button
                  onClick={() => setConvertersOpen(!convertersOpen)}
                  class={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-mono transition-colors ${
                    isChildActive
                      ? 'bg-[#141414] text-[#f5f5f5]'
                      : 'text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#141414]'
                  }`}
                  title={item.defaultLabel}
                >
                  <div class="flex items-center gap-2.5">
                    <span class={isChildActive ? 'text-[#f5f5f5]' : 'text-[#737373]'}>
                      {renderIcon(item.icon)}
                    </span>
                    {!collapsed && <span>{item.defaultLabel}</span>}
                  </div>
                  {!collapsed && (
                    <svg
                      class={`w-3.5 h-3.5 text-[#737373] transition-transform duration-150 ${convertersOpen ? 'rotate-90' : ''}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  )}
                </button>

                {convertersOpen && !collapsed && (
                  <div class="pl-7 pr-1 space-y-0.5 border-l border-[#1a1a1a] ml-4 my-1">
                    {item.children?.map((child) => {
                      const isSubActive = (child.path.replace(/\/$/, '') || '/') === normalizedCurrent;
                      return (
                        <a
                          key={child.id}
                          href={child.path}
                          class={`block px-2 py-1.5 rounded text-[11px] font-mono transition-colors ${
                            isSubActive
                              ? 'text-[#f5f5f5] font-semibold bg-[#171717]'
                              : 'text-[#737373] hover:text-[#a3a3a3] hover:bg-[#141414]'
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
              class={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-mono transition-colors ${
                isActive
                  ? 'bg-[#141414] text-[#f5f5f5] font-semibold border border-[#262626]'
                  : 'text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#141414]'
              }`}
              title={item.defaultLabel}
            >
              <span class={isActive ? 'text-[#f5f5f5]' : 'text-[#737373]'}>
                {renderIcon(item.icon)}
              </span>
              {!collapsed && <span>{item.defaultLabel}</span>}
            </a>
          );
        })}
      </div>

      {/* Collapse Toggle Footer */}
      <div class="p-2 border-t border-[#1a1a1a]">
        <button
          onClick={toggleCollapse}
          class="w-full flex items-center justify-center p-2 rounded-md text-[#737373] hover:text-[#f5f5f5] hover:bg-[#141414] transition-colors text-xs font-mono"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            class={`w-4 h-4 transition-transform duration-150 ${collapsed ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/>
          </svg>
        </button>
      </div>
    </aside>
  );
}
