'use client';
import AppShell from '@/components/layout/app-shell';
import {TabsProvider} from '@/contexts/tabs-context';
import DashboardContent from '@/components/dashboard/dashboard-content';

export default function DashboardPage() {
  return (
    <AppShell>
      <TabsProvider defaultValue="summary">
        <DashboardContent />
      </TabsProvider>
    </AppShell>
  );
}
