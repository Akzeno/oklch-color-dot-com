import { useState, useEffect } from 'preact/hooks';
import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Code2,
  LayoutTemplate,
  MoreHorizontal,
  Palette,
  Pipette,
  Sparkles,
  X,
} from 'lucide-preact';
import type { LucideIcon } from 'lucide-preact';
import { navigationConfig } from '../../config/navigation';

/** Key used in localStorage to track first-time visitor status */
const FIRST_VISIT_KEY = 'oklch_first_visit_dismissed';
/** The nav item ID that gets the first-visit badge */
const FIRST_VISIT_TARGET_ID = 'generator';

/**
 * Mobile navigation.
 *
 * Four destinations plus "More". Labels are the shortened tool names — the
 * mobile bar cannot fit the full nav labels at 10px without truncating, so the
 * short form is stated here rather than produced by runtime string surgery on
 * the nav config (`defaultLabel.replace('Color ', '')`, which would silently
 * mangle any future label that happened to start with those words).
 */
const ICONS: Record<string, LucideIcon> = {
  Pipette,
  Palette,
  Sparkles,
  ArrowLeftRight,
  LayoutTemplate,
  Code2,
  BookOpen,
  BarChart3,
};

/** Short labels, authored rather than derived. */
const SHORT_LABELS: Record<string, string> = {
  picker: 'Picker',
  palettes: 'Palettes',
  converters: 'Convert',
  preview: 'Preview',
  generator: 'Generator',
  export: 'Export',
  learn: 'Learn',
};

interface MobileTabBarProps {
  currentPath: string;
}

