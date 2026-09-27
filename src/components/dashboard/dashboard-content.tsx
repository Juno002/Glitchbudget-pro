'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart2, NotebookPen, FileText, ArrowLeftRight } from "lucide-react";
import SummaryTab from "@/components/dashboard/summary-tab";
import ReportsTab from "@/components/dashboard/reports-tab";
import BottomNav from "@/components/layout/bottom-nav";
import { PRIMARY_NAV_ITEMS, type PrimaryArea } from "@/components/layout/primary-navigation";
import { useTabs } from "@/contexts/tabs-context";
import MovementsTab from "./movements-tab";
import PlanningTab from "./planning-tab";

const icons = {
  summary: BarChart2,
  movements: ArrowLeftRight,
  planning: NotebookPen,
  reports: FileText,
} satisfies Record<PrimaryArea, typeof BarChart2>;

export default function DashboardContent() {
  const { activeTab, setActiveTab } = useTabs();

  return (
    <div className="w-full fade-in">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList aria-label="Navegación principal" className="hidden md:grid w-full grid-cols-4 mb-6">
          {PRIMARY_NAV_ITEMS.map(item => {
            const Icon = icons[item.value];
            return (
              <TabsTrigger key={item.value} value={item.value}>
                <Icon className="w-4 h-4 mr-2" />
                {item.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="min-h-[calc(100vh-200px)] w-full relative">
          <TabsContent value="summary">
            <SummaryTab />
          </TabsContent>
          <TabsContent value="movements">
            <MovementsTab />
          </TabsContent>
          <TabsContent value="planning">
            <PlanningTab />
          </TabsContent>
          <TabsContent value="reports">
            <ReportsTab />
          </TabsContent>
        </div>
        <BottomNav />
      </Tabs>
    </div>
  );
}
