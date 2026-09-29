// src/hooks/use-achievements.ts
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useFinances } from '@/contexts/finance-context';
import {
  type AchievementId,
  type UnlockedAchievement,
  loadUnlocked,
  saveUnlocked,
  getStreak,
  setStreak,
  ACHIEVEMENTS,
  getTotalXP,
  getLevel,
} from '@/lib/achievements';
import { evaluateAchievementEligibility } from '@/domain/achievements';

export function useAchievements() {
  const {
    expenses,
    incomes,
    goals,
    goalContributions,
    budgets,
    currentMonth,
    getBudgetStatusDetails,
    loading,
  } = useFinances();

  const [unlocked, setUnlocked] = useState<UnlockedAchievement[]>([]);
  const [newlyUnlocked, setNewlyUnlocked] = useState<AchievementId[]>([]);
  const [streak, setStreakState] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  // Canonical ref that stays in sync with the latest unlocked list,
  // so we can check it synchronously without closure staleness.
  const unlockedRef = useRef<UnlockedAchievement[]>([]);

  // Load persisted state on mount
  useEffect(() => {
    const stored = loadUnlocked();
    unlockedRef.current = stored;
    setUnlocked(stored);
    setStreakState(getStreak());
    setHydrated(true);
  }, []);

  const isUnlocked = useCallback(
    (id: AchievementId) => unlocked.some((u) => u.id === id),
    [unlocked]
  );

  const unlock = useCallback(
    (id: AchievementId) => {
      // Check against the ref (always current) to prevent duplicates
      if (unlockedRef.current.some((u) => u.id === id)) return;
      const newEntry: UnlockedAchievement = {
        id,
        unlockedAt: new Date().toISOString(),
      };
      const next = [...unlockedRef.current, newEntry];
      unlockedRef.current = next;
      setUnlocked(next);
      saveUnlocked(next);
      setNewlyUnlocked((prev) => [...prev, id]);
    },
    [] // No dependency on `unlocked` state — uses ref instead
  );

  const dismissNew = useCallback((id: AchievementId) => {
    setNewlyUnlocked((prev) => prev.filter((a) => a !== id));
  }, []);

  // --- Evaluate achievements ---
  // Only runs after hydrated = true, which is set in the same batch
  // as setUnlocked(stored), so `unlocked` is guaranteed to have
  // the persisted data by the time this effect fires.
  useEffect(() => {
    if (!hydrated || loading) return;
    if (!expenses || !incomes || !goals || !goalContributions || !budgets) return;

    const evaluation = evaluateAchievementEligibility({
      expenses,
      incomes,
      goals,
      goalContributions,
      budgets,
      currentMonth,
      budgetDetails: getBudgetStatusDetails(currentMonth),
      streak,
    });

    evaluation.eligible.forEach(unlock);

    if (evaluation.nextStreak > streak) {
      setStreakState(evaluation.nextStreak);
      setStreak(evaluation.nextStreak);
    }
  }, [
    expenses, incomes, goals, goalContributions, budgets,
    currentMonth, loading, unlock, streak, getBudgetStatusDetails,
    hydrated,
  ]);

  const totalXP = getTotalXP(unlocked);
  const levelInfo = getLevel(totalXP);

  return {
    unlocked,
    newlyUnlocked,
    dismissNew,
    isUnlocked,
    totalXP,
    levelInfo,
    streak,
    allAchievements: ACHIEVEMENTS,
  };
}
