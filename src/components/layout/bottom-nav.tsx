"use client";

import { useTabs } from "@/contexts/tabs-context";
import { PRIMARY_NAV_ITEMS, type PrimaryArea } from "@/components/layout/primary-navigation";
import { cn } from "@/lib/utils";
import { BarChart2, NotebookPen, FileText, ArrowLeftRight } from "lucide-react";
import { usePathname } from "next/navigation";

const icons = {
  summary: BarChart2,
  movements: ArrowLeftRight,
  planning: NotebookPen,
  reports: FileText,
} satisfies Record<PrimaryArea, typeof BarChart2>;

export default function BottomNav() {
  const { activeTab, setActiveTab } = useTabs();
  const pathname = usePathname();

  if (pathname !== '/') return null;

  return (
    <nav
      aria-label="Navegación principal"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-black/5 dark:border-white/10 bg-background/80 backdrop-blur-xl shadow-[0_-8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
    >
      <div className="flex justify-around items-stretch p-1 gap-1" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.25rem)'}}>
        {PRIMARY_NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.value;
          const Icon = icons[item.value];
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setActiveTab(item.value)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 p-2 flex-1 rounded-[12px] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
                isActive
                  ? "text-primary bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)_/_0.05)]"
                  : "text-muted-foreground/60 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
