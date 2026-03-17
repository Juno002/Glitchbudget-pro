'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart2, NotebookPen, FileText, ArrowLeftRight, History } from "lucide-react";
import SummaryTab from "@/components/dashboard/summary-tab";
import ReportsTab from "@/components/dashboard/reports-tab";
import BottomNav from "@/components/layout/bottom-nav";
import { useTabs } from "@/contexts/tabs-context";
import MovementsTab from "./movements-tab";
import PlanningTab from "./planning-tab";

export default function DashboardContent() {
  const { activeTab, setActiveTab } = useTabs();

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="hidden md:grid w-full grid-cols-4 mb-6">
        <TabsTrigger value="summary">
          <BarChart2 className="w-4 h-4 mr-2"/>
          Resumen
        </TabsTrigger>
        <TabsTrigger value="movements">
          <ArrowLeftRight className="w-4 h-4 mr-2" />
          Movimientos
        </TabsTrigger>
        <TabsTrigger value="planning">
          <NotebookPen className="w-4 h-4 mr-2" />
          Planificación
          </TabsTrigger>
        <TabsTrigger value="reports">
          <FileText className="w-4 h-4 mr-2" />
          Reportes
          </TabsTrigger>
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
  )
}
