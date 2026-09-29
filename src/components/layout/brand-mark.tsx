'use client';

import { cn } from '@/lib/utils';

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid h-8 w-8 shrink-0 grid-cols-3 items-end gap-[3px] rounded-[10px] bg-primary p-[7px] shadow-[var(--shadow-brand)]',
        className,
      )}
    >
      <span className="h-2 rounded-full bg-[hsl(var(--brand-gold))]" />
      <span className="h-4 rounded-full bg-primary-foreground" />
      <span className="h-3 rounded-full bg-[hsl(var(--brand-coral))]" />
    </span>
  );
}
