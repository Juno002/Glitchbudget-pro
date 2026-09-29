'use client';

import { ArrowLeftRight, BarChart3, Check, FileText, NotebookPen, Plus } from 'lucide-react';
import { BrandMark } from '@/components/layout/brand-mark';
import { PRIMARY_NAV_ITEMS, type PrimaryArea } from '@/components/layout/primary-navigation';
import { useTabs } from '@/contexts/tabs-context';
import { cn } from '@/lib/utils';

const icons = {
  summary: BarChart3,
  movements: ArrowLeftRight,
  planning: NotebookPen,
  reports: FileText,
} satisfies Record<PrimaryArea, typeof BarChart3>;

export default function DesktopSidebar({ onNewMovement }: { onNewMovement: () => void }) {
  const { activeTab, setActiveTab } = useTabs();

  return (
    <aside className="sticky top-0 hidden h-screen w-[244px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 text-sidebar-foreground md:flex">
      {/* Static navigation avoids Next RSC fetches, prohibited by the offline CSP. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="flex items-center gap-3 px-2" aria-label="GlitchBudget Pro">
        <BrandMark />
        <span className="min-w-0">
          <span className="block truncate font-headline text-[1.2rem] leading-none tracking-[-0.035em] text-sidebar-primary">GlitchBudget Pro</span>
          <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Local / privado</span>
        </span>
      </a>

      <button
        type="button"
        onClick={onNewMovement}
        aria-label="Nuevo movimiento"
        className="mt-8 flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-interactive)] bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-floating)] transition-[transform,background-color,box-shadow] duration-[var(--motion-standard)] hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
      >
        <Plus className="h-4 w-4" />
        Nuevo movimiento
      </button>

      <nav aria-label="Navegación principal" className="mt-7 grid gap-1.5">
        {PRIMARY_NAV_ITEMS.map(item => {
          const Icon = icons[item.value];
          const active = activeTab === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setActiveTab(item.value)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex min-h-11 items-center gap-3 rounded-[var(--radius-interactive)] px-3 text-left text-sm font-semibold transition-[background-color,color,transform] duration-[var(--motion-standard)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
              )}
            >
              {active ? <span className="absolute -left-4 h-5 w-[3px] rounded-r-full bg-[hsl(var(--brand-coral))]" /> : null}
              <Icon className="h-[18px] w-[18px]" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto px-1">
        <div className="flex items-center gap-2 rounded-[var(--radius-card)] border border-sidebar-border bg-background/45 p-3">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-good/15 text-good">
            <Check className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-sidebar-foreground">Solo en tu dispositivo</span>
            <span className="mt-0.5 block text-[10px] text-muted-foreground">Sincronización financiera remota desactivada</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