export default function MobileTabBar({ currentPath }: MobileTabBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  /* First-visit notification badge */
  const [showFirstVisitBadge, setShowFirstVisitBadge] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(FIRST_VISIT_KEY);
      if (!dismissed) {
        setShowFirstVisitBadge(true);
      }
    } catch {
      // Private-mode storage failures must not break navigation.
    }
  }, []);

  const dismissFirstVisitBadge = () => {
    setShowFirstVisitBadge(false);
    try {
      localStorage.setItem(FIRST_VISIT_KEY, 'true');
    } catch {
      // ignore
    }
  };

  const normalize = (p: string) => p.replace(/\/$/, '') || '/';
  const current = normalize(currentPath);

  const primary = navigationConfig
    .filter((item) => item.showInMobileBar)
    .sort((a, b) => (a.mobileBarOrder ?? 0) - (b.mobileBarOrder ?? 0));

  /*
   * Built from the nav config rather than a hand-written list. The previous
   * copy duplicated all six converter routes inline, so the sheet went stale
   * the moment a converter was renamed in one place but not the other.
   *
   * Learn guides are pulled out of `secondary` the same way the desktop
   * sidebar pulls them out of the top-level rail: they get their own section
   * so the sheet stays a list of tools.
   */
  const converterGroup = navigationConfig.find((item) => item.children?.length);
  const learnItems = navigationConfig.filter((item) => item.group === 'learn');
  const secondary = navigationConfig.filter(
    (item) =>
      !item.showInMobileBar && !item.children?.length && item.group !== 'learn'
  );

  return (
    <>
      <nav
        class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-canvas/95 backdrop-blur-lg border-t border-hairline pb-safe"
        aria-label="Primary"
      >
        <div class="flex items-stretch h-14 px-1">
          {primary.map((item) => {
            const active = normalize(item.path) === current;
            const Ico = ICONS[item.icon];
            return (
              <a
                key={item.id}
                href={item.path}
                aria-current={active ? 'page' : undefined}
                class={`flex flex-col items-center justify-center gap-0.5 flex-1 font-mono text-[10px] transition-colors duration-150 ${
                  active ? 'text-ink' : 'text-mute'
                }`}
              >
                {Ico && <Ico class="w-5 h-5" aria-hidden="true" strokeWidth={1.75} />}
                <span>{SHORT_LABELS[item.id] ?? item.defaultLabel}</span>
              </a>
            );
          })}

          <button
            onClick={() => setSheetOpen(true)}
            aria-expanded={sheetOpen}
            class={`flex flex-col items-center justify-center gap-0.5 flex-1 font-mono text-[10px] transition-colors duration-150 relative ${
              sheetOpen ? 'text-ink' : 'text-mute'
            }`}
          >
            <span class="relative">
              <MoreHorizontal class="w-5 h-5" aria-hidden="true" strokeWidth={1.75} />
              {showFirstVisitBadge && (
                <span class="absolute -top-0 -right-0 w-2.5 h-2.5 bg-first-visit rounded-full ring-1 ring-canvas animate-badge-pulse" aria-label="Recommended to try" />
              )}
            </span>
            <span>More</span>
          </button>
        </div>
      </nav>

      {sheetOpen && (
        <div class="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            class="fixed inset-0 bg-black/70"
            onClick={() => setSheetOpen(false)}
            aria-hidden="true"
          />

          <div
            class="relative z-10 bg-canvas-card border-t border-hairline rounded-t-lg dock-in max-h-[80vh] overflow-y-auto pb-safe"
            role="dialog"
            aria-modal="true"
            aria-label="All tools"
          >
            <div class="flex items-center justify-between px-4 py-3 border-b border-hairline-subtle sticky top-0 bg-canvas-card">
              <span class="eyebrow">All tools</span>
              <button
                onClick={() => setSheetOpen(false)}
                class="icon-btn -mr-1"
                aria-label="Close"
              >
                <X class="w-4 h-4" aria-hidden="true" strokeWidth={2} />
              </button>
            </div>

            <div class="p-4 space-y-5">
              <div class="grid grid-cols-2 gap-2">
                {secondary.map((item) => {
                  const Ico = ICONS[item.icon];
                  const isFirstVisitTarget = item.id === FIRST_VISIT_TARGET_ID;
                  return (
                    <a
                      key={item.id}
                      href={item.path}
                      onClick={() => {
                        setSheetOpen(false);
                        if (isFirstVisitTarget) dismissFirstVisitBadge();
                      }}
                      class="flex items-center gap-2.5 px-3 py-2.5 rounded-md border border-hairline bg-canvas-raised text-label text-ink transition-colors duration-150"
                    >
                      <span class="relative flex-shrink-0">
                        {Ico && <Ico class="w-4 h-4 text-mute" aria-hidden="true" strokeWidth={1.75} />}
                        {showFirstVisitBadge && isFirstVisitTarget && (
                          <span class="absolute -top-0 -right-0 w-2.5 h-2.5 bg-first-visit rounded-full ring-1 ring-canvas animate-badge-pulse" aria-label="Recommended to try" />
                        )}
                      </span>
                      <span class="truncate">{item.defaultLabel}</span>
                    </a>
                  );
                })}
              </div>

              {converterGroup && (
                <div>
                  <span class="eyebrow block mb-2">Converters</span>
                  <div class="grid grid-cols-2 gap-1.5">
                    {converterGroup.children!.map((child) => (
                      <a
                        key={child.id}
                        href={child.path}
                        onClick={() => setSheetOpen(false)}
                        class="px-3 py-2 rounded-md border border-hairline-subtle bg-canvas-raised font-mono text-label text-body transition-colors duration-150"
                      >
                        {child.defaultLabel}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {learnItems.length > 0 && (
                <div>
                  <span class="eyebrow block mb-2">Learn</span>
                  <div class="grid grid-cols-2 gap-1.5">
                    {learnItems.map((item) => (
                      <a
                        key={item.id}
                        href={item.path}
                        onClick={() => setSheetOpen(false)}
                        class="px-3 py-2 rounded-md border border-hairline-subtle bg-canvas-raised font-mono text-label text-body transition-colors duration-150"
                      >
                        {item.defaultLabel}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}