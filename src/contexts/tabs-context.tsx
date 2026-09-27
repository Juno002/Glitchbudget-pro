'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';

type TabsContextType = {
  planTab: string;
  setPlanTab: (tab: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export function TabsProvider({ children, defaultValue }: { children: ReactNode, defaultValue: string }) {
  const [planTab, setPlanTab] = useState('budgets');
  const [activeTab, setActiveTab] = useState(defaultValue);

  const value = useMemo(() => ({
    planTab, setPlanTab,
    activeTab,
    setActiveTab,
  }), [activeTab, planTab]);

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
