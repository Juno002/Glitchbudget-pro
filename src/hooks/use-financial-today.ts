'use client';

import { useEffect, useState } from 'react';
import { millisecondsUntilNextFinancialDay } from '@/lib/financial-clock';
import { localDate } from '@/lib/finance-calculations';

export function useFinancialToday(): string {
  const [today, setToday] = useState(() => localDate());

  useEffect(() => {
    let timer: number | undefined;

    const schedule = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      setToday(current => {
        const next = localDate();
        return current === next ? current : next;
      });
      timer = window.setTimeout(schedule, millisecondsUntilNextFinancialDay(new Date()));
    };

    const syncWhenVisible = () => {
      if (document.visibilityState === 'visible') schedule();
    };

    schedule();
    document.addEventListener('visibilitychange', syncWhenVisible);
    window.addEventListener('focus', schedule);

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', syncWhenVisible);
      window.removeEventListener('focus', schedule);
    };
  }, []);

  return today;
}
