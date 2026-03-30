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

    // first_expense
    if (expenses.length >= 1) unlock('first_expense');

    // first_income
    if (incomes.length >= 1) unlock('first_income');

    // first_goal
    if (goals.length >= 1) unlock('first_goal');

    // five_transactions
    if (expenses.length + incomes.length >= 5) unlock('five_transactions');

    // twenty_transactions
    if (expenses.length + incomes.length >= 20) unlock('twenty_transactions');

    // goal_complete
    if (goals.some((g) => g.status === 'completed')) unlock('goal_complete');

    // big_saver (saved >= RD$10,000 = 1_000_000 cents)
    const totalSaved = goals.reduce((sum, g) => sum + g.saved, 0);
    if (totalSaved >= 1_000_000) unlock('big_saver');

    // budget_master (5+ budgeted categories in current month)
    const monthBudgets = budgets.filter((b) => b.month === currentMonth && b.limit > 0);
    if (monthBudgets.length >= 5) unlock('budget_master');

    // budget_under_control
    const budgetDetails = getBudgetStatusDetails(currentMonth);
    const budgetedCategories = budgetDetails.filter((b) => b.limit > 0);
    if (budgetedCategories.length > 0 && budgetedCategories.every((b) => b.status !== 'over')) {
      unlock('budget_under_control');
    }

    // diversified_income (3+ categories)
    const incomeCategories = new Set(incomes.map((i) => i.categoryId));
    if (incomeCategories.size >= 3) unlock('diversified_income');

    // zero_waste: no budgets over AND each has ≤10% remaining relative to limit
    if (
      budgetedCategories.length > 0 &&
      budgetedCategories.every((b) => b.status !== 'over') &&
      budgetedCategories.every((b) => b.remaining >= 0 && b.remaining <= b.limit * 0.1)
    ) {
      unlock('zero_waste');
    }

    // consistent_tracker (data in 3+ months)
    const allMonths = new Set([
      ...expenses.map((e) => e.month),
      ...incomes.map((i) => i.month),
    ]);
    if (allMonths.size >= 3) unlock('consistent_tracker');

    // saver_streak_3 / saver_streak_7
    const contributionCount = goalContributions.length;
    if (contributionCount > streak) {
      const newStreak = contributionCount;
      setStreakState(newStreak);
      setStreak(newStreak);
    }
    if (streak >= 3) unlock('saver_streak_3');
    if (streak >= 7) unlock('saver_streak_7');
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
