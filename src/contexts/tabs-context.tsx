'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';

export type PlanningTabValue = 'budgets' | 'goals' | 'subscriptions';

type TabsContextType = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  planningTab: PlanningTabValue;
  setPlanningTab: (tab: PlanningTabValue) => void;
};

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export function TabsProvider({ children, defaultValue }: { children: ReactNode, defaultValue: string }) {
  const [activeTab, setActiveTab] = useState(defaultValue);
  const [planningTab, setPlanningTab] = useState<PlanningTabValue>('budgets');

  const value = useMemo(() => ({
    activeTab,
    setActiveTab,
    planningTab,
    setPlanningTab,
  }), [activeTab, planningTab]);

  return (
    <TabsContext.Provider value={value}>
      {children}
    </TabsContext.Provider>
  );
}

export function useTabs() {
  const context = useContext(TabsContext);
  if (context === undefined) {
    throw new Error('useTabs must be used within a TabsProvider');
  }
  return context;
}
