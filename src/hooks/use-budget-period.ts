'use client';

import { useMemo, useState } from 'react';
import { useFinances } from '@/contexts/finance-context';
import { budgetPeriodContaining, contains, nextBudgetPeriod, previousBudgetPeriod, type BudgetPeriodKind, type BudgetPeriodRange } from '@/domain/periods';
import { savedBudgetRanges } from '@/domain/budgets';
import { localDate } from '@/lib/finance-calculations';

export function useBudgetPeriod() {
  const { currentPeriod, periodStartDay, budgets, setCurrentMonth } = useFinances();
  const [kind, setKind] = useState<BudgetPeriodKind>('monthly');
  const [selection, setSelection] = useState<{ context:string; anchor:string; start:string; end:string } | null>(null);
  const context = `${currentPeriod.start}:${currentPeriod.end}`;
  const today = localDate();
  const values = selection?.context === context ? selection : {
    context, anchor:contains(currentPeriod, today) ? today : currentPeriod.end,
    start:currentPeriod.start, end:currentPeriod.end,
  };
  const update = (patch: Partial<typeof values>) => setSelection({ ...values, ...patch });
  const range = useMemo(() => {
    try {
      return budgetPeriodContaining(kind === 'monthly' ? currentPeriod.end : kind === 'one_time' ? values.start : values.anchor,
        kind, { periodStartDay }, { start:values.start, end:values.end });
    } catch { return null; }
  }, [kind, currentPeriod.end, periodStartDay, values.start, values.end, values.anchor]);
  const saved = useMemo(() => savedBudgetRanges(budgets || [], { periodStartDay }).filter(item => item.kind === kind), [budgets, kind, periodStartDay]);
  const choose = (item: BudgetPeriodRange) => {
    if (item.kind === 'monthly') setCurrentMonth(item.id);
    else update({ anchor:item.start, start:item.start, end:item.end });
  };
  const navigate = (direction: -1 | 1) => {
    if (!range) return;
    const adjacent = direction === -1 ? previousBudgetPeriod(range, { periodStartDay }) : nextBudgetPeriod(range, { periodStartDay });
    if (adjacent) choose(adjacent);
  };
  return { kind, setKind, range, saved, values, update, choose, navigate };
}
