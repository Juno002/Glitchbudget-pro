'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  navigationSearch,
  parseNavigationSearch,
  type MovementSection,
  type PlanningArea,
  type PrimaryArea,
} from '@/domain/navigation';

export type PlanningTabValue = PlanningArea;

type NavigateTarget = {
  area: PrimaryArea;
  planningTab?: PlanningTabValue;
  movementSection?: MovementSection | null;
};

type TabsContextType = {
  activeTab: PrimaryArea;
  setActiveTab: (tab: PrimaryArea) => void;
  navigate: (target: NavigateTarget, options?: { replace?: boolean }) => void;
  planningTab: PlanningTabValue;
  setPlanningTab: (tab: PlanningTabValue) => void;
  movementSectionFocus: MovementSection | null;
  clearMovementSectionFocus: () => void;
  movementFocusId: string | null;
  requestMovementFocus: (id: string) => void;
  clearMovementFocus: () => void;
};

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export function TabsProvider({ children, defaultValue }: { children: ReactNode, defaultValue: PrimaryArea }) {
  const [activeTab, setActiveTabState] = useState<PrimaryArea>(defaultValue);
  const [planningTab, setPlanningTabState] = useState<PlanningTabValue>('budgets');
  const [movementSectionFocus, setMovementSectionFocus] = useState<MovementSection | null>(null);
  const [movementFocusId, setMovementFocusId] = useState<string | null>(null);

  const writeLocation = useCallback((
    area: PrimaryArea,
    nextPlanningTab: PlanningTabValue,
    nextMovementSection: MovementSection | null,
    replace = false,
  ) => {
    const search = navigationSearch({
      area,
      planningTab: nextPlanningTab,
      movementSection: nextMovementSection,
    });
    const nextUrl = `${window.location.pathname}${search}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl === currentUrl) return;
    window.history[replace ? 'replaceState' : 'pushState']({ prismaNavigation: true }, '', nextUrl);
  }, []);

  useEffect(() => {
    const syncFromLocation = () => {
      const location = parseNavigationSearch(window.location.search);
      setActiveTabState(location.area);
      setPlanningTabState(location.planningTab);
      setMovementSectionFocus(location.movementSection);
    };

    syncFromLocation();
    window.addEventListener('popstate', syncFromLocation);
    return () => window.removeEventListener('popstate', syncFromLocation);
  }, []);

  const navigate = useCallback((target: NavigateTarget, options?: { replace?: boolean }) => {
    const nextPlanningTab = target.planningTab ?? planningTab;
    const nextMovementSection = target.area === 'movements'
      ? (target.movementSection ?? null)
      : null;

    setActiveTabState(target.area);
    if (target.planningTab) setPlanningTabState(target.planningTab);
    setMovementSectionFocus(nextMovementSection);
    writeLocation(target.area, nextPlanningTab, nextMovementSection, options?.replace ?? false);
  }, [planningTab, writeLocation]);

  const setActiveTab = useCallback((tab: PrimaryArea) => {
    navigate({ area: tab });
  }, [navigate]);

  const setPlanningTab = useCallback((tab: PlanningTabValue) => {
    setPlanningTabState(tab);
    if (activeTab === 'planning') {
      writeLocation('planning', tab, null);
    }
  }, [activeTab, writeLocation]);

  const value = useMemo(() => ({
    activeTab,
    setActiveTab,
    navigate,
    planningTab,
    setPlanningTab,
    movementSectionFocus,
    clearMovementSectionFocus: () => setMovementSectionFocus(null),
    movementFocusId,
    requestMovementFocus: (id: string) => setMovementFocusId(id),
    clearMovementFocus: () => setMovementFocusId(null),
  }), [activeTab, setActiveTab, navigate, planningTab, setPlanningTab, movementSectionFocus, movementFocusId]);

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

export function useOptionalTabs() {
  return useContext(TabsContext);
}
