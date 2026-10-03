import { useState } from 'preact/hooks';
import { navigationConfig, type NavItem } from '../../config/navigation';

interface MobileTabBarProps {
  currentPath: string;
}

export default function MobileTabBar({ currentPath }: MobileTabBarProps) {
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);
  const normalizedCurrent = currentPath.replace(/\/$/, '') || '/';

  // Primary mobile bar items: Picker, Palettes, Converters, Preview
  const mobileBarItems = navigationConfig
    .filter((item) => item.showInMobileBar)
    .sort((a, b) => (a.mobileBarOrder || 0) - (b.mobileBarOrder || 0));

  // Items shown in "More" drawer: Generator, Export, Learn + full converters list
  const moreDrawerItems = navigationConfig.filter((item) => !item.showInMobileBar);

  return (
    <>
      {/* Fixed Bottom Tab Bar */}
      <nav
        class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-lg border-t border-[#262626] pb-safe"
        aria-label="Mobile Navigation Bar"
      >
        <div class="flex items-center justify-around h-14 px-2">
          {mobileBarItems.map((item) => {
            const isActive = (item.path.replace(/\/$/, '') || '/') === normalizedCurrent;
            return (
              <a
                key={item.id}
                href={item.path}
                class={`touch-target flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-mono transition-colors ${
                  isActive ? 'text-[#f5f5f5]' : 'text-[#737373] hover:text-[#a3a3a3]'
                }`}
              >
                {/* Icons */}
                {item.id === 'picker' && (
                  <svg class="w-5 h-5 mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z"/>
                  </svg>
                )}
                {item.id === 'palettes' && (
                  <svg class="w-5 h-5 mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
                  </svg>
                )}
                {item.id === 'converters' && (
                  <svg class="w-5 h-5 mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>
                  </svg>
                )}
                {item.id === 'preview' && (
                  <svg class="w-5 h-5 mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect width="18" height="7" x="3" y="3" rx="1"/><rect width="9" height="7" x="3" y="14" rx="1"/><rect width="5" height="7" x="16" y="14" rx="1"/>
                  </svg>
                )}
                <span>{item.defaultLabel.replace('Color ', '').replace('UI ', '')}</span>
              </a>
            );
          })}

          {/* "More" Trigger */}
          <button
            onClick={() => setMoreDrawerOpen(true)}
            class={`touch-target flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-mono transition-colors ${
              moreDrawerOpen ? 'text-[#f5f5f5]' : 'text-[#737373] hover:text-[#a3a3a3]'
            }`}
            aria-label="More navigation options"
          >
            <svg class="w-5 h-5 mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
            </svg>
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* "More" Bottom Drawer */}
      {moreDrawerOpen && (
        <div class="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            class="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMoreDrawerOpen(false)}
            aria-hidden="true"
          />

          <div
            class="relative z-10 bg-[#121212] border-t border-[#262626] rounded-t-2xl p-5 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto pb-safe animate-in slide-in-from-bottom duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="More Tools & Settings"
          >
            <div class="flex items-center justify-between pb-2 border-b border-[#1f1f1f]">
              <span class="text-xs font-mono uppercase tracking-wider text-[#737373]">Tools & Resources</span>
              <button
                onClick={() => setMoreDrawerOpen(false)}
                class="touch-target p-1 text-[#a3a3a3] hover:text-[#f5f5f5]"
              >
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div class="grid grid-cols-2 gap-2">
              {moreDrawerItems.map((item) => (
                <a
                  key={item.id}
                  href={item.path}
                  onClick={() => setMoreDrawerOpen(false)}
                  class="p-3 rounded-lg bg-[#171717] hover:bg-[#222222] border border-[#262626] text-xs font-mono text-[#f5f5f5] flex items-center gap-2.5 transition-colors"
                >
                  <span>{item.defaultLabel}</span>
                </a>
              ))}
            </div>

            {/* All Converter Presets */}
            <div class="pt-2">
              <span class="text-[11px] font-mono uppercase tracking-wider text-[#737373] block mb-2">
                Color Converters
              </span>
              <div class="grid grid-cols-2 gap-1.5">
                {[
                  { label: 'HEX → OKLCH', path: '/hex-to-oklch' },
                  { label: 'OKLCH → HEX', path: '/oklch-to-hex' },
                  { label: 'RGB → OKLCH', path: '/rgb-to-oklch' },
                  { label: 'OKLCH → RGB', path: '/oklch-to-rgb' },
                  { label: 'HSL → OKLCH', path: '/hsl-to-oklch' },
                  { label: 'OKLCH → HSL', path: '/oklch-to-hsl' },
                ].map((c) => (
                  <a
                    key={c.path}
                    href={c.path}
                    onClick={() => setMoreDrawerOpen(false)}
                    class="px-2.5 py-2 rounded bg-[#171717] hover:bg-[#222222] border border-[#1f1f1f] text-[11px] font-mono text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors"
                  >
                    {c.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
