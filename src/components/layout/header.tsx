'use client';

import Link from 'next/link';
import { localDate } from '@/lib/finance-calculations';
import { periodContaining } from '@/domain/periods';
import { formatPeriodRange } from '@/lib/period-format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useFinances } from '@/contexts/finance-context';
import { AchievementsDialogContent, AchievementToastLayer, AchievementHeaderBadge } from '@/components/dashboard/achievements-panel';
import { SettingsDialog } from './settings-dialog';
import { BalanceVisibilityToggle } from './balance-visibility-toggle';

export default function Header() {
  const {
    currentMonth,
    setCurrentMonth,
    currentPeriod,
    periodStartDay,
  } = useFinances();

  return (
    <>
      <header className="sticky top-0 z-10 flex h-auto items-center gap-4 border-b bg-background/80 px-4 py-2 backdrop-blur-sm md:px-6">
        <div className="flex w-full flex-wrap items-center gap-2">
          <div className="mr-auto flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-[hsl(var(--primary)_/_0.08)] px-3 py-1.5 text-primary shadow-[0_0_15px_hsl(var(--primary)_/_0.1)] transition-all hover:bg-primary/10">
                <span className="text-lg" aria-hidden="true">💰</span>
                <span className="font-syne font-bold tracking-wide">GlitchBudget Pro</span>
              </div>
            </Link>
          </div>

          <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 pt-2 sm:w-auto sm:pt-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <label htmlFor="period-picker" className="hidden text-sm text-muted-foreground md:inline">Período</label>
              <div className="relative h-9 min-w-0 w-[104px] rounded-full border border-input bg-background focus-within:ring-2 focus-within:ring-ring sm:w-[145px]">
                <span aria-hidden="true" className="pointer-events-none flex h-full items-center justify-center px-2 text-[10px] capitalize sm:text-xs">
                  {formatPeriodRange(currentPeriod)}
                </span>
                <Input
                  id="period-picker"
                  type="month"
                  value={currentMonth}
                  onChange={e => { if (e.target.value) setCurrentMonth(e.target.value); }}
                  aria-label="Período financiero"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </div>
              <Button
                variant="outline"
                className="h-9 px-2 text-xs sm:text-sm"
                onClick={() => setCurrentMonth(periodContaining(localDate(), { periodStartDay }).id)}
              >
                Período actual
              </Button>
            </div>

            <BalanceVisibilityToggle />

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Ver logros">
                  <AchievementHeaderBadge />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>🏆 Logros</DialogTitle>
                  <DialogDescription>Tu progreso y medallas desbloqueadas.</DialogDescription>
                </DialogHeader>
                <AchievementsDialogContent />
              </DialogContent>
            </Dialog>

            <SettingsDialog />
          </div>
        </div>
      </header>
      <AchievementToastLayer />
    </>
  );
}
