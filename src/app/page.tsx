'use client';

import AppShell from '@/components/layout/app-shell';
import DashboardContent from '@/components/dashboard/dashboard-content';
import { TabsProvider } from '@/contexts/tabs-context';

export default function DashboardPage() {
  return (
    <TabsProvider defaultValue="summary">
      <AppShell>
        <DashboardContent />
      </AppShell>
    </TabsProvider>
  );
}
