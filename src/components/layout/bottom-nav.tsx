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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[rgba(255,255,255,0.08)] bg-[rgba(8,8,8,0.85)] backdrop-blur-xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      <div className="flex justify-around items-stretch p-1 gap-1" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.25rem)'}}>
        {navItems.map((item) => {
          const isActive = activeTab === item.value;
          return (
             <Link
              key={item.value}
              href={item.href}
              onClick={() => setActiveTab(item.value)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 p-2 flex-1 rounded-[12px] transition-all duration-300",
                isActive 
                  ? "text-[#00ff88] bg-[rgba(0,255,136,0.08)] shadow-[0_0_15px_rgba(0,255,136,0.05)]" 
                  : "text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.03)]"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
