'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart2, NotebookPen, FileText, ArrowLeftRight } from "lucide-react";
import { PRIMARY_AREAS } from '@/lib/navigation';
import SummaryTab from "@/components/dashboard/summary-tab";
import ReportsTab from "@/components/dashboard/reports-tab";
import BottomNav from "@/components/layout/bottom-nav";
import { useTabs } from "@/contexts/tabs-context";
import MovementsTab from "./movements-tab";
import PlanningTab from "./planning-tab";

export default function DashboardContent() {
  const { activeTab, setActiveTab } = useTabs();

  return (
    <div className="w-full fade-in">

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="hidden md:grid w-full grid-cols-4 mb-6">
        {PRIMARY_AREAS.map(area => <TabsTrigger key={area.value} value={area.value}><area.icon className="mr-2 h-4 w-4" aria-hidden="true" />{area.label}</TabsTrigger>)}
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
  )
}
