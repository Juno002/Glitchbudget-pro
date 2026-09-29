'use client';

import { Tabs, TabsContent } from '@/components/ui/tabs';
import SummaryTab from '@/components/dashboard/summary-tab';
import ReportsTab from '@/components/dashboard/reports-tab';
import { useTabs } from '@/contexts/tabs-context';
import MovementsTab from './movements-tab';
import PlanningTab from './planning-tab';

export default function DashboardContent() {
  const { activeTab, setActiveTab } = useTabs();

  return (
    <div className="w-full fade-in">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="relative min-h-[calc(100vh-180px)] w-full">
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
      </Tabs>
    </div>
  );
}
