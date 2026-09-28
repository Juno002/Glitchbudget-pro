'use client';

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
      <header className="sticky top-0 z-10 border-b bg-background/80 px-4 py-2 backdrop-blur-sm md:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2">
          {/* Static navigation avoids Next RSC fetches, prohibited by the offline CSP. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="flex min-w-0 items-center gap-2">
            <div className="flex min-w-0 items-center gap-2 rounded-full border border-primary/20 bg-[hsl(var(--primary)_/_0.08)] px-3 py-1.5 text-primary shadow-[0_0_15px_hsl(var(--primary)_/_0.1)] transition-all hover:bg-primary/10">
              <span className="text-lg" aria-hidden="true">💰</span>
              <span className="truncate font-syne font-bold tracking-wide">GlitchBudget Pro</span>
            </div>
          </a>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <BalanceVisibilityToggle />

            <div className="hidden md:block">
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
            </div>

            <SettingsDialog />
          </div>

          <div className="order-last flex w-full min-w-0 items-center gap-2 pt-1 md:order-none md:ml-auto md:w-auto md:pt-0">
            <label htmlFor="period-picker" className="hidden text-sm text-muted-foreground lg:inline">Período</label>
            <div className="relative h-9 min-w-0 flex-1 rounded-full border border-input bg-background focus-within:ring-2 focus-within:ring-ring md:w-[150px] md:flex-none">
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
              className="h-9 shrink-0 px-2 text-xs sm:text-sm"
              onClick={() => setCurrentMonth(periodContaining(localDate(), { periodStartDay }).id)}
            >
              Período actual
            </Button>
          </div>
        </div>
      </header>
      <AchievementToastLayer />
    </>
  );
}
