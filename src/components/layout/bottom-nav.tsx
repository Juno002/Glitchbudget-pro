"use client";

import { usePathname } from "next/navigation";
import { ArrowLeftRight, BarChart3, FileText, NotebookPen } from "lucide-react";
import { useTabs } from "@/contexts/tabs-context";
import { PRIMARY_NAV_ITEMS, type PrimaryArea } from "@/components/layout/primary-navigation";
import { cn } from "@/lib/utils";

const icons = {
  summary: BarChart3,
  movements: ArrowLeftRight,
  planning: NotebookPen,
  reports: FileText,
} satisfies Record<PrimaryArea, typeof BarChart3>;

export default function BottomNav() {
  const { activeTab, setActiveTab } = useTabs();
  const pathname = usePathname();

  if (pathname !== "/") return null;

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-background/95 backdrop-blur-xl shadow-[var(--shadow-nav)] md:hidden"
    >
      <div
        className="grid grid-cols-4 gap-1 px-2 pt-2"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)" }}
      >
        {PRIMARY_NAV_ITEMS.map(item => {
          const isActive = activeTab === item.value;
          const Icon = icons[item.value];
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setActiveTab(item.value)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-[var(--radius-interactive)] px-1 py-2 text-[10px] font-semibold transition-[background-color,color,transform] duration-[var(--motion-standard)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset active:scale-[0.98]",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              )}
            >
              <Icon className="h-[19px] w-[19px]" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
