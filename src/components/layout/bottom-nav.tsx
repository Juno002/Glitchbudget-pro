"use client";

import { useTabs } from "@/contexts/tabs-context";
import { cn } from "@/lib/utils";
import { BarChart2, NotebookPen, FileText, ArrowLeftRight, History } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { value: "summary", label: "Resumen", icon: BarChart2, href: "/" },
  { value: "movements", label: "Movimientos", icon: ArrowLeftRight, href: "/"},
  { value: "planning", label: "Plan", icon: NotebookPen, href: "/" },
  { value: "reports", label: "Reportes", icon: FileText, href: "/" },
];

export default function BottomNav() {
  const { activeTab, setActiveTab } = useTabs();
  const pathname = usePathname();
  
  // Hide on any page other than the main dashboard routes
  if (pathname !== '/') return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-sm">
      <div className="flex justify-around items-stretch" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)'}}>
        {navItems.map((item) => {
          const isActive = activeTab === item.value;
          return (
             <Link
              key={item.value}
              href={item.href}
              onClick={() => setActiveTab(item.value)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 p-2 text-muted-foreground flex-1",
                { "text-primary bg-primary/10": isActive }
              )}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
